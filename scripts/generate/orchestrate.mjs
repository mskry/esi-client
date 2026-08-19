import { createHash, randomUUID } from 'node:crypto';
import { cp, lstat, mkdir, mkdtemp, readFile, rename, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { basename, dirname, join, relative, resolve } from 'node:path';

import { applySpecificationCorrections } from './corrections.mjs';
import { createOperationAccountingReport, renderGeneratedJson } from './artifacts.mjs';
import { namingReviewReportPath, renderNamingReviewReport } from './naming-review.mjs';
import { normalizeOpenApiDocument } from './normalize.mjs';
import { defaultSpecificationUrl, stageOpenApiSnapshot } from './openapi.mjs';
import {
  defaultFacadeCatalogPath,
  loadFacadeCatalog,
  resolveOperationMetadata,
} from './operation-metadata.mjs';
import { generatedReplacementTargets, repositoryRoot } from './paths.mjs';

const generatedTargetKinds = new Map([
  ['src/generated', 'directory'],
  ['llms.txt', 'file'],
  ['docs/generated', 'directory'],
  ['docs/llms.txt', 'file'],
  ['examples/generated', 'directory'],
  ['tests/generated', 'directory'],
  ['openapi/generated', 'directory'],
]);

export async function orchestrateGeneration(options = {}) {
  const projectRoot = resolve(options.projectRoot ?? repositoryRoot);
  const temporaryRoot = resolve(options.temporaryRoot ?? tmpdir());
  const dependencies = options.dependencies ?? {};
  const stageSnapshot = dependencies.stageOpenApiSnapshot ?? stageOpenApiSnapshot;
  const applyCorrections =
    dependencies.applySpecificationCorrections ?? applySpecificationCorrections;
  const normalizeDocument = dependencies.normalizeOpenApiDocument ?? normalizeOpenApiDocument;
  const materializePath = dependencies.materializePath ?? copyPath;
  const replacePath = dependencies.replacePath ?? renamePath;
  const transaction = [];
  let stagedSnapshot;
  let workspace;
  let result;
  let failure;

  try {
    workspace = await mkdtemp(join(temporaryRoot, 'esi-client-generate-'));
    stagedSnapshot = await stageSnapshot({
      ...options.openapi,
      temporaryRoot: workspace,
    });
    const corrected = await applyCorrections(
      stagedSnapshot.document,
      stagedSnapshot.compatibilityDate,
      options.corrections,
    );
    const normalizedModel = await normalizeDocument(corrected.document, options.normalization);
    const outputDirectory = join(workspace, 'outputs');
    await mkdir(outputDirectory, { recursive: true });

    const snapshot = serializeJson(corrected.document);
    const sha256 = createHash('sha256').update(snapshot).digest('hex');
    const facadeCatalogPath = resolve(
      options.operationMetadata?.facadeCatalogPath ?? defaultFacadeCatalogPath,
    );
    const [facadeCatalogSource, facadeCatalog, operationMetadata] = await Promise.all([
      readFile(facadeCatalogPath, 'utf8'),
      loadFacadeCatalog(normalizedModel, facadeCatalogPath),
      resolveOperationMetadata(normalizedModel, options.operationMetadata),
    ]);
    const provenanceWithoutReport = Object.freeze({
      appliedCorrections: corrected.appliedCorrections,
      compatibilityDate: stagedSnapshot.compatibilityDate,
      facadeCatalog: {
        path: relative(projectRoot, facadeCatalogPath).replaceAll('\\', '/'),
        sha256: hash(facadeCatalogSource),
      },
      sha256,
      sourceSha256: stagedSnapshot.sha256,
      specificationUrl: options.openapi?.specificationUrl ?? defaultSpecificationUrl,
    });
    const namingReviewReport = renderNamingReviewReport(
      normalizedModel,
      facadeCatalog,
      provenanceWithoutReport,
    );
    const provenance = Object.freeze({
      ...provenanceWithoutReport,
      facadeReviewReport: {
        path: namingReviewReportPath,
        sha256: hash(namingReviewReport),
      },
    });
    const accountingReport = createOperationAccountingReport(normalizedModel, operationMetadata);
    await writeOpenApiOutput(
      outputDirectory,
      snapshot,
      normalizedModel,
      provenance,
      accountingReport,
    );

    const outputPath = (target) => {
      if (!generatedTargetKinds.has(target)) {
        throw new Error(`Emitter requested unexpected generated target: ${target}`);
      }
      return join(outputDirectory, target);
    };
    const context = Object.freeze({
      compatibilityDate: stagedSnapshot.compatibilityDate,
      correctedDocument: corrected.document,
      normalizedModel,
      namingReviewReport,
      operationMetadata,
      outputDirectory,
      outputPath,
      provenance,
    });
    const claims = [
      { emitter: 'openapi-snapshot', kind: 'directory', target: 'openapi/generated' },
    ];
    const emitterNames = new Set();
    for (const emitter of options.emitters ?? []) {
      if (
        emitter === null ||
        typeof emitter !== 'object' ||
        typeof emitter.name !== 'string' ||
        emitter.name.length === 0 ||
        typeof emitter.emit !== 'function'
      ) {
        throw new Error('Invalid generated output emitter');
      }
      if (emitterNames.has(emitter.name)) {
        throw new Error(`Duplicate emitter name: ${emitter.name}`);
      }
      emitterNames.add(emitter.name);
      const emittedClaims = await emitter.emit(context);
      if (!Array.isArray(emittedClaims)) {
        throw new Error(`Emitter ${emitter.name} did not return output claims`);
      }
      for (const claim of emittedClaims) claims.push({ ...claim, emitter: emitter.name });
    }

    await validateClaims(claims, outputDirectory);
    await materializeIncomingPaths(outputDirectory, projectRoot, transaction, materializePath);
    await replaceGeneratedPaths(transaction, replacePath);
    result = Object.freeze({
      compatibilityDate: stagedSnapshot.compatibilityDate,
      replacedTargets: generatedReplacementTargets,
      sha256,
    });
  } catch (error) {
    failure = error;
  }

  const cleanupFailures = [];
  try {
    await cleanupTransactionPaths(transaction);
  } catch (error) {
    cleanupFailures.push(error);
  }
  if (stagedSnapshot) {
    try {
      await stagedSnapshot.cleanup();
    } catch (error) {
      cleanupFailures.push(error);
    }
  }
  if (workspace) {
    try {
      await rm(workspace, { force: true, recursive: true });
    } catch (error) {
      cleanupFailures.push(error);
    }
  }

  if (failure && cleanupFailures.length > 0) {
    throw new AggregateError([failure, ...cleanupFailures], 'Generation and cleanup failed');
  }
  if (failure) throw failure;
  if (cleanupFailures.length > 0) {
    throw new AggregateError(cleanupFailures, 'Generation cleanup failed');
  }
  return result;
}

async function writeOpenApiOutput(
  outputDirectory,
  snapshot,
  normalizedModel,
  provenance,
  accountingReport,
) {
  const directory = join(outputDirectory, 'openapi/generated');
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(join(directory, 'esi-openapi.json'), snapshot),
    writeFile(join(directory, 'normalized-model.json'), serializeJson(normalizedModel)),
    writeFile(
      join(directory, 'operation-accounting.json'),
      renderGeneratedJson(accountingReport, provenance),
    ),
    writeFile(join(directory, 'provenance.json'), serializeJson(provenance)),
  ]);
}

