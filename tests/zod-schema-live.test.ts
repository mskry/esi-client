import { cp, mkdir, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { build } from 'esbuild';
import { expect, it } from 'vitest';

import {
  DEFAULT_ESI_BASE_URL,
  PINNED_ESI_COMPATIBILITY_DATE,
} from '../src/client/configuration.js';
import { domainFileName } from '../scripts/generate/domain-client.mjs';
import { normalizeOpenApiDocument } from '../scripts/generate/normalize.mjs';
import { resolveOperationMetadata } from '../scripts/generate/operation-metadata.mjs';
import type { EmitterContext } from '../scripts/generate/orchestrate.mjs';
import { generatedSourceEmitter } from '../scripts/generate/source-emitter.mjs';
import { generatedTestsEmitter } from '../scripts/generate/test-emitter.mjs';
import {
  renderZodModelSchemaModule,
  renderZodOperationSchemaModule,
} from '../scripts/generate/zod-schema.mjs';
import { makeTemporaryDirectory } from './helpers/temporary-directory.js';
import { expectIsolatedDeclarationsCompilation } from './helpers/typescript.js';

it(
  'emits every schema and domain operation from the committed corrected ESI specification',
  { timeout: 180_000 },
  async () => {
    const [correctedDocument, committedProvenance] = await Promise.all([
      readFile(join(process.cwd(), 'openapi/generated/esi-openapi.json'), 'utf8').then(
        parseJsonRecord,
      ),
      readFile(join(process.cwd(), 'openapi/generated/provenance.json'), 'utf8').then(
        parseCommittedProvenance,
      ),
    ]);
    const corrected = {
      appliedCorrections: committedProvenance.appliedCorrections,
      document: correctedDocument,
    };
    const staged = {
      compatibilityDate: committedProvenance.compatibilityDate,
      sha256: committedProvenance.sourceSha256,
    };
    const model = await normalizeOpenApiDocument(corrected.document);
    const operationMetadata = await resolveOperationMetadata(model);
    const provenance = {
      compatibilityDate: staged.compatibilityDate,
      sha256: committedProvenance.sha256,
    };
    const modelsSource = renderZodModelSchemaModule(model.models, provenance);
    const operationsSource = renderZodOperationSchemaModule(
      model.operations,
      model.models,
      provenance,
    );

    expect(modelsSource.match(/^export const \w+Schema:/gmu)).toHaveLength(model.models.length);
    expect(operationsSource.match(/^export const \w+RequestSchema:/gmu)).toHaveLength(
      model.operations.length,
    );
    expect(operationsSource.match(/^export const \w+SuccessResponseSchema:/gmu)).toHaveLength(
      model.operations.length +
        model.operations.reduce((total, operation) => total + operation.successResponses.length, 0),
    );
    expect(
      operationsSource.match(/^export const \w+SuccessResponseSchemasByStatus:/gmu),
    ).toHaveLength(model.operations.length);
    expect(operationsSource).toMatch(
      /export const GetContractsPublicBidsContractIdStatus204SuccessResponseSchema: z\.ZodType<undefined, undefined> = z\.undefined\(\);/u,
    );
    expect(operationsSource).toMatch(
      /export const GetContractsPublicItemsContractIdStatus204SuccessResponseSchema: z\.ZodType<undefined, undefined> = z\.undefined\(\);/u,
    );

    const directory = await makeTemporaryDirectory('esi-client-live-schemas-');
    const sourceDirectory = join(directory, 'src/generated');
    await mkdir(sourceDirectory, { recursive: true });
    const context: EmitterContext = {
      compatibilityDate: staged.compatibilityDate,
      correctedDocument: corrected.document,
      normalizedModel: model,
      namingReviewReport: 'test naming review\n',
      operationMetadata,
      outputDirectory: directory,
      outputPath: (target) => join(directory, target),
      provenance: {
        ...provenance,
        appliedCorrections: corrected.appliedCorrections,
        facadeCatalog: committedProvenance.facadeCatalog,
        facadeReviewReport: committedProvenance.facadeReviewReport,
        sourceSha256: staged.sha256,
        specificationUrl: committedProvenance.specificationUrl,
      },
    };
    await expect(generatedSourceEmitter.emit(context)).resolves.toEqual([
      { target: 'src/generated', kind: 'directory' },
    ]);
    await expect(generatedTestsEmitter.emit(context)).resolves.toEqual([
      { target: 'tests/generated', kind: 'directory' },
    ]);
    await cp(join(process.cwd(), 'src/client'), join(directory, 'src/client'), {
      recursive: true,
    });

    const domainNames = new Set(operationMetadata.map(({ domain }) => domain));
    const domainFiles = await readdir(join(sourceDirectory, 'domains'));
    const descriptorFiles = await readdir(join(sourceDirectory, 'internal/descriptors'));
    const implementationFiles = await readdir(join(sourceDirectory, 'internal/domains'));
    const modelFiles = await readdir(join(sourceDirectory, 'schemas/models'));
    const operationSchemaFiles = await readdir(join(sourceDirectory, 'schemas/operations'));
    const clientSource = await readFile(join(sourceDirectory, 'esi-client.ts'), 'utf8');
    const rootIndexSource = await readFile(join(sourceDirectory, 'index.ts'), 'utf8');
    const contracts = await readFile(
      join(directory, 'tests/generated/domain-operation-coverage.ts'),
      'utf8',
    );
    expect(domainFiles).toHaveLength(domainNames.size + 1);
    expect(descriptorFiles).toHaveLength(domainNames.size);
    expect(implementationFiles).toHaveLength(domainNames.size * 2);
    expect(modelFiles).toHaveLength(model.models.length);
    expect(operationSchemaFiles).toHaveLength(domainNames.size);
    expect(rootIndexSource).toContain("export * from './esi-client.js';");
    expect(
      clientSource.match(/^  readonly [A-Za-z][A-Za-z0-9]*: \w+DomainClient;$/gmu),
    ).toHaveLength(domainNames.size);
    expect(contracts.match(/^  readonly [A-Za-z][A-Za-z0-9]*: \{$/gmu)).toHaveLength(
      model.operations.length,
    );
    expect(contracts.match(/^export type \w+DomainClientFactoryAssertion =/gmu)).toHaveLength(
      domainNames.size,
    );
    for (const domain of domainNames) {
      const domainName = capitalize(domain);
      const className = `${domainName}DomainClient`;
      const factoryName = `create${domainName}Client`;
      const fileName = domainFileName(domain);
      const domainSource = await readFile(join(sourceDirectory, `domains/${fileName}.ts`), 'utf8');
      const contractSource = await readFile(
        join(sourceDirectory, `internal/domains/${fileName}-contract.ts`),
        'utf8',
      );
      const descriptorSource = await readFile(
        join(sourceDirectory, `internal/descriptors/${fileName}.ts`),
        'utf8',
      );
      expect(clientSource).toContain(`/** Operations for the ESI \`${domain}\` domain. */`);
      expect(clientSource).toContain(`readonly ${domain}: ${className};`);
      expect(clientSource).toContain(`this.${domain} = bind${className}(this.configuration);`);
      expect(domainSource).toContain(`export function ${factoryName}(`);
      expect(contractSource).toContain(`export interface ${className}`);
      expect(descriptorSource).toContain(`from '../../schemas/operations/${fileName}.js';`);
    }
    for (const { domain, method, operationId } of operationMetadata) {
      expect(contracts).toContain(`readonly ${operationId}: {`);
      expect(contracts).toContain(`readonly domain: '${domain}';`);
      expect(contracts).toContain(`readonly method: '${method}';`);
    }
    await expectIsolatedDeclarationsCompilation(directory);
    const clientBundlePath = join(directory, 'client.mjs');
    await build({
      bundle: true,
      entryPoints: [join(sourceDirectory, 'index.ts')],
      format: 'esm',
      nodePaths: [join(process.cwd(), 'node_modules')],
      outfile: clientBundlePath,
      platform: 'node',
      target: 'node22',
    });
    const generatedModule = assertGeneratedClientModule(
      await import(pathToFileURL(clientBundlePath).href),
    );
    const client = new generatedModule.EsiClient();
    expect(new Set(Object.keys(client))).toEqual(new Set(['configuration', ...domainNames]));
    expect(Object.isFrozen(client)).toBe(true);
    expect(client.configuration).toMatchObject({
      baseUrl: DEFAULT_ESI_BASE_URL,
      compatibilityDate: PINNED_ESI_COMPATIBILITY_DATE,
    });
    for (const domain of domainNames) {
      const domainClient: unknown = client[domain];
      expect(domainClient).toEqual(expect.objectContaining({ withMetadata: expect.any(Function) }));
      expect(Object.isFrozen(domainClient)).toBe(true);
    }
    const domainsBundlePath = join(directory, 'domains.mjs');
    await build({
      bundle: true,
      entryPoints: [join(sourceDirectory, 'domains/index.ts')],
      format: 'esm',
      nodePaths: [join(process.cwd(), 'node_modules')],
      outfile: domainsBundlePath,
      platform: 'node',
      target: 'node22',
    });
    const domainsModule: unknown = await import(pathToFileURL(domainsBundlePath).href);
    if (!isRecord(domainsModule)) throw new TypeError('Generated domains module is invalid');
    for (const domain of domainNames) {
      const domainName = capitalize(domain);
      const factory = domainsModule[`create${domainName}Client`];
      if (typeof factory !== 'function') {
        throw new TypeError(`Missing generated domain factory: ${domain}`);
      }
      const standalone: unknown = factory();
      expect(standalone).toEqual(expect.objectContaining({ withMetadata: expect.any(Function) }));
      expect(Object.isFrozen(standalone)).toBe(true);
    }
  },
);

function capitalize(value: string): string {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

interface GeneratedClientModule {
  readonly EsiClient: new () => Record<string, unknown> & {
    readonly configuration: {
      readonly baseUrl: string;
      readonly compatibilityDate: string;
    };
  };
}

function parseJsonRecord(source: string): Readonly<Record<string, unknown>> {
  const value: unknown = JSON.parse(source);
  if (!isRecord(value)) {
    throw new TypeError('Expected a JSON object');
  }
  return value;
}

function parseCommittedProvenance(source: string): EmitterContext['provenance'] {
  const value = parseJsonRecord(source);
  if (
    !isStringArray(value.appliedCorrections) ||
    typeof value.compatibilityDate !== 'string' ||
    !isProvenanceArtifact(value.facadeCatalog) ||
    !isProvenanceArtifact(value.facadeReviewReport) ||
    typeof value.sha256 !== 'string' ||
    typeof value.sourceSha256 !== 'string' ||
    typeof value.specificationUrl !== 'string'
  ) {
    throw new TypeError('Invalid committed generation provenance');
  }
  return Object.freeze({
    appliedCorrections: Object.freeze([...value.appliedCorrections]),
    compatibilityDate: value.compatibilityDate,
    facadeCatalog: value.facadeCatalog,
    facadeReviewReport: value.facadeReviewReport,
    sha256: value.sha256,
    sourceSha256: value.sourceSha256,
    specificationUrl: value.specificationUrl,
  });
}

function isProvenanceArtifact(
  value: unknown,
): value is EmitterContext['provenance']['facadeCatalog'] {
  return isRecord(value) && typeof value.path === 'string' && typeof value.sha256 === 'string';
}

function isStringArray(value: unknown): value is string[] {
  return Array.isArray(value) && value.every((entry: unknown) => typeof entry === 'string');
}

function isRecord(value: unknown): value is Record<string, unknown> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function assertGeneratedClientModule(value: unknown): GeneratedClientModule {
  if (
    value === null ||
    typeof value !== 'object' ||
    !('EsiClient' in value) ||
    typeof value.EsiClient !== 'function'
  ) {
    throw new TypeError('Generated EsiClient module is invalid');
  }
  // The runtime shape was checked above.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  return value as GeneratedClientModule;
}
