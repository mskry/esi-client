import type { NormalizedOpenApiModel } from './generate/normalize.mjs';

export interface SpecificationVersionInput {
  readonly compatibilityDate: string;
  readonly corrections: readonly string[];
  readonly document: Readonly<Record<string, unknown>>;
  readonly model: NormalizedOpenApiModel;
  readonly sha256: string;
  readonly sourceSha256: string;
  readonly specificationUrl: string;
}

export interface SpecificationDriftInput {
  readonly pinned: SpecificationVersionInput;
  readonly latest: SpecificationVersionInput;
}

export interface DriftCollection<TAdded = unknown, TChanged = unknown> {
  readonly added: readonly TAdded[];
  readonly removed: readonly TAdded[];
  readonly changed: readonly TChanged[];
}

export interface OperationIdentity {
  readonly operationId: string;
  readonly path: string;
  readonly method: string;
}

export interface OperationChange {
  readonly operationId: string;
  readonly categories: readonly string[];
  readonly parameters: DriftCollection;
  readonly responses: DriftCollection;
  readonly [key: string]: unknown;
}

export interface SpecificationDriftReport {
  readonly schemaVersion: 1;
  readonly pinned: SpecificationVersionDescription;
  readonly latest: SpecificationVersionDescription;
  readonly summary: Readonly<Record<string, boolean | number>>;
  readonly changes: {
    readonly operations: DriftCollection<OperationIdentity, OperationChange>;
    readonly componentSchemas: DriftCollection;
    readonly authenticationSchemes: DriftCollection;
  };
}

export interface SpecificationVersionDescription {
  readonly compatibilityDate: string;
  readonly sha256: string;
  readonly sourceSha256: string;
  readonly specificationUrl: string;
  readonly source: 'committed-corrected' | 'upstream-staged';
  readonly comparison: 'committed-corrected' | 'upstream-with-applicable-corrections';
  readonly corrections: {
    readonly policy: 'applicable-date-ranges';
    readonly applied: boolean;
    readonly appliedIds: readonly string[];
  };
}

export interface SpecificationDriftReportOptions {
  readonly repositoryRoot?: string;
  readonly exclusionsPath?: string;
  readonly correctionManifestPath?: string;
  readonly latestCompatibilityDate?: string;
  readonly fetchImplementation?: typeof fetch;
  readonly specificationUrl?: string;
  readonly temporaryRoot?: string;
  readonly signal?: AbortSignal;
  readonly outputPath?: string;
  readonly output?: (
    serializedReport: string,
    report: SpecificationDriftReport,
  ) => void | Promise<void>;
}

export function compareSpecificationDrift(input: SpecificationDriftInput): SpecificationDriftReport;
export function renderSpecificationDriftReport(report: SpecificationDriftReport): string;
export function reportSpecificationDrift(
  options?: SpecificationDriftReportOptions,
): Promise<SpecificationDriftReport>;
