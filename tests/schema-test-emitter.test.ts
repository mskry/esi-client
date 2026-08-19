import { execFile } from 'node:child_process';
import { readFile, symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

import { describe, expect, it } from 'vitest';

import type {
  NormalizedModel,
  NormalizedOpenApiModel,
  NormalizedOperation,
  NormalizedSchema,
} from '../scripts/generate/normalize.mjs';
import type { EmitterContext } from '../scripts/generate/orchestrate.mjs';
import {
  generatedSchemaTestsComponent,
  renderGeneratedSchemaContractTests,
} from '../scripts/generate/schema-test-emitter.mjs';
import { createGeneratedSourceEmitter } from '../scripts/generate/source-emitter.mjs';
import { createGeneratedTestsEmitter } from '../scripts/generate/test-emitter.mjs';
import { zodSchemaSourceComponent } from '../scripts/generate/zod-schema.mjs';
import { makeTemporaryDirectory } from './helpers/temporary-directory.js';

const executeFile = promisify(execFile);
const provenance = {
  compatibilityDate: '2026-08-18',
  sha256: 'd'.repeat(64),
};

describe('generated schema contract tests', () => {
  it('selects deterministic mechanically provable contracts from normalized schemas', () => {
    const models = representativeModels();
    const operations = representativeOperations();
    const first = renderGeneratedSchemaContractTests(models, operations, provenance);
    const second = renderGeneratedSchemaContractTests(
      reversed(models),
      reversed(operations),
      provenance,
    );

    expect(second).toBe(first);
    expect(first).toContain('accepts minimal valid data');
    expect(first).toContain('rejects an invalid known field');
    expect(first).toContain('validates nested collection data');
    expect(first).toContain('preserves an unknown field');
    expect(first).toContain('keeps date-time values as strings');
    expect(first).toContain('validates allOf composition');
    expect(first).toContain('validates oneOf composition');
    expect(first).toContain('validates anyOf composition');
    expect(first).toContain('accepts null');
    expect(first).toContain('accepts only no content');
    expect(first).toContain("from '../../src/generated/schemas/models.js';");
    expect(first).toContain("from '../../src/generated/schemas/operations.js';");
  });

  it('does not invent a fixture when constraints cannot be satisfied mechanically', () => {
    const source = renderGeneratedSchemaContractTests(
      [
        model('UnsupportedFixture', {
          type: 'object',
          required: ['code'],
          properties: { code: { type: 'string', pattern: '^esi-[0-9]{8}$' } },
        }),
      ],
      [operation('remove_item', [noContentResponse('204')])],
      provenance,
    );

    expect(source).not.toContain('UnsupportedFixture accepts minimal valid data');
    expect(source).toContain('remove_item 204 accepts only no content');
  });

  it('emits source and generated tests that compile and run together in a staged tree', async () => {
    const directory = await makeTemporaryDirectory('esi-client-generated-schema-tests-');
    const outputDirectory = join(directory, 'outputs');
    const normalizedModel = normalized(representativeModels(), representativeOperations());
    const context = emitterContext(outputDirectory, normalizedModel);
    const sourceEmitter = createGeneratedSourceEmitter([zodSchemaSourceComponent]);
    const testsEmitter = createGeneratedTestsEmitter([generatedSchemaTestsComponent]);

    await expect(sourceEmitter.emit(context)).resolves.toEqual([
      { target: 'src/generated', kind: 'directory' },
    ]);
    await expect(testsEmitter.emit(context)).resolves.toEqual([
      { target: 'tests/generated', kind: 'directory' },
    ]);
    await symlink(
      join(process.cwd(), 'node_modules'),
      join(outputDirectory, 'node_modules'),
      'dir',
    );
    await writeFile(join(outputDirectory, 'package.json'), '{"type":"module"}\n');
    await writeFile(
      join(outputDirectory, 'tsconfig.json'),
      `${JSON.stringify({
        compilerOptions: {
          lib: ['ES2022'],
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          noEmit: true,
          skipLibCheck: true,
          strict: true,
          target: 'ES2022',
          types: ['node', 'vitest/globals'],
          verbatimModuleSyntax: true,
        },
        include: ['src/**/*.ts', 'tests/**/*.ts'],
      })}\n`,
    );

    await expect(
      executeFile(
        process.execPath,
        [join(process.cwd(), 'node_modules/typescript/bin/tsc'), '--project', 'tsconfig.json'],
        { cwd: outputDirectory },
      ),
    ).resolves.toBeDefined();
    await expect(
      executeFile(
        process.execPath,
        [
          join(process.cwd(), 'node_modules/vitest/vitest.mjs'),
          'run',
          'tests/generated/schema-contracts.test.ts',
        ],
        { cwd: outputDirectory },
      ),
    ).resolves.toMatchObject({ stdout: expect.stringContaining('passed') });
  });

  it('coordinates multiple generated test components under one output claim', async () => {
    const directory = await makeTemporaryDirectory('esi-client-test-coordinator-');
    const context = emitterContext(
      join(directory, 'outputs'),
      normalized([], [operation('remove_item', [noContentResponse('204')])]),
    );
    const sibling = {
      name: 'future-contracts',
      async emit(_context: EmitterContext, testsDirectory: string) {
        await writeFile(join(testsDirectory, 'future.test.ts'), 'export {};\n');
        return ['future.test.ts'];
      },
    };
    const emitter = createGeneratedTestsEmitter([generatedSchemaTestsComponent, sibling]);

    await expect(emitter.emit(context)).resolves.toEqual([
      { target: 'tests/generated', kind: 'directory' },
    ]);
    await expect(
      readFile(join(directory, 'outputs/tests/generated/future.test.ts'), 'utf8'),
    ).resolves.toBe('export {};\n');
  });

  it('rejects invalid components and duplicate or unsafe generated test outputs', async () => {
    expect(() => createGeneratedTestsEmitter([])).toThrow('non-empty array');
    expect(() =>
      createGeneratedTestsEmitter([
        {
          name: 'same',
          async emit() {
            return [];
          },
        },
        {
          name: 'same',
          async emit() {
            return [];
          },
        },
      ]),
    ).toThrow('Duplicate generated test component name');

    const directory = await makeTemporaryDirectory('esi-client-invalid-test-coordinator-');
    const context = emitterContext(
      join(directory, 'outputs'),
      normalized([], [operation('remove_item', [noContentResponse('204')])]),
    );
    const duplicate = createGeneratedTestsEmitter([
      {
        name: 'first',
        async emit(_context, testsDirectory) {
          await writeFile(join(testsDirectory, 'same.test.ts'), 'export {};\n');
          return ['same.test.ts'];
        },
      },
      {
        name: 'second',
        async emit() {
          return ['same.test.ts'];
        },
      },
    ]);
    const unsafe = createGeneratedTestsEmitter([
      {
        name: 'unsafe',
        async emit() {
          return ['../maintained.test.ts'];
        },
      },
    ]);

    await expect(duplicate.emit(context)).rejects.toThrow('Duplicate generated test output');
    await expect(unsafe.emit(context)).rejects.toThrow('unsafe output path');
  });
});

function representativeModels(): NormalizedModel[] {
  return [
    model('Entity', {
      type: 'object',
      required: ['created_at', 'groups', 'id'],
      properties: {
        id: { type: 'integer', minimum: 1 },
        created_at: { type: 'string', format: 'date-time' },
        groups: {
          type: 'array',
          minItems: 1,
          items: { type: 'array', items: { type: 'string' } },
        },
      },
    }),
    model('Combined', {
      allOf: [
        { type: 'object', required: ['left'], properties: { left: { type: 'string' } } },
        { type: 'object', required: ['right'], properties: { right: { type: 'boolean' } } },
      ],
    }),
    model('Exclusive', { oneOf: [{ type: 'string' }, { type: 'boolean' }] }),
    model('Alternative', { anyOf: [{ type: 'integer' }, { type: 'boolean' }] }),
    model('OptionalName', { type: ['string', 'null'] }),
  ];
}

function representativeOperations(): NormalizedOperation[] {
  return [
    operation('list_entities', [
      response('200', { type: 'array', items: { $ref: '#/components/schemas/Entity' } }),
    ]),
    operation('remove_item', [noContentResponse('204')]),
  ];
}

function model(name: string, schema: NormalizedSchema): NormalizedModel {
  return { name, pointer: `#/components/schemas/${name}`, schema };
}

function operation(
  operationId: string,
  successResponses: NormalizedOperation['successResponses'],
): NormalizedOperation {
  return {
    operationId,
    method: 'GET',
    path: '/items',
    domainSource: 'Items',
    tags: ['Items'],
    summary: null,
    description: null,
    parameters: [],
    requestBody: null,
    successResponses,
    security: [],
    pagination: { kind: 'none', requestParameters: [], responseHeaders: [] },
    cache: { responseHeaders: [], extensions: {} },
    extensions: {},
  };
}

function response(status: string, schema: NormalizedSchema) {
  return {
    status,
    description: 'Success',
    noContent: false,
    content: [{ mediaType: 'application/json', schema, extensions: {} }],
    headers: [],
    extensions: {},
  };
}

function noContentResponse(status: string) {
  return {
    status,
    description: 'No content',
    noContent: true,
    content: [],
    headers: [],
    extensions: {},
  };
}

function normalized(
  models: readonly NormalizedModel[],
  operations: readonly NormalizedOperation[],
): NormalizedOpenApiModel {
  const operationIds = operations.map(({ operationId }) => operationId);
  return {
    models,
    operations,
    exclusions: [],
    inventory: { openapi: [], schemas: [] },
    accounting: {
      sourceOperationIds: operationIds,
      normalizedOperationIds: operationIds,
      excludedOperationIds: [],
    },
  };
}

function emitterContext(
  outputDirectory: string,
  normalizedModel: NormalizedOpenApiModel,
): EmitterContext {
  return {
    compatibilityDate: provenance.compatibilityDate,
    correctedDocument: {},
    normalizedModel,
    namingReviewReport: 'test naming review\n',
    operationMetadata: normalizedModel.operations.map(({ operationId }) => ({
      operationId,
      domain: 'items',
      method: operationId === 'remove_item' ? 'removeItem' : 'listEntities',
      classification: 'read',
      safetyOverrideReason: null,
    })),
    outputDirectory,
    outputPath: (target) => join(outputDirectory, target),
    provenance: {
      ...provenance,
      appliedCorrections: [],
      facadeCatalog: { path: 'openapi/config/naming-overrides.json', sha256: 'd'.repeat(64) },
      facadeReviewReport: {
        path: 'docs/generated/facade-naming-review.md',
        sha256: 'e'.repeat(64),
      },
      sourceSha256: 'e'.repeat(64),
      specificationUrl: 'https://example.test/openapi.json',
    },
  };
}

function reversed<Value>(values: readonly Value[]): Value[] {
  const result: Value[] = [];
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];
    if (value !== undefined) result.push(value);
  }
  return result;
}
