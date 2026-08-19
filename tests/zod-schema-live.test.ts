import { cp, mkdir, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';
import { pathToFileURL } from 'node:url';

import { build } from 'esbuild';
import { expect, it } from 'vitest';

import {
  DEFAULT_ESI_BASE_URL,
  PINNED_ESI_COMPATIBILITY_DATE,
} from '../src/client/configuration.js';
import { normalizeOpenApiDocument } from '../scripts/generate/normalize.mjs';
import { resolveOperationMetadata } from '../scripts/generate/operation-metadata.mjs';
import type { EmitterContext } from '../scripts/generate/orchestrate.mjs';
import { generatedSourceEmitter } from '../scripts/generate/source-emitter.mjs';
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
      operationMetadata,
      outputDirectory: directory,
      outputPath: (target) => join(directory, target),
      provenance: {
        ...provenance,
        appliedCorrections: corrected.appliedCorrections,
        sourceSha256: staged.sha256,
        specificationUrl: committedProvenance.specificationUrl,
      },
    };
    await expect(generatedSourceEmitter.emit(context)).resolves.toEqual([
      { target: 'src/generated', kind: 'directory' },
    ]);
    await cp(join(process.cwd(), 'src/client'), join(directory, 'src/client'), {
      recursive: true,
    });

    const domainNames = new Set(operationMetadata.map(({ domain }) => domain));
    const domainFiles = await readdir(join(sourceDirectory, 'domains'));
    const descriptorFiles = await readdir(join(sourceDirectory, 'internal/descriptors'));
    const clientSource = await readFile(join(sourceDirectory, 'esi-client.ts'), 'utf8');
    const rootIndexSource = await readFile(join(sourceDirectory, 'index.ts'), 'utf8');
    const contracts = await readFile(
      join(sourceDirectory, 'domains/operation-coverage.ts'),
      'utf8',
    );
    expect(domainFiles).toHaveLength(domainNames.size + 2);
    expect(descriptorFiles).toHaveLength(domainNames.size);
    expect(rootIndexSource).toContain("export * from './esi-client.js';");
    expect(
      clientSource.match(/^  readonly [A-Za-z][A-Za-z0-9]*: \w+DomainClient;$/gmu),
    ).toHaveLength(domainNames.size);
    expect(contracts.match(/^  readonly "[^"]+": \{$/gmu)).toHaveLength(model.operations.length);
    for (const domain of domainNames) {
      const className = `${capitalize(domain)}DomainClient`;
      expect(clientSource).toContain(`/** Operations for the ESI \`${domain}\` domain. */`);
      expect(clientSource).toContain(`readonly ${domain}: ${className};`);
      expect(clientSource).toContain(`this.${domain} = new ${className}(this.configuration);`);
    }
    for (const { domain, method, operationId } of operationMetadata) {
      expect(contracts).toContain(`readonly ${JSON.stringify(operationId)}: {`);
      expect(contracts).toContain(`readonly domain: ${JSON.stringify(domain)};`);
      expect(contracts).toContain(`readonly method: ${JSON.stringify(method)};`);
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
    await build({
      bundle: true,
      entryPoints: [join(sourceDirectory, 'domains/index.ts')],
      format: 'esm',
      nodePaths: [join(process.cwd(), 'node_modules')],
      outfile: join(directory, 'domains.mjs'),
      platform: 'node',
      target: 'node22',
    });
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
    typeof value.sha256 !== 'string' ||
    typeof value.sourceSha256 !== 'string' ||
    typeof value.specificationUrl !== 'string'
  ) {
    throw new TypeError('Invalid committed generation provenance');
  }
  return Object.freeze({
    appliedCorrections: Object.freeze([...value.appliedCorrections]),
    compatibilityDate: value.compatibilityDate,
    sha256: value.sha256,
    sourceSha256: value.sourceSha256,
    specificationUrl: value.specificationUrl,
  });
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
