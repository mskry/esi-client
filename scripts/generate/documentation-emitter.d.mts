import type { ArtifactProvenance } from './artifacts.mjs';
import type { SerializableOperationManifest } from './operation-registry.mjs';
import type { EmitterContext, GeneratedOutputEmitter } from './orchestrate.mjs';

export interface RenderedGeneratedDocumentation {
  readonly generatedFiles: ReadonlyMap<string, string>;
  readonly llmsText: string;
}

export function renderGeneratedDocumentation(
  manifest: SerializableOperationManifest,
  provenance: ArtifactProvenance,
  namingReviewReport: string,
): RenderedGeneratedDocumentation;
export function emitGeneratedDocumentation(
  context: EmitterContext,
): Promise<
  readonly [
    { readonly target: 'docs/generated'; readonly kind: 'directory' },
    { readonly target: 'llms.txt'; readonly kind: 'file' },
    { readonly target: 'docs/llms.txt'; readonly kind: 'file' },
  ]
>;
export const generatedDocumentationEmitter: GeneratedOutputEmitter;
