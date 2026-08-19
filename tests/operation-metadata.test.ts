import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import type {
  HttpMethod,
  NormalizedOpenApiModel,
  NormalizedOperation,
} from '../scripts/generate/normalize.mjs';
import {
  defaultDomainName,
  defaultMethodName,
  loadFacadeCatalog,
  loadSafetyOverrides,
  resolveOperationMetadata,
} from '../scripts/generate/operation-metadata.mjs';
import { makeTemporaryDirectory } from './helpers/temporary-directory.js';

describe('operation facade naming and safety metadata', () => {
  it('derives deterministic identifiers from tags and operation IDs', async () => {
    const model = makeModel([
      makeOperation('post_search_results', 'POST', 'Search & Results'),
      makeOperation('getXML_status', 'GET', 'UI Status'),
      makeOperation('delete', 'DELETE', null),
    ]);

    expect(defaultDomainName(makeOperation('get_item', 'GET', null))).toBe('item');
    expect(defaultMethodName('get_XML-items')).toBe('getXmlItems');
    await expect(resolveSyntheticOperationMetadata(model)).resolves.toEqual([
      {
        classification: 'mutation',
        domain: 'esi',
        method: 'operationDelete',
        operationId: 'delete',
        safetyOverrideReason: null,
      },
      {
        classification: 'read',
        domain: 'uiStatus',
        method: 'getXmlStatus',
        operationId: 'getXML_status',
        safetyOverrideReason: null,
      },
      {
        classification: 'mutation',
        domain: 'searchResults',
        method: 'postSearchResults',
        operationId: 'post_search_results',
        safetyOverrideReason: null,
      },
    ]);
  });

  it('applies reviewed naming and read-like POST overrides', async () => {
    const model = makeModel([
      makeOperation('get_item', 'GET', 'Items'),
      makeOperation('post_search', 'POST', 'Search'),
    ]);
    const facadeCatalogPath = await writeFacadeCatalog('naming', [
      {
        operationId: 'get_item',
        domain: 'inventory',
        method: 'findItem',
        reviewed: true,
      },
      {
        operationId: 'post_search',
        domain: 'search',
        method: 'search',
        reviewed: true,
        note: 'POST is used for this read-like search.',
      },
    ]);
    const safetyOverridesPath = await writeConfig('safety', [
      {
        operationId: 'post_search',
        classification: 'read',
        reason: 'Searches without changing server state.',
        reviewed: true,
      },
    ]);

    const metadata = await resolveOperationMetadata(model, {
      facadeCatalogPath,
      safetyOverridesPath,
    });

    expect(metadata).toEqual([
      {
        classification: 'read',
        domain: 'inventory',
        method: 'findItem',
        operationId: 'get_item',
        safetyOverrideReason: null,
      },
      {
        classification: 'read',
        domain: 'search',
        method: 'search',
        operationId: 'post_search',
        safetyOverrideReason: 'Searches without changing server state.',
      },
    ]);
    expect(Object.isFrozen(metadata)).toBe(true);
  });

  it('classifies only GET as read without a reviewed override', async () => {
    const methods = ['DELETE', 'GET', 'HEAD', 'OPTIONS', 'PATCH', 'POST', 'PUT', 'TRACE'] as const;
    const metadata = await resolveSyntheticOperationMetadata(
      makeModel(methods.map((method) => makeOperation(`${method.toLowerCase()}_item`, method))),
    );

    expect(
      Object.fromEntries(
        metadata.map(({ classification, operationId }) => [operationId, classification]),
      ),
    ).toEqual({
      delete_item: 'mutation',
      get_item: 'read',
      head_item: 'mutation',
      options_item: 'mutation',
      patch_item: 'mutation',
      post_item: 'mutation',
      put_item: 'mutation',
      trace_item: 'mutation',
    });
  });

  it.each([
    [
      'duplicate entries',
      [reviewedNaming('get_item'), reviewedNaming('get_item')],
      'Duplicate facade catalog entry: get_item',
    ],
    ['stale entries', [reviewedNaming('removed')], 'Stale facade catalog entry: removed'],
    [
      'unreviewed entries',
      [{ ...reviewedNaming('get_item'), reviewed: false }],
      'Facade catalog entry is not reviewed',
    ],
    [
      'unknown fields',
      [{ ...reviewedNaming('get_item'), source: 'manual' }],
      'Unknown facade catalog entry 0 field',
    ],
    [
      'invalid domain identifiers',
      [{ ...reviewedNaming('get_item'), domain: 'bad-domain' }],
      'Invalid TypeScript identifier for Facade domain',
    ],
    [
      'uppercase domains',
      [{ ...reviewedNaming('get_item'), domain: 'Items' }],
      'Facade domain must begin with a lowercase letter',
    ],
    [
      'uppercase methods',
      [{ ...reviewedNaming('get_item'), method: 'GetItem' }],
      'Facade method must begin with a lowercase letter',
    ],
    [
      'reserved method identifiers',
      [{ ...reviewedNaming('get_item'), method: 'class' }],
      'Reserved facade method for get_item: class',
    ],
    [
      'empty notes',
      [{ ...reviewedNaming('get_item'), note: '' }],
      'Facade catalog note for get_item must be a non-empty trimmed string',
    ],
  ])('rejects facade catalogs with %s', async (_case, operations, message) => {
    const path = await writeFacadeCatalog('invalid-naming', operations);
    await expect(loadFacadeCatalog(makeModel([makeOperation('get_item')]), path)).rejects.toThrow(
      message,
    );
  });

  it('requires exact normalized-model coverage', async () => {
    const path = await writeFacadeCatalog('missing-naming', [reviewedNaming('get_item')]);
    await expect(
      loadFacadeCatalog(
        makeModel([makeOperation('get_item'), makeOperation('post_item', 'POST')]),
        path,
      ),
    ).rejects.toThrow('Missing facade catalog entries: post_item');
  });

  it('requires catalog entries to be deterministically sorted by operation ID', async () => {
    const path = await writeFacadeCatalog('unordered-naming', [
      reviewedNaming('post_item'),
      reviewedNaming('get_item'),
    ]);
    await expect(
      loadFacadeCatalog(
        makeModel([makeOperation('get_item'), makeOperation('post_item', 'POST')]),
        path,
      ),
    ).rejects.toThrow(
      'Facade catalog entries must be sorted by operationId: post_item before get_item',
    );
  });

  it.each([
    ['constructor', 'method'],
    ['withMetadata', 'method'],
    ['toString', 'method'],
    ['callOperation', 'domain'],
    ['configuration', 'domain'],
  ] as const)('rejects reserved generated or inherited %s members', async (member, kind) => {
    const path = await writeFacadeCatalog('reserved-naming', [
      { ...reviewedNaming('get_item'), [kind]: member },
    ]);
    await expect(loadFacadeCatalog(makeModel([makeOperation('get_item')]), path)).rejects.toThrow(
      `Reserved facade ${kind} for get_item: ${member}`,
    );
  });

  it.each([
    [
      'duplicates',
      [reviewedSafety('post_search'), reviewedSafety('post_search')],
      'Duplicate operation safety override',
    ],
    ['stale IDs', [reviewedSafety('removed')], 'Stale or unknown operation safety override'],
    [
      'unreviewed entries',
      [{ ...reviewedSafety('post_search'), reviewed: false }],
      'Operation safety override is not reviewed',
    ],
    [
      'non-read classifications',
      [{ ...reviewedSafety('post_search'), classification: 'mutation' }],
      'must classify the operation as read',
    ],
    [
      'unknown fields',
      [{ ...reviewedSafety('post_search'), ticket: 'reviewed' }],
      'Unknown operation safety override 0 field',
    ],
  ])('rejects safety overrides with %s', async (_case, overrides, message) => {
    const path = await writeConfig('invalid-safety', overrides);
    await expect(
      loadSafetyOverrides(makeModel([makeOperation('post_search', 'POST')]), path),
    ).rejects.toThrow(message);
  });

  it.each(['GET', 'PUT', 'PATCH', 'DELETE', 'HEAD'] as const)(
    'rejects a read-like override for %s',
    async (method) => {
      const path = await writeConfig('wrong-method', [reviewedSafety('operation')]);
      await expect(
        loadSafetyOverrides(makeModel([makeOperation('operation', method)]), path),
      ).rejects.toThrow(`only valid for POST operations: operation is ${method}`);
    },
  );

  it('rejects exact facade domain/method collisions', async () => {
    const model = makeModel([
      makeOperation('get_item', 'GET', 'Items'),
      makeOperation('get_other', 'GET', 'Items'),
    ]);
    const path = await writeFacadeCatalog('colliding-naming', [
      reviewedNaming('get_item'),
      reviewedNaming('get_other'),
    ]);

    await expect(loadFacadeCatalog(model, path)).rejects.toThrow(
      'Facade domain/method collision items.getItem: get_item and get_other',
    );
  });

  it('rejects case-insensitive derived domain path collisions', async () => {
    const model = makeModel([makeOperation('get_first'), makeOperation('get_second')]);
    const path = await writeFacadeCatalog('domain-path-collision', [
      { ...reviewedNaming('get_first'), domain: 'fooBAR', method: 'first' },
      { ...reviewedNaming('get_second'), domain: 'fooBar', method: 'second' },
    ]);

    await expect(loadFacadeCatalog(model, path)).rejects.toThrow(
      'Case-insensitive domain path collision foo-bar: get_first and get_second',
    );
  });

  it('rejects inexact config roots', async () => {
    const path = await writeFacadeCatalog('unknown-root', [], { owner: 'generator' });
    await expect(loadFacadeCatalog(makeModel([]), path)).rejects.toThrow(
      'Unknown facade catalog config field: owner',
    );
  });

  it('loads optional notes and freezes the exhaustive catalog without reordering it', async () => {
    const entry = { ...reviewedNaming('get_item'), note: 'Explains a non-obvious name.' };
    const path = await writeFacadeCatalog('valid-note', [entry]);

    const catalog = await loadFacadeCatalog(makeModel([makeOperation('get_item')]), path);

    expect(catalog).toEqual([entry]);
    expect(Object.isFrozen(catalog)).toBe(true);
    expect(Object.isFrozen(catalog[0])).toBe(true);
  });
});

