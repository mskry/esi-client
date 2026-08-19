import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  compareSpecificationDrift,
  renderSpecificationDriftReport,
  reportSpecificationDrift,
} from '../scripts/drift-report.mjs';
import { normalizeOpenApiDocument } from '../scripts/generate/normalize.mjs';
import { makeTemporaryDirectory } from './helpers/temporary-directory.js';

describe('specification drift comparison', () => {
  it('reports every contract change category with deterministic sorted arrays', async () => {
    const pinnedDocument = driftDocument('pinned');
    const latestDocument = driftDocument('latest');
    const pinnedModel = await normalizeOpenApiDocument(pinnedDocument);
    const latestModel = await normalizeOpenApiDocument(latestDocument);
    const input = driftInput(pinnedDocument, pinnedModel, latestDocument, latestModel);

    const report = compareSpecificationDrift(input);
    const changed = report.changes.operations.changed.find(
      ({ operationId }) => operationId === 'change_item',
    );

    expect(report.changes.operations.added.map(({ operationId }) => operationId)).toEqual([
      'a_added',
      'z_added',
    ]);
    expect(report.changes.operations.removed.map(({ operationId }) => operationId)).toEqual([
      'a_removed',
      'z_removed',
    ]);
    expect(changed?.categories).toEqual([
      'authentication',
      'cache',
      'method',
      'pagination',
      'parameters',
      'path',
      'requestBody',
      'responses',
    ]);
    expect(changed?.parameters).toMatchObject({
      added: [
        { name: 'add_me', placement: 'header' },
        { name: 'cursor', placement: 'query' },
      ],
      removed: [
        { name: 'page', placement: 'query' },
        { name: 'remove_me', placement: 'header' },
      ],
      changed: [
        {
          name: 'item_id',
          changes: ['placement', 'required', 'schema'],
        },
      ],
    });
    expect(changed?.responses).toMatchObject({
      added: [{ status: '201' }],
      removed: [{ status: '204' }],
      changed: [
        {
          status: '200',
          categories: ['fields', 'shape'],
          content: {
            changed: [
              {
                mediaType: 'application/json',
                fields: {
                  added: [{ path: '/added' }],
                  removed: [{ path: '/removed' }],
                  changed: [{ path: '/id', changes: ['required', 'schema'] }],
                },
              },
            ],
          },
        },
        { status: '202', categories: ['noContent', 'shape'] },
      ],
    });
    expect(report.changes.componentSchemas).toMatchObject({
      added: [{ name: 'AddedModel' }],
      removed: [{ name: 'RemovedModel' }],
      changed: [
        {
          name: 'Item',
          fields: {
            added: [{ path: '/added' }],
            removed: [{ path: '/removed' }],
            changed: [{ path: '/id', changes: ['required', 'schema'] }],
          },
        },
      ],
    });
    expect(report.changes.authenticationSchemes).toMatchObject({
      added: [{ name: 'ApiKey' }],
      removed: [{ name: 'Legacy' }],
      changed: [
        {
          name: 'OAuth',
          scopes: {
            added: [{ name: 'scope.write' }],
            removed: [{ name: 'scope.old' }],
            changed: [{ name: 'scope.read' }],
          },
        },
      ],
    });
    expect(report.summary).toMatchObject({
      hasChanges: true,
      operationsAdded: 2,
      operationsRemoved: 2,
      operationsChanged: 1,
      parametersAdded: 2,
      parametersRemoved: 2,
      parametersChanged: 1,
      responsesAdded: 1,
      responsesRemoved: 1,
      responsesChanged: 2,
      paginationChanged: 1,
      cacheChanged: 1,
      authenticationChanged: 1,
    });

    const reorderedInput = {
      pinned: { ...input.pinned, model: reverseModelCollections(input.pinned.model) },
      latest: { ...input.latest, model: reverseModelCollections(input.latest.model) },
    };
    expect(renderSpecificationDriftReport(compareSpecificationDrift(reorderedInput))).toBe(
      renderSpecificationDriftReport(report),
    );
  });

  it('emits an explicit no-change report', async () => {
    const document = driftDocument('pinned');
    const model = await normalizeOpenApiDocument(document);
    const report = compareSpecificationDrift(driftInput(document, model, document, model));

    expect(report.summary).toMatchObject({ hasChanges: false, totalChanges: 0 });
    expect(report.changes).toEqual({
      authenticationSchemes: { added: [], removed: [], changed: [] },
      componentSchemas: { added: [], removed: [], changed: [] },
      operations: { added: [], removed: [], changed: [] },
    });
    expect(JSON.parse(renderSpecificationDriftReport(report))).toEqual(report);
  });

  it('stages with the latest advertised date and never mutates pinned files', async () => {
    const root = await makeTemporaryDirectory('esi-client-drift-');
    const pinnedDocument = minimalDocument('fixed');
    const latestDocument = minimalDocument('upstream');
    const pinnedModel = await normalizeOpenApiDocument(pinnedDocument);
    const generatedDirectory = join(root, 'openapi/generated');
    const correctionDirectory = join(root, 'openapi/corrections');
    const configDirectory = join(root, 'openapi/config');
    await Promise.all([
      mkdir(generatedDirectory, { recursive: true }),
      mkdir(correctionDirectory, { recursive: true }),
      mkdir(configDirectory, { recursive: true }),
    ]);
    const snapshot = canonicalJson(pinnedDocument);
    const snapshotHash = hash(snapshot);
    const pinnedPaths = {
      snapshot: join(generatedDirectory, 'esi-openapi.json'),
      model: join(generatedDirectory, 'normalized-model.json'),
      provenance: join(generatedDirectory, 'provenance.json'),
    };
    await Promise.all([
      writeFile(pinnedPaths.snapshot, snapshot),
      writeFile(pinnedPaths.model, canonicalJson(pinnedModel)),
      writeFile(
        pinnedPaths.provenance,
        canonicalJson({
          appliedCorrections: ['fix-version'],
          compatibilityDate: '2026-08-18',
          sha256: snapshotHash,
          sourceSha256: 'a'.repeat(64),
          specificationUrl: 'https://example.test/openapi.json',
        }),
      ),
      writeFile(join(root, 'openapi/compatibility-date.txt'), '2026-08-18\n'),
      writeFile(
        join(configDirectory, 'exclusions.json'),
        canonicalJson({ schemaVersion: 1, exclusions: [] }),
      ),
      writeFile(
        join(correctionDirectory, 'manifest.json'),
        canonicalJson({
          schemaVersion: 1,
          corrections: [
            {
              id: 'fix-version',
              patch: 'fix-version.json',
              reason: 'Correct the synthetic upstream version.',
              from: '2026-01-01',
              through: '2026-12-31',
            },
          ],
        }),
      ),
      writeFile(
        join(correctionDirectory, 'fix-version.json'),
        canonicalJson([
          { op: 'test', path: '/info/version', value: 'upstream' },
          { op: 'replace', path: '/info/version', value: 'fixed' },
        ]),
      ),
    ]);
    const before = await readPinnedFiles(pinnedPaths);
    const requests: Array<{ input: string | URL | Request; init?: RequestInit }> = [];
    let output = '';

    const report = await reportSpecificationDrift({
      repositoryRoot: root,
      specificationUrl: 'https://example.test/openapi.json',
      fetchImplementation: async (input, init) => {
        requests.push({ input, init });
        const requestUrl =
          input instanceof Request ? input.url : input instanceof URL ? input.href : input;
        if (requestUrl === 'https://example.test/meta/compatibility-dates') {
          return new Response(
            JSON.stringify({ compatibility_dates: ['invalid', '2026-08-18', '2026-08-19'] }),
          );
        }
        return new Response(JSON.stringify(latestDocument));
      },
      output(serialized) {
        output = serialized;
      },
    });

    expect(requests).toMatchObject([
      {
        input: new URL('https://example.test/meta/compatibility-dates'),
        init: { headers: { accept: 'application/json' } },
      },
      {
        input: 'https://example.test/openapi.json',
        init: { headers: { 'x-compatibility-date': '2026-08-19' } },
      },
    ]);
    expect(report.latest).toMatchObject({
      compatibilityDate: '2026-08-19',
      corrections: {
        applied: true,
        appliedIds: ['fix-version'],
        policy: 'applicable-date-ranges',
      },
    });
    expect(report.summary).toMatchObject({ hasChanges: false, totalChanges: 0 });
    expect(JSON.parse(output)).toEqual(report);
    expect(await readPinnedFiles(pinnedPaths)).toEqual(before);
  });

  it('does not apply corrections outside their compatibility range', async () => {
    const root = await writeMinimalRepository({
      correctionThrough: '2026-08-18',
      pinnedDocument: minimalDocument('fixed'),
    });
    const latestDocument = minimalDocument('upstream');

    const report = await reportSpecificationDrift({
      repositoryRoot: root,
      latestCompatibilityDate: '2026-08-19',
      fetchImplementation: async () => new Response(JSON.stringify(latestDocument)),
    });

    expect(report.latest).toMatchObject({
      corrections: { applied: false, appliedIds: [], policy: 'applicable-date-ranges' },
    });
    expect(report.latest).toMatchObject({ sha256: report.latest.sourceSha256 });
  });

  it('rejects report output paths that could overwrite generated artifacts', async () => {
    await expect(
      reportSpecificationDrift({
        repositoryRoot: '/workspace/project',
        outputPath: '/workspace/project/openapi/generated/drift.json',
      }),
    ).rejects.toThrow('Drift report output cannot overwrite generated path: openapi/generated');
  });
});

