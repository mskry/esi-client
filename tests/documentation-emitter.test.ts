import { readFile, readdir } from 'node:fs/promises';
import { join, posix } from 'node:path';

import { describe, expect, it } from 'vitest';

import {
  emitGeneratedDocumentation,
  renderGeneratedDocumentation,
} from '../scripts/generate/documentation-emitter.mjs';
import type { NormalizedOpenApiModel } from '../scripts/generate/normalize.mjs';
import { renderNamingReviewReport } from '../scripts/generate/naming-review.mjs';
import {
  loadFacadeCatalog,
  resolveOperationMetadata,
} from '../scripts/generate/operation-metadata.mjs';
import {
  createSerializableOperationManifest,
  type SerializableOperationManifest,
} from '../scripts/generate/operation-registry.mjs';
import type { EmitterContext, GenerationProvenance } from '../scripts/generate/orchestrate.mjs';
import { makeTemporaryDirectory } from './helpers/temporary-directory.js';

const operationCount = 233;
const domainCount = 39;
const conceptPaths = [
  'concepts/installation.md',
  'concepts/client.md',
  'concepts/auth.md',
  'concepts/validation.md',
  'concepts/metadata-pagination.md',
  'concepts/errors.md',
  'concepts/mutation-safety.md',
];
const examplePaths = [
  'examples/index.md',
  'examples/public.md',
  'examples/authenticated.md',
  'examples/paginated.md',
  'examples/metadata.md',
  'examples/validation-error.md',
  'examples/mutation-safety.md',
];

