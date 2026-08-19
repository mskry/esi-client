import { createHash } from 'node:crypto';
import { lstat, mkdir, mkdtemp, readFile, readdir, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { pathToFileURL } from 'node:url';

import { createOperationAccountingReport, renderGeneratedJson } from './artifacts.mjs';
import { generatedDocumentationEmitter } from './documentation-emitter.mjs';
import { generatedExamplesEmitter } from './examples-emitter.mjs';
import { namingReviewReportPath, renderNamingReviewReport } from './naming-review.mjs';
import { normalizeOpenApiDocument } from './normalize.mjs';
import { loadFacadeCatalog, resolveOperationMetadata } from './operation-metadata.mjs';
import { generatedPaths, repositoryRoot } from './paths.mjs';
import { generatedSourceEmitter } from './source-emitter.mjs';
import { generatedTestsEmitter } from './test-emitter.mjs';

export const generationCheckTargets = Object.freeze([
  ...generatedPaths.source,
  ...generatedPaths.documentation,
  ...generatedPaths.examples,
  ...generatedPaths.tests,
  ...generatedPaths.openapi,
]);

export async function checkGeneratedOutputs(root = repositoryRoot) {
  const projectRoot = resolve(root);
  const workspace = await mkdtemp(join(tmpdir(), 'esi-client-generate-check-'));

  try {
    const generatedDirectory = join(projectRoot, 'openapi/generated');
    const facadeCatalogPath = join(projectRoot, 'openapi/config/naming-overrides.json');
    const [snapshotSource, provenance, compatibilityDate, facadeCatalogSource] = await Promise.all([
      readFile(join(generatedDirectory, 'esi-openapi.json'), 'utf8'),
      readFile(join(generatedDirectory, 'provenance.json'), 'utf8').then(JSON.parse),
      readFile(join(projectRoot, 'openapi/compatibility-date.txt'), 'utf8').then((value) =>
        value.trim(),
      ),
      readFile(facadeCatalogPath, 'utf8'),
    ]);
    const correctedDocument = JSON.parse(snapshotSource);
    const canonicalSnapshot = serializeJson(correctedDocument);
    assertCommittedSnapshotProvenance(provenance, compatibilityDate, canonicalSnapshot);

    const normalizedModel = await normalizeOpenApiDocument(correctedDocument, {
      exclusionsPath: join(projectRoot, 'openapi/config/exclusions.json'),
    });
    const [facadeCatalog, operationMetadata] = await Promise.all([
      loadFacadeCatalog(normalizedModel, facadeCatalogPath),
      resolveOperationMetadata(normalizedModel, {
        facadeCatalogPath,
        safetyOverridesPath: join(projectRoot, 'openapi/config/safety-overrides.json'),
      }),
    ]);
    const namingReviewReport = renderNamingReviewReport(normalizedModel, facadeCatalog, provenance);
    assertNamingProvenance(provenance, facadeCatalogSource, namingReviewReport);
    const context = Object.freeze({
      compatibilityDate,
      correctedDocument,
      normalizedModel,
      namingReviewReport,
      operationMetadata,
      outputDirectory: workspace,
      outputPath: (target) => join(workspace, target),
      provenance,
    });

    for (const emitter of [
      generatedSourceEmitter,
      generatedDocumentationEmitter,
      generatedExamplesEmitter,
      generatedTestsEmitter,
    ]) {
      await emitter.emit(context);
    }
    await writeOpenApiOutputs(
      workspace,
      canonicalSnapshot,
      normalizedModel,
      operationMetadata,
      provenance,
    );

    const result = await compareGeneratedOutputs(workspace, projectRoot, generationCheckTargets);
    return { ...result, compatibilityDate, sha256: provenance.sha256 };
  } finally {
    await rm(workspace, { force: true, recursive: true });
  }
}

export async function compareGeneratedOutputs(stagedRoot, projectRoot, targets) {
  const checkedTargets = targets ?? generationCheckTargets;
  const [staged, committed] = await Promise.all([
    snapshotPaths(resolve(stagedRoot), checkedTargets),
    snapshotPaths(resolve(projectRoot), checkedTargets),
  ]);
  const allPaths = new Set([...staged.keys(), ...committed.keys()]);
  const drift = [];

  for (const path of [...allPaths].toSorted(compareText)) {
    const stagedEntry = staged.get(path);
    const committedEntry = committed.get(path);
    if (stagedEntry === undefined) drift.push(`unexpected committed path ${path}`);
    else if (committedEntry === undefined) drift.push(`missing committed path ${path}`);
    else if (stagedEntry.kind !== committedEntry.kind) drift.push(`path kind changed ${path}`);
    else if (stagedEntry.content !== committedEntry.content) drift.push(`content changed ${path}`);
  }

  if (drift.length > 0) {
    throw new Error(
      `Generated output is stale; run pnpm generate and review the result:\n${drift
        .map((entry) => `- ${entry}`)
        .join('\n')}`,
    );
  }
  return { fileCount: [...staged.values()].filter(({ kind }) => kind === 'file').length };
}

async function writeOpenApiOutputs(
  outputDirectory,
  snapshot,
  normalizedModel,
  operationMetadata,
  provenance,
) {
  const directory = join(outputDirectory, 'openapi/generated');
  const accounting = createOperationAccountingReport(normalizedModel, operationMetadata);
  await mkdir(directory, { recursive: true });
  await Promise.all([
    writeFile(join(directory, 'esi-openapi.json'), snapshot),
    writeFile(join(directory, 'normalized-model.json'), serializeJson(normalizedModel)),
    writeFile(
      join(directory, 'operation-accounting.json'),
      renderGeneratedJson(accounting, provenance),
    ),
    writeFile(join(directory, 'provenance.json'), serializeJson(provenance)),
  ]);
}

function assertCommittedSnapshotProvenance(provenance, compatibilityDate, snapshot) {
  const sha256 = createHash('sha256').update(snapshot).digest('hex');
  if (
    provenance === null ||
    typeof provenance !== 'object' ||
    provenance.compatibilityDate !== compatibilityDate ||
    provenance.sha256 !== sha256 ||
    !Array.isArray(provenance.appliedCorrections) ||
    typeof provenance.sourceSha256 !== 'string' ||
    typeof provenance.specificationUrl !== 'string'
  ) {
    throw new Error('Committed OpenAPI snapshot and provenance are inconsistent');
  }
}

function assertNamingProvenance(provenance, facadeCatalogSource, namingReviewReport) {
  if (
    provenance.facadeCatalog?.path !== 'openapi/config/naming-overrides.json' ||
    provenance.facadeCatalog?.sha256 !== hashText(facadeCatalogSource) ||
    provenance.facadeReviewReport?.path !== namingReviewReportPath ||
    provenance.facadeReviewReport?.sha256 !== hashText(namingReviewReport)
  ) {
    throw new Error(
      'Committed facade catalog, naming review report, and provenance are inconsistent',
    );
  }
}

function hashText(value) {
  return createHash('sha256').update(value).digest('hex');
}

async function snapshotPaths(root, targets) {
  const snapshot = new Map();
  for (const target of targets) await snapshotPath(root, target, snapshot);
  return snapshot;
}

async function snapshotPath(root, repositoryPath, snapshot) {
  const path = join(root, repositoryPath);
  let status;
  try {
    status = await lstat(path);
  } catch (error) {
    if (error?.code === 'ENOENT') return;
    throw error;
  }
  if (status.isSymbolicLink()) {
    throw new Error(`Generated output must not contain symbolic links: ${repositoryPath}`);
  }
  if (status.isFile()) {
    snapshot.set(repositoryPath, { kind: 'file', content: await readFile(path, 'base64') });
    return;
  }
  if (!status.isDirectory()) {
    throw new Error(`Generated output must be a file or directory: ${repositoryPath}`);
  }

  snapshot.set(repositoryPath, { kind: 'directory', content: '' });
  const entries = await readdir(path, { withFileTypes: true });
  for (const entry of entries.toSorted((left, right) => compareText(left.name, right.name))) {
    await snapshotPath(root, `${repositoryPath}/${entry.name}`, snapshot);
  }
}

function serializeJson(value) {
  return `${JSON.stringify(sortJsonValue(value), null, 2)}\n`;
}

function sortJsonValue(value) {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    Object.entries(value)
      .toSorted(([left], [right]) => compareText(left, right))
      .map(([key, entry]) => [key, sortJsonValue(entry)]),
  );
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

const entryPath = process.argv[1];
if (entryPath !== undefined && import.meta.url === pathToFileURL(resolve(entryPath)).href) {
  const result = await checkGeneratedOutputs();
  process.stdout.write(
    `Generated output is current: ${result.fileCount} files for ESI ${result.compatibilityDate} (${result.sha256}).\n`,
  );
}
