import type { NormalizedOpenApiModel, NormalizedOperation } from './normalize.mjs';

export type OperationSafetyClassification = 'read' | 'mutation';

export interface FacadeCatalogEntry {
  readonly operationId: string;
  readonly domain: string;
  readonly method: string;
  readonly reviewed: true;
  readonly note?: string;
}

export interface OperationSafetyOverride {
  readonly operationId: string;
  readonly classification: 'read';
  readonly reason: string;
  readonly reviewed: true;
}

export interface ResolvedOperationMetadata {
  readonly operationId: string;
  readonly domain: string;
  readonly method: string;
  readonly classification: OperationSafetyClassification;
  readonly safetyOverrideReason: string | null;
}

export interface OperationMetadataOptions {
  facadeCatalogPath?: string;
  safetyOverridesPath?: string;
}

export const defaultFacadeCatalogPath: string;
export const defaultSafetyOverridesPath: string;

export function loadFacadeCatalog(
  model: NormalizedOpenApiModel,
  path?: string,
): Promise<readonly FacadeCatalogEntry[]>;
export function loadSafetyOverrides(
  model: NormalizedOpenApiModel,
  path?: string,
): Promise<readonly OperationSafetyOverride[]>;
export function resolveOperationMetadata(
  model: NormalizedOpenApiModel,
  options?: OperationMetadataOptions,
): Promise<readonly ResolvedOperationMetadata[]>;
/** Derives an unreviewed candidate domain for review tooling and synthetic tests only. */
export function defaultDomainName(operation: NormalizedOperation): string;
/** Derives an unreviewed candidate method for review tooling and synthetic tests only. */
export function defaultMethodName(operationId: string): string;
