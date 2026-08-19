import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import type { NormalizedOpenApiModel } from '../scripts/generate/normalize.mjs';
import { resolveOperationMetadata } from '../scripts/generate/operation-metadata.mjs';
import { renderOperationRegistryArtifacts } from '../scripts/generate/operation-registry.mjs';
import {
  operationManifest,
  operationRegistry,
  type ExecutableOperationRegistry,
  type SerializableOperationManifest,
} from '../src/operations.js';

const operationCount = 233;
const reviewedReadLikePostIds = new Set([
  'PostCharactersAffiliation',
  'PostCharactersCharacterIdAssetsLocations',
  'PostCharactersCharacterIdAssetsNames',
  'PostCharactersCharacterIdCspa',
  'PostCorporationsCorporationIdAssetsLocations',
  'PostCorporationsCorporationIdAssetsNames',
  'PostRoute',
  'PostUniverseIds',
  'PostUniverseNames',
]);
const forbiddenCredentialKeys = new Set([
  'accesstoken',
  'authorization',
  'providervalue',
  'token',
  'tokenprovider',
]);

describe('generated operation registry and manifest', () => {
  it('renders byte-stable modules from normalized operations and facade metadata', async () => {
    const model = await readNormalizedModel();
    const metadata = await resolveOperationMetadata(model);
    const provenance = await readProvenance();
    const first = renderOperationRegistryArtifacts(model, metadata, provenance);
    const second = renderOperationRegistryArtifacts(
      { ...model, operations: reversed(model.operations) },
      reversed(metadata),
      provenance,
    );

    expect(second).toEqual(first);
    expect(first.registrySource).toContain('// Compatibility date: 2026-08-18.');
    expect(first.manifestSource).toContain(`// Specification SHA-256: ${provenance.sha256}.`);
    expect(first.indexSource).toContain("export * from './manifest.js';");
    expect(first.indexSource).toContain("export * from './registry.js';");
  });

  it('covers exactly all 233 normalized operations with matching executable descriptors', async () => {
    const model = await readNormalizedModel();
    const expectedIds = model.operations.map(({ operationId }) => operationId);
    const registryIds = Object.keys(operationRegistry);
    const manifestIds = operationManifest.operations.map(({ operationId }) => operationId);

    expect(expectedIds).toHaveLength(operationCount);
    expect(registryIds).toEqual(expectedIds);
    expect(manifestIds).toEqual(expectedIds);
    expect(new Set(manifestIds).size).toBe(operationCount);

    for (const contract of operationManifest.operations) {
      const runtime = operationRegistry[contract.operationId];
      if (runtime === undefined) throw new Error(`Missing registry entry: ${contract.operationId}`);

      expect(runtime.transport.operationId).toBe(contract.operationId);
      expect(runtime.transport.method).toBe(contract.http.method);
      expect(runtime.transport.path).toBe(contract.http.path);
      expect(runtime.classification).toBe(contract.classification);
      const expectedClassification =
        contract.http.method === 'GET' || reviewedReadLikePostIds.has(contract.operationId)
          ? 'read'
          : 'mutation';
      expect(contract.classification).toBe(expectedClassification);
      expect(contract.safety.readLike).toBe(expectedClassification === 'read');
      expect(contract.safety.generic).toEqual({
        requiresClientMutationEnablement: expectedClassification === 'mutation',
        requiresConfirmation: expectedClassification === 'mutation',
      });
      expect(contract.safety.typed).toEqual({
        expressesMutationIntent: expectedClassification === 'mutation',
        genericMutationGatesApply: false,
      });
      const reviewedReadLikePost = reviewedReadLikePostIds.has(contract.operationId);
      expect(contract.safety.readLikeOverride === null).toBe(!reviewedReadLikePost);
      expect(contract.safety.readLikeOverride?.reviewed).toBe(
        reviewedReadLikePost ? true : undefined,
      );
      expect(typeof contract.safety.readLikeOverride?.reason).toBe(
        reviewedReadLikePost ? 'string' : 'undefined',
      );
      expect(runtime.requestSchema).toBe(runtime.transport.requestSchema);
      expect(runtime.transport.authentication?.scopes ?? []).toEqual(
        contract.authentication.scopes,
      );
      expect(runtime.transport.authentication !== null).toBe(contract.authentication.required);
      expect(runtime.transport.transport?.compatibilityDateOverride === true).toBe(
        contract.transport.compatibilityDateOverride,
      );
      expect(
        runtime.transport.parameters.map(({ name, placement, required }) => ({
          name,
          placement,
          required,
        })),
      ).toEqual(
        contract.parameters.map(({ name, placement, required }) => ({ name, placement, required })),
      );
      expect(Object.keys(runtime.responseSchemasByStatus)).toEqual(
        contract.responses.map(({ status }) => status),
      );

      for (const response of contract.responses) {
        const schema = runtime.responseSchemasByStatus[response.status];
        expect(schema).toBeDefined();
        const transportResponse = runtime.transport.successResponses.find(
          ({ status }) => String(status) === response.status,
        );
        expect(transportResponse?.body).toBe(response.body);
        if (transportResponse?.body === 'json' && transportResponse.schema !== schema) {
          throw new Error(`Response schema mismatch: ${contract.operationId} ${response.status}`);
        }
      }
    }
  });

  it('exports a deeply immutable credential-free JSON-compatible manifest', () => {
    const registryType: ExecutableOperationRegistry = operationRegistry;
    const manifestType: SerializableOperationManifest = operationManifest;
    const serialized = JSON.stringify(manifestType);

    expect(registryType).toBe(operationRegistry);
    expect(serialized).not.toContain('super-secret-operation-registry-test-token');
    expect(JSON.parse(serialized)).toEqual(operationManifest);
    assertFrozenJsonValue(operationManifest, '$', new WeakSet());
  });
});

