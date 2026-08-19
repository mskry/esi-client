import type {
  EsiCacheMetadata,
  EsiErrorLimitMetadata,
  EsiPaginationMetadata,
  EsiResponseMetadata,
  EsiResponseMetadataInput,
} from './response.js';

export const ESI_ERROR_BODY_LIMITS: Readonly<{
  bytes: number;
  characters: number;
  depth: number;
  keys: number;
  arrayItems: number;
  stringCharacters: number;
}> = Object.freeze({
  bytes: 16_384,
  characters: 8_192,
  depth: 8,
  keys: 256,
  arrayItems: 100,
  stringCharacters: 1_024,
});

export type EsiErrorCode =
  | 'ESI_UNKNOWN_OPERATION'
  | 'ESI_AUTHENTICATION_REQUIRED'
  | 'ESI_GENERIC_MUTATION_DISABLED'
  | 'ESI_GENERIC_MUTATION_UNCONFIRMED'
  | 'ESI_HTTP_ERROR'
  | 'ESI_RESPONSE_PARSE_ERROR'
  | 'ESI_REQUEST_VALIDATION_ERROR'
  | 'ESI_RESPONSE_VALIDATION_ERROR';

export type EsiValidationDirection = 'request' | 'response';
export type EsiErrorBodyFormat = 'json' | 'text' | 'none';
export type EsiErrorBodyValue =
  | null
  | boolean
  | number
  | string
  | readonly EsiErrorBodyValue[]
  | { readonly [key: string]: EsiErrorBodyValue };

export interface EsiErrorRedactionContext {
  readonly secrets?: readonly string[];
}

export interface EsiValidationIssueInput {
  readonly path?: readonly PropertyKey[];
  readonly message?: string;
  readonly code?: string;
}

export interface EsiValidationIssue {
  readonly path: readonly (string | number)[];
  readonly message: string;
  readonly code: string;
}

export interface SerializedEsiError {
  readonly name: string;
  readonly code: EsiErrorCode;
  readonly message: string;
  readonly operationId: string;
}

export interface SerializedEsiAuthenticationRequiredError extends SerializedEsiError {
  readonly scopes: readonly string[];
}

export interface SerializedEsiHttpError extends SerializedEsiError {
  readonly status: number;
  readonly metadata: EsiResponseMetadata;
  readonly bodyFormat: EsiErrorBodyFormat;
  readonly body: EsiErrorBodyValue | undefined;
  readonly bodyTruncated: boolean;
}

export interface SerializedEsiResponseParseError extends SerializedEsiError {
  readonly status: number;
  readonly metadata: EsiResponseMetadata;
}

export interface SerializedEsiValidationError extends SerializedEsiError {
  readonly direction: EsiValidationDirection;
  readonly issues: readonly EsiValidationIssue[];
}

interface CommonErrorOptions {
  readonly operationId: string;
  readonly message?: string;
  readonly redaction?: EsiErrorRedactionContext;
  readonly cause?: unknown;
}

export interface EsiUnknownOperationErrorOptions extends CommonErrorOptions {}

export interface EsiAuthenticationRequiredErrorOptions extends CommonErrorOptions {
  readonly scopes?: readonly string[];
}

export interface EsiGenericMutationDisabledErrorOptions extends CommonErrorOptions {}

export interface EsiGenericMutationUnconfirmedErrorOptions extends CommonErrorOptions {}

export interface EsiHttpErrorOptions extends CommonErrorOptions {
  readonly status: number;
  readonly metadata?: EsiResponseMetadataInput;
  readonly responseBodyText?: string;
}

export interface EsiResponseParseErrorOptions extends CommonErrorOptions {
  readonly status: number;
  readonly metadata?: EsiResponseMetadataInput;
}

interface EsiValidationErrorOptions extends CommonErrorOptions {
  readonly issues: readonly EsiValidationIssueInput[];
}

export interface EsiRequestValidationErrorOptions extends EsiValidationErrorOptions {}

export interface EsiResponseValidationErrorOptions extends EsiValidationErrorOptions {}

