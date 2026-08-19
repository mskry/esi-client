import { readdir, readFile } from 'node:fs/promises';
import { join, posix, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { domainFileName } from './generate/domain-client.mjs';
import { resolveOperationMetadata } from './generate/operation-metadata.mjs';

const defaultRoot = fileURLToPath(new URL('../', import.meta.url));
const expectedOperationCount = 233;
const expectedDomainCount = 39;

export async function inspectDocumentationConsistency(root = defaultRoot) {
  const projectRoot = resolve(root);
  const [model, provenance, generatedDocuments, generatedExamples, repositoryLlms, siteLlms] =
    await Promise.all([
      readJson(join(projectRoot, 'openapi/generated/normalized-model.json')),
      readJson(join(projectRoot, 'openapi/generated/provenance.json')),
      readFiles(join(projectRoot, 'docs/generated'), 'docs/generated'),
      readFiles(join(projectRoot, 'examples/generated'), 'examples/generated'),
      readFile(join(projectRoot, 'llms.txt'), 'utf8'),
      readFile(join(projectRoot, 'docs/llms.txt'), 'utf8'),
    ]);

  if (!Array.isArray(model?.operations)) {
    throw new Error('Invalid normalized operation model for documentation validation');
  }
  if (typeof provenance?.compatibilityDate !== 'string' || typeof provenance?.sha256 !== 'string') {
    throw new Error('Invalid OpenAPI provenance for documentation validation');
  }

  const operationMetadata = await resolveOperationMetadata(model);
  const documents = new Map([
    ['llms.txt', repositoryLlms],
    ['docs/llms.txt', siteLlms],
    ...generatedDocuments,
  ]);
  const domainPaths = new Set(
    operationMetadata.map(({ domain }) => `docs/generated/domains/${domainFileName(domain)}.md`),
  );

  return {
    documents,
    domainPaths: [...domainPaths].toSorted(compareText),
    examples: generatedExamples,
    operationIds: model.operations.map(({ operationId }) => operationId),
    provenance: {
      compatibilityDate: provenance.compatibilityDate,
      sha256: provenance.sha256,
    },
  };
}

export function validateDocumentationConsistency(inspection) {
  const { documents, domainPaths, examples, operationIds, provenance } = inspection;
  if (
    !(documents instanceof Map) ||
    !(examples instanceof Map) ||
    !Array.isArray(domainPaths) ||
    !Array.isArray(operationIds)
  ) {
    throw new TypeError('Invalid documentation consistency inspection');
  }

  const uniqueOperationIds = new Set(operationIds);
  if (
    operationIds.length !== expectedOperationCount ||
    uniqueOperationIds.size !== operationIds.length
  ) {
    throw new Error(
      `Documentation operation model must contain exactly ${expectedOperationCount} unique operations; found ${operationIds.length}/${uniqueOperationIds.size}`,
    );
  }
  const uniqueDomainPaths = new Set(domainPaths);
  if (domainPaths.length !== expectedDomainCount || uniqueDomainPaths.size !== domainPaths.length) {
    throw new Error(
      `Documentation model must contain exactly ${expectedDomainCount} unique domains; found ${domainPaths.length}/${uniqueDomainPaths.size}`,
    );
  }

  const expectedOperationPaths = [...uniqueOperationIds]
    .map((operationId) => `docs/generated/operations/${operationId}.md`)
    .toSorted(compareText);
  const actualOperationPaths = pathsUnder(documents, 'docs/generated/operations/');
  assertExactPaths('operation references', actualOperationPaths, expectedOperationPaths);
  assertExactPaths(
    'domain indexes',
    pathsUnder(documents, 'docs/generated/domains/'),
    [...uniqueDomainPaths].toSorted(compareText),
  );

  for (const operationId of uniqueOperationIds) {
    const path = `docs/generated/operations/${operationId}.md`;
    const content = documents.get(path);
    if (content === undefined) throw new Error(`Missing operation reference: ${operationId}`);
    assertSingleOccurrence(
      content,
      `Stable ID: \`${operationId}\``,
      `${operationId} stable reference`,
    );
    assertSingleOccurrence(
      content,
      '## Standalone domain-factory snippet',
      `${operationId} standalone domain snippet`,
    );
    assertSingleOccurrence(
      content,
      '## Aggregate EsiClient snippet',
      `${operationId} aggregate domain snippet`,
    );
    assertSingleOccurrence(
      content,
      '## Generic-execution snippet',
      `${operationId} generic snippet`,
    );
    assertSingleOccurrence(
      content,
      `client.callOperation("${operationId}"`,
      `${operationId} generic operation call`,
    );
  }

  const artifacts = new Map([...documents, ...examples]);
  for (const [path, content] of artifacts) {
    assertProvenance(path, content, provenance);
    assertCredentialSafe(path, content);
  }
  validateLinks(documents);

  return {
    documentCount: documents.size,
    domainCount: uniqueDomainPaths.size,
    exampleCount: examples.size,
    operationCount: uniqueOperationIds.size,
  };
}

export async function checkDocumentationConsistency(root = defaultRoot) {
  return validateDocumentationConsistency(await inspectDocumentationConsistency(root));
}

function validateLinks(documents) {
  for (const [sourcePath, content] of documents) {
    for (const match of content.matchAll(/!?\[[^\]]*\]\(([^)]+)\)/gu)) {
      const rawTarget = match[1]?.trim();
      if (rawTarget === undefined || rawTarget === '') {
        throw new Error(`Empty documentation link in ${sourcePath}`);
      }
      if (/^[A-Za-z][A-Za-z0-9+.-]*:/u.test(rawTarget) || rawTarget.startsWith('//')) {
        throw new Error(
          `Documentation link must be repository-relative: ${sourcePath} -> ${rawTarget}`,
        );
      }
      const pathTarget = rawTarget.split(/[?#]/u, 1)[0];
      if (pathTarget === undefined || pathTarget === '') continue;

      let decodedTarget;
      try {
        decodedTarget = decodeURIComponent(pathTarget);
      } catch (error) {
        throw new Error(`Invalid encoded documentation link: ${sourcePath} -> ${rawTarget}`, {
          cause: error,
        });
      }
      if (decodedTarget.includes('\\')) {
        throw new Error(
          `Documentation link contains an invalid separator: ${sourcePath} -> ${rawTarget}`,
        );
      }
      const resolvedTarget = posix.normalize(
        decodedTarget.startsWith('/')
          ? decodedTarget.slice(1)
          : posix.join(posix.dirname(sourcePath), decodedTarget),
      );
      if (
        resolvedTarget === '..' ||
        resolvedTarget.startsWith('../') ||
        posix.isAbsolute(resolvedTarget)
      ) {
        throw new Error(`Documentation link escapes the repository: ${sourcePath} -> ${rawTarget}`);
      }
      if (!documents.has(resolvedTarget)) {
        throw new Error(`Documentation link target is missing: ${sourcePath} -> ${rawTarget}`);
      }
    }
  }
}

function assertProvenance(path, content, provenance) {
  const dates = [...content.matchAll(/Compatibility date: (\d{4}-\d{2}-\d{2})\./gu)].map(
    (match) => match[1],
  );
  const hashes = [...content.matchAll(/Specification SHA-256: ([a-f0-9]{64})\./gu)].map(
    (match) => match[1],
  );
  if (
    dates.length !== 1 ||
    dates[0] !== provenance.compatibilityDate ||
    hashes.length !== 1 ||
    hashes[0] !== provenance.sha256
  ) {
    throw new Error(
      `Generated artifact provenance does not match openapi/generated/provenance: ${path}`,
    );
  }
}

function assertCredentialSafe(path, content) {
  const forbiddenPatterns = [
    /-----BEGIN [A-Z ]*PRIVATE KEY-----/u,
    /\bBearer\s+[^\s"'`<>)]+/iu,
    /\beyJ[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\.[A-Za-z0-9_-]{8,}\b/u,
    /\b(?:access[_-]?token|token|authorization|client[_-]?secret)\b\s*[:=]\s*["'`][^"'`\r\n]+["'`]/iu,
    /console\.[A-Za-z]+\([^\r\n)]*\b(?:accessToken|token|authorization)\b/iu,
  ];
  if (forbiddenPatterns.some((pattern) => pattern.test(content))) {
    throw new Error(`Generated artifact contains a credential or authorization value: ${path}`);
  }

  const credentialAssignments = content.matchAll(
    /\b(accessToken|token|authorization)\b\s*[:=]\s*([^,;}\r\n]+)/giu,
  );
  const allowedPlaceholders = new Set([
    'accessToken',
    'process.env.ESI_ACCESS_TOKEN',
    'requiredAccessToken()',
  ]);
  for (const match of credentialAssignments) {
    const value = match[2]?.trim();
    if (value === undefined || !allowedPlaceholders.has(value)) {
      throw new Error(`Generated artifact contains a credential or authorization value: ${path}`);
    }
  }
}

function assertExactPaths(label, actual, expected) {
  if (sameStrings(actual, expected)) return;
  const actualSet = new Set(actual);
  const expectedSet = new Set(expected);
  const missing = expected.filter((path) => !actualSet.has(path));
  const unexpected = actual.filter((path) => !expectedSet.has(path));
  throw new Error(
    `Generated documentation ${label} are inconsistent (expected ${expected.length}, found ${actual.length}; missing: ${formatList(missing)}; unexpected: ${formatList(unexpected)})`,
  );
}

function assertSingleOccurrence(content, text, label) {
  const count = content.split(text).length - 1;
  if (count !== 1)
    throw new Error(`Generated documentation must contain exactly one ${label}; found ${count}`);
}

function pathsUnder(files, prefix) {
  return [...files.keys()].filter((path) => path.startsWith(prefix)).toSorted(compareText);
}

async function readFiles(directory, repositoryPrefix) {
  const files = new Map();
  await collectFiles(directory, repositoryPrefix, files);
  return files;
}

async function collectFiles(directory, repositoryPath, files) {
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries.toSorted((left, right) => compareText(left.name, right.name))) {
    const path = join(directory, entry.name);
    const relativePath = `${repositoryPath}/${entry.name}`.replaceAll('\\', '/');
    if (entry.isDirectory()) {
      await collectFiles(path, relativePath, files);
    } else if (entry.isFile()) {
      files.set(relativePath, await readFile(path, 'utf8'));
    } else {
      throw new Error(`Generated documentation artifact must be a regular file: ${relativePath}`);
    }
  }
}

async function readJson(path) {
  return JSON.parse(await readFile(path, 'utf8'));
}

function sameStrings(left, right) {
  return left.length === right.length && left.every((value, index) => value === right[index]);
}

function formatList(values) {
  return values.length === 0 ? '(none)' : values.join(', ');
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

const entryPath = process.argv[1];
if (entryPath !== undefined && import.meta.url === pathToFileURL(resolve(entryPath)).href) {
  const result = await checkDocumentationConsistency();
  process.stdout.write(
    `Documentation consistency validated: ${result.operationCount} operations, ${result.domainCount} domains, ${result.exampleCount} examples.\n`,
  );
}
