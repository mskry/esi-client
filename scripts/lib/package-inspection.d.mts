export interface PackedFile {
  readonly path: string;
  readonly size?: number;
}

export interface PackedPackageManifest {
  readonly exports?: { readonly [entry: string]: unknown };
}

export interface PackedPackageBoundaryResult {
  readonly forbiddenPaths: readonly string[];
  readonly operationExportTargets: readonly string[];
}

export const forbiddenPackagePaths: readonly string[];
export const packageBudgetSchemaVersion: number;
export const packageBudgetByteHeadroomPercent: number;
export const packageBudgetFileCountHeadroom: number;
export function findForbiddenPackedPaths(files: readonly PackedFile[]): readonly string[];
export function validatePackedPackageBoundary(
  files: readonly PackedFile[],
  packageJson: PackedPackageManifest,
): PackedPackageBoundaryResult;

export interface PackageMeasurements {
  packageVersion: string;
  totals: { [metric: string]: number };
  publicEntries: {
    [entry: string]: {
      javascript: { path: string; bytes: number };
      declaration: { path: string; bytes: number };
    };
  };
  files: string[];
}

export interface PackageBudgetBaseline {
  schemaVersion: number;
  policy: {
    byteHeadroomPercent: number;
    fileCountHeadroom: number;
    description: string;
  };
  totals: {
    [metric: string]: { measured: number; maximum: number };
  };
  publicEntries: {
    [entry: string]: {
      javascript: {
        path: string;
        measuredBytes: number;
        maximumBytes: number;
      };
      declaration: {
        path: string;
        measuredBytes: number;
        maximumBytes: number;
      };
    };
  };
  allowedFiles: string[];
}

export function measurePackedPackage(
  pack: {
    readonly size: number;
    readonly unpackedSize: number;
    readonly entryCount?: number;
    readonly files: readonly PackedFile[];
  },
  packageJson: PackedPackageManifest & { readonly version?: string },
): PackageMeasurements;
export function createPackageBudgetBaseline(
  measurements: PackageMeasurements,
): PackageBudgetBaseline;
export function validatePackageBudgets(
  measurements: PackageMeasurements,
  baseline: PackageBudgetBaseline,
): void;
