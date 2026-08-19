export interface PackedFile {
  readonly path: string;
  readonly size?: number;
  readonly source?: string;
}

export interface PackedPackageManifest {
  readonly exports?: { readonly [entry: string]: unknown };
  readonly dependencies?: { readonly [name: string]: string };
  readonly optionalDependencies?: { readonly [name: string]: string };
  readonly peerDependencies?: { readonly [name: string]: string };
}

export interface PackedPackageBoundaryResult {
  readonly forbiddenPaths: readonly string[];
  readonly operationExportTargets: readonly string[];
}

export const forbiddenPackagePaths: readonly string[];
export const packageBudgetSchemaVersion: number;
export const packageBudgetByteHeadroomPercent: number;
export const packageBudgetFileCountHeadroom: number;
export const expectedDomainEntryCount: number;
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
      runtime: PackedArtifactGraph;
      declaration: PackedArtifactGraph;
    };
  };
  files: string[];
}

export interface PackedArtifactExternalEdge {
  from: string;
  specifier: string;
}

export interface PackedArtifactGraph {
  target: string;
  files: string[];
  externalEdges: PackedArtifactExternalEdge[];
  uniqueBytes: number;
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
      runtime: PackageEntryBudget;
      declaration: PackageEntryBudget;
    };
  };
  allowedFiles: string[];
}

export interface PackageEntryBudget {
  target: string;
  files: string[];
  externalEdges: PackedArtifactExternalEdge[];
  measuredUniqueBytes: number;
  maximumUniqueBytes: number;
}

export function tracePackedArtifactGraph(
  files: readonly PackedFile[],
  target: string,
  kind: 'runtime' | 'declaration',
  approvedExternalPackages?: readonly string[],
): PackedArtifactGraph;
export function validateDomainEntryIsolation(
  measurements: PackageMeasurements,
  expectedCount?: number,
): { domainEntryCount: number };
export function validateDomainDeclarationSurface(
  measurements: PackageMeasurements,
  files: readonly PackedFile[],
  expectedCount?: number,
): { domainEntryCount: number };

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