async function readNormalizedModel(): Promise<NormalizedOpenApiModel> {
  const value: unknown = JSON.parse(
    await readFile(new URL('../openapi/generated/normalized-model.json', import.meta.url), 'utf8'),
  );
  if (value === null || typeof value !== 'object' || !('operations' in value)) {
    throw new TypeError('Invalid committed normalized model');
  }
  // The committed generator output is checked structurally above and exercised operation-by-operation.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return value as NormalizedOpenApiModel;
}

async function readProvenance(): Promise<{ compatibilityDate: string; sha256: string }> {
  const value: unknown = JSON.parse(
    await readFile(new URL('../openapi/generated/provenance.json', import.meta.url), 'utf8'),
  );
  if (
    value === null ||
    typeof value !== 'object' ||
    !('compatibilityDate' in value) ||
    typeof value.compatibilityDate !== 'string' ||
    !('sha256' in value) ||
    typeof value.sha256 !== 'string'
  ) {
    throw new TypeError('Invalid committed provenance');
  }
  return { compatibilityDate: value.compatibilityDate, sha256: value.sha256 };
}

function assertFrozenJsonValue(value: unknown, path: string, ancestors: WeakSet<object>): void {
  if (value === null || typeof value === 'string' || typeof value === 'boolean') return;
  if (typeof value === 'number' && Number.isFinite(value)) return;
  if (typeof value !== 'object') throw new TypeError(`Non-JSON value at ${path}: ${typeof value}`);
  if (ancestors.has(value)) throw new TypeError(`Cyclic manifest value at ${path}`);
  if (!Object.isFrozen(value)) throw new TypeError(`Mutable manifest value at ${path}`);
  const prototype: unknown = Object.getPrototypeOf(value);
  if (prototype !== Object.prototype && prototype !== Array.prototype) {
    throw new TypeError(`Non-plain manifest value at ${path}`);
  }

  ancestors.add(value);
  if (Array.isArray(value)) {
    for (const key of Reflect.ownKeys(value)) {
      if (key === 'length') continue;
      if (typeof key !== 'string' || !/^(?:0|[1-9]\d*)$/u.test(key)) {
        throw new TypeError(`Non-index manifest array key at ${path}`);
      }
    }
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) throw new TypeError(`Sparse manifest array at ${path}`);
      assertFrozenJsonValue(value[index], `${path}.${index}`, ancestors);
    }
    ancestors.delete(value);
    return;
  }
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key !== 'string') throw new TypeError(`Symbol manifest key at ${path}`);
    const normalizedKey = key.replaceAll(/[^A-Za-z]/gu, '').toLowerCase();
    if (forbiddenCredentialKeys.has(normalizedKey)) {
      throw new TypeError(`Credential-bearing manifest key at ${path}.${key}`);
    }
    const descriptor = Object.getOwnPropertyDescriptor(value, key);
    if (descriptor === undefined || !descriptor.enumerable || !('value' in descriptor)) {
      throw new TypeError(`Non-data manifest property at ${path}.${key}`);
    }
    assertFrozenJsonValue(descriptor.value, `${path}.${key}`, ancestors);
  }
  ancestors.delete(value);
}

function reversed<Value>(values: readonly Value[]): Value[] {
  const result: Value[] = [];
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];
    if (value !== undefined) result.push(value);
  }
  return result;
}
