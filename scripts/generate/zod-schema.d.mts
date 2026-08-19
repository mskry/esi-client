import type { ArtifactProvenance } from './artifacts.mjs';
import type { NormalizedModel, NormalizedOperation, NormalizedSchema } from './normalize.mjs';
import type { EmitterContext } from './orchestrate.mjs';
import type { GeneratedSourceComponent } from './source-emitter.mjs';

export interface EmitZodSchemaExpressionOptions {
  readonly path?: string;
  readonly references?: Readonly<Record<string, string>>;
}

export class ZodSchemaEmissionError extends Error {
  constructor(message: string, path: string);
  readonly path: string;
}

export function emitZodSchemaExpression(
  schema: NormalizedSchema,
  options?: EmitZodSchemaExpressionOptions,
): string;

export function renderZodSchemaModule(
  models: readonly NormalizedModel[],
  provenance: ArtifactProvenance,
): string;

export function renderZodModelSchemaModule(
  models: readonly NormalizedModel[],
  provenance: ArtifactProvenance,
): string;

export function renderZodOperationSchemaModule(
  operations: readonly NormalizedOperation[],
  models: readonly NormalizedModel[],
  provenance: ArtifactProvenance,
): string;

export function renderZodSchemaContractsModule(
  operations: readonly NormalizedOperation[],
  operationMetadata: EmitterContext['operationMetadata'],
  provenance: ArtifactProvenance,
): string;

export function operationSchemaName(operationId: string): string;
export function operationStatusResponseSchemaName(operationId: string, status: string): string;

export function emitZodSchemaSource(
  context: EmitterContext,
  sourceDirectory: string,
): Promise<
  readonly [
    'schemas/contracts.ts',
    'schemas/index.ts',
    'schemas/models.ts',
    'schemas/operations.ts',
  ]
>;

export const zodSchemaSourceComponent: GeneratedSourceComponent;
