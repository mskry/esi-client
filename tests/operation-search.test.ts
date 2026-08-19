import { describe, expect, it } from 'vitest';

import {
  operationManifest,
  searchOperations,
  type OperationSearchResult,
} from '../src/operations.js';

describe('operation search', () => {
  it('normalizes queries and applies exact, prefix, token, and substring matching', () => {
    expect(searchOperations({ query: '  GET_status  ' })[0]?.operationId).toBe('GetStatus');
    expect(searchOperations({ query: 'get sta' })[0]?.operationId).toBe('GetStatus');
    expect(
      searchOperations({ query: 'status' }).some(({ operationId }) => operationId === 'GetStatus'),
    ).toBe(true);
    expect(
      searchOperations({ query: 'tatus' }).some(({ operationId }) => operationId === 'GetStatus'),
    ).toBe(true);
    expect(searchOperations({ query: 'bulk delete contacts' })[0]?.operationId).toBe(
      'DeleteCharactersCharacterIdContacts',
    );
  });

  it('searches facade, HTTP, authentication, scope, and classification fields', () => {
    expect(searchOperations({ query: 'agentsResearch' })[0]?.operationId).toBe(
      'GetCharactersCharacterIdAgentsResearch',
    );
    expect(
      searchOperations({ query: 'public', limit: 100 }).every((result) => !result.authenticated),
    ).toBe(true);
    expect(searchOperations({ query: 'mutation', limit: 1 }).every(isMutation)).toBe(true);
    expect(searchOperations({ query: 'esi characters write contacts v1' })[0]?.operationId).toBe(
      'DeleteCharactersCharacterIdContacts',
    );
    expect(
      searchOperations({ query: 'delete', limit: 100 }).some(
        ({ httpMethod }) => httpMethod === 'DELETE',
      ),
    ).toBe(true);
  });

  it('supports filter-only searches and combines every typed filter', () => {
    const scope = 'esi-markets.read_character_orders.v1';
    const results = searchOperations({
      domain: 'market',
      method: 'GET',
      authenticated: true,
      scopes: [scope],
      classification: 'read',
      limit: 100,
    });

    expect(results.length).toBeGreaterThan(0);
    expect(
      results.every(
        (result) =>
          result.domain === 'market' &&
          result.httpMethod === 'GET' &&
          result.authenticated &&
          result.scopes.includes(scope) &&
          result.classification === 'read',
      ),
    ).toBe(true);
    expect(searchOperations({ authenticated: false, limit: 100 }).every(isPublic)).toBe(true);
  });

  it('uses exactly 20 by default, permits zero, and enforces the hard maximum', () => {
    expect(searchOperations()).toHaveLength(20);
    expect(searchOperations({ limit: 0 })).toEqual([]);
    expect(searchOperations({ limit: 100 })).toHaveLength(100);

    for (const limit of [-1, 1.5, 101, Number.NaN, Number.POSITIVE_INFINITY]) {
      expect(() => searchOperations({ limit })).toThrow(/Operation search limit/u);
    }
    expect(() =>
      // @ts-expect-error Runtime callers can still provide a non-number limit.
      searchOperations({ limit: '20' }),
    ).toThrow(TypeError);
  });

  it('orders equal-scoring results by stable operation ID and is deterministic', () => {
    const first = searchOperations({ domain: 'market', limit: 100 });
    const second = searchOperations({ domain: 'MARKET', limit: 100 });
    const ids = first.map(({ operationId }) => operationId);
    const expectedIds = operationManifest.operations
      .filter(({ facade }) => facade.domain === 'market')
      .map(({ operationId }) => operationId);

    expect(ids).toEqual(expectedIds);
    expect(second).toEqual(first);
    expect(searchOperations({ query: 'market', limit: 100 })).toEqual(
      searchOperations({ query: 'market', limit: 100 }),
    );
    expect(searchOperations({ query: 'market', domain: 'market', limit: 100 })).toEqual(first);
  });

  it('returns concise deeply immutable JSON entries without executable or credential data', () => {
    const secret = 'super-secret-operation-search-test-token';
    const results = searchOperations({ query: 'authenticated', limit: 100 });
    const serialized = JSON.stringify(results);

    expect(results.length).toBeGreaterThan(0);
    expect(serialized).not.toContain(secret);
    expect(serialized.toLowerCase()).not.toContain('authorization');
    expect(serialized.toLowerCase()).not.toContain('tokenprovider');
    expect(JSON.parse(serialized)).toEqual(results);
    expect(Object.isFrozen(results)).toBe(true);
    for (const result of results) {
      expect(Object.keys(result)).toEqual([
        'operationId',
        'domain',
        'facadeMethod',
        'summary',
        'httpMethod',
        'authenticated',
        'scopes',
        'classification',
      ]);
      expect(Object.isFrozen(result)).toBe(true);
      expect(Object.isFrozen(result.scopes)).toBe(true);
      expect(Object.values(result).every((value) => typeof value !== 'function')).toBe(true);
    }

    expect(operationManifest.operations.length).toBeGreaterThan(results.length);
  });
});

function isMutation(result: OperationSearchResult): boolean {
  return result.classification === 'mutation';
}

function isPublic(result: OperationSearchResult): boolean {
  return !result.authenticated;
}
