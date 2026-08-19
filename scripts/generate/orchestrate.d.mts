import type {
  AppliedSpecificationCorrections,
  SpecificationCorrectionOptions,
} from './corrections.mjs';
import type { NormalizeOpenApiOptions, NormalizedOpenApiModel } from './normalize.mjs';
import type { StageOpenApiSnapshotOptions, StagedOpenApiSnapshot } from './openapi.mjs';
import type { OperationMetadataOptions, ResolvedOperationMetadata } from './operation-metadata.mjs';

export type GeneratedOutputKind = 'file' | 'directory';
export type ReplacementPhase = 'backup' | 'install' | 'restore';

export interface GeneratedOutputClaim {
  readonly target: string;
  readonly kind: GeneratedOutputKind;
}

export interface GenerationProvenance {
  readonly appliedCorrections: readonly string[];
  readonly compatibilityDate: string;
  readonly sha256: string;
  readonly sourceSha256: string;
  readonly specificationUrl: string;
  readonly facadeCatalog: GenerationProvenanceArtifact;
  readonly facadeReviewReport: GenerationProvenanceArtifact;
}

export interface GenerationProvenanceArtifact {
  readonly path: string;
  readonly sha256: string;
}

export interface EmitterContext {
  readonly compatibilityDate: string;
  readonly correctedDocument: Readonly<Record<string, unknown>>;
  readonly normalizedModel: NormalizedOpenApiModel;
  readonly namingReviewReport: string;
  readonly operationMetadata: readonly ResolvedOperationMetadata[];
  readonly outputDirectory: string;
  readonly provenance: GenerationProvenance;
  outputPath(target: string): string;
}

export interface GeneratedOutputEmitter {
  readonly name: string;
  emit(context: EmitterContext): Promise<readonly GeneratedOutputClaim[]>;
}

export interface OrchestrationDependencies {
  stageOpenApiSnapshot?(options?: StageOpenApiSnapshotOptions): Promise<StagedOpenApiSnapshot>;
  applySpecificationCorrections?(
    document: Readonly<Record<string, unknown>>,
    compatibilityDate: string,
    options?: SpecificationCorrectionOptions,
  ): Promise<AppliedSpecificationCorrections<Readonly<Record<string, unknown>>>>;
  normalizeOpenApiDocument?(
    document: Readonly<Record<string, unknown>>,
    options?: NormalizeOpenApiOptions,
  ): Promise<NormalizedOpenApiModel>;
  materializePath?(source: string, destination: string): Promise<void>;
  replacePath?(source: string, destination: string, phase: ReplacementPhase): Promise<void>;
}

export interface OrchestrateGenerationOptions {
  emitters?: readonly GeneratedOutputEmitter[];
  projectRoot?: string;
  temporaryRoot?: string;
  openapi?: Omit<StageOpenApiSnapshotOptions, 'temporaryRoot'>;
  corrections?: SpecificationCorrectionOptions;
  normalization?: NormalizeOpenApiOptions;
  operationMetadata?: OperationMetadataOptions;
  dependencies?: OrchestrationDependencies;
}

export interface OrchestrationResult {
  readonly compatibilityDate: string;
  readonly replacedTargets: readonly string[];
  readonly sha256: string;
}

export function orchestrateGeneration(
  options?: OrchestrateGenerationOptions,
): Promise<OrchestrationResult>;
