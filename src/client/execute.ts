import type { EsiClientConfiguration } from './configuration.js';
import {
  ESI_ERROR_BODY_LIMITS,
  EsiAuthenticationRequiredError,
  EsiHttpError,
  EsiRequestValidationError,
  EsiResponseParseError,
  EsiResponseValidationError,
} from './errors.js';
import { constructOperationRequest } from './request.js';
import { createEsiResponse, extractEsiResponseMetadata } from './response.js';
import type {
  ExecutableOperationDescriptor,
  OperationRequestArguments,
  OperationSchema,
} from './request.js';
import type { EsiResponse } from './response.js';

export type OperationSuccessStatus = number | '2XX';

export interface JsonOperationSuccessResponse<TResponse = unknown> {
  readonly status: OperationSuccessStatus;
  readonly body: 'json';
  readonly schema: OperationSchema<TResponse>;
}

export interface NoContentOperationSuccessResponse {
  readonly status: OperationSuccessStatus;
  readonly body: 'none';
}

export type OperationSuccessResponse<TResponse = unknown> =
  | JsonOperationSuccessResponse<TResponse>
  | NoContentOperationSuccessResponse;

export interface OperationAuthentication {
  readonly scopes: readonly string[];
}

export interface OperationTransportDescriptor {
  readonly compatibilityDateOverride?: true;
}

export interface OperationExecutionDescriptor<
  TArguments extends OperationRequestArguments = OperationRequestArguments,
  TResponse = unknown,
> extends ExecutableOperationDescriptor<TArguments> {
  readonly authentication: OperationAuthentication | null;
  readonly successResponses: readonly OperationSuccessResponse<TResponse>[];
  readonly transport?: OperationTransportDescriptor;
}

export interface OperationExecutionOptions {
  readonly forceRequestValidation?: boolean;
  readonly compatibilityDate?: string;
}

interface ValidatedExecutionDescriptor<TResponse> {
  readonly authentication: OperationAuthentication | null;
  readonly successResponses: readonly OperationSuccessResponse<TResponse>[];
  readonly allowsCompatibilityDateOverride: boolean;
}

const compatibilityDatePattern: RegExp = /^\d{4}-\d{2}-\d{2}$/u;

export async function executeOperation<TArguments extends OperationRequestArguments, TResponse>(
  configuration: EsiClientConfiguration,
  descriptor: OperationExecutionDescriptor<TArguments, TResponse>,
  arguments_: TArguments,
  options: OperationExecutionOptions = {},
): Promise<EsiResponse<TResponse>> {
  const execution = validateExecutionDescriptor(descriptor);
  const forceRequestValidation = validateExecutionOptions(
    descriptor.operationId,
    options,
    execution,
  );
  const validatedArguments =
    configuration.validateRequests || forceRequestValidation
      ? validateOperationRequestArguments(descriptor, arguments_)
      : arguments_;
  const request = constructOperationRequest(descriptor, validatedArguments);
  const compatibilityDate = resolveCompatibilityDate(
    descriptor.operationId,
    configuration.compatibilityDate,
    options.compatibilityDate,
  );
  const headers = createRequestHeaders(
    request.headers,
    request.body,
    compatibilityDate,
    configuration.language,
  );

  const secrets: string[] = [];
  if (execution.authentication !== null) {
    const token = await resolveAccessToken(
      configuration,
      descriptor.operationId,
      execution.authentication,
    );
    secrets.push(token);
    headers.set('authorization', `Bearer ${token}`);
  }

  const fetchImplementation = configuration.fetch;
  const response = await fetchImplementation(`${configuration.baseUrl}${request.path}`, {
    method: request.method,
    headers,
    ...(request.body === undefined ? {} : { body: request.body }),
  });
  const responseHeaders = new Headers(response.headers);
  const metadata = extractEsiResponseMetadata(response.status, responseHeaders);
  const redaction = { secrets };

  if (!response.ok) {
    const responseBodyText = await readBoundedResponseBody(response);
    throw new EsiHttpError({
      operationId: descriptor.operationId,
      status: response.status,
      metadata,
      responseBodyText,
      redaction,
    });
  }

  const successResponse = selectSuccessResponse(execution.successResponses, response.status);
  if (response.status === 204 || response.status === 205 || successResponse?.body === 'none') {
    await response.body?.cancel();
    return createEsiResponse(
      // Generated descriptors include undefined in TResponse exactly when no content is declared.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      undefined as TResponse,
      metadata,
    );
  }

  let data: unknown;
  try {
    data = await response.json();
  } catch (cause) {
    throw new EsiResponseParseError({
      operationId: descriptor.operationId,
      status: response.status,
      metadata,
      redaction,
      cause,
    });
  }

  if (!configuration.validateResponses) {
    return createEsiResponse(
      // Validation is explicitly disabled, so the wire value retains the generated response type.
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      data as TResponse,
      metadata,
    );
  }
  if (successResponse === undefined) {
    throw new EsiResponseValidationError({
      operationId: descriptor.operationId,
      issues: [
        {
          path: [],
          code: 'unsupported_status',
          message: `No response schema is declared for successful HTTP status ${response.status}`,
        },
      ],
      redaction,
    });
  }
  const parsed = successResponse.schema.safeParse(data);
  if (!parsed.success) {
    throw new EsiResponseValidationError({
      operationId: descriptor.operationId,
      issues: parsed.error.issues,
      redaction,
    });
  }
  return createEsiResponse(parsed.data, metadata);
}