interface Redactor {
  readonly secrets: readonly string[];
  readonly lookahead: number;
}

interface BoundedText {
  readonly text: string;
  readonly truncated: boolean;
}

interface NormalizationState {
  keys: number;
  arrayItems: number;
  truncated: boolean;
}

interface NormalizedBody {
  readonly format: Exclude<EsiErrorBodyFormat, 'none'>;
  readonly value: EsiErrorBodyValue;
  readonly truncated: boolean;
}

const REDACTED: string = '[REDACTED]';
const TRUNCATED: string = '[TRUNCATED]';
const MAX_OPERATION_ID_CHARACTERS: number = 256;
const MAX_MESSAGE_CHARACTERS: number = 512;
const MAX_METADATA_STRING_CHARACTERS: number = 1_024;
const MAX_HEADER_COUNT: number = 128;
const MAX_HEADER_NAME_CHARACTERS: number = 256;
const MAX_ISSUES: number = 100;
const MAX_ISSUE_PATH_SEGMENTS: number = 32;
const MAX_ISSUE_STRING_CHARACTERS: number = 256;
const MAX_SCOPES: number = 64;
const MAX_SECRET_LOOKAHEAD: number = 4_096;
const sensitiveNames: ReadonlySet<string> = new Set([
  'authorization',
  'proxyauthorization',
  'cookie',
  'setcookie',
  'token',
  'accesstoken',
  'refreshtoken',
  'idtoken',
  'apikey',
  'password',
  'clientsecret',
]);
export class EsiError extends Error {
  readonly code: EsiErrorCode;
  readonly operationId: string;

  protected constructor(
    name: string,
    code: EsiErrorCode,
    defaultMessage: string,
    options: CommonErrorOptions,
    redactor: Redactor,
  ) {
    const operationId = sanitizeString(
      options.operationId,
      redactor,
      MAX_OPERATION_ID_CHARACTERS,
      'unknown',
    );
    const message = sanitizeString(
      options.message,
      redactor,
      MAX_MESSAGE_CHARACTERS,
      defaultMessage.replace('{operationId}', operationId),
    );
    super(message, options.cause === undefined ? undefined : { cause: options.cause });
    Object.defineProperty(this, 'name', { value: name, enumerable: false });
    this.code = code;
    this.operationId = operationId;
  }

  toJSON(): SerializedEsiError {
    return Object.freeze({
      name: this.name,
      code: this.code,
      message: this.message,
      operationId: this.operationId,
    });
  }
}

export class EsiUnknownOperationError extends EsiError {
  constructor(options: EsiUnknownOperationErrorOptions) {
    const redactor = createRedactor(options.redaction);
    super(
      'EsiUnknownOperationError',
      'ESI_UNKNOWN_OPERATION',
      'Unknown ESI operation: {operationId}',
      options,
      redactor,
    );
    Object.freeze(this);
  }
}

export class EsiAuthenticationRequiredError extends EsiError {
  readonly scopes: readonly string[];

  constructor(options: EsiAuthenticationRequiredErrorOptions) {
    const redactor = createRedactor(options.redaction);
    super(
      'EsiAuthenticationRequiredError',
      'ESI_AUTHENTICATION_REQUIRED',
      'Authentication is required for ESI operation {operationId}',
      options,
      redactor,
    );
    this.scopes = normalizeScopes(options.scopes, redactor);
    Object.freeze(this);
  }

  override toJSON(): SerializedEsiAuthenticationRequiredError {
    return Object.freeze({ ...super.toJSON(), scopes: this.scopes });
  }
}

export class EsiGenericMutationDisabledError extends EsiError {
  constructor(options: EsiGenericMutationDisabledErrorOptions) {
    const redactor = createRedactor(options.redaction);
    super(
      'EsiGenericMutationDisabledError',
      'ESI_GENERIC_MUTATION_DISABLED',
      'Generic mutations are disabled for ESI operation {operationId}',
      options,
      redactor,
    );
    Object.freeze(this);
  }
}

