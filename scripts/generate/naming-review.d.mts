import type { ArtifactProvenance } from './artifacts.mjs';
import type { NormalizedOpenApiModel } from './normalize.mjs';
import type { FacadeCatalogEntry } from './operation-metadata.mjs';

export type NamingResponseShape = 'collection' | 'detail' | 'none';

export interface NamingReviewEntry {
  readonly operationId: string;
  readonly domain: string;
  readonly method: string;
  readonly path: string;
  readonly positionalIdentifiers: readonly string[];
  readonly summary: string | null;
  readonly responseShape: NamingResponseShape;
  readonly currentTransliteration: string;
  readonly candidateMethod: string;
  readonly candidateCollisionOperationIds: readonly string[];
  readonly acceptedDomain: string;
  readonly acceptedMethod: string;
  readonly derivedOptionsType: string | null;
  readonly note: string | null;
}

export interface NamingReviewDomain {
  readonly domain: string;
  readonly operations: readonly NamingReviewEntry[];
}

export interface NamingReview {
  readonly domains: readonly NamingReviewDomain[];
  readonly operationCount: number;
}

export const namingReviewReportPath: 'docs/generated/facade-naming-review.md';
export function createNamingReview(
  model: NormalizedOpenApiModel,
  facadeCatalog: readonly FacadeCatalogEntry[],
): NamingReview;
export function renderNamingReviewReport(
  model: NormalizedOpenApiModel,
  facadeCatalog: readonly FacadeCatalogEntry[],
  provenance: ArtifactProvenance,
): string;