function validateExecutionDescriptor<TResponse>(
  descriptor: OperationExecutionDescriptor<OperationRequestArguments, TResponse>,
): ValidatedExecutionDescriptor<TResponse> {
  const operationId = descriptor.operationId;
  const authentication = descriptor.authentication;
  if (authentication !== null) {
    if (!isRecord(authentication) || !Array.isArray(authentication.scopes)) {
      throw new TypeError(`Operation descriptor ${operationId} authentication must provide scopes`);
    }
    for (const scope of authentication.scopes) {
      if (typeof scope !== 'string' || scope.length === 0) {
        throw new TypeError(
          `Operation descriptor ${operationId} has an invalid authentication scope`,
        );
      }
    }
  }
  if (!Array.isArray(descriptor.successResponses) || descriptor.successResponses.length === 0) {
    throw new TypeError(`Operation descriptor ${operationId} must declare successful responses`);
  }
  const statuses = new Set<OperationSuccessStatus>();
  for (const response of descriptor.successResponses) {
    validateSuccessResponse(operationId, response);
    if (statuses.has(response.status)) {
      throw new TypeError(
        `Operation descriptor ${operationId} has duplicate success status ${response.status}`,
      );
    }
    statuses.add(response.status);
  }
  if (statuses.has('2XX') && statuses.size > 1) {
    throw new TypeError(`Operation descriptor ${operationId} has overlapping success statuses`);
  }
  const transport = descriptor.transport;
  if (
    transport !== undefined &&
    (!isRecord(transport) ||
      (transport.compatibilityDateOverride !== undefined &&
        transport.compatibilityDateOverride !== true))
  ) {
    throw new TypeError(`Operation descriptor ${operationId} has invalid transport metadata`);
  }
  return {
    authentication,
    successResponses: descriptor.successResponses,
    allowsCompatibilityDateOverride: transport?.compatibilityDateOverride === true,
  };
}

function validateSuccessResponse(operationId: string, response: OperationSuccessResponse): void {
  if (!isRecord(response)) {
    throw new TypeError(`Operation descriptor ${operationId} has an invalid success response`);
  }
  if (
    response.status !== '2XX' &&
    (!Number.isInteger(response.status) || response.status < 200 || response.status > 299)
  ) {
    throw new TypeError(`Operation descriptor ${operationId} has an invalid success status`);
  }
  if (response.body !== 'json' && response.body !== 'none') {
    throw new TypeError(`Operation descriptor ${operationId} has an invalid success response body`);
  }
  if (
    response.body === 'json' &&
    (!isRecord(response.schema) || typeof response.schema.safeParse !== 'function')
  ) {
    throw new TypeError(
      `Operation descriptor ${operationId} JSON response schema must provide safeParse()`,
    );
  }
  if (response.body === 'none' && 'schema' in response) {
    throw new TypeError(`Operation descriptor ${operationId} no-content response has a schema`);
  }
}

function validateExecutionOptions<TResponse>(
  operationId: string,
  options: OperationExecutionOptions,
  descriptor: ValidatedExecutionDescriptor<TResponse>,
): boolean {
  if (!isRecord(options)) {
    throw requestValidationError(
      operationId,
      [],
      'Execution options must be an object',
      'invalid_type',
    );
  }
  for (const key of Object.keys(options)) {
    if (key !== 'forceRequestValidation' && key !== 'compatibilityDate') {
      throw requestValidationError(
        operationId,
        [key],
        `Unknown execution option: ${key}`,
        'unrecognized_key',
      );
    }
  }
  if (
    options.forceRequestValidation !== undefined &&
    typeof options.forceRequestValidation !== 'boolean'
  ) {
    throw requestValidationError(
      operationId,
      ['forceRequestValidation'],
      'forceRequestValidation must be a boolean',
      'invalid_type',
    );
  }
  if (options.compatibilityDate !== undefined && !descriptor.allowsCompatibilityDateOverride) {
    throw requestValidationError(
      operationId,
      ['compatibilityDate'],
      'This operation does not declare a compatibility-date override',
      'unrecognized_key',
    );
  }
  return options.forceRequestValidation ?? false;
}