function driftDocument(version: 'pinned' | 'latest') {
  const pinned = version === 'pinned';
  const itemSchema = pinned
    ? {
        type: 'object',
        required: ['id'],
        properties: { removed: { type: 'string' }, id: { type: 'integer' } },
      }
    : {
        type: 'object',
        properties: { id: { type: 'string' }, added: { type: 'boolean' } },
      };
  const changedOperation = {
    operationId: 'change_item',
    parameters: pinned
      ? [
          parameter('item_id', 'path', true, { type: 'integer' }),
          parameter('page', 'query', false, { minimum: 1, type: 'integer' }),
          parameter('remove_me', 'header', false, { type: 'string' }),
        ]
      : [
          parameter('item_id', 'query', false, { type: 'string' }),
          parameter('cursor', 'query', false, { type: 'string' }),
          parameter('add_me', 'header', true, { type: 'boolean' }),
        ],
    requestBody: {
      required: pinned,
      content: {
        'application/json': {
          schema: pinned
            ? { type: 'object', required: ['value'], properties: { value: { type: 'string' } } }
            : { type: 'object', properties: { value: { type: 'integer' } } },
        },
      },
    },
    responses: pinned
      ? {
          '200': jsonResponse(itemSchema, {
            'X-Pages': { schema: { type: 'integer' } },
            ETag: { schema: { type: 'string' } },
          }),
          '202': jsonResponse({ type: 'string' }),
          '204': { description: 'No content' },
        }
      : {
          '200': jsonResponse(itemSchema, {
            'X-Next-Cursor': { schema: { type: 'string' } },
            'Last-Modified': { schema: { type: 'string' } },
          }),
          '201': jsonResponse({ type: 'object', properties: { created: { type: 'boolean' } } }),
          '202': { description: 'Accepted without content' },
        },
    security: pinned ? [{ OAuth: ['scope.read'] }] : [{ ApiKey: [], OAuth: ['scope.write'] }],
    ...(pinned ? { 'x-cache-seconds': 60 } : { 'x-cache-minutes': 5 }),
  };

  return {
    openapi: '3.1.0',
    info: { title: 'Drift fixture', version },
    paths: pinned
      ? {
          '/z-removed': { get: noContentOperation('z_removed') },
          '/items/{item_id}': { get: changedOperation },
          '/a-removed': { delete: noContentOperation('a_removed') },
        }
      : {
          '/z-added': { put: noContentOperation('z_added') },
          '/things': { post: changedOperation },
          '/a-added': { get: noContentOperation('a_added') },
        },
    components: {
      schemas: pinned
        ? {
            RemovedModel: { type: 'string' },
            Item: itemSchema,
          }
        : {
            Item: itemSchema,
            AddedModel: { type: 'number' },
          },
      securitySchemes: pinned
        ? {
            Legacy: { type: 'apiKey', in: 'header', name: 'X-Legacy' },
            OAuth: oauthScheme({ 'scope.old': 'Old', 'scope.read': 'Read before' }),
          }
        : {
            OAuth: oauthScheme({ 'scope.write': 'Write', 'scope.read': 'Read after' }),
            ApiKey: { type: 'apiKey', in: 'header', name: 'X-Key' },
          },
    },
  };
}

