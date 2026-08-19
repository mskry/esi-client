import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';

import type {
  NormalizedModel,
  NormalizedOpenApiModel,
  NormalizedOperation,
  NormalizedSchema,
} from '../scripts/generate/normalize.mjs';
import type { EmitterContext } from '../scripts/generate/orchestrate.mjs';
import { createGeneratedSourceEmitter } from '../scripts/generate/source-emitter.mjs';
import {
  createSchemaDependencyModel,
  emitZodSchemaSource,
  emitZodSchemaExpression,
  renderZodOperationSchemaModule,
  renderZodModelDependencyModule,
  renderZodSchemaContractsModule,
  renderZodSchemaModule,
  ZodSchemaEmissionError,
  zodSchemaSourceComponent,
} from '../scripts/generate/zod-schema.mjs';
import { makeTemporaryDirectory } from './helpers/temporary-directory.js';
import { executeTypeScript, expectIsolatedDeclarationsCompilation } from './helpers/typescript.js';

const provenance = {
  compatibilityDate: '2026-08-18',
  sha256: 'b'.repeat(64),
};

describe('Zod schema emitter', () => {
  it('emits deterministic constrained primitive, literal, array, and nullable expressions', () => {
    expect(
      emitZodSchemaExpression({
        type: 'string',
        minLength: 2,
        maxLength: 8,
        pattern: '^[a-z]+$',
      }),
    ).toBe('z.string().min(2).max(8).regex(new RegExp("^[a-z]+$", \'u\'))');
    expect(emitZodSchemaExpression({ type: 'integer', format: 'int32', minimum: 1 })).toBe(
      'z.int32().min(1)',
    );
    expect(emitZodSchemaExpression({ type: 'number', format: 'double', maximum: 10 })).toBe(
      'z.number().max(10)',
    );
    expect(emitZodSchemaExpression({ type: 'string', format: 'date' })).toBe('z.iso.date()');
    expect(emitZodSchemaExpression({ type: 'string', format: 'date-time' })).toBe(
      'z.iso.datetime({ offset: true })',
    );
    expect(emitZodSchemaExpression({ type: 'string', enum: ['red', 'blue'] })).toBe(
      'z.intersection(z.string(), z.literal(["red", "blue"]))',
    );
    expect(emitZodSchemaExpression({ type: ['null', 'boolean'] })).toBe('z.boolean().nullable()');
    expect(emitZodSchemaExpression({ type: 'integer', nullable: true })).toBe('z.int().nullable()');
    expect(emitZodSchemaExpression({ description: 'JSON-native value' })).toBe('z.json()');
  });

  it('compiles and evaluates refs, loose objects, formats, catchalls, and compositions', async () => {
    const module = await compileModule(renderZodSchemaModule(representativeModels(), provenance));

    const parsed = module.EntitySchema.parse({
      id: 7,
      created_at: '2026-08-18T12:30:00+02:00',
      birthday: '2026-08-18',
      labels: ['first', 'second'],
      nested: [{ enabled: true, extra: 'preserved' }],
      extra: { retained: true },
    });
    expect(parsed).toEqual({
      id: 7,
      created_at: '2026-08-18T12:30:00+02:00',
      birthday: '2026-08-18',
      labels: ['first', 'second'],
      nested: [{ enabled: true, extra: 'preserved' }],
      extra: { retained: true },
    });
    expect(typeof parsed.created_at).toBe('string');
    expect(module.EntitySchema.safeParse({ id: 0 }).success).toBe(false);
    expect(module.EntitySchema.safeParse({ id: 1, created_at: 'not-a-date' }).success).toBe(false);
    expect(module.EntitySchema.safeParse({ id: 1, birthday: new Date() }).success).toBe(false);
    expect(module.EntitySchema.safeParse({ id: 1, labels: ['same', 'same'] }).success).toBe(false);
    expect(module.EntitySchema.safeParse({ id: 1, nested: [{ enabled: 'wrong' }] }).success).toBe(
      false,
    );

    expect(module.IntersectionSchema.parse({ left: 'yes', right: 2, unknown: true })).toEqual({
      left: 'yes',
      right: 2,
      unknown: true,
    });
    expect(module.ExclusiveSchema.safeParse(1).success).toBe(false);
    expect(module.ExclusiveSchema.safeParse(1.5).success).toBe(true);
    expect(module.AnySchema.safeParse('value').success).toBe(true);
    expect(module.AnySchema.safeParse(false).success).toBe(true);
    expect(module.AnySchema.safeParse(1).success).toBe(false);
    expect(module.NullableSchema.parse(null)).toBeNull();
    expect(module.ConstSchema.safeParse('fixed').success).toBe(true);
    expect(module.ConstSchema.safeParse('other').success).toBe(false);
    expect(module.DictionarySchema.parse({ alpha: 1, beta: 2 })).toEqual({ alpha: 1, beta: 2 });
    expect(module.DictionarySchema.safeParse({ alpha: 'wrong' }).success).toBe(false);
    expect(module.JsonValueSchema.safeParse({ nested: [true, null] }).success).toBe(true);
    expect(module.JsonValueSchema.safeParse(new Date()).success).toBe(false);
  });

  it('produces byte-stable modules independent of model and property insertion order', () => {
    const models = representativeModels();
    const first = renderZodSchemaModule(models, provenance);
    const reordered: NormalizedModel[] = [];
    for (let index = models.length - 1; index >= 0; index -= 1) {
      const entry = models[index];
      if (entry) reordered.push(entry);
    }
    const second = renderZodSchemaModule(reordered, provenance);

    expect(second).toBe(first);
    expect(
      emitZodSchemaExpression({
        type: 'object',
        properties: { zeta: { type: 'string' }, alpha: { type: 'boolean' } },
      }),
    ).toBe(
      emitZodSchemaExpression({
        properties: { alpha: { type: 'boolean' }, zeta: { type: 'string' } },
        type: 'object',
      }),
    );
    expect(first).not.toMatch(/z\.(?:any|unknown)\(/u);
    expect(first.indexOf('export const IdSchema')).toBeLessThan(
      first.indexOf('export const EntitySchema'),
    );
  });

  it.each([
    [{ type: 'string', format: 'binary' }, '#/response', 'Unsupported string format'],
    [{ type: 'object', additionalProperties: false }, '#/response', 'forward-compatible'],
    [{ type: 'array' }, '#/response', 'Array items are required'],
    [{ type: ['string', 'number'] }, '#/response', 'one value type plus null'],
    [{ type: 'boolean', minimum: 1 }, '#/response', 'minimum requires type'],
    [{ type: 'string', not: { type: 'null' } }, '#/response', 'Unsupported schema keyword'],
    [true, '#/response', 'Boolean schema true is unsupported'],
  ] as const)('fails closed with the schema path for %#', (schema, path, message) => {
    expect(() => emitZodSchemaExpression(schema, { path })).toThrow(message);
    let thrown: unknown;
    try {
      emitZodSchemaExpression(schema, { path });
    } catch (error) {
      thrown = error;
    }
    expect(thrown).toBeInstanceOf(ZodSchemaEmissionError);
    expect(thrown).toMatchObject({ path: expect.stringMatching(/^#\/response/u) });
    expect(thrown).toHaveProperty('message', expect.stringContaining('#/response'));
  });

  it('reports unresolved and recursive references at the exact ref path', () => {
    expect(() =>
      emitZodSchemaExpression(
        { $ref: '#/components/schemas/Missing' },
        { path: '#/response', references: {} },
      ),
    ).toThrow(
      'Unresolved local component reference "#/components/schemas/Missing" at #/response/$ref',
    );

    expect(() =>
      renderZodSchemaModule(
        [
          model('Node', {
            type: 'object',
            properties: {
              children: {
                type: 'array',
                items: { $ref: '#/components/schemas/Node' },
              },
            },
          }),
        ],
        provenance,
      ),
    ).toThrow(
      'Recursive component references are unsupported: Node -> Node at #/components/schemas/Node/properties/children/items/$ref',
    );
  });

  it('emits executable request, collection, composed, nullable, status-specific, and no-content schemas', async () => {
    const models = operationModels();
    const operations = representativeOperations();
    const source = renderZodOperationSchemaModule(operations, models, provenance);
    const module = await compileSchemaModules(models, operations);

    expect(
      module.ListItemsRequestSchema.parse({
        path: { owner_id: 7 },
        query: { page: 2 },
        body: { name: 'replacement' },
      }),
    ).toEqual({
      path: { owner_id: 7 },
      query: { page: 2 },
      body: { name: 'replacement' },
    });
    expect(module.ListItemsRequestSchema.safeParse({ path: {} }).success).toBe(false);
    expect(
      module.ListItemsStatus200SuccessResponseSchema.parse([{ id: 1, extra: 'preserved' }]),
    ).toEqual([{ id: 1, extra: 'preserved' }]);
    expect(
      module.ListItemsStatus200SuccessResponseSchema.safeParse([{ id: 'wrong' }]).success,
    ).toBe(false);
    expect(module.GetComposedSuccessResponseSchema.parse({ id: 4, label: null })).toEqual({
      id: 4,
      label: null,
    });
    expect(module.RemoveItemSuccessResponseSchema.parse(undefined)).toBeUndefined();
    expect(module.RemoveItemSuccessResponseSchema.safeParse(null).success).toBe(false);
    expect(module.GetOptionalSuccessResponseSchemasByStatus).toEqual({
      '200': module.GetOptionalStatus200SuccessResponseSchema,
      '204': module.GetOptionalStatus204SuccessResponseSchema,
    });
    expect(module.GetOptionalSuccessResponseSchema.safeParse('available').success).toBe(true);
    expect(module.GetOptionalSuccessResponseSchema.safeParse(undefined).success).toBe(true);
    expect(source).toMatch(
      /export const RemoveItemStatus204SuccessResponseSchema: z\.ZodType<undefined, undefined> = z\.undefined\(\);/u,
    );
    expect(source).toMatch(
      /export const ListItemsStatus200SuccessResponseSchema: z\.ZodType<Array<Item>, Array<ItemInput>> = z\.array\(ItemSchema\);/u,
    );
    expect(source).toContain(
      'export type ListItemsInput = z.input<typeof ListItemsRequestSchema>;',
    );
    expect(source).toContain(
      'export type ListItemsOutput = z.output<typeof ListItemsSuccessResponseSchema>;',
    );
  });

  it('renders operation schemas byte-stably and selects equivalent JSON content deterministically', () => {
    const models = operationModels();
    const operation = makeOperation('content_operation', {
      requestBody: {
        required: false,
        description: null,
        content: [
          media('application/vnd.esi+json', { type: 'string' }),
          media('text/plain', { type: 'string' }),
          media('application/json', { type: 'string' }),
        ],
        extensions: {},
      },
      successResponses: [response('200', { type: 'string' })],
    });
    const earlierOperation = makeOperation('alpha_operation');

    const first = renderZodOperationSchemaModule([earlierOperation, operation], models, provenance);
    const reorderedModels: NormalizedModel[] = [];
    for (let index = models.length - 1; index >= 0; index -= 1) {
      const entry = models[index];
      if (entry) reorderedModels.push(entry);
    }
    const second = renderZodOperationSchemaModule(
      [operation, earlierOperation],
      reorderedModels,
      provenance,
    );

    expect(second).toBe(first);
    expect(first).toContain('"body": z.string().optional()');
  });

  it('computes deterministic transitive model and domain dependency closures', () => {
    const models = [
      model('Leaf', { type: 'string' }),
      model('Branch', {
        type: 'object',
        properties: { leaf: { $ref: '#/components/schemas/Leaf' } },
      }),
      model('Root', {
        type: 'array',
        items: { $ref: '#/components/schemas/Branch' },
      }),
    ];
    const operation = makeOperation('get_tree', {
      successResponses: [response('200', { $ref: '#/components/schemas/Root' })],
    });
    const metadata = [
      {
        operationId: 'get_tree',
        domain: 'trees',
        method: 'get',
        classification: 'read' as const,
        safetyOverrideReason: null,
      },
    ];

    const first = createSchemaDependencyModel(models, [operation], metadata);
    const second = createSchemaDependencyModel(
      [models[2], models[1], models[0]],
      [operation],
      metadata,
    );

    expect(second).toEqual(first);
    expect(first.models.find(({ model: entry }) => entry.name === 'Root')).toMatchObject({
      dependencies: ['Branch', 'Leaf'],
      directDependencies: ['Branch'],
      fileName: 'root',
    });
    expect(first.operations[0]).toMatchObject({
      dependencies: ['Branch', 'Leaf', 'Root'],
      directDependencies: ['Root'],
      domain: 'trees',
    });
    expect(first.domains[0]).toMatchObject({
      dependencies: ['Branch', 'Leaf', 'Root'],
      fileName: 'trees',
    });
    expect(renderZodModelDependencyModule(models[2], models, provenance)).toContain(
      "from './branch.js'",
    );
  });

  it('rejects unresolved granular dependencies and duplicate operation exports', () => {
    expect(() =>
      createSchemaDependencyModel([model('Broken', { $ref: '#/components/schemas/Missing' })], []),
    ).toThrow('Unresolved local component reference');
    expect(() =>
      createSchemaDependencyModel([], [makeOperation('get-item'), makeOperation('get item')]),
    ).toThrow('Operation schema name collision');
  });

  it.each([
    [
      'conflicting JSON request representations',
      makeOperation('conflicting_request', {
        requestBody: {
          required: true,
          description: null,
          content: [
            media('application/json', { type: 'string' }),
            media('application/vnd.esi+json', { type: 'integer' }),
          ],
          extensions: {},
        },
      }),
      'JSON representations have incompatible schemas',
    ],
    [
      'non-JSON success content',
      makeOperation('non_json', {
        successResponses: [
          {
            ...response('200', { type: 'string' }),
            content: [media('text/plain', { type: 'string' })],
          },
        ],
      }),
      'Content has no JSON representation',
    ],
    [
      'overlapping exact and wildcard statuses',
      makeOperation('overlapping', {
        successResponses: [
          response('200', { type: 'string' }),
          response('2XX', { type: 'number' }),
        ],
      }),
      'status 2XX overlaps an exact status',
    ],
  ])('fails closed for %s', (_case, operation, message) => {
    expect(() =>
      renderZodOperationSchemaModule([operation], operationModels(), provenance),
    ).toThrow(message);
  });

  it('writes schemas as one component of a singly claimed generated source tree', async () => {
    const directory = await makeTemporaryDirectory('esi-client-source-emitter-');
    const outputDirectory = join(directory, 'outputs');
    const normalized = normalizedModel(operationModels(), representativeOperations());
    const methodsByOperationId: Readonly<Record<string, string>> = {
      get_composed: 'getComposed',
      get_optional: 'getOptional',
      list_items: 'listItems',
      remove_item: 'removeItem',
    };
    const operationMetadata = normalized.operations.map((operation) => ({
      operationId: operation.operationId,
      domain: 'items',
      method: methodsByOperationId[operation.operationId] ?? 'unknownOperation',
      classification: 'read' as const,
      safetyOverrideReason: null,
    }));
    const context: EmitterContext = {
      compatibilityDate: provenance.compatibilityDate,
      correctedDocument: {},
      normalizedModel: normalized,
      namingReviewReport: 'test naming review\n',
      operationMetadata,
      outputDirectory,
      provenance: {
        ...provenance,
        appliedCorrections: [],
        facadeCatalog: { path: 'openapi/config/naming-overrides.json', sha256: 'd'.repeat(64) },
        facadeReviewReport: {
          path: 'docs/generated/facade-naming-review.md',
          sha256: 'e'.repeat(64),
        },
        sourceSha256: 'c'.repeat(64),
        specificationUrl: 'https://example.test/openapi.json',
      },
      outputPath: (target: string) => join(outputDirectory, target),
    };
    const siblingComponent = {
      name: 'future-barrel',
      async emit(_context: EmitterContext, sourceDirectory: string) {
        await writeFile(join(sourceDirectory, 'future.ts'), 'export {};\n');
        return ['future.ts'];
      },
    };
    const emitter = createGeneratedSourceEmitter([zodSchemaSourceComponent, siblingComponent]);

    await expect(emitter.emit(context)).resolves.toEqual([
      { target: 'src/generated', kind: 'directory' },
    ]);
    await expect(
      readFile(join(outputDirectory, 'src/generated/schemas/models.ts'), 'utf8'),
    ).resolves.toContain("export * from './models/item.js';");
    await expect(
      readFile(join(outputDirectory, 'src/generated/schemas/models/item.ts'), 'utf8'),
    ).resolves.toContain('export const ItemSchema');
    await expect(
      readFile(join(outputDirectory, 'src/generated/schemas/operations.ts'), 'utf8'),
    ).resolves.toContain("export * from './operations/items.js';");
    await expect(
      readFile(join(outputDirectory, 'src/generated/schemas/operations/items.ts'), 'utf8'),
    ).resolves.toContain('export const ListItemsRequestSchema');
    await expect(
      readFile(join(outputDirectory, 'src/generated/schemas/index.ts'), 'utf8'),
    ).resolves.toContain("export * from './operations.js';");
    await expect(
      readFile(join(outputDirectory, 'src/generated/schemas/contracts.ts'), 'utf8'),
    ).resolves.toContain('export interface GeneratedDomainSignatures');
    await expect(readFile(join(outputDirectory, 'src/generated/future.ts'), 'utf8')).resolves.toBe(
      'export {};\n',
    );

    const directDirectory = join(directory, 'direct');
    await mkdir(directDirectory, { recursive: true });
    await expect(emitZodSchemaSource(context, directDirectory)).resolves.toEqual(
      expect.arrayContaining([
        'schemas/contracts.ts',
        'schemas/index.ts',
        'schemas/models/item.ts',
        'schemas/models.ts',
        'schemas/operations/items.ts',
        'schemas/operations.ts',
      ]),
    );
    await expectIsolatedDeclarationsCompilation(directDirectory);

    await writeFile(
      join(directDirectory, 'mismatch.ts'),
      `import type { AssertGeneratedDomainSignature } from './schemas/contracts.js';

export type Mismatch = AssertGeneratedDomainSignature<
  'items',
  'listItems',
  { readonly input: string; readonly output: number }
>;
`,
    );
    await expect(executeTypeScript(directDirectory)).rejects.toMatchObject({
      stdout: expect.stringContaining(
        "Type '{ readonly input: string; readonly output: number; }'",
      ),
    });
  });

  it('renders deterministic operation and domain schema contracts', () => {
    const operations = representativeOperations();
    const metadata = [
      ['get_composed', 'getComposed'],
      ['get_optional', 'getOptional'],
      ['list_items', 'listItems'],
      ['remove_item', 'removeItem'],
    ].map(([operationId, method]) => ({
      operationId: operationId ?? '',
      domain: 'items',
      method: method ?? '',
      classification: 'read' as const,
      safetyOverrideReason: null,
    }));
    const reorderedMetadata = [metadata[3], metadata[1], metadata[0], metadata[2]];
    const source = renderZodSchemaContractsModule(operations, reorderedMetadata, provenance);

    expect(source).toContain(
      'readonly "list_items": OperationTypeContract<ListItemsInput, ListItemsOutput>;',
    );
    expect(source).toContain('readonly "listItems": GeneratedOperationSignatures["list_items"];');
    const reorderedOperations = [operations[2], operations[0], operations[3], operations[1]];
    expect(renderZodSchemaContractsModule(reorderedOperations, metadata, provenance)).toBe(source);
  });
});

function representativeModels(): NormalizedModel[] {
  return [
    model('Entity', {
      type: 'object',
      required: ['id'],
      properties: {
        labels: {
          type: 'array',
          items: { type: 'string' },
          minItems: 1,
          uniqueItems: true,
        },
        nested: {
          type: 'array',
          items: {
            type: 'object',
            required: ['enabled'],
            properties: { enabled: { type: 'boolean' } },
          },
        },
        birthday: { type: 'string', format: 'date' },
        created_at: { type: 'string', format: 'date-time' },
        id: { $ref: '#/components/schemas/Id' },
      },
    }),
    model('Id', { type: 'integer', format: 'int64', minimum: 1, maximum: 100 }),
    model('Intersection', {
      allOf: [
        {
          type: 'object',
          required: ['left'],
          properties: { left: { type: 'string' } },
        },
        {
          type: 'object',
          required: ['right'],
          properties: { right: { type: 'number' } },
        },
      ],
    }),
    model('Exclusive', {
      oneOf: [{ type: 'number' }, { type: 'integer' }],
    }),
    model('Any', {
      anyOf: [{ type: 'string' }, { type: 'boolean' }],
    }),
    model('Nullable', { type: ['string', 'null'] }),
    model('Const', { type: 'string', const: 'fixed' }),
    model('Dictionary', {
      type: 'object',
      additionalProperties: { type: 'integer' },
    }),
    model('JsonValue', { description: 'JSON-encoded configuration' }),
  ];
}

function model(name: string, schema: NormalizedSchema): NormalizedModel {
  return { name, pointer: `#/components/schemas/${name}`, schema };
}

async function compileModule(source: string): Promise<Record<string, any>> {
  const directory = await makeTemporaryDirectory('esi-client-zod-emitter-');
  const outputPath = join(directory, 'schemas.mjs');
  await build({
    bundle: true,
    format: 'esm',
    outfile: outputPath,
    platform: 'node',
    stdin: {
      contents: source,
      loader: 'ts',
      resolveDir: process.cwd(),
      sourcefile: 'schemas.ts',
    },
    target: 'node22',
  });
  return import(pathToFileURL(outputPath).href);
}

function operationModels(): NormalizedModel[] {
  return [
    model('Item', {
      type: 'object',
      required: ['id'],
      properties: { id: { type: 'integer' } },
    }),
    model('Replacement', {
      allOf: [
        { type: 'object', required: ['name'], properties: { name: { type: 'string' } } },
        { type: 'object', properties: { note: { type: ['string', 'null'] } } },
      ],
    }),
  ];
}

function representativeOperations(): NormalizedOperation[] {
  return [
    makeOperation('list_items', {
      parameters: [
        parameter('owner_id', 'path', true, { type: 'integer' }),
        parameter('page', 'query', false, { type: 'integer', minimum: 1 }),
      ],
      requestBody: {
        required: true,
        description: null,
        content: [media('application/json', { $ref: '#/components/schemas/Replacement' })],
        extensions: {},
      },
      successResponses: [
        response('200', {
          type: 'array',
          items: { $ref: '#/components/schemas/Item' },
        }),
      ],
    }),
    makeOperation('get_composed', {
      successResponses: [
        response('200', {
          allOf: [
            { $ref: '#/components/schemas/Item' },
            {
              type: 'object',
              required: ['label'],
              properties: { label: { type: ['string', 'null'] } },
            },
          ],
        }),
      ],
    }),
    makeOperation('remove_item', { successResponses: [noContentResponse('204')] }),
    makeOperation('get_optional', {
      successResponses: [response('200', { type: 'string' }), noContentResponse('204')],
    }),
  ];
}

function makeOperation(
  operationId: string,
  overrides: Partial<NormalizedOperation> = {},
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
    successResponses: [response('200', { type: 'string' })],
    security: [],
    pagination: { kind: 'none', requestParameters: [], responseHeaders: [] },
    cache: { responseHeaders: [], extensions: {} },
    extensions: {},
    ...overrides,
  };
}

function parameter(
  name: string,
  placement: 'path' | 'query' | 'header' | 'cookie',
  required: boolean,
  schema: NormalizedSchema,
) {
  return {
    name,
    placement,
    required,
    description: null,
    deprecated: false,
    style: null,
    explode: null,
    allowReserved: null,
    schema,
    extensions: {},
  };
}

function media(mediaType: string, schema: NormalizedSchema) {
  return { mediaType, schema, extensions: {} };
}

function response(status: string, schema: NormalizedSchema) {
  return {
    status,
    description: 'Success',
    noContent: false,
    content: [media('application/json', schema)],
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

function normalizedModel(
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

async function compileSchemaModules(
  models: readonly NormalizedModel[],
  operations: readonly NormalizedOperation[],
): Promise<Record<string, any>> {
  const directory = await makeTemporaryDirectory('esi-client-operation-schemas-');
  const modelsPath = join(directory, 'models.ts');
  const operationsPath = join(directory, 'operations.ts');
  const outputPath = join(directory, 'schemas.mjs');
  await Promise.all([
    writeFile(modelsPath, renderZodSchemaModule(models, provenance)),
    writeFile(operationsPath, renderZodOperationSchemaModule(operations, models, provenance)),
  ]);
  await build({
    bundle: true,
    entryPoints: [operationsPath],
    format: 'esm',
    nodePaths: [join(process.cwd(), 'node_modules')],
    outfile: outputPath,
    platform: 'node',
    target: 'node22',
  });
  return import(pathToFileURL(outputPath).href);
}