export function validateOperationRequestArguments<TArguments extends OperationRequestArguments>(
  descriptor: OperationExecutionDescriptor<TArguments>,
  arguments_: TArguments,
): TArguments {
  if (descriptor.requestSchema === undefined) {
    throw new TypeError(
      `Operation descriptor ${descriptor.operationId} requires a request schema for validation`,
    );
  }
  const parsed = descriptor.requestSchema.safeParse(arguments_);
  if (!parsed.success) {
    throw new EsiRequestValidationError({
      operationId: descriptor.operationId,
      issues: parsed.error.issues,
    });
  }
  return parsed.data;
}

function resolveCompatibilityDate(
  operationId: string,
  configured: string,
  override: string | undefined,
): string {
  const value = override ?? configured;
  if (typeof value !== 'string' || !compatibilityDatePattern.test(value)) {
    throw requestValidationError(
      operationId,
      ['compatibilityDate'],
      'compatibilityDate must use the YYYY-MM-DD format',
      'invalid_format',
    );
  }
  const parsedDate = new Date(`${value}T00:00:00.000Z`);
  if (Number.isNaN(parsedDate.valueOf()) || parsedDate.toISOString().slice(0, 10) !== value) {
    throw requestValidationError(
      operationId,
      ['compatibilityDate'],
      'compatibilityDate must be a valid calendar date',
      'invalid_format',
    );
  }
  return value;
}

function createRequestHeaders(
  operationHeaders: Readonly<Record<string, string>>,
  body: string | undefined,
  compatibilityDate: string,
  language: string,
): Headers {
  const headers = new Headers(operationHeaders);
  headers.set('accept', 'application/json');
  headers.set('accept-language', language);
  headers.set('x-compatibility-date', compatibilityDate);
  headers.delete('authorization');
  if (body === undefined) headers.delete('content-type');
  else headers.set('content-type', 'application/json');
  return headers;
}

async function resolveAccessToken(
  configuration: EsiClientConfiguration,
  operationId: string,
  authentication: OperationAuthentication,
): Promise<string> {
  let token = configuration.token;
  if (token === undefined && configuration.tokenProvider !== undefined) {
    try {
      token = await configuration.tokenProvider();
    } catch (cause) {
      throw new EsiAuthenticationRequiredError({
        operationId,
        scopes: authentication.scopes,
        cause,
      });
    }
  }
  if (!isSafeToken(token)) {
    throw new EsiAuthenticationRequiredError({
      operationId,
      scopes: authentication.scopes,
      ...(typeof token === 'string' ? { redaction: { secrets: [token] } } : {}),
    });
  }
  return token;
}

function isSafeToken(value: unknown): value is string {
  if (typeof value !== 'string' || value.length === 0) return false;
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint <= 0x20 || codePoint === 0x7f) return false;
  }
  return true;
}

function selectSuccessResponse<TResponse>(
  responses: readonly OperationSuccessResponse<TResponse>[],
  status: number,
): OperationSuccessResponse<TResponse> | undefined {
  return responses.find((response) => response.status === status || response.status === '2XX');
}

async function readBoundedResponseBody(response: Response): Promise<string | undefined> {
  if (response.body === null) return undefined;
  const reader = response.body.getReader();
  const chunks: Uint8Array[] = [];
  let byteLength = 0;
  const maximumBytes = ESI_ERROR_BODY_LIMITS.bytes + 1;
  try {
    while (byteLength < maximumBytes) {
      const result = await reader.read();
      if (result.done) break;
      const remaining = maximumBytes - byteLength;
      const chunk =
        result.value.byteLength > remaining ? result.value.slice(0, remaining) : result.value;
      chunks.push(chunk);
      byteLength += chunk.byteLength;
      if (result.value.byteLength > remaining) break;
    }
  } finally {
    if (byteLength >= maximumBytes) await reader.cancel().catch(() => undefined);
    reader.releaseLock();
  }
  const bytes = new Uint8Array(byteLength);
  let offset = 0;
  for (const chunk of chunks) {
    bytes.set(chunk, offset);
    offset += chunk.byteLength;
  }
  return new TextDecoder().decode(bytes);
}

function requestValidationError(
  operationId: string,
  path: readonly (string | number)[],
  message: string,
  code: string,
): EsiRequestValidationError {
  return new EsiRequestValidationError({ operationId, issues: [{ path, message, code }] });
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