async function validateClaims(claims, outputDirectory) {
  const claimedTargets = new Set();
  for (const claim of claims) {
    if (
      claim === null ||
      typeof claim !== 'object' ||
      typeof claim.target !== 'string' ||
      (claim.kind !== 'file' && claim.kind !== 'directory')
    ) {
      throw new Error(`Emitter ${claim?.emitter ?? 'unknown'} returned an invalid output claim`);
    }
    const expectedKind = generatedTargetKinds.get(claim.target);
    if (expectedKind === undefined) {
      throw new Error(
        `Emitter ${claim.emitter} claimed unexpected generated target: ${claim.target}`,
      );
    }
    if (claimedTargets.has(claim.target)) {
      throw new Error(`Duplicate generated output claim: ${claim.target}`);
    }
    if (claim.kind !== expectedKind) {
      throw new Error(
        `Generated output ${claim.target} must be a ${expectedKind}, not a ${claim.kind}`,
      );
    }
    claimedTargets.add(claim.target);

    let status;
    try {
      status = await lstat(join(outputDirectory, claim.target));
    } catch (error) {
      if (error?.code === 'ENOENT') {
        throw new Error(`Claimed generated output is missing: ${claim.target}`, { cause: error });
      }
      throw error;
    }
    if (status.isSymbolicLink()) {
      throw new Error(`Generated output must not be a symbolic link: ${claim.target}`);
    }
    if (
      (expectedKind === 'file' && !status.isFile()) ||
      (expectedKind === 'directory' && !status.isDirectory())
    ) {
      throw new Error(`Generated output has the wrong filesystem type: ${claim.target}`);
    }
  }

  const missing = generatedReplacementTargets.filter((target) => !claimedTargets.has(target));
  if (missing.length > 0) {
    throw new Error(`Missing generated output claims: ${missing.join(', ')}`);
  }
}

