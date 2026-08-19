import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import {
  createNamingReview,
  renderNamingReviewReport,
} from '../scripts/generate/naming-review.mjs';
import type {
  NormalizedOpenApiModel,
  NormalizedOperation,
} from '../scripts/generate/normalize.mjs';
import {
  loadFacadeCatalog,
  type FacadeCatalogEntry,
} from '../scripts/generate/operation-metadata.mjs';

const provenance = { compatibilityDate: '2026-08-18', sha256: 'a'.repeat(64) };

describe('facade naming review', () => {
  it('covers all 233 operations in stable domain and operation-ID order', async () => {
    const { catalog, model } = await loadLiveFixture();
    const review = createNamingReview(model, catalog);
    const entries = review.domains.flatMap(({ operations }) => operations);

    expect(review.operationCount).toBe(233);
    expect(entries).toHaveLength(233);
    expect(new Set(entries.map(({ operationId }) => operationId)).size).toBe(233);
    expect(isSorted(review.domains.map(({ domain }) => domain))).toBe(true);
    for (const domain of review.domains) {
      expect(isSorted(domain.operations.map(({ operationId }) => operationId))).toBe(true);
    }
  });

  it('is byte-stable when normalized model input is reordered', async () => {
    const { catalog, model } = await loadLiveFixture();
    const reordered: NormalizedOpenApiModel = {
      ...model,
      operations: reversed(model.operations),
      models: reversed(model.models),
    };

    expect(renderNamingReviewReport(reordered, catalog, provenance)).toBe(
      renderNamingReviewReport(model, catalog, provenance),
    );
  });

  it('makes unresolved candidate collisions visible without order-dependent suffixes', () => {
    const model = syntheticModel([
      operation('GetFirstItems', '/widgets', 'List widgets'),
      operation('GetSecondItems', '/widgets', 'List widgets'),
    ]);
    const catalog: FacadeCatalogEntry[] = [
      reviewed('GetFirstItems', 'listFirstItems'),
      reviewed('GetSecondItems', 'listSecondItems'),
    ];
    const review = createNamingReview(model, catalog);
    const entries = review.domains[0]?.operations ?? [];
    const report = renderNamingReviewReport(model, catalog, provenance);

    expect(entries.map(({ candidateMethod }) => candidateMethod)).toEqual([
      'listWidgets',
      'listWidgets',
    ]);
    for (const entry of entries) {
      expect(entry.candidateCollisionOperationIds).toEqual(['GetFirstItems', 'GetSecondItems']);
    }
    expect(report).toContain('`GetFirstItems`<br>`GetSecondItems` | `items.listFirstItems`');
    expect(report).not.toContain('listWidgets2');
  });

  it('normalizes Corporationhistory, Skillqueue, and Openwindow into readable compounds', async () => {
    const { catalog, model } = await loadLiveFixture();
    const entries = new Map(
      createNamingReview(model, catalog)
        .domains.flatMap(({ operations }) => operations)
        .map((entry) => [entry.operationId, entry]),
    );

    expect(entries.get('GetCharactersCharacterIdCorporationhistory')?.candidateMethod).toBe(
      'listCorporationHistory',
    );
    expect(entries.get('GetCharactersCharacterIdSkillqueue')?.candidateMethod).toBe(
      'listSkillQueue',
    );
    expect(entries.get('PostUiOpenwindowContract')?.candidateMethod).toBe('openContract');
  });

  it('reports positional identifiers in route order and accepted option symbols', () => {
    const item: NormalizedOperation = {
      ...operation('GetOwnerItem', '/owners/{owner_id}/items/{item_id}', 'Get item'),
      parameters: [pathParameter('item_id'), pathParameter('owner_id')],
    };
    const model = syntheticModel([item]);
    const catalog = [{ ...reviewed('GetOwnerItem', 'getItem'), note: 'Reviewed detail name.' }];
    const review = createNamingReview(model, catalog);
    const entry = review.domains[0]?.operations[0];
    const report = renderNamingReviewReport(model, catalog, provenance);

    expect(entry?.positionalIdentifiers).toEqual(['owner_id', 'item_id']);
    expect(entry?.derivedOptionsType).toBeNull();
    expect(report).toContain(
      '`GET /owners/{owner_id}/items/{item_id}` | `owner_id`, `item_id` | Get item',
    );
    expect(report).toContain('Reviewed detail name.');
  });
});

async function loadLiveFixture(): Promise<{
  catalog: readonly FacadeCatalogEntry[];
  model: NormalizedOpenApiModel;
}> {
  const value: unknown = JSON.parse(
    await readFile(new URL('../openapi/generated/normalized-model.json', import.meta.url), 'utf8'),
  );
  if (value === null || typeof value !== 'object' || !('operations' in value)) {
    throw new TypeError('Invalid committed normalized model');
  }
  assertModel(value);
  const model = value;
  return { catalog: await loadFacadeCatalog(model), model };
}

function operation(operationId: string, path: string, summary: string): NormalizedOperation {
  return {
    operationId,
    method: 'GET',
    path,
    domainSource: 'Items',
    tags: ['Items'],
    summary,
    description: null,
    parameters: [],
    requestBody: null,
    successResponses: [
      {
        status: '200',
        description: 'OK',
        noContent: false,
        content: [
          { mediaType: 'application/json', schema: { type: 'array', items: {} }, extensions: {} },
        ],
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

function pathParameter(name: string): NormalizedOperation['parameters'][number] {
  return {
    name,
    placement: 'path',
    required: true,
    description: null,
    deprecated: false,
    style: null,
    explode: null,
    allowReserved: null,
    schema: { type: 'integer' },
    extensions: {},
  };
}

function reviewed(operationId: string, method: string): FacadeCatalogEntry {
  return { operationId, domain: 'items', method, reviewed: true };
}

function syntheticModel(operations: readonly NormalizedOperation[]): NormalizedOpenApiModel {
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

function compareText(left: string, right: string): number {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isSorted(values: readonly string[]): boolean {
  return values.every(
    (value, index) => index === 0 || compareText(values[index - 1] ?? '', value) <= 0,
  );
}

function reversed<Value>(values: readonly Value[]): Value[] {
  const result: Value[] = [];
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];
    if (value !== undefined) result.push(value);
  }
  return result;
}

function assertModel(value: unknown): asserts value is NormalizedOpenApiModel {
  if (value === null || typeof value !== 'object' || !('operations' in value)) {
    throw new TypeError('Invalid committed normalized model');
  }
}