function makeOperation(
  operationId: string,
  method: HttpMethod = 'GET',
  domainSource: string | null = 'Items',
): NormalizedOperation {
  return {
    operationId,
    method,
    path: '/items',
    domainSource,
    tags: domainSource === null ? [] : [domainSource],
    summary: null,
    description: null,
    parameters: [],
    requestBody: null,
    successResponses: [
      {
        status: '204',
        description: 'No content',
        noContent: true,
        content: [],
        headers: [],
        extensions: {},
      },
    ],
    security: [],
    pagination: { kind: 'none', requestParameters: [], responseHeaders: [] },
    cache: { responseHeaders: [], extensions: {} },
    extensions: {},
  };
}

function makeModel(operations: readonly NormalizedOperation[]): NormalizedOpenApiModel {
  const operationIds = operations.map(({ operationId }) => operationId);
  return {
    operations,
    models: [],
    exclusions: [],
    inventory: { openapi: [], schemas: [] },
    accounting: {
      sourceOperationIds: operationIds,
      normalizedOperationIds: operationIds,
      excludedOperationIds: [],
    },
  };
}

function reviewedNaming(operationId: string) {
  return { operationId, domain: 'items', method: 'getItem', reviewed: true };
}

function reviewedSafety(operationId: string) {
  return {
    operationId,
    classification: 'read',
    reason: 'Reviewed as read-like.',
    reviewed: true,
  };
}

