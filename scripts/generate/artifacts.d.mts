import type { JsonObject, NormalizedOpenApiModel } from './normalize.mjs';
import type {
  OperationSafetyClassification,
  ResolvedOperationMetadata,
} from './operation-metadata.mjs';

export type ProvenanceHeaderFormat = 'typescript' | 'markdown' | 'json-compatible';

export interface ArtifactProvenance {
  readonly compatibilityDate: string;
  readonly sha256: string;
}

export interface JsonProvenanceHeader {
  readonly _generated: {
    readonly compatibilityDate: string;
    readonly notice: string;
    readonly specificationSha256: string;
  };
}

export interface GeneratedOperationAccountingEntry {
  readonly operationId: string;
  readonly status: 'generated';
  readonly classification: OperationSafetyClassification;
  readonly facade: {
    readonly domain: string;
    readonly method: string;
  };
}

export interface ExcludedOperationAccountingEntry {
  readonly operationId: string;
  readonly status: 'excluded';
  readonly reason: {
    readonly code: string;
    readonly detail: string;
  };
}

export interface OperationAccountingReport {
  readonly schemaVersion: 1;
  readonly summary: {
    readonly source: number;
    readonly generated: number;
    readonly excluded: number;
  };
  readonly operations: readonly (
    | GeneratedOperationAccountingEntry
    | ExcludedOperationAccountingEntry
  )[];
}

export function createProvenanceHeader(
  provenance: ArtifactProvenance,
  format: ProvenanceHeaderFormat,
): string;
export function createJsonProvenanceHeader(provenance: ArtifactProvenance): JsonProvenanceHeader;
export function renderGeneratedBarrel(
  moduleSpecifiers: readonly string[],
  provenance: ArtifactProvenance,
): string;
export function createOperationAccountingReport(
  model: NormalizedOpenApiModel,
  operationMetadata: readonly ResolvedOperationMetadata[],
): OperationAccountingReport;
export function renderGeneratedJson(
  value: JsonObject | OperationAccountingReport,
  provenance: ArtifactProvenance,
): string;
