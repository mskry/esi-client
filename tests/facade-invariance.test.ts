import { readFile } from 'node:fs/promises';

import { describe, expect, it } from 'vitest';

import { renderGeneratedDocumentation } from '../scripts/generate/documentation-emitter.mjs';
import { renderDomainClientArtifacts } from '../scripts/generate/domain-client.mjs';
import { renderOperationSnippets } from '../scripts/generate/examples-emitter.mjs';
import type { NormalizedOpenApiModel } from '../scripts/generate/normalize.mjs';
import {
  resolveOperationMetadata,
  type ResolvedOperationMetadata,
} from '../scripts/generate/operation-metadata.mjs';
import {
  createSerializableOperationManifest,
  renderOperationRegistryArtifacts,
} from '../scripts/generate/operation-registry.mjs';
import type { GenerationProvenance } from '../scripts/generate/orchestrate.mjs';

const operationCount = 233;

describe('facade rename invariance', () => {
  it('changes facade names without changing operation or generic execution contracts', async () => {
    const fixture = await loadFixture();
    const renamedMetadata = fixture.metadata.map((metadata) => ({
      ...metadata,
      method: renamedMethod(metadata.method),
    }));
    const originalManifest = createSerializableOperationManifest(
      fixture.model,
      fixture.metadata,
      fixture.provenance,
    );
    const renamedManifest = createSerializableOperationManifest(
      fixture.model,
      renamedMetadata,
      fixture.provenance,
    );

    expect(originalManifest.operations).toHaveLength(operationCount);
    expect(renamedManifest.operations.map(({ operationId }) => operationId)).toEqual(
      originalManifest.operations.map(({ operationId }) => operationId),
    );
    for (const [index, original] of originalManifest.operations.entries()) {
      const renamed = renamedManifest.operations[index];
      if (renamed === undefined) throw new Error(`Missing renamed manifest entry at ${index}`);
      expect(renamed.facade).toEqual({
        domain: original.facade.domain,
        method: renamedMethod(original.facade.method),
      });
      const { facade: _originalFacade, ...originalContract } = original;
      const { facade: _renamedFacade, ...renamedContract } = renamed;
      expect(renamedContract).toEqual(originalContract);
    }

    const originalRegistry = renderOperationRegistryArtifacts(
      fixture.model,
      fixture.metadata,
      fixture.provenance,
    );
    const renamedRegistry = renderOperationRegistryArtifacts(
      fixture.model,
      renamedMetadata,
      fixture.provenance,
    );
    expect(renamedRegistry.registrySource).toBe(originalRegistry.registrySource);
    expect(renamedRegistry.indexSource).toBe(originalRegistry.indexSource);
    expect(renamedRegistry.manifestSource).not.toBe(originalRegistry.manifestSource);

    const originalDomains = renderDomainClientArtifacts(
      fixture.model,
      fixture.metadata,
      fixture.provenance,
    );
    const renamedDomains = renderDomainClientArtifacts(
      fixture.model,
      renamedMetadata,
      fixture.provenance,
    );
    expect(renamedDomains.clientSource).toBe(originalDomains.clientSource);
    expect(renamedDomains.indexSource).toBe(originalDomains.indexSource);
    expect(renamedDomains.rootIndexSource).toBe(originalDomains.rootIndexSource);
    expect(
      canonicalizeDomainImports(
        restoreFacadeNames(renamedDomains.contractsSource, fixture.metadata),
      ),
    ).toBe(canonicalizeDomainImports(originalDomains.contractsSource));
    for (const [index, original] of originalDomains.domains.entries()) {
      const renamed = renamedDomains.domains[index];
      if (renamed === undefined) throw new Error(`Missing renamed domain artifact at ${index}`);
      expect(renamed.descriptorSource).toBe(original.descriptorSource);
      expect(restoreFacadeNames(renamed.domainSource, fixture.metadata)).toBe(
        original.domainSource,
      );
    }

    const originalSnippets = renderOperationSnippets(originalManifest);
    const renamedSnippets = renderOperationSnippets(renamedManifest);
    for (const [operationId, original] of originalSnippets) {
      const renamed = renamedSnippets.get(operationId);
      if (renamed === undefined) throw new Error(`Missing renamed snippets for ${operationId}`);
      expect(renamed.genericExecution).toBe(original.genericExecution);
      expect(renamed.domainMethod).not.toBe(original.domainMethod);
      expect(restoreFacadeNames(renamed.domainMethod, fixture.metadata)).toBe(
        original.domainMethod,
      );
    }

    const originalDocumentation = renderGeneratedDocumentation(
      originalManifest,
      fixture.provenance,
      'test naming review\n',
    );
    const renamedDocumentation = renderGeneratedDocumentation(
      renamedManifest,
      fixture.provenance,
      'test naming review\n',
    );
    expect(renamedDocumentation.llmsText).toBe(originalDocumentation.llmsText);
    expect([...renamedDocumentation.generatedFiles.keys()]).toEqual([
      ...originalDocumentation.generatedFiles.keys(),
    ]);
    for (const [path, original] of originalDocumentation.generatedFiles) {
      const renamed = renamedDocumentation.generatedFiles.get(path);
      if (renamed === undefined) throw new Error(`Missing renamed documentation: ${path}`);
      const isFacadeReference = path.startsWith('domains/') || path.startsWith('operations/');
      expect(renamed === original).toBe(!isFacadeReference);
      expect(restoreFacadeNames(renamed, fixture.metadata)).toBe(original);
    }
  });
});

interface Fixture {
  readonly metadata: readonly ResolvedOperationMetadata[];
  readonly model: NormalizedOpenApiModel;
  readonly provenance: GenerationProvenance;
}

async function loadFixture(): Promise<Fixture> {
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
  return { metadata: await resolveOperationMetadata(model), model, provenance };
}

function renamedMethod(method: string): string {
  return `renamed${method.slice(0, 1).toUpperCase()}${method.slice(1)}`;
}

function restoreFacadeNames(
  source: string,
  metadata: readonly ResolvedOperationMetadata[],
): string {
  let restored = source;
  for (const { method } of metadata) {
    const renamed = renamedMethod(method);
    restored = restored.replaceAll(renamed, method);
  }
  return restored;
}

function canonicalizeDomainImports(source: string): string {
  return source.replaceAll(
    /import \{\n([\s\S]*?)\n\} from '(\.\/[^']+\.js)';/gu,
    (_match: string, entries: string, module: string) =>
      `import {\n${sortedLines(entries).join('\n')}\n} from '${module}';`,
  );
}

function sortedLines(value: string): string[] {
  const sorted: string[] = [];
  for (const line of value.split('\n')) {
    const index = sorted.findIndex((entry) => line < entry);
    sorted.splice(index === -1 ? sorted.length : index, 0, line);
  }
  return sorted;
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
    !('facadeReviewReport' in value) ||
    !('sha256' in value) ||
    typeof value.sha256 !== 'string'
  ) {
    throw new TypeError('Invalid committed generation provenance');
  }
}