async function materializeIncomingPaths(
  outputDirectory,
  projectRoot,
  transaction,
  materializePath,
) {
  const transactionId = randomUUID();
  for (const target of generatedReplacementTargets) {
    const livePath = resolve(projectRoot, target);
    const parent = dirname(livePath);
    const name = basename(livePath);
    const entry = {
      backupPath: join(parent, `.${name}.esi-client-backup-${transactionId}`),
      backedUp: false,
      incomingPath: join(parent, `.${name}.esi-client-incoming-${transactionId}`),
      installed: false,
      livePath,
    };
    transaction.push(entry);
    await mkdir(parent, { recursive: true });
    await materializePath(join(outputDirectory, target), entry.incomingPath);
  }
}

async function replaceGeneratedPaths(transaction, replacePath) {
  try {
    for (const entry of transaction) {
      if (await pathExists(entry.livePath)) {
        await replacePath(entry.livePath, entry.backupPath, 'backup');
        entry.backedUp = true;
      }
      await replacePath(entry.incomingPath, entry.livePath, 'install');
      entry.installed = true;
    }
  } catch (error) {
    const rollbackFailures = await rollbackGeneratedPaths(transaction, replacePath);
    if (rollbackFailures.length > 0) {
      throw new AggregateError([error, ...rollbackFailures], 'Replacement and rollback failed', {
        cause: error,
      });
    }
    throw error;
  }

  for (const entry of transaction) {
    if (!entry.backedUp) continue;
    await rm(entry.backupPath, { force: true, recursive: true });
    entry.backedUp = false;
  }
}

async function rollbackGeneratedPaths(transaction, replacePath) {
  const failures = [];
  for (const entry of transaction.toReversed()) {
    try {
      if (entry.installed) {
        await rm(entry.livePath, { force: true, recursive: true });
        entry.installed = false;
      }
      if (entry.backedUp) {
        await replacePath(entry.backupPath, entry.livePath, 'restore');
        entry.backedUp = false;
      }
    } catch (error) {
      failures.push(error);
    }
  }
  return failures;
}

async function cleanupTransactionPaths(transaction) {
  for (const entry of transaction) {
    await rm(entry.incomingPath, { force: true, recursive: true });
    if (!entry.backedUp) await rm(entry.backupPath, { force: true, recursive: true });
  }
}

async function copyPath(source, destination) {
  await cp(source, destination, { errorOnExist: true, force: false, recursive: true });
}

async function renamePath(source, destination) {
  await rename(source, destination);
}

async function pathExists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

function serializeJson(value) {
  return `${JSON.stringify(sortJsonValue(value), null, 2)}\n`;
}

function hash(value) {
  return createHash('sha256').update(value).digest('hex');
}

function sortJsonValue(value) {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .toSorted(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, entry]) => [key, sortJsonValue(entry)]),
  );
}
