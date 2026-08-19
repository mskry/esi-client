export interface DocumentationProvenance {
  readonly compatibilityDate: string;
  readonly sha256: string;
}

export interface DocumentationConsistencyInspection {
  readonly documents: ReadonlyMap<string, string>;
  readonly domainPaths: readonly string[];
  readonly examples: ReadonlyMap<string, string>;
  readonly operationIds: readonly string[];
  readonly provenance: DocumentationProvenance;
}

export interface DocumentationConsistencyResult {
  readonly documentCount: number;
  readonly domainCount: number;
  readonly exampleCount: number;
  readonly operationCount: number;
}

export function inspectDocumentationConsistency(
  root?: string,
): Promise<DocumentationConsistencyInspection>;
export function validateDocumentationConsistency(
  inspection: DocumentationConsistencyInspection,
): DocumentationConsistencyResult;
export function checkDocumentationConsistency(
  root?: string,
): Promise<DocumentationConsistencyResult>;
