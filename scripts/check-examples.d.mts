export interface ExampleSource {
  readonly path: string;
  readonly source: string;
}

export interface PackageManifest {
  readonly name: string;
  readonly exports: { readonly [subpath: string]: unknown };
}

export interface ExamplesProjectInspection {
  readonly generatedFiles: readonly string[];
  readonly projectFiles: readonly string[];
}

export function inspectExamplesProject(root?: string): Promise<ExamplesProjectInspection>;
export function validateDocumentedPackageImports(
  files: readonly ExampleSource[],
  packageManifest: PackageManifest,
): void;
export function checkExamplesProject(root?: string): Promise<void>;