async function writeConfig(
  name: string,
  overrides: readonly object[],
  extra: Readonly<Record<string, unknown>> = {},
): Promise<string> {
  const directory = await makeTemporaryDirectory(`esi-client-${name}-overrides-`);
  const path = join(directory, 'config.json');
  await writeFile(path, `${JSON.stringify({ schemaVersion: 1, overrides, ...extra })}\n`);
  return path;
}

async function writeFacadeCatalog(
  name: string,
  operations: readonly object[],
  extra: Readonly<Record<string, unknown>> = {},
): Promise<string> {
  const directory = await makeTemporaryDirectory(`esi-client-${name}-catalog-`);
  const path = join(directory, 'config.json');
  await writeFile(path, `${JSON.stringify({ schemaVersion: 2, operations, ...extra })}\n`);
  return path;
}

async function resolveSyntheticOperationMetadata(model: NormalizedOpenApiModel) {
  const facadeCatalogPath = await writeFacadeCatalog(
    'synthetic-naming',
    model.operations.reduce<ReturnType<typeof reviewedNaming>[]>((catalog, operation) => {
      const entry = {
        operationId: operation.operationId,
        domain: defaultDomainName(operation),
        method: defaultMethodName(operation.operationId),
        reviewed: true as const,
      };
      const index = catalog.findIndex(({ operationId }) => entry.operationId < operationId);
      if (index === -1) return [...catalog, entry];
      return [...catalog.slice(0, index), entry, ...catalog.slice(index)];
    }, []),
  );
  const safetyOverridesPath = await writeConfig('empty-safety', []);
  return resolveOperationMetadata(model, { facadeCatalogPath, safetyOverridesPath });
}
