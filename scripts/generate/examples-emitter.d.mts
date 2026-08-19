import type { ArtifactProvenance } from './artifacts.mjs';
import type {
  SerializableOperationManifest,
  SerializableOperationManifestEntry,
} from './operation-registry.mjs';
import type { EmitterContext, GeneratedOutputEmitter } from './orchestrate.mjs';

export interface OperationSnippets {
  readonly domainMethod: string;
  readonly standaloneDomainMethod: string;
  readonly genericExecution: string;
  readonly standaloneExamples: readonly string[];
}

export interface GeneratedExamplesComponent {
  readonly name: string;
  emit(context: EmitterContext, examplesDirectory: string): Promise<readonly string[]>;
}

export function renderOperationSnippets(
  manifest: SerializableOperationManifest,
): ReadonlyMap<SerializableOperationManifestEntry['operationId'], OperationSnippets>;
export function renderStandaloneExamples(
  manifest: SerializableOperationManifest,
  provenance: ArtifactProvenance,
): ReadonlyMap<string, string>;
export function renderStandaloneExampleDocumentation(
  provenance: ArtifactProvenance,
): ReadonlyMap<string, string>;
export function createGeneratedExamplesEmitter(
  components: readonly GeneratedExamplesComponent[],
): GeneratedOutputEmitter;
export function emitStandaloneExamples(
  context: EmitterContext,
  examplesDirectory: string,
): Promise<readonly string[]>;
export const standaloneExamplesComponent: GeneratedExamplesComponent;
export const generatedExamplesEmitter: GeneratedOutputEmitter;
