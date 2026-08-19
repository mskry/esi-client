export type JsonPrimitive = boolean | number | string | null;
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];
export interface JsonObject {
  readonly [key: string]: JsonValue;
}
export type NormalizedSchema = boolean | JsonObject;
export type HttpMethod = 'DELETE' | 'GET' | 'HEAD' | 'OPTIONS' | 'PATCH' | 'POST' | 'PUT' | 'TRACE';
export type ParameterPlacement = 'path' | 'query' | 'header' | 'cookie';
export type PaginationKind = 'none' | 'offset' | 'cursor' | 'offset-and-cursor';

export interface NormalizedParameter {
  readonly name: string;
  readonly placement: ParameterPlacement;
  readonly required: boolean;
  readonly description: string | null;
  readonly deprecated: boolean;
  readonly style: string | null;
  readonly explode: boolean | null;
  readonly allowReserved: boolean | null;
  readonly schema: NormalizedSchema;
  readonly extensions: JsonObject;
}

export interface NormalizedMediaType {
  readonly mediaType: string;
  readonly schema: NormalizedSchema;
  readonly extensions: JsonObject;
}

export interface NormalizedRequestBody {
  readonly required: boolean;
  readonly description: string | null;
  readonly content: readonly NormalizedMediaType[];
  readonly extensions: JsonObject;
}

export interface NormalizedResponseHeader {
  readonly name: string;
  readonly description: string | null;
  readonly schema: NormalizedSchema;
  readonly extensions: JsonObject;
}

export interface NormalizedSuccessResponse {
  readonly status: string;
  readonly description: string;
  readonly noContent: boolean;
  readonly content: readonly NormalizedMediaType[];
  readonly headers: readonly NormalizedResponseHeader[];
  readonly extensions: JsonObject;
}

export interface NormalizedSecuritySchemeRequirement {
  readonly name: string;
  readonly scopes: readonly string[];
}

export interface NormalizedSecurityRequirement {
  readonly schemes: readonly NormalizedSecuritySchemeRequirement[];
}

export interface NormalizedOperation {
  readonly operationId: string;
  readonly method: HttpMethod;
  readonly path: string;
  readonly domainSource: string | null;
  readonly tags: readonly string[];
  readonly summary: string | null;
  readonly description: string | null;
  readonly parameters: readonly NormalizedParameter[];
  readonly requestBody: NormalizedRequestBody | null;
  readonly successResponses: readonly NormalizedSuccessResponse[];
  readonly security: readonly NormalizedSecurityRequirement[];
  readonly pagination: {
    readonly kind: PaginationKind;
    readonly requestParameters: readonly string[];
    readonly responseHeaders: readonly string[];
  };
  readonly cache: {
    readonly responseHeaders: readonly string[];
    readonly extensions: JsonObject;
  };
  readonly extensions: JsonObject;
}

export interface NormalizedModel {
  readonly name: string;
  readonly pointer: string;
  readonly schema: NormalizedSchema;
}

export interface OperationExclusion {
  readonly operationId: string;
  readonly reason: {
    readonly code: string;
    readonly detail: string;
  };
  readonly reviewed: true;
}

export interface ConstructInventoryEntry {
  readonly construct: string;
  readonly count: number;
}

export interface OpenApiConstructInventory {
  readonly openapi: readonly ConstructInventoryEntry[];
  readonly schemas: readonly ConstructInventoryEntry[];
}

export interface NormalizedOpenApiModel {
  readonly operations: readonly NormalizedOperation[];
  readonly models: readonly NormalizedModel[];
  readonly exclusions: readonly OperationExclusion[];
  readonly inventory: OpenApiConstructInventory;
  readonly accounting: {
    readonly sourceOperationIds: readonly string[];
    readonly normalizedOperationIds: readonly string[];
    readonly excludedOperationIds: readonly string[];
  };
}

export interface NormalizeOpenApiOptions {
  exclusionsPath?: string;
}

export const defaultExclusionsPath: string;

export function normalizeOpenApiDocument(
  document: Readonly<Record<string, unknown>>,
  options?: NormalizeOpenApiOptions,
): Promise<NormalizedOpenApiModel>;
export function resolveLocalReference(document: unknown, reference: string): unknown;
export function createOpenApiInventory(
  document: Readonly<Record<string, unknown>>,
): OpenApiConstructInventory;