function oauthScheme(scopes: Record<string, string>) {
  return {
    type: 'oauth2',
    flows: {
      authorizationCode: {
        authorizationUrl: 'https://example.test/authorize',
        tokenUrl: 'https://example.test/token',
        scopes,
      },
    },
  };
}

function parameter(
  name: string,
  placement: 'path' | 'query' | 'header',
  required: boolean,
  schema: object,
) {
  return { name, in: placement, required, schema };
}

function jsonResponse(schema: object, headers: Record<string, object> = {}) {
  return {
    description: 'JSON response',
    headers,
    content: { 'application/json': { schema } },
  };
}

function noContentOperation(operationId: string) {
  return { operationId, responses: { '204': { description: 'No content' } } };
}

function minimalDocument(version: string) {
  return {
    openapi: '3.1.0',
    info: { title: 'Minimal drift fixture', version },
    paths: {},
  };
}

function driftInput(
  pinnedDocument: ReturnType<typeof driftDocument>,
  pinnedModel: Awaited<ReturnType<typeof normalizeOpenApiDocument>>,
  latestDocument: ReturnType<typeof driftDocument>,
  latestModel: Awaited<ReturnType<typeof normalizeOpenApiDocument>>,
) {
  return {
    pinned: {
      compatibilityDate: '2026-08-18',
      corrections: ['pinned-fix'],
      document: pinnedDocument,
      model: pinnedModel,
      sha256: '1'.repeat(64),
      sourceSha256: '2'.repeat(64),
      specificationUrl: 'https://example.test/openapi.json',
    },
    latest: {
      compatibilityDate: '2026-08-19',
      corrections: [],
      document: latestDocument,
      model: latestModel,
      sha256: '3'.repeat(64),
      sourceSha256: '3'.repeat(64),
      specificationUrl: 'https://example.test/openapi.json',
    },
  };
}

