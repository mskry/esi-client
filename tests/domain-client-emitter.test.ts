import { cp, mkdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { build } from 'esbuild';
import { describe, expect, it } from 'vitest';

import {
  DEFAULT_ESI_BASE_URL,
  EsiClientConfiguration,
  PINNED_ESI_COMPATIBILITY_DATE,
} from '../src/client/configuration.js';
import {
  domainClientSourceComponent,
  renderDomainClientArtifacts,
  validateDomainClientArtifacts,
} from '../scripts/generate/domain-client.mjs';
import type {
  NormalizedOpenApiModel,
  NormalizedOperation,
  NormalizedParameter,
} from '../scripts/generate/normalize.mjs';
import type { ResolvedOperationMetadata } from '../scripts/generate/operation-metadata.mjs';
import type { EmitterContext } from '../scripts/generate/orchestrate.mjs';
import { createGeneratedSourceEmitter } from '../scripts/generate/source-emitter.mjs';
import { operationRegistrySourceComponent } from '../scripts/generate/operation-registry.mjs';
import { zodSchemaSourceComponent } from '../scripts/generate/zod-schema.mjs';
import { makeTemporaryDirectory } from './helpers/temporary-directory.js';
import { expectIsolatedDeclarationsCompilation } from './helpers/typescript.js';

const provenance = {
  compatibilityDate: '2026-08-18',
  sha256: 'f'.repeat(64),
};

describe('generated domain clients', () => {
  it('renders deterministic positional identifiers, final options, descriptors, and coverage', () => {
    const model = representativeModel();
    const metadata = representativeMetadata();
    const first = renderDomainClientArtifacts(model, metadata, provenance);
    const second = renderDomainClientArtifacts(
      { ...model, operations: reversed(model.operations) },
      reversed(metadata),
      provenance,
    );

    expect(second).toEqual(first);
    expect(first.domains).toHaveLength(1);
    expect(first.rootIndexSource).toContain("export * from './esi-client.js';");
    expect(first.rootIndexSource).toContain("export * from './domains/index.js';");
    expect(first.rootIndexSource).toContain("export * from './schemas/index.js';");
    expect(first.clientSource).toContain('export class EsiClient extends EsiClientBase');
    expect(first.clientSource).toContain('/** Operations for the ESI `items` domain. */');
    expect(first.clientSource).toContain('readonly items: ItemsDomainClient;');
    expect(first.clientSource).toContain('this.items = bindItemsDomainClient(this.configuration);');
    expect(first.indexSource).toContain("export * from './items.js';");
    expect(first.indexSource).not.toContain('operation-coverage');
    expect(first.domains[0]?.contractSource).toContain('export interface ItemsDomainClient');
    expect(first.domains[0]?.contractSource).toContain(
      'getItem(itemId: NonNullable<GetItemInput[\'path\']>["item_id"], options?: GetItemOptions)',
    );
    expect(first.domains[0]?.contractSource).toContain('readonly "page"?:');
    expect(first.domains[0]?.contractSource).toContain('readonly "ifNoneMatch"?:');
    expect(first.domains[0]?.contractSource).toContain('readonly "compatibilityDate"?: string;');
    expect(first.domains[0]?.contractSource).not.toContain('acceptLanguage');
    expect(first.domains[0]?.contractSource).toContain(
      'createItem(options: CreateItemOptions): Promise<CreateItemOutput>',
    );
    expect(first.domains[0]?.contractSource).toContain(
      'withMetadata(): ItemsDomainClientWithMetadata',
    );
    expect(first.domains[0]?.domainSource).toContain(
      'export function createItemsClient(options: EsiClientOptions = {})',
    );
    expect(first.domains[0]?.domainSource).not.toContain('bindItemsDomainClient(configuration');
    expect(first.domains[0]?.implementationSource).toContain(
      'export function bindItemsDomainClient(configuration: EsiClientConfiguration)',
    );
    expect(first.domains[0]?.implementationSource).toContain(
      'class ItemsDomainClientImplementation implements ItemsDomainClient',
    );
    expect(first.domains[0]?.implementationSource.match(/const arguments_:/gu)).toHaveLength(2);
    expect(first.domains[0]?.implementationSource).toContain(
      'return this.#metadata.getItem(itemId, options).then((response) => response.data);',
    );
    expect(first.domains[0]?.descriptorSource).toContain(
      'transport: { compatibilityDateOverride: true }',
    );
    expect(first.domains[0]?.descriptorSource).not.toContain('X-Compatibility-Date');
    expect(first.contractsSource.match(/^  readonly "(?:Create|Get)Item": \{$/gmu)).toHaveLength(2);
    expect(first.contractsSource).toContain(
      'IsExact<keyof GeneratedDomainOperationCoverage, keyof GeneratedOperationSignatures>',
    );
    const sources = [
      first.clientSource,
      first.contractsSource,
      first.indexSource,
      first.rootIndexSource,
      ...first.domains.flatMap(
        ({ contractSource, descriptorSource, domainSource, implementationSource }) => [
          contractSource,
          descriptorSource,
          domainSource,
          implementationSource,
        ],
      ),
    ];
    for (const source of sources) expect(source).not.toMatch(/[ \t]+$/mu);
  });

  it('emits clients that compile against maintained transport and execute representative calls', async () => {
    const directory = await makeTemporaryDirectory('esi-client-domain-runtime-');
    const outputDirectory = join(directory, 'outputs');
    const sourceDirectory = join(outputDirectory, 'src/generated');
    const model = representativeModel();
    const context = emitterContext(outputDirectory, model);
    const emitter = createGeneratedSourceEmitter([
      zodSchemaSourceComponent,
      domainClientSourceComponent,
      operationRegistrySourceComponent,
    ]);

    await emitter.emit(context);
    await mkdir(join(outputDirectory, 'src'), { recursive: true });
    await cp(join(process.cwd(), 'src/client'), join(outputDirectory, 'src/client'), {
      recursive: true,
    });
    await expectIsolatedDeclarationsCompilation(outputDirectory);

    const bundlePath = join(outputDirectory, 'items.mjs');
    await build({
      bundle: true,
      entryPoints: [join(sourceDirectory, 'index.ts')],
      format: 'esm',
      nodePaths: [join(process.cwd(), 'node_modules')],
      outfile: bundlePath,
      platform: 'node',
      target: 'node22',
    });
    const imported: unknown = await import(pathToFileURL(bundlePath).href);
    const module = assertDomainModule(imported);
    const requests: Request[] = [];
    const configuration = new EsiClientConfiguration({
      baseUrl: 'https://esi.example.test',
      token: 'secret-token',
      validateRequests: true,
      fetch: async (input, init) => {
        const request = new Request(input, init);
        requests.push(request);
        const body = request.method === 'POST' ? { id: 9, name: 'created' } : { id: 7 };
        return new Response(JSON.stringify(body), {
          status: 200,
          headers: { 'content-type': 'application/json', 'x-pages': '4' },
        });
      },
    });
    const domainClient = module.createItemsClient({ fetch: configuration.fetch });
    const minimalClient = new module.EsiClient();
    const client = new module.EsiClient({
      baseUrl: 'https://esi.example.test',
      token: 'secret-token',
      validateRequests: true,
      fetch: configuration.fetch,
    });

    expect(minimalClient.configuration).toMatchObject({
      baseUrl: DEFAULT_ESI_BASE_URL,
      compatibilityDate: PINNED_ESI_COMPATIBILITY_DATE,
    });
    expect(client.configuration).toMatchObject({
      baseUrl: 'https://esi.example.test',
      compatibilityDate: '2026-08-18',
    });
    expect(Object.isFrozen(client)).toBe(true);
    expect(Object.isFrozen(client.configuration)).toBe(true);
    expect(Object.isFrozen(client.items)).toBe(true);
    expect(Object.isFrozen(client.items.withMetadata())).toBe(true);
    expect(client.items.withMetadata()).toBe(client.items.withMetadata());
    expect(() => {
      (client as { items: RuntimeItemsDomainClient }).items = domainClient;
    }).toThrow(TypeError);

    await expect(
      client.items.getItem(7, {
        compatibilityDate: '2026-08-19',
        ifNoneMatch: 'item-etag',
        page: 2,
        xTenant: 'tranquility',
      }),
    ).resolves.toMatchObject({ id: 7 });
    expect(requests[0]?.url).toBe('https://esi.example.test/items/7?page=2');
    expect(requests[0]?.headers.get('if-none-match')).toBe('item-etag');
    expect(requests[0]?.headers.get('x-compatibility-date')).toBe('2026-08-19');
    expect(requests[0]?.headers.get('x-tenant')).toBe('tranquility');

    await expect(client.items.withMetadata().getItem(7)).resolves.toMatchObject({
      data: { id: 7 },
      meta: { status: 200, pagination: { pages: 4 } },
    });

    await expect(client.items.createItem({ body: { name: 'created' } })).resolves.toMatchObject({
      id: 9,
      name: 'created',
    });
    expect(configuration.allowGenericMutations).toBe(false);
    expect(requests[2]?.method).toBe('POST');
    expect(requests[2]?.headers.get('authorization')).toBe('Bearer secret-token');
    await expect(requests[2]?.json()).resolves.toEqual({ name: 'created' });
  });

  it('rejects metadata gaps and facade option collisions', () => {
    const model = representativeModel();
    expect(() => renderDomainClientArtifacts(model, [], provenance)).toThrow(
      'does not cover every domain operation',
    );

    const operation = makeOperation('Collision', 'GET', '/collision', [
      compatibilityDateParameter(),
      parameter('compatibility_date', 'query', false, { type: 'string' }),
    ]);
    expect(() =>
      renderDomainClientArtifacts(
        normalized([operation]),
        [operationMetadata('Collision', 'collision')],
        provenance,
      ),
    ).toThrow('Facade option collision');

    const configurationDomainOperation = makeOperation(
      'ConfigurationDomain',
      'GET',
      '/configuration',
      [compatibilityDateParameter()],
    );
    expect(() =>
      renderDomainClientArtifacts(
        normalized([configurationDomainOperation]),
        [
          {
            ...operationMetadata('ConfigurationDomain', 'getConfiguration'),
            domain: 'configuration',
          },
        ],
        provenance,
      ),
    ).toThrow('EsiClient domain property collision: configuration');
  });

  it('rejects missing factories and cross-domain descriptor schema imports', () => {
    const artifacts = renderDomainClientArtifacts(
      representativeModel(),
      representativeMetadata(),
      provenance,
    );
    const domain = artifacts.domains[0];
    if (domain === undefined) throw new Error('Missing domain fixture');
    expect(() =>
      validateDomainClientArtifacts({
        ...artifacts,
        domains: [{ ...domain, domainSource: 'export {};' }],
      }),
    ).toThrow('Missing domain factory');
    expect(() =>
      validateDomainClientArtifacts({
        ...artifacts,
        domains: [
          {
            ...domain,
            descriptorSource: domain.descriptorSource.replace(
              '../../schemas/operations/items.js',
              '../../schemas/operations/other.js',
            ),
          },
        ],
      }),
    ).toThrow('outside its domain');
  });
});

interface RuntimeItemsDomainClient {
  getItem(
    itemId: number,
    options?: {
      readonly compatibilityDate?: string;
      readonly ifNoneMatch?: string;
      readonly page?: number;
      readonly xTenant?: string;
    },
  ): Promise<unknown>;
  createItem(options: { readonly body: { readonly name: string } }): Promise<unknown>;
  withMetadata(): RuntimeItemsDomainClient;
}

interface RuntimeDomainModule {
  readonly EsiClient: new (options?: {
    readonly baseUrl?: string;
    readonly fetch?: typeof fetch;
    readonly token?: string;
    readonly validateRequests?: boolean;
  }) => {
    readonly configuration: EsiClientConfiguration;
    readonly items: RuntimeItemsDomainClient;
  };
  readonly createItemsClient: (options?: {
    readonly fetch?: typeof fetch;
  }) => RuntimeItemsDomainClient;
}

function assertDomainModule(value: unknown): RuntimeDomainModule {
  if (
    value === null ||
    typeof value !== 'object' ||
    !('EsiClient' in value) ||
    typeof value.EsiClient !== 'function' ||
    !('createItemsClient' in value) ||
    typeof value.createItemsClient !== 'function'
  ) {
    throw new TypeError('Generated items domain module is invalid');
  }
  // The runtime shape was checked above.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return value as unknown as RuntimeDomainModule;
}

function representativeModel(): NormalizedOpenApiModel {
  const getItem = makeOperation('GetItem', 'GET', '/items/{item_id}', [
    parameter('item_id', 'path', true, { type: 'integer', format: 'int64' }),
    parameter('page', 'query', false, { type: 'integer', format: 'int32' }),
    parameter('Accept-Language', 'header', false, { type: 'string' }),
    parameter('If-None-Match', 'header', false, { type: 'string' }),
    compatibilityDateParameter(),
    parameter('X-Tenant', 'header', false, { type: 'string' }),
  ]);
  const createItem = {
    ...makeOperation('CreateItem', 'POST', '/items', [compatibilityDateParameter()]),
    requestBody: {
      required: true,
      description: null,
      content: [
        {
          mediaType: 'application/json',
          schema: {
            type: 'object',
            required: ['name'],
            properties: { name: { type: 'string' } },
          },
          extensions: {},
        },
      ],
      extensions: {},
    },
    security: [{ schemes: [{ name: 'OAuth2', scopes: ['esi-items.write.v1'] }] }],
  } satisfies NormalizedOperation;
  return {
    ...normalized([getItem, createItem]),
    models: [
      {
        name: 'Item',
        pointer: '#/components/schemas/Item',
        schema: {
          type: 'object',
          required: ['id'],
          properties: { id: { type: 'integer' }, name: { type: 'string' } },
        },
      },
    ],
  };
}

function representativeMetadata(): ResolvedOperationMetadata[] {
  return [
    operationMetadata('CreateItem', 'createItem', 'mutation'),
    operationMetadata('GetItem', 'getItem'),
  ];
}

function operationMetadata(
  operationId: string,
  method: string,
  classification: 'mutation' | 'read' = 'read',
): ResolvedOperationMetadata {
  return {
    operationId,
    domain: 'items',
    method,
    classification,
    safetyOverrideReason: null,
  };
}

function makeOperation(
  operationId: string,
  method: NormalizedOperation['method'],
  path: string,
  parameters: readonly NormalizedParameter[],
): NormalizedOperation {
  return {
    operationId,
    method,
    path,
    domainSource: 'Items',
    tags: ['Items'],
    summary: null,
    description: null,
    parameters,
    requestBody: null,
    successResponses: [
      {
        status: '200',
        description: 'Success',
        noContent: false,
        content: [
          {
            mediaType: 'application/json',
            schema: { $ref: '#/components/schemas/Item' },
            extensions: {},
          },
        ],
        headers: [],
        extensions: {},
      },
    ],
    security: [],
    pagination: { kind: 'none', requestParameters: [], responseHeaders: [] },
    cache: { responseHeaders: [], extensions: {} },
    extensions: { 'x-compatibility-date': '2026-08-18' },
  };
}

function compatibilityDateParameter(): NormalizedParameter {
  return parameter('X-Compatibility-Date', 'header', true, {
    type: 'string',
    format: 'date',
    enum: ['2026-08-18'],
  });
}

function parameter(
  name: string,
  placement: NormalizedParameter['placement'],
  required: boolean,
  schema: NormalizedParameter['schema'],
): NormalizedParameter {
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

function normalized(operations: readonly NormalizedOperation[]): NormalizedOpenApiModel {
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

function emitterContext(
  outputDirectory: string,
  normalizedModel: NormalizedOpenApiModel,
): EmitterContext {
  return {
    compatibilityDate: provenance.compatibilityDate,
    correctedDocument: {},
    normalizedModel,
    namingReviewReport: 'test naming review\n',
    operationMetadata: representativeMetadata(),
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