describe('generated LLM documentation', () => {
  it('renders deterministic progressive documentation from all serializable operations', async () => {
    const fixture = await loadFixture();
    const first = renderGeneratedDocumentation(
      fixture.manifest,
      fixture.provenance,
      fixture.namingReviewReport,
    );
    const reorderedManifest: SerializableOperationManifest = {
      ...fixture.manifest,
      operations: reversed(fixture.manifest.operations),
    };
    const second = renderGeneratedDocumentation(
      reorderedManifest,
      fixture.provenance,
      fixture.namingReviewReport,
    );

    expect(second.llmsText).toBe(first.llmsText);
    expect([...second.generatedFiles]).toEqual([...first.generatedFiles]);
    expect(first.llmsText.length).toBeLessThan(12_000);
    expect(first.llmsText).not.toContain('## Parameters');
    expect(first.generatedFiles.size).toBe(
      conceptPaths.length + examplePaths.length + domainCount + operationCount + 1,
    );

    const operationPaths = [...first.generatedFiles.keys()].filter((path) =>
      path.startsWith('operations/'),
    );
    const domainPaths = [...first.generatedFiles.keys()].filter((path) =>
      path.startsWith('domains/'),
    );
    expect(operationPaths).toHaveLength(operationCount);
    expect(domainPaths).toHaveLength(domainCount);
    for (const path of conceptPaths) expect(first.generatedFiles.has(path)).toBe(true);
    for (const path of examplePaths) expect(first.generatedFiles.has(path)).toBe(true);

    for (const operation of fixture.manifest.operations) {
      const path = `operations/${operation.operationId}.md`;
      const page = first.generatedFiles.get(path);
      if (page === undefined) throw new Error(`Missing operation documentation: ${path}`);
      expect(page).toContain(`# ${operation.operationId}`);
      expect(page).toContain(`Stable ID: \`${operation.operationId}\``);
      expect(page).toContain(`client.${operation.facade.domain}.${operation.facade.method}(`);
      expect(page).toContain(`client.callOperation("${operation.operationId}"`);
      expect(page).toContain('## Standalone domain-factory snippet');
      expect(page).toContain('## Aggregate EsiClient snippet');
      expect(page).toContain('## Generic-execution snippet');
      expect(page).toContain("from '@evespace/esi-client/domains/");
      expect(page).toContain("import { EsiClient } from '@evespace/esi-client';");
      expect(page).toContain("from '@evespace/esi-client/operations';");
      expect(page).toContain(operation.requestSchema.export);
      expect(page).toContain('## Parameters');
      expect(page).toContain('## Result and schemas');
      expect(page).toContain('## Authentication');
      expect(page).toContain('## Pagination and cache');
      expect(page).toContain('## Structured errors');
      expect(page).toContain(operation.pagination.kind);
      for (const scope of operation.authentication.scopes) expect(page).toContain(scope);
      for (const response of operation.responses) expect(page).toContain(response.schema.export);
    }

    for (const path of domainPaths) {
      const page = first.generatedFiles.get(path);
      if (page === undefined) throw new Error(`Missing domain documentation: ${path}`);
      expect(page).toContain('## Standalone domain factory');
      expect(page).toContain('## Aggregate client');
      expect(page).toContain("from '@evespace/esi-client/domains/");
      expect(page).toContain("import { EsiClient } from '@evespace/esi-client';");
    }
  });

  it('emits isolated documentation claims and identical repository/site llms.txt files', async () => {
    const fixture = await loadFixture();
    const outputDirectory = await makeTemporaryDirectory('esi-client-documentation-emitter-');
    const context: EmitterContext = {
      compatibilityDate: fixture.provenance.compatibilityDate,
      correctedDocument: {},
      normalizedModel: fixture.model,
      namingReviewReport: fixture.namingReviewReport,
      operationMetadata: fixture.metadata,
      outputDirectory,
      outputPath: (target) => join(outputDirectory, target),
      provenance: fixture.provenance,
    };

    await expect(emitGeneratedDocumentation(context)).resolves.toEqual([
      { target: 'docs/generated', kind: 'directory' },
      { target: 'llms.txt', kind: 'file' },
      { target: 'docs/llms.txt', kind: 'file' },
    ]);
    const [repositoryLlms, siteLlms] = await Promise.all([
      readFile(join(outputDirectory, 'llms.txt'), 'utf8'),
      readFile(join(outputDirectory, 'docs/llms.txt'), 'utf8'),
    ]);
    expect(siteLlms).toBe(repositoryLlms);
    expect(repositoryLlms).toBe(
      renderGeneratedDocumentation(fixture.manifest, fixture.provenance, fixture.namingReviewReport)
        .llmsText,
    );
  });

  it('matches every materialized repository documentation output without stale files', async () => {
    const fixture = await loadFixture();
    const rendered = renderGeneratedDocumentation(
      fixture.manifest,
      fixture.provenance,
      fixture.namingReviewReport,
    );
    const generatedRoot = new URL('../docs/generated/', import.meta.url);
    const materializedPaths = await listRelativeFiles(generatedRoot);

    expect(materializedPaths).toEqual(sortedText(rendered.generatedFiles.keys()));
    await Promise.all(
      materializedPaths.map(async (path) => {
        await expect(readFile(new URL(path, generatedRoot), 'utf8')).resolves.toBe(
          rendered.generatedFiles.get(path),
        );
      }),
    );
    const [repositoryLlms, siteLlms] = await Promise.all([
      readFile(new URL('../llms.txt', import.meta.url), 'utf8'),
      readFile(new URL('../docs/llms.txt', import.meta.url), 'utf8'),
    ]);
    expect(repositoryLlms).toBe(rendered.llmsText);
    expect(siteLlms).toBe(rendered.llmsText);
  });

  it('uses valid repository-root links and matching provenance on every document', async () => {
    const fixture = await loadFixture();
    const rendered = renderGeneratedDocumentation(
      fixture.manifest,
      fixture.provenance,
      fixture.namingReviewReport,
    );
    const documents = new Map<string, string>([
      ['llms.txt', rendered.llmsText],
      ['docs/llms.txt', rendered.llmsText],
    ]);
    for (const [path, content] of rendered.generatedFiles) {
      documents.set(`docs/generated/${path}`, content);
    }
    const provenanceText = `Specification SHA-256: ${fixture.provenance.sha256}.`;

    for (const [path, content] of documents) {
      expect(content.startsWith('<!--\n@generated by @evespace/esi-client.')).toBe(true);
      expect(content).toContain(`Compatibility date: ${fixture.provenance.compatibilityDate}.`);
      expect(content).toContain(provenanceText);
      expect(content).not.toMatch(/Bearer\s+[A-Za-z0-9._~-]{16,}/u);
      expect(content).not.toMatch(/-----BEGIN [A-Z ]*PRIVATE KEY-----/u);

      for (const target of markdownLinks(content)) {
        expect(target).not.toMatch(/^[a-z]+:/iu);
        const resolved = target.startsWith('/')
          ? posix.normalize(target.slice(1))
          : posix.normalize(posix.join(posix.dirname(path), target));
        expect(documents.has(resolved), `${path} links to missing ${target}`).toBe(true);
      }
    }
  });

  it('rejects unsafe and case-colliding operation output paths', async () => {
    const fixture = await loadFixture();
    const operation = fixture.manifest.operations[0];
    if (operation === undefined) throw new Error('Fixture has no operations');
    const unsafe: SerializableOperationManifest = {
      ...fixture.manifest,
      operations: [{ ...operation, operationId: '../escape' }],
    };
    const colliding: SerializableOperationManifest = {
      ...fixture.manifest,
      operations: [operation, { ...operation, operationId: operation.operationId.toLowerCase() }],
    };

    expect(() =>
      renderGeneratedDocumentation(unsafe, fixture.provenance, fixture.namingReviewReport),
    ).toThrow('Unsafe documentation operation ID path segment');
    expect(() =>
      renderGeneratedDocumentation(colliding, fixture.provenance, fixture.namingReviewReport),
    ).toThrow('Documentation operation path collision');
  });
});