export class EsiGenericMutationUnconfirmedError extends EsiError {
  constructor(options: EsiGenericMutationUnconfirmedErrorOptions) {
    const redactor = createRedactor(options.redaction);
    super(
      'EsiGenericMutationUnconfirmedError',
      'ESI_GENERIC_MUTATION_UNCONFIRMED',
      'Generic mutation confirmation is required for ESI operation {operationId}',
      options,
      redactor,
    );
    Object.freeze(this);
  }
}

export class EsiHttpError extends EsiError {
  readonly status: number;
  readonly metadata: EsiResponseMetadata;
  readonly bodyFormat: EsiErrorBodyFormat;
  readonly body: EsiErrorBodyValue | undefined;
  readonly bodyTruncated: boolean;

  constructor(options: EsiHttpErrorOptions) {
    const redactor = createRedactor(options.redaction);
    const status = normalizeStatus(options.status);
    super(
      'EsiHttpError',
      'ESI_HTTP_ERROR',
      `ESI operation {operationId} failed with HTTP status ${status}`,
      options,
      redactor,
    );
    const body = normalizeErrorBody(options.responseBodyText, redactor);
    this.status = status;
    this.metadata = normalizeMetadata(status, options.metadata, redactor);
    this.bodyFormat = body?.format ?? 'none';
    this.body = body?.value;
    this.bodyTruncated = body?.truncated ?? false;
    Object.freeze(this);
  }

  override toJSON(): SerializedEsiHttpError {
    return Object.freeze({
      ...super.toJSON(),
      status: this.status,
      metadata: this.metadata,
      bodyFormat: this.bodyFormat,
      body: this.body,
      bodyTruncated: this.bodyTruncated,
    });
  }
}

export class EsiResponseParseError extends EsiError {
  readonly status: number;
  readonly metadata: EsiResponseMetadata;

  constructor(options: EsiResponseParseErrorOptions) {
    const redactor = createRedactor(options.redaction);
    const status = normalizeStatus(options.status);
    super(
      'EsiResponseParseError',
      'ESI_RESPONSE_PARSE_ERROR',
      'Failed to parse the response for ESI operation {operationId}',
      options,
      redactor,
    );
    this.status = status;
    this.metadata = normalizeMetadata(status, options.metadata, redactor);
    Object.freeze(this);
  }

  override toJSON(): SerializedEsiResponseParseError {
    return Object.freeze({
      ...super.toJSON(),
      status: this.status,
      metadata: this.metadata,
    });
  }
}

export class EsiValidationError extends EsiError {
  readonly direction: EsiValidationDirection;
  readonly issues: readonly EsiValidationIssue[];

  protected constructor(
    name: string,
    code: 'ESI_REQUEST_VALIDATION_ERROR' | 'ESI_RESPONSE_VALIDATION_ERROR',
    direction: EsiValidationDirection,
    options: EsiValidationErrorOptions,
    redactor: Redactor,
  ) {
    super(
      name,
      code,
      `ESI ${direction} validation failed for operation {operationId}`,
      options,
      redactor,
    );
    this.direction = direction;
    this.issues = normalizeIssues(options.issues, redactor);
  }

  override toJSON(): SerializedEsiValidationError {
    return Object.freeze({
      ...super.toJSON(),
      direction: this.direction,
      issues: this.issues,
    });
  }
}

export class EsiRequestValidationError extends EsiValidationError {
  constructor(options: EsiRequestValidationErrorOptions) {
    const redactor = createRedactor(options.redaction);
    super(
      'EsiRequestValidationError',
      'ESI_REQUEST_VALIDATION_ERROR',
      'request',
      options,
      redactor,
    );
    Object.freeze(this);
  }
}

export class EsiResponseValidationError extends EsiValidationError {
  constructor(options: EsiResponseValidationErrorOptions) {
    const redactor = createRedactor(options.redaction);
    super(
      'EsiResponseValidationError',
      'ESI_RESPONSE_VALIDATION_ERROR',
      'response',
      options,
      redactor,
    );
    Object.freeze(this);
  }
}

