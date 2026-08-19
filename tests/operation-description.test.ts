import { describe, expect, it } from 'vitest';

import { EsiUnknownOperationError } from '../src/client/errors.js';
import {
  describeOperation,
  operationManifest,
  operationRegistry,
  type SerializableOperationManifestEntry,
} from '../src/operations.js';

const forbiddenCredentialKeys = new Set([
  'accesstoken',
  'authorization',
  'credential',
  'password',
  'providervalue',
  'refreshtoken',
  'token',
  'tokenprovider',
]);

describe('operation descriptions', () => {
  it('returns the complete known operation contract from the serializable manifest', () => {
    const description: SerializableOperationManifestEntry = describeOperation('GetStatus');
    const manifestEntry = operationManifest.operations.find(
      ({ operationId }) => operationId === 'GetStatus',
    );

    expect(manifestEntry).toBeDefined();
    expect(description).toBe(manifestEntry);
    expect(description).toMatchObject({
      operationId: 'GetStatus',
      facade: { domain: 'status', method: 'get' },
      http: { method: 'GET', path: '/status' },
      requestSchema: {
        module: '@evespace/esi-client/schemas',
        export: 'GetStatusRequestSchema',
      },
      authentication: { required: false, scopes: [] },
      pagination: { kind: 'none' },
      classification: 'read',
    });
    expect(description.parameters.length).toBeGreaterThan(0);
    expect(description.responses).toEqual([
      {
        body: 'json',
        content: [
          {
            mediaType: 'application/json',
            schema: { $ref: '#/components/schemas/Status' },
          },
        ],
        description: 'OK',
        schema: {
          export: 'GetStatusStatus200SuccessResponseSchema',
          module: '@evespace/esi-client/schemas',
        },
        status: '200',
      },
    ]);
  });

  it('round-trips descriptions through JSON', () => {
    const description = describeOperation('DeleteCharactersCharacterIdContacts');

    expect(JSON.parse(JSON.stringify(description))).toEqual(description);
  });

  it('returns deeply immutable contracts that cannot mutate the global manifest', () => {
    const description = describeOperation('GetStatus');
    const originalPath = description.http.path;
    const originalSchema = description.responses[0]?.content[0]?.schema;

    assertFrozenJsonValue(description, '$', new WeakSet());
    expect(() => {
      (description.http as { path: string }).path = '/changed';
    }).toThrow(TypeError);
    expect(() => {
      Object.defineProperty(description.responses, '0', { value: null });
    }).toThrow(TypeError);
    expect(describeOperation('GetStatus').http.path).toBe(originalPath);
    expect(describeOperation('GetStatus').responses[0]?.content[0]?.schema).toBe(originalSchema);
  });

  it('describes every generated operation without executable fallback', () => {
    const manifestIds = operationManifest.operations.map(({ operationId }) => operationId);

    expect(manifestIds).toEqual(Object.keys(operationRegistry));
    expect(manifestIds.map((operationId) => describeOperation(operationId).operationId)).toEqual(
      manifestIds,
    );
  });

  it.each([
    ['missing operation', 'NotAnEsiOperation', 'NotAnEsiOperation'],
    ['near executable operation', 'getstatus', 'getstatus'],
    ['empty ID', '', ''],
    ['whitespace-padded ID', ' GetStatus ', ' GetStatus '],
    ['non-string ID', 42, 'unknown'],
    ['null ID', null, 'unknown'],
    ['object ID', { operationId: 'GetStatus' }, 'unknown'],
  ])('throws a structured unknown-operation error for a %s', (_case, stableId, errorId) => {
    let thrown: unknown;
    try {
      // @ts-expect-error Runtime callers can provide malformed IDs.
      describeOperation(stableId);
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(EsiUnknownOperationError);
    if (!(thrown instanceof EsiUnknownOperationError)) {
      throw new TypeError('Expected EsiUnknownOperationError');
    }
    const error = thrown;
    expect(error.code).toBe('ESI_UNKNOWN_OPERATION');
    expect(error.operationId).toBe(errorId);
    expect(error.toJSON()).toEqual({
      name: 'EsiUnknownOperationError',
      code: 'ESI_UNKNOWN_OPERATION',
      message: `Unknown ESI operation: ${errorId}`,
      operationId: errorId,
    });
    expect(Object.keys(error.toJSON())).toEqual(['name', 'code', 'message', 'operationId']);
    expect(JSON.parse(JSON.stringify(error))).toEqual(error.toJSON());
    expect(Object.hasOwn(error, 'suggestion')).toBe(false);
    expect(Object.hasOwn(error, 'operation')).toBe(false);
  });

  it('contains no functions, executable schemas, or credential-bearing values', () => {
    for (const { operationId } of operationManifest.operations) {
      assertFrozenJsonValue(describeOperation(operationId), operationId, new WeakSet());
    }
    expect(operationManifest.operations).toHaveLength(Object.keys(operationRegistry).length);
  });
});

function assertFrozenJsonValue(value: unknown, path: string, ancestors: WeakSet<object>): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (typeof value !== 'object') throw new TypeError(`Non-JSON value at ${path}: ${typeof value}`);
  if (ancestors.has(value)) throw new TypeError(`Cyclic value at ${path}`);
  if (!Object.isFrozen(value)) throw new TypeError(`Mutable value at ${path}`);

  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== Array.prototype) {
    throw new TypeError(`Non-plain value at ${path}`);
  }

  ancestors.add(value);
  for (const key of Reflect.ownKeys(value)) {
    if (Array.isArray(value) && key === 'length') continue;
    if (typeof key !== 'string') throw new TypeError(`Symbol key at ${path}`);
    if (!Array.isArray(value)) {
      const normalizedKey = key.replaceAll(/[^A-Za-z]/gu, '').toLowerCase();
      if (forbiddenCredentialKeys.has(normalizedKey)) {
        throw new TypeError(`Credential-bearing key at ${path}.${key}`);
      }
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
      throw new TypeError(`Non-data property at ${path}.${key}`);
    }
    assertFrozenJsonValue(descriptor.value, `${path}.${key}`, ancestors);
  }
  ancestors.delete(value);
}
