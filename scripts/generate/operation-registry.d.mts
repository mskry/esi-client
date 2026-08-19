import type { ArtifactProvenance } from './artifacts.mjs';
import type { JsonObject, JsonValue, NormalizedOpenApiModel } from './normalize.mjs';
import type { ResolvedOperationMetadata } from './operation-metadata.mjs';
import type { EmitterContext } from './orchestrate.mjs';
import type { GeneratedSourceComponent } from './source-emitter.mjs';

export interface RenderedOperationRegistryArtifacts {
  readonly indexSource: string;
  readonly manifestSource: string;
  readonly registrySource: string;
}

export interface SerializableOperationReference {
  readonly module: '@evespace/esi-client/schemas';
  readonly export: string;
}

export interface SerializableOperationParameter {
  readonly name: string;
  readonly placement: 'path' | 'query' | 'header' | 'cookie';
  readonly required: boolean;
  readonly deprecated: boolean;
  readonly description: string | null;
  readonly style: string | null;
  readonly explode: boolean | null;
  readonly allowReserved: boolean | null;
  readonly schema: JsonValue;
}

export interface SerializableOperationContent {
  readonly mediaType: string;
  readonly schema: JsonValue;
}

export interface SerializableOperationManifestEntry {
  readonly operationId: string;
  readonly facade: { readonly domain: string; readonly method: string };
  readonly summary: string | null;
  readonly description: string | null;
  readonly http: {
    readonly method: 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT' | 'TRACE';
    readonly path: string;
  };
  readonly parameters: readonly SerializableOperationParameter[];
  readonly requestBody: {
    readonly required: boolean;
    readonly description: string | null;
    readonly content: readonly SerializableOperationContent[];
  } | null;
  readonly requestSchema: SerializableOperationReference;
  readonly responses: readonly {
    readonly status: string;
    readonly description: string;
    readonly body: 'json' | 'none';
    readonly content: readonly SerializableOperationContent[];
    readonly schema: SerializableOperationReference;
  }[];
  readonly authentication: { readonly required: boolean; readonly scopes: readonly string[] };
  readonly pagination: {
    readonly kind: 'none' | 'offset' | 'cursor' | 'offset-and-cursor';
    readonly requestParameters: readonly string[];
    readonly responseHeaders: readonly string[];
  };
  readonly cache: {
    readonly responseHeaders: readonly string[];
    readonly extensions: JsonObject;
  };
  readonly transport: { readonly compatibilityDateOverride: boolean };
  readonly classification: 'read' | 'mutation';
  readonly safety: {
    readonly readLike: boolean;
    readonly readLikeOverride: { readonly reviewed: true; readonly reason: string } | null;
    readonly typed: {
      readonly expressesMutationIntent: boolean;
      readonly genericMutationGatesApply: false;
    };
    readonly generic: {
      readonly requiresClientMutationEnablement: boolean;
      readonly requiresConfirmation: boolean;
    };
  };
}

export interface SerializableOperationManifest {
  readonly _generated: {
    readonly compatibilityDate: string;
    readonly notice: string;
    readonly specificationSha256: string;
  };
  readonly operations: readonly SerializableOperationManifestEntry[];
  readonly schemaVersion: 1;
}

export function renderOperationRegistryArtifacts(
  model: NormalizedOpenApiModel,
  operationMetadata: readonly ResolvedOperationMetadata[],
  provenance: ArtifactProvenance,
): RenderedOperationRegistryArtifacts;
export function createSerializableOperationManifest(
  model: NormalizedOpenApiModel,
  operationMetadata: readonly ResolvedOperationMetadata[],
  provenance: ArtifactProvenance,
): SerializableOperationManifest;
export function emitOperationRegistrySource(
  context: EmitterContext,
  sourceDirectory: string,
): Promise<readonly ['operations/index.ts', 'operations/manifest.ts', 'operations/registry.ts']>;
export const operationRegistrySourceComponent: GeneratedSourceComponent;
