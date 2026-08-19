import { mkdir, readFile, readdir } from 'node:fs/promises';
import { join } from 'node:path';

import { transformSync } from 'esbuild';
import { describe, expect, it } from 'vitest';

import {
  emitStandaloneExamples,
  generatedExamplesEmitter,
  renderOperationSnippets,
  renderStandaloneExamples,
} from '../scripts/generate/examples-emitter.mjs';
import type { NormalizedOpenApiModel } from '../scripts/generate/normalize.mjs';
import { resolveOperationMetadata } from '../scripts/generate/operation-metadata.mjs';
import {
  createSerializableOperationManifest,
  type SerializableOperationManifest,
} from '../scripts/generate/operation-registry.mjs';
import type { EmitterContext, GenerationProvenance } from '../scripts/generate/orchestrate.mjs';
import { makeTemporaryDirectory } from './helpers/temporary-directory.js';

const operationCount = 233;
const domainCount = 39;
const representativePaths = [
  'authenticated.ts',
  'metadata.ts',
  'mutation-safety.ts',
  'paginated.ts',
  'public.ts',
  'validation-error.ts',
];

describe('generated examples', () => {
  it('renders deterministic domain and generic snippets for every operation', async () => {
    const fixture = await loadFixture();
    const first = renderOperationSnippets(fixture.manifest);
    const reordered: SerializableOperationManifest = {
      ...fixture.manifest,
      operations: reversed(fixture.manifest.operations),
    };
    const second = renderOperationSnippets(reordered);

    expect(first.size).toBe(operationCount);
    expect([...second]).toEqual([...first]);

    for (const operation of fixture.manifest.operations) {
      const snippets = first.get(operation.operationId);
      if (snippets === undefined) throw new Error(`Missing snippets: ${operation.operationId}`);

      expect(snippets.domainMethod).toContain(
        `client.${operation.facade.domain}.${operation.facade.method}(`,
      );
      expect(snippets.domainMethod).toContain("from '@evespace/esi-client';");
      expect(snippets.standaloneDomainMethod).toContain(`client.${operation.facade.method}(`);
      expect(snippets.standaloneDomainMethod).toContain(`from '@evespace/esi-client/domains/`);
      expect(snippets.standaloneDomainMethod).not.toContain("from '@evespace/esi-client';");
      expect(snippets.genericExecution).toContain(
        `CallOperationArguments<'${operation.operationId}'>`,
      );
      expect(snippets.genericExecution).toContain(
        `client.callOperation('${operation.operationId}', arguments_`,
      );
      expect(syntaxDiagnostics(snippets.domainMethod)).toEqual([]);
      expect(syntaxDiagnostics(snippets.standaloneDomainMethod)).toEqual([]);
      expect(syntaxDiagnostics(snippets.genericExecution)).toEqual([]);

      const combined = `${snippets.domainMethod}\n${snippets.standaloneDomainMethod}\n${snippets.genericExecution}`;
      expect(combined).not.toMatch(/Bearer\s+[A-Za-z0-9._~-]{8,}/u);
      expect(combined).not.toMatch(/-----BEGIN [A-Z ]*PRIVATE KEY-----/u);
    }

    for (const operation of fixture.manifest.operations.filter(
      ({ authentication }) => authentication.required,
    )) {
      const snippets = first.get(operation.operationId);
      if (snippets === undefined) throw new Error(`Missing snippets: ${operation.operationId}`);
      const combined = `${snippets.domainMethod}\n${snippets.genericExecution}`;
      expect(combined).toContain('process.env.ESI_ACCESS_TOKEN');
      expect(combined).not.toMatch(/console\.[a-z]+\([^)]*(?:accessToken|token)/u);
    }

    for (const operation of fixture.manifest.operations.filter(
      ({ classification }) => classification === 'mutation',
    )) {
      const snippets = first.get(operation.operationId);
      if (snippets === undefined) throw new Error(`Missing snippets: ${operation.operationId}`);
      expect(snippets.domainMethod).toContain('named typed mutation expresses explicit intent');
      expect(snippets.domainMethod).toContain('Verify authorization');
      expect(snippets.genericExecution).toContain('allowGenericMutations: true');
      expect(snippets.genericExecution).toContain('confirmMutation: true');
      expect(snippets.genericExecution).toContain('requires authorization');
    }
  });

  it('emits the curated standalone set with provenance and safe mutation credentials', async () => {
    const fixture = await loadFixture();
    const rendered = renderStandaloneExamples(fixture.manifest, fixture.provenance);

    expect(rendered.size).toBe(representativePaths.length + domainCount);
    for (const path of representativePaths) expect(rendered.has(path)).toBe(true);
    expect([...rendered.keys()].filter((path) => path.startsWith('domain-'))).toHaveLength(
      domainCount,
    );
    for (const [path, source] of rendered) {
      expect(source).toContain(`Compatibility date: ${fixture.provenance.compatibilityDate}.`);
      expect(source).toContain(`Specification SHA-256: ${fixture.provenance.sha256}.`);
      expect(source).not.toMatch(/Bearer\s+[A-Za-z0-9._~-]{8,}/u);
      expect(source).not.toMatch(/-----BEGIN [A-Z ]*PRIVATE KEY-----/u);
      expect({ path, diagnostics: syntaxDiagnostics(source) }).toEqual({ path, diagnostics: [] });
    }

    const authenticated = rendered.get('authenticated.ts') ?? '';
    expect(authenticated).toContain('process.env.ESI_ACCESS_TOKEN');
    expect(authenticated).not.toContain('console.');

    const mutation = rendered.get('mutation-safety.ts') ?? '';
    expect(mutation).toContain('authorizationApproved');
    expect(mutation).toContain('named typed mutation is explicit intent');
    expect(mutation).toContain('generic gates do not apply');
    expect(mutation).toContain('allowGenericMutations: true');
    expect(mutation).toContain('confirmMutation: true');
  });

  it('owns one composable examples/generated claim', async () => {
    const fixture = await loadFixture();
    const outputDirectory = await makeTemporaryDirectory('esi-client-examples-emitter-');
    const context = createContext(fixture, outputDirectory);

    await expect(generatedExamplesEmitter.emit(context)).resolves.toEqual([
      { target: 'examples/generated', kind: 'directory' },
    ]);
    await expect(readdir(join(outputDirectory, 'examples/generated'))).resolves.toHaveLength(
      representativePaths.length + domainCount,
    );
  });

  it('matches every materialized standalone output without stale files', async () => {
    const fixture = await loadFixture();
    const rendered = renderStandaloneExamples(fixture.manifest, fixture.provenance);
    const generatedRoot = new URL('../examples/generated/', import.meta.url);
    const materializedPaths = sortedText(await readdir(generatedRoot));

    expect(materializedPaths).toEqual(sortedText(rendered.keys()));
    await Promise.all(
      materializedPaths.map(async (path) => {
        await expect(readFile(new URL(path, generatedRoot), 'utf8')).resolves.toBe(
          rendered.get(path),
        );
      }),
    );
  });

  it('keeps the standalone component reusable within the shared target', async () => {
    const fixture = await loadFixture();
    const outputDirectory = await makeTemporaryDirectory('esi-client-examples-component-');
    const examplesDirectory = join(outputDirectory, 'examples');
    await mkdir(examplesDirectory);

    await expect(
      emitStandaloneExamples(createContext(fixture, outputDirectory), examplesDirectory),
    ).resolves.toHaveLength(representativePaths.length + domainCount);
  });
});