function createRedactor(context: EsiErrorRedactionContext | undefined): Redactor {
  const secrets: string[] = [];
  let lookahead = 0;
  for (const secret of context?.secrets ?? []) {
    if (typeof secret !== 'string' || secret.length === 0 || secrets.includes(secret)) continue;
    secrets.push(secret);
    lookahead = Math.max(lookahead, Math.min(secret.length, MAX_SECRET_LOOKAHEAD));
  }
  return { secrets, lookahead };
}

function sanitizeString(
  value: string | undefined,
  redactor: Redactor,
  maximumCharacters: number,
  fallback: string,
): string {
  if (typeof value !== 'string') return fallback;
  const prefix = takeBoundedText(value, maximumCharacters + redactor.lookahead, Infinity);
  const redacted = redactText(prefix.text, redactor);
  const bounded = takeBoundedText(redacted, maximumCharacters, Infinity);
  if (!bounded.truncated && !prefix.truncated) return bounded.text;
  const markedPrefix = takeBoundedText(
    redacted,
    Math.max(0, maximumCharacters - TRUNCATED.length),
    Infinity,
  );
  return `${markedPrefix.text}${TRUNCATED}`;
}

function redactText(value: string, redactor: Redactor): string {
  let redacted = value;
  for (const secret of redactor.secrets) redacted = redacted.split(secret).join(REDACTED);
  redacted = redacted.replace(/\b(Bearer|Basic)\s+[^\s"',;}\]]+/giu, '$1 [REDACTED]');
  return redacted.replace(
    /\b((?:proxy-)?authorization|access[_-]?token|refresh[_-]?token|id[_-]?token|api[_-]?key|password|client[_-]?secret)\b\s*[:=]\s*(?:"[^"]*"|'[^']*'|[^\s,;}\]]+)/giu,
    '$1=[REDACTED]',
  );
}

function takeBoundedText(
  value: string,
  maximumCharacters: number,
  maximumBytes: number,
): BoundedText {
  let text = '';
  let characters = 0;
  let bytes = 0;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    const characterBytes =
      codePoint <= 0x7f ? 1 : codePoint <= 0x7ff ? 2 : codePoint <= 0xffff ? 3 : 4;
    if (characters >= maximumCharacters || bytes + characterBytes > maximumBytes) {
      return { text, truncated: true };
    }
    text += character;
    characters += 1;
    bytes += characterBytes;
  }
  return { text, truncated: false };
}

function normalizeStatus(value: number): number {
  return Number.isInteger(value) && value >= 0 && value <= 999 ? value : 0;
}

function normalizeMetadata(
  status: number,
  input: EsiResponseMetadataInput | undefined,
  redactor: Redactor,
): EsiResponseMetadata {
  const metadata: {
    status: number;
    headers: Readonly<Record<string, string>>;
    requestId?: string;
    pagination?: EsiPaginationMetadata;
    cache?: EsiCacheMetadata;
    errorLimit?: EsiErrorLimitMetadata;
  } = {
    status,
    headers: normalizeHeaders(input?.headers, redactor),
  };
  if (input?.requestId !== undefined) {
    metadata.requestId = sanitizeString(
      input.requestId,
      redactor,
      MAX_METADATA_STRING_CHARACTERS,
      '',
    );
  }
  const pagination = normalizePagination(input?.pagination, redactor);
  if (pagination !== undefined) metadata.pagination = pagination;
  const cache = normalizeCache(input?.cache, redactor);
  if (cache !== undefined) metadata.cache = cache;
  const errorLimit = normalizeErrorLimit(input?.errorLimit);
  if (errorLimit !== undefined) metadata.errorLimit = errorLimit;
  return Object.freeze(metadata);
}

function normalizeHeaders(
  headers: Readonly<Record<string, string>> | undefined,
  redactor: Redactor,
): Readonly<Record<string, string>> {
  const result: Record<string, string> = {};
  let count = 0;
  for (const [rawName, rawValue] of Object.entries(headers ?? {})) {
    if (count >= MAX_HEADER_COUNT) break;
    if (typeof rawValue !== 'string') continue;
    const name = sanitizeString(rawName.toLowerCase(), redactor, MAX_HEADER_NAME_CHARACTERS, '');
    if (name.length === 0) continue;
    if (Object.hasOwn(result, name)) continue;
    const value = isSensitiveName(rawName)
      ? REDACTED
      : sanitizeString(rawValue, redactor, MAX_METADATA_STRING_CHARACTERS, '');
    Object.defineProperty(result, name, {
      value,
      enumerable: true,
      configurable: false,
      writable: false,
    });
    count += 1;
  }
  return Object.freeze(result);
}

function normalizePagination(
  input: EsiPaginationMetadata | undefined,
  redactor: Redactor,
): EsiPaginationMetadata | undefined {
  if (input === undefined) return undefined;
  const result: {
    pages?: number;
    cursor?: string;
    nextCursor?: string;
    previousCursor?: string;
  } = {};
  if (isFiniteNumber(input.pages)) result.pages = input.pages;
  if (input.cursor !== undefined) {
    result.cursor = sanitizeString(input.cursor, redactor, MAX_METADATA_STRING_CHARACTERS, '');
  }
  if (input.nextCursor !== undefined) {
    result.nextCursor = sanitizeString(
      input.nextCursor,
      redactor,
      MAX_METADATA_STRING_CHARACTERS,
      '',
    );
  }
  if (input.previousCursor !== undefined) {
    result.previousCursor = sanitizeString(
      input.previousCursor,
      redactor,
      MAX_METADATA_STRING_CHARACTERS,
      '',
    );
  }
  return Object.freeze(result);
}

function normalizeCache(
  input: EsiCacheMetadata | undefined,
  redactor: Redactor,
): EsiCacheMetadata | undefined {
  if (input === undefined) return undefined;
  const result: {
    etag?: string;
    expires?: string;
    lastModified?: string;
    cacheControl?: string;
  } = {};
  if (input.etag !== undefined) {
    result.etag = sanitizeString(input.etag, redactor, MAX_METADATA_STRING_CHARACTERS, '');
  }
  if (input.expires !== undefined) {
    result.expires = sanitizeString(input.expires, redactor, MAX_METADATA_STRING_CHARACTERS, '');
  }
  if (input.lastModified !== undefined) {
    result.lastModified = sanitizeString(
      input.lastModified,
      redactor,
      MAX_METADATA_STRING_CHARACTERS,
      '',
    );
  }
  if (input.cacheControl !== undefined) {
    result.cacheControl = sanitizeString(
      input.cacheControl,
      redactor,
      MAX_METADATA_STRING_CHARACTERS,
      '',
    );
  }
  return Object.freeze(result);
}

function normalizeErrorLimit(
  input: EsiErrorLimitMetadata | undefined,
): EsiErrorLimitMetadata | undefined {
  if (input === undefined) return undefined;
  const result: { remaining?: number; reset?: number } = {};
  if (isFiniteNumber(input.remaining)) result.remaining = input.remaining;
  if (isFiniteNumber(input.reset)) result.reset = input.reset;
  return Object.freeze(result);
}

function isFiniteNumber(value: number | undefined): value is number {
  return typeof value === 'number' && Number.isFinite(value);
}

function normalizeScopes(
  scopes: readonly string[] | undefined,
  redactor: Redactor,
): readonly string[] {
  const normalized: string[] = [];
  for (const scope of scopes ?? []) {
    if (normalized.length >= MAX_SCOPES) break;
    if (typeof scope !== 'string') continue;
    normalized.push(sanitizeString(scope, redactor, MAX_ISSUE_STRING_CHARACTERS, ''));
  }
  return Object.freeze(normalized);
}

function normalizeIssues(
  issues: readonly EsiValidationIssueInput[],
  redactor: Redactor,
): readonly EsiValidationIssue[] {
  const normalized: EsiValidationIssue[] = [];
  for (const issue of issues) {
    if (normalized.length >= MAX_ISSUES) break;
    if (typeof issue !== 'object' || issue === null) continue;
    const path: (string | number)[] = [];
    for (const segment of issue.path ?? []) {
      if (path.length >= MAX_ISSUE_PATH_SEGMENTS) break;
      if (typeof segment === 'number' && Number.isFinite(segment)) path.push(segment);
      if (typeof segment === 'string') {
        path.push(sanitizeString(segment, redactor, MAX_ISSUE_STRING_CHARACTERS, ''));
      }
    }
    normalized.push(
      Object.freeze({
        path: Object.freeze(path),
        message: sanitizeString(
          issue.message,
          redactor,
          MAX_ISSUE_STRING_CHARACTERS,
          'Validation failed',
        ),
        code: sanitizeString(issue.code, redactor, MAX_ISSUE_STRING_CHARACTERS, 'custom'),
      }),
    );
  }
  return Object.freeze(normalized);
}

function normalizeErrorBody(
  bodyText: string | undefined,
  redactor: Redactor,
): NormalizedBody | undefined {
  if (typeof bodyText !== 'string') return undefined;
  const bounded = takeBoundedText(
    bodyText,
    ESI_ERROR_BODY_LIMITS.characters,
    ESI_ERROR_BODY_LIMITS.bytes,
  );
  if (!bounded.truncated) {
    try {
      const parsed: unknown = JSON.parse(bounded.text);
      const state: NormalizationState = { keys: 0, arrayItems: 0, truncated: false };
      const value = normalizeJsonValue(parsed, 0, state, redactor);
      return Object.freeze({ format: 'json', value, truncated: state.truncated });
    } catch {
      // Invalid JSON is represented as bounded text below.
    }
  }
  const text = sanitizeString(bounded.text, redactor, ESI_ERROR_BODY_LIMITS.characters, '');
  return Object.freeze({ format: 'text', value: text, truncated: bounded.truncated });
}

function normalizeJsonValue(
  value: unknown,
  depth: number,
  state: NormalizationState,
  redactor: Redactor,
): EsiErrorBodyValue {
  if (depth > ESI_ERROR_BODY_LIMITS.depth) {
    state.truncated = true;
    return TRUNCATED;
  }
  if (value === null || typeof value === 'boolean') return value;
  if (typeof value === 'number') return Number.isFinite(value) ? value : 0;
  if (typeof value === 'string') {
    return sanitizeString(value, redactor, ESI_ERROR_BODY_LIMITS.stringCharacters, '');
  }
  if (Array.isArray(value)) {
    const result: EsiErrorBodyValue[] = [];
    for (const item of value) {
      if (state.arrayItems >= ESI_ERROR_BODY_LIMITS.arrayItems) {
        state.truncated = true;
        break;
      }
      state.arrayItems += 1;
      result.push(normalizeJsonValue(item, depth + 1, state, redactor));
    }
    return Object.freeze(result);
  }
  if (typeof value === 'object') {
    const result: Record<string, EsiErrorBodyValue> = {};
    for (const [rawKey, item] of Object.entries(value)) {
      if (state.keys >= ESI_ERROR_BODY_LIMITS.keys) {
        state.truncated = true;
        break;
      }
      state.keys += 1;
      const key = sanitizeString(rawKey, redactor, MAX_ISSUE_STRING_CHARACTERS, '');
      if (Object.hasOwn(result, key)) {
        state.truncated = true;
        continue;
      }
      const normalized = isSensitiveName(rawKey)
        ? REDACTED
        : normalizeJsonValue(item, depth + 1, state, redactor);
      Object.defineProperty(result, key, {
        value: normalized,
        enumerable: true,
        configurable: false,
        writable: false,
      });
    }
    return Object.freeze(result);
  }
  state.truncated = true;
  return TRUNCATED;
}

function isSensitiveName(value: string): boolean {
  return sensitiveNames.has(value.toLowerCase().replaceAll('-', '').replaceAll('_', ''));
}
