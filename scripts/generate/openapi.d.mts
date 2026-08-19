export interface CompatibilityDateOptions {
  requestedDate?: string;
  environment?: Readonly<Record<string, string | undefined>>;
  pinnedDatePath?: string;
}

export interface StageOpenApiSnapshotOptions extends CompatibilityDateOptions {
  fetchImplementation?: typeof fetch;
  specificationUrl?: string;
  temporaryRoot?: string;
  signal?: AbortSignal;
}

export interface StagedOpenApiSnapshot {
  readonly compatibilityDate: string;
  readonly directory: string;
  readonly document: Readonly<Record<string, unknown>>;
  readonly provenancePath: string;
  readonly sha256: string;
  readonly snapshotPath: string;
  cleanup(): Promise<void>;
}

export const defaultSpecificationUrl: string;
export const pinnedCompatibilityDatePath: string;

export function resolveCompatibilityDate(options?: CompatibilityDateOptions): Promise<string>;
export function stageOpenApiSnapshot(
  options?: StageOpenApiSnapshotOptions,
): Promise<StagedOpenApiSnapshot>;
