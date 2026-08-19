import type { NormalizedOpenApiModel, NormalizedOperation } from './normalize.mjs';

export type OperationSafetyClassification = 'read' | 'mutation';

export interface FacadeNamingOverride {
  readonly operationId: string;
  readonly domain: string;
  readonly method: string;
  readonly reviewed: true;
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
  namingOverridesPath?: string;
  safetyOverridesPath?: string;
}

export const defaultNamingOverridesPath: string;
export const defaultSafetyOverridesPath: string;

export function loadNamingOverrides(
  model: NormalizedOpenApiModel,
  path?: string,
): Promise<readonly FacadeNamingOverride[]>;
export function loadSafetyOverrides(
  model: NormalizedOpenApiModel,
  path?: string,
): Promise<readonly OperationSafetyOverride[]>;
export function resolveOperationMetadata(
  model: NormalizedOpenApiModel,
  options?: OperationMetadataOptions,
): Promise<readonly ResolvedOperationMetadata[]>;
export function defaultDomainName(operation: NormalizedOperation): string;
export function defaultMethodName(operationId: string): string;
