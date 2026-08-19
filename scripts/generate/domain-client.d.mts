import type { ArtifactProvenance } from './artifacts.mjs';
import type { NormalizedOpenApiModel, NormalizedOperation } from './normalize.mjs';
import type { ResolvedOperationMetadata } from './operation-metadata.mjs';
import type { EmitterContext } from './orchestrate.mjs';
import type { GeneratedSourceComponent } from './source-emitter.mjs';

export interface RenderedDomainClientArtifact {
  readonly className: string;
  readonly descriptorSource: string;
  readonly domain: string;
  readonly domainSource: string;
  readonly fileName: string;
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
export function operationDescriptorName(operationId: string): string;
export function domainFileName(domain: string): string;
export function resolveOperationAuthentication(
  operation: NormalizedOperation,
): { readonly scopes: readonly string[] } | null;