interface ExamplesFixture {
  readonly manifest: SerializableOperationManifest;
  readonly metadata: EmitterContext['operationMetadata'];
  readonly model: NormalizedOpenApiModel;
  readonly provenance: GenerationProvenance;
}

async function loadFixture(): Promise<ExamplesFixture> {
  const [model, provenance] = await Promise.all([
    readFile(new URL('../openapi/generated/normalized-model.json', import.meta.url), 'utf8').then(
      JSON.parse,
    ),
    readFile(new URL('../openapi/generated/provenance.json', import.meta.url), 'utf8').then(
      JSON.parse,
    ),
  ]);
  assertModel(model);
  assertProvenance(provenance);
  const metadata = await resolveOperationMetadata(model);
  return {
    manifest: createSerializableOperationManifest(model, metadata, provenance),
    metadata,
    model,
    provenance,
  };
}

function createContext(fixture: ExamplesFixture, outputDirectory: string): EmitterContext {
  return {
    compatibilityDate: fixture.provenance.compatibilityDate,
    correctedDocument: {},
    normalizedModel: fixture.model,
    namingReviewReport: 'test naming review\n',
    operationMetadata: fixture.metadata,
    outputDirectory,
    outputPath: (target) => join(outputDirectory, target),
    provenance: fixture.provenance,
  };
}

function syntaxDiagnostics(source: string): readonly string[] {
  try {
    transformSync(source, { format: 'esm', loader: 'ts', target: 'es2022' });
    return [];
  } catch (error) {
    return [error instanceof Error ? error.message : String(error)];
  }
}

function assertModel(value: unknown): asserts value is NormalizedOpenApiModel {
  if (value === null || typeof value !== 'object' || !('operations' in value)) {
    throw new TypeError('Invalid committed normalized model');
  }
}

function assertProvenance(value: unknown): asserts value is GenerationProvenance {
  if (
    value === null ||
    typeof value !== 'object' ||
    !('compatibilityDate' in value) ||
    typeof value.compatibilityDate !== 'string' ||
    !('sha256' in value) ||
    typeof value.sha256 !== 'string'
  ) {
    throw new TypeError('Invalid committed generation provenance');
  }
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, 'en');
}

function reversed<Value>(values: readonly Value[]): Value[] {
  const result: Value[] = [];
  for (let index = values.length - 1; index >= 0; index -= 1) {
    const value = values[index];
    if (value !== undefined) result.push(value);
  }
  return result;
}

function sortedText(values: Iterable<string>): string[] {
  const result: string[] = [];
  for (const value of values) {
    const index = result.findIndex((entry) => compareText(value, entry) < 0);
    result.splice(index === -1 ? result.length : index, 0, value);
  }
  return result;
}