function reverseModelCollections(model: Awaited<ReturnType<typeof normalizeOpenApiDocument>>) {
  return {
    ...model,
    models: reversed(model.models),
    operations: reversed(model.operations).map((operation) => ({
      ...operation,
      parameters: reversed(operation.parameters),
      successResponses: reversed(operation.successResponses),
    })),
  };
}

async function writeMinimalRepository(options: {
  correctionThrough: string;
  pinnedDocument: ReturnType<typeof minimalDocument>;
}) {
  const root = await makeTemporaryDirectory('esi-client-drift-range-');
  const generatedDirectory = join(root, 'openapi/generated');
  const correctionDirectory = join(root, 'openapi/corrections');
  const configDirectory = join(root, 'openapi/config');
  await Promise.all([
    mkdir(generatedDirectory, { recursive: true }),
    mkdir(correctionDirectory, { recursive: true }),
    mkdir(configDirectory, { recursive: true }),
  ]);
  const model = await normalizeOpenApiDocument(options.pinnedDocument);
  const snapshot = canonicalJson(options.pinnedDocument);
  await Promise.all([
    writeFile(join(generatedDirectory, 'esi-openapi.json'), snapshot),
    writeFile(join(generatedDirectory, 'normalized-model.json'), canonicalJson(model)),
    writeFile(
      join(generatedDirectory, 'provenance.json'),
      canonicalJson({
        appliedCorrections: ['fix-version'],
        compatibilityDate: '2026-08-18',
        sha256: hash(snapshot),
        sourceSha256: 'a'.repeat(64),
        specificationUrl: 'https://esi.evetech.net/meta/openapi.json',
      }),
    ),
    writeFile(join(root, 'openapi/compatibility-date.txt'), '2026-08-18\n'),
    writeFile(
      join(configDirectory, 'exclusions.json'),
      canonicalJson({ schemaVersion: 1, exclusions: [] }),
    ),
    writeFile(
      join(correctionDirectory, 'manifest.json'),
      canonicalJson({
        schemaVersion: 1,
        corrections: [
          {
            id: 'fix-version',
            patch: 'fix-version.json',
            reason: 'Correct synthetic source.',
            from: '2026-01-01',
            through: options.correctionThrough,
          },
        ],
      }),
    ),
    writeFile(
      join(correctionDirectory, 'fix-version.json'),
      canonicalJson([
        { op: 'test', path: '/info/version', value: 'upstream' },
        { op: 'replace', path: '/info/version', value: 'fixed' },
      ]),
    ),
  ]);
  return root;
}

async function readPinnedFiles(paths: Record<string, string>) {
  return Object.fromEntries(
    await Promise.all(
      Object.entries(paths).map(async ([name, path]) => [name, await readFile(path, 'utf8')]),
    ),
  );
}

function canonicalJson(value: unknown) {
  return `${JSON.stringify(sortJson(value), null, 2)}\n`;
}

function sortJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(sortJson);
  if (value === null || typeof value !== 'object') return value;
  return Object.fromEntries(
    sortedObjectEntries(value).map(([key, entry]) => [key, sortJson(entry)]),
  );
}

function reversed<T>(values: readonly T[]): T[] {
  return Array.from({ length: values.length }, (_, index) => values[values.length - index - 1]);
}

function sortedObjectEntries(value: object): [string, unknown][] {
  const sorted: [string, unknown][] = [];
  for (const entry of Object.entries(value)) {
    const index = sorted.findIndex(([key]) => key.localeCompare(entry[0], 'en') > 0);
    if (index === -1) sorted.push(entry);
    else sorted.splice(index, 0, entry);
  }
  return sorted;
}

function hash(value: string) {
  return createHash('sha256').update(value).digest('hex');
}