interface DocumentationFixture {
  readonly manifest: SerializableOperationManifest;
  readonly metadata: EmitterContext['operationMetadata'];
  readonly model: NormalizedOpenApiModel;
  readonly namingReviewReport: string;
  readonly provenance: GenerationProvenance;
}

async function loadFixture(): Promise<DocumentationFixture> {
  const [modelValue, provenanceValue] = await Promise.all([
    readFile(new URL('../openapi/generated/normalized-model.json', import.meta.url), 'utf8').then(
      JSON.parse,
    ),
    readFile(new URL('../openapi/generated/provenance.json', import.meta.url), 'utf8').then(
      JSON.parse,
    ),
  ]);
  assertModel(modelValue);
  assertProvenance(provenanceValue);
  const [facadeCatalog, metadata] = await Promise.all([
    loadFacadeCatalog(modelValue),
    resolveOperationMetadata(modelValue),
  ]);
  return {
    manifest: createSerializableOperationManifest(modelValue, metadata, provenanceValue),
    metadata,
    model: modelValue,
    namingReviewReport: renderNamingReviewReport(modelValue, facadeCatalog, provenanceValue),
    provenance: provenanceValue,
  };
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
    !('facadeCatalog' in value) ||
    !isProvenanceArtifact(value.facadeCatalog) ||
    !('facadeReviewReport' in value) ||
    !isProvenanceArtifact(value.facadeReviewReport) ||
    !('sha256' in value) ||
    typeof value.sha256 !== 'string' ||
    !('sourceSha256' in value) ||
    typeof value.sourceSha256 !== 'string' ||
    !('specificationUrl' in value) ||
    typeof value.specificationUrl !== 'string' ||
    !('appliedCorrections' in value) ||
    !Array.isArray(value.appliedCorrections)
  ) {
    throw new TypeError('Invalid committed generation provenance');
  }
}

function isProvenanceArtifact(value: unknown): value is GenerationProvenance['facadeCatalog'] {
  return (
    value !== null &&
    typeof value === 'object' &&
    'path' in value &&
    typeof value.path === 'string' &&
    'sha256' in value &&
    typeof value.sha256 === 'string'
  );
}

function markdownLinks(content: string): string[] {
  return [...content.matchAll(/\[[^\]]*\]\(([^)]+)\)/gu)].flatMap((match) =>
    match[1] === undefined ? [] : [match[1]],
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

async function listRelativeFiles(directory: URL, prefix = ''): Promise<string[]> {
  const paths: string[] = [];
  const entries = await readdir(directory, { withFileTypes: true });
  for (const entry of entries) {
    const relativePath = prefix === '' ? entry.name : `${prefix}/${entry.name}`;
    if (entry.isDirectory()) {
      paths.push(...(await listRelativeFiles(new URL(`${entry.name}/`, directory), relativePath)));
    } else if (entry.isFile()) {
      paths.push(relativePath);
    } else {
      throw new Error(`Generated documentation contains a non-file entry: ${relativePath}`);
    }
  }
  return sortedText(paths);
}

function compareText(left: string, right: string): number {
  return left.localeCompare(right, 'en');
}

function sortedText(values: Iterable<string>): string[] {
  const result: string[] = [];
  for (const value of values) {
    const index = result.findIndex((entry) => compareText(value, entry) < 0);
    result.splice(index === -1 ? result.length : index, 0, value);
  }
  return result;
}
