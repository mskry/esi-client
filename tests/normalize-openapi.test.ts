import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { normalizeOpenApiDocument, resolveLocalReference } from '../scripts/generate/normalize.mjs';
import { makeTemporaryDirectory } from './helpers/temporary-directory.js';

describe('normalized OpenAPI model', () => {
  it('resolves local operation references and captures emitter inputs', async () => {
    const result = await normalizeOpenApiDocument(referencedDocument());

    expect(result.operations.map(({ operationId }) => operationId)).toEqual([
      'get_item',
      'remove_item',
    ]);
    expect(result.models.map(({ name }) => name)).toEqual(['Alpha', 'Zeta']);
    expect(result.operations[0]).toMatchObject({
      operationId: 'get_item',
      method: 'GET',
      path: '/items/{item_id}',
      domainSource: 'Zeta',
      tags: ['Alpha', 'Zeta'],
      summary: 'Get an item',
      description: 'Returns one item.',
      parameters: [
        {
          name: 'item_id',
          placement: 'path',
          required: true,
          schema: { type: 'integer' },
        },
        {
          name: 'page',
          placement: 'query',
          required: false,
          schema: { minimum: 1, type: 'integer' },
        },
      ],
      requestBody: {
        required: true,
        content: [
          {
            mediaType: 'application/json',
            schema: { $ref: '#/components/schemas/Zeta' },
          },
        ],
      },
      successResponses: [
        {
          status: '200',
          noContent: false,
          headers: [
            { name: 'ETag', schema: { type: 'string' } },
            { name: 'X-Pages', schema: { minimum: 1, type: 'integer' } },
          ],
          content: [
            {
              mediaType: 'application/json',
              schema: { $ref: '#/components/schemas/Zeta' },
            },
          ],
        },
      ],
      security: [{ schemes: [{ name: 'esiOAuth', scopes: ['esi-items.read'] }] }],
      pagination: {
        kind: 'offset',
        requestParameters: ['page'],
        responseHeaders: ['x-pages'],
      },
      cache: {
        responseHeaders: ['etag'],
        extensions: { 'x-cache-seconds': 60 },
      },
      extensions: { 'x-cache-seconds': 60, 'x-owner': 'items' },
    });
    expect(result.operations[1]?.successResponses).toEqual([
      {
        status: '204',
        description: 'Removed',
        noContent: true,
        content: [],
        headers: [],
        extensions: {},
      },
    ]);
    expect(result.accounting).toEqual({
      sourceOperationIds: ['get_item', 'remove_item'],
      normalizedOperationIds: ['get_item', 'remove_item'],
      excludedOperationIds: [],
    });
  });

  it('sorts operation, model, parameter, response, header, media, and inventory collections', async () => {
    const document = referencedDocument();
    const reordered = reverseObjectEntries(document);
    if (!isRecord(reordered)) throw new TypeError('Reordered fixture must remain an object');

    const first = await normalizeOpenApiDocument(document);
    const second = await normalizeOpenApiDocument(reordered);

    expect(second).toEqual(first);
    expect(first.operations[0]?.parameters.map(({ name }) => name)).toEqual(['item_id', 'page']);
    expect(isSorted(first.inventory.openapi.map(({ construct }) => construct))).toBe(true);
    expect(isSorted(first.inventory.schemas.map(({ construct }) => construct))).toBe(true);
  });

  it('inventories OpenAPI and schema constructs with deterministic counts', async () => {
    const { inventory } = await normalizeOpenApiDocument(referencedDocument());

    expect(inventory.openapi).toEqual(
      expect.arrayContaining([
        { construct: 'extension:x-cache-seconds', count: 1 },
        { construct: 'media-type:application/json', count: 2 },
        { construct: 'operation:delete', count: 1 },
        { construct: 'operation:get', count: 1 },
        { construct: 'parameter:path', count: 1 },
        { construct: 'parameter:query', count: 1 },
        { construct: 'version:3.1.0', count: 1 },
      ]),
    );
    expect(inventory.schemas).toEqual(
      expect.arrayContaining([
        { construct: 'keyword:$ref', count: 2 },
        { construct: 'keyword:properties', count: 2 },
        { construct: 'type:integer', count: 4 },
        { construct: 'type:object', count: 2 },
        { construct: 'type:string', count: 3 },
      ]),
    );
  });

  it('accounts for reviewed exclusions with machine-readable reasons', async () => {
    const exclusionsPath = await writeExclusions([
      {
        operationId: 'remove_item',
        reviewed: true,
        reason: { code: 'unsupported-callback', detail: 'Requires callback emitter support.' },
      },
    ]);

    const result = await normalizeOpenApiDocument(referencedDocument(), { exclusionsPath });

    expect(result.operations.map(({ operationId }) => operationId)).toEqual(['get_item']);
    expect(result.exclusions).toEqual([
      {
        operationId: 'remove_item',
        reviewed: true,
        reason: { code: 'unsupported-callback', detail: 'Requires callback emitter support.' },
      },
    ]);
    expect(result.accounting.excludedOperationIds).toEqual(['remove_item']);
  });

  it.each([
    [
      'duplicate',
      [reviewedExclusion('get_item'), reviewedExclusion('get_item')],
      'Duplicate operation exclusion: get_item',
    ],
    ['stale', [reviewedExclusion('removed_operation')], 'Stale or unknown operation exclusion'],
    [
      'unreviewed',
      [{ ...reviewedExclusion('get_item'), reviewed: false }],
      'Operation exclusion is not reviewed',
    ],
    [
      'unknown fields',
      [{ ...reviewedExclusion('get_item'), owner: 'generator' }],
      'Unknown operation exclusion 0 field',
    ],
  ])('rejects %s exclusion entries', async (_case, exclusions, message) => {
    const exclusionsPath = await writeExclusions(exclusions);
    await expect(
      normalizeOpenApiDocument(referencedDocument(), { exclusionsPath }),
    ).rejects.toThrow(message);
  });

  it('detects missing and duplicate operation IDs before accounting', async () => {
    await expect(
      normalizeOpenApiDocument(minimalDocument({ '/missing': { get: operation() } })),
    ).rejects.toThrow('Missing or invalid operationId for GET /missing');
    await expect(
      normalizeOpenApiDocument(
        minimalDocument({
          '/first': { get: operation('duplicate') },
          '/second': { post: operation('duplicate') },
        }),
      ),
    ).rejects.toThrow('Duplicate operationId duplicate');
  });

  it.each([
    ['unresolved', '#/components/schemas/Missing', 'Unresolved local OpenAPI reference'],
    [
      'external',
      'other.json#/components/schemas/Result',
      'External or unsupported OpenAPI reference',
    ],
    ['anchor', '#Result', 'External or unsupported OpenAPI reference'],
  ])('rejects %s schema references', async (_case, reference, message) => {
    const document = minimalDocument({
      '/result': {
        get: operation('get_result', {
          content: { 'application/json': { schema: { $ref: reference } } },
        }),
      },
    });
    await expect(normalizeOpenApiDocument(document)).rejects.toThrow(message);
  });

  it('resolves escaped and URI-encoded local JSON Pointer segments', () => {
    const document = {
      components: {
        schemas: {
          'A/B~ C': { oneOf: [{ type: 'string' }, { type: 'number' }] },
        },
      },
    };
    expect(resolveLocalReference(document, '#/components/schemas/A~1B~0%20C')).toEqual({
      oneOf: [{ type: 'string' }, { type: 'number' }],
    });
    expect(resolveLocalReference(document, '#/components/schemas/A~1B~0%20C/oneOf/1')).toEqual({
      type: 'number',
    });
  });
});

