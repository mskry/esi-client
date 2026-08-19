import type { ArtifactProvenance } from './artifacts.mjs';
import type { NormalizedOpenApiModel, NormalizedOperation } from './normalize.mjs';
import type { ResolvedOperationMetadata } from './operation-metadata.mjs';
import type { EmitterContext } from './orchestrate.mjs';
import type { GeneratedSourceComponent } from './source-emitter.mjs';
import type { GeneratedTestComponent } from './test-emitter.mjs';

export interface RenderedDomainClientArtifact {
  readonly binderName: string;
  readonly className: string;
  readonly contractSource: string;
  readonly descriptorSource: string;
  readonly domain: string;
  readonly domainSource: string;
  readonly factoryName: string;
  readonly fileName: string;
  readonly implementationSource: string;
  readonly metadataClassName: string;
}

export interface RenderedDomainClientArtifacts {
  readonly clientSource: string;
  readonly contractsSource: string;
  readonly domains: readonly RenderedDomainClientArtifact[];
  readonly indexSource: string;
  readonly rootIndexSource: string;
}

export function renderDomainClientArtifacts(
  model: NormalizedOpenApiModel,
  operationMetadata: readonly ResolvedOperationMetadata[],
  provenance: ArtifactProvenance,
): RenderedDomainClientArtifacts;
export function emitDomainClientSource(
  context: EmitterContext,
  sourceDirectory: string,
): Promise<readonly string[]>;
export const domainClientSourceComponent: GeneratedSourceComponent;
export function emitDomainClientTests(
  context: EmitterContext,
  testsDirectory: string,
): Promise<readonly ['domain-operation-coverage.ts']>;
export const domainClientTestsComponent: GeneratedTestComponent;
export function validateDomainClientArtifacts(artifacts: RenderedDomainClientArtifacts): void;
export function operationDescriptorName(operationId: string): string;
export function domainFileName(domain: string): string;
export function resolveOperationAuthentication(
  operation: NormalizedOperation,
): { readonly scopes: readonly string[] } | null;
