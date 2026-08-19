import { createHash } from 'node:crypto';
import { mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { validate } from '@scalar/openapi-parser';

export const defaultSpecificationUrl = 'https://esi.evetech.net/meta/openapi.json';
export const pinnedCompatibilityDatePath = fileURLToPath(
  new URL('../../openapi/compatibility-date.txt', import.meta.url),
);

const compatibilityDatePattern = /^\d{4}-\d{2}-\d{2}$/;

export async function resolveCompatibilityDate(options = {}) {
  const {
    requestedDate,
    environment = process.env,
    pinnedDatePath = pinnedCompatibilityDatePath,
  } = options;
  const pinnedDate = requestedDate ?? environment.ESI_COMPATIBILITY_DATE;
  const compatibilityDate = (pinnedDate ?? (await readFile(pinnedDatePath, 'utf8'))).trim();

  if (!compatibilityDatePattern.test(compatibilityDate)) {
    throw new Error(`Invalid ESI compatibility date: ${compatibilityDate}`);
  }
  const parsedDate = new Date(`${compatibilityDate}T00:00:00.000Z`);
  if (
    Number.isNaN(parsedDate.valueOf()) ||
    parsedDate.toISOString().slice(0, 10) !== compatibilityDate
  ) {
    throw new Error(`Invalid ESI compatibility date: ${compatibilityDate}`);
  }
  return compatibilityDate;
}

export async function stageOpenApiSnapshot(options = {}) {
  const {
    fetchImplementation = globalThis.fetch,
    specificationUrl = defaultSpecificationUrl,
    temporaryRoot = tmpdir(),
  } = options;
  const compatibilityDate = await resolveCompatibilityDate(options);
  const stageDirectory = await mkdtemp(join(temporaryRoot, 'esi-client-openapi-'));

  try {
    const response = await fetchImplementation(specificationUrl, {
      headers: {
        accept: 'application/json',
        'x-compatibility-date': compatibilityDate,
      },
      signal: options.signal,
    });
    if (!response.ok) {
      throw new Error(`Failed to retrieve ESI OpenAPI specification: HTTP ${response.status}`);
    }

    const source = await response.text();
    let document;
    try {
      document = JSON.parse(source);
    } catch (error) {
      throw new Error('Failed to parse ESI OpenAPI specification as JSON', { cause: error });
    }

    const validation = await validate(document);
    if (!validation.valid) {
      const details = validation.errors.map(({ message, path }) => {
        const location = path?.length ? ` at ${path.join('.')}` : '';
        return `${message}${location}`;
      });
      throw new Error(`Invalid ESI OpenAPI specification: ${details.join('; ')}`);
    }
    if (!String(document.openapi).startsWith('3.1.')) {
      throw new Error(
        `Expected an OpenAPI 3.1 specification, received ${document.openapi ?? 'unknown'}`,
      );
    }

    const normalizedDocument = sortJsonValue(document);
    const snapshot = `${JSON.stringify(normalizedDocument, null, 2)}\n`;
    const sha256 = createHash('sha256').update(snapshot).digest('hex');
    const provenance = `${JSON.stringify(
      {
        compatibilityDate,
        specificationUrl,
        sha256,
      },
      null,
      2,
    )}\n`;
    const snapshotPath = join(stageDirectory, 'esi-openapi.json');
    const provenancePath = join(stageDirectory, 'provenance.json');
    await writeFile(snapshotPath, snapshot);
    await writeFile(provenancePath, provenance);

    return Object.freeze({
      compatibilityDate,
      directory: stageDirectory,
      document: normalizedDocument,
      provenancePath,
      sha256,
      snapshotPath,
      async cleanup() {
        await rm(stageDirectory, { force: true, recursive: true });
      },
    });
  } catch (error) {
    await rm(stageDirectory, { force: true, recursive: true });
    throw error;
  }
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
