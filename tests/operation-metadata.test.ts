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
  loadNamingOverrides,
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
    const namingOverridesPath = await writeConfig('naming', [
      {
        operationId: 'get_item',
        domain: 'inventory',
        method: 'findItem',
        reviewed: true,
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
      namingOverridesPath,
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
        method: 'postSearch',
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
      'Duplicate facade naming override: get_item',
    ],
    ['stale entries', [reviewedNaming('removed')], 'Stale or unknown facade naming override'],
    [
      'unreviewed entries',
      [{ ...reviewedNaming('get_item'), reviewed: false }],
      'Facade naming override is not reviewed',
    ],
    [
      'unknown fields',
      [{ ...reviewedNaming('get_item'), source: 'manual' }],
      'Unknown facade naming override 0 field',
    ],
    [
      'invalid domain identifiers',
      [{ ...reviewedNaming('get_item'), domain: 'bad-domain' }],
      'Invalid TypeScript identifier for Facade domain',
    ],
    [
      'reserved method identifiers',
      [{ ...reviewedNaming('get_item'), method: 'class' }],
      'Invalid TypeScript identifier for Facade method',
    ],
  ])('rejects naming overrides with %s', async (_case, overrides, message) => {
    const path = await writeConfig('invalid-naming', overrides);
    await expect(loadNamingOverrides(makeModel([makeOperation('get_item')]), path)).rejects.toThrow(
      message,
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

  it('rejects facade domain/method collisions after applying defaults and overrides', async () => {
    const model = makeModel([
      makeOperation('get_item', 'GET', 'Items'),
      makeOperation('getItem', 'GET', 'Items'),
    ]);

    await expect(resolveSyntheticOperationMetadata(model)).rejects.toThrow(
      'Facade domain/method collision items.getItem: get_item and getItem',
    );
  });

  it('rejects inexact config roots', async () => {
    const path = await writeConfig('unknown-root', [], { owner: 'generator' });
    await expect(loadNamingOverrides(makeModel([]), path)).rejects.toThrow(
      'Unknown facade naming overrides config field: owner',
    );
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

async function resolveSyntheticOperationMetadata(model: NormalizedOpenApiModel) {
  const safetyOverridesPath = await writeConfig('empty-safety', []);
  return resolveOperationMetadata(model, { safetyOverridesPath });
}