function referencedDocument() {
  return {
    openapi: '3.1.0',
    info: { title: 'Normalization fixture', version: '1.0.0' },
    paths: {
      '/removed': {
        delete: operation('remove_item'),
      },
      '/items/{item_id}': { $ref: '#/components/pathItems/Item' },
    },
    components: {
      schemas: {
        Zeta: {
          type: 'object',
          required: ['name', 'id'],
          properties: {
            name: { type: 'string' },
            id: { type: 'integer' },
          },
        },
        Alpha: {
          type: 'object',
          properties: { created_at: { format: 'date-time', type: 'string' } },
        },
      },
      parameters: {
        Page: {
          name: 'page',
          in: 'query',
          schema: { type: 'integer', minimum: 1 },
        },
        ItemId: {
          name: 'item_id',
          in: 'path',
          required: true,
          schema: { type: 'integer' },
        },
      },
      headers: {
        Pages: {
          schema: { type: 'integer', minimum: 1 },
        },
      },
      requestBodies: {
        ItemBody: {
          required: true,
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Zeta' } },
          },
        },
      },
      responses: {
        Item: {
          description: 'An item',
          headers: {
            'X-Pages': { $ref: '#/components/headers/Pages' },
            ETag: { schema: { type: 'string' } },
          },
          content: {
            'application/json': { schema: { $ref: '#/components/schemas/Zeta' } },
          },
        },
      },
      securitySchemes: {
        esiOAuth: { type: 'oauth2', flows: {} },
      },
      pathItems: {
        Item: {
          parameters: [{ $ref: '#/components/parameters/ItemId' }],
          get: {
            operationId: 'get_item',
            tags: ['Zeta', 'Alpha'],
            summary: 'Get an item',
            description: 'Returns one item.',
            parameters: [{ $ref: '#/components/parameters/Page' }],
            requestBody: { $ref: '#/components/requestBodies/ItemBody' },
            responses: { '200': { $ref: '#/components/responses/Item' } },
            security: [{ esiOAuth: ['esi-items.read'] }],
            'x-owner': 'items',
            'x-cache-seconds': 60,
          },
        },
      },
    },
  };
}

function minimalDocument(paths: Record<string, object>) {
  return {
    openapi: '3.1.0',
    info: { title: 'Minimal fixture', version: '1.0.0' },
    paths,
  };
}

function operation(operationId?: string, response: object = { description: 'Removed' }) {
  return {
    ...(operationId === undefined ? {} : { operationId }),
    responses: { '204': response },
  };
}

function reviewedExclusion(operationId: string) {
  return {
    operationId,
    reviewed: true,
    reason: { code: 'unsupported-test', detail: 'Excluded by a test fixture.' },
  };
}

async function writeExclusions(exclusions: readonly object[]): Promise<string> {
  const directory = await makeTemporaryDirectory('esi-client-exclusions-');
  const path = join(directory, 'exclusions.json');
  await writeFile(path, `${JSON.stringify({ schemaVersion: 1, exclusions })}\n`);
  return path;
}

function reverseObjectEntries(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(reverseObjectEntries);
  if (value === null || typeof value !== 'object') return value;
  const entries = Object.entries(value);
  const reversed: Record<string, unknown> = {};
  for (let index = entries.length - 1; index >= 0; index -= 1) {
    const entry = entries[index];
    if (entry) reversed[entry[0]] = reverseObjectEntries(entry[1]);
  }
  return reversed;
}

function isSorted(values: readonly string[]): boolean {
  return values.every(
    (value, index) => index === 0 || (values[index - 1]?.localeCompare(value, 'en') ?? 0) <= 0,
  );
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
