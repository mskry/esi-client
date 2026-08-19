import { EsiRequestValidationError } from './errors.js';

export type OperationHttpMethod =
  | 'DELETE'
  | 'GET'
  | 'HEAD'
  | 'OPTIONS'
  | 'PATCH'
  | 'POST'
  | 'PUT'
  | 'TRACE';
export type OperationParameterPlacement = 'path' | 'query' | 'header';
export type JsonPrimitive = null | boolean | number | string;
export type JsonValue = JsonPrimitive | JsonObject | readonly JsonValue[];

export interface JsonObject {
  readonly [key: string]: JsonValue;
}

export interface StringParameterSchema {
  readonly type: 'string';
}

export interface BooleanParameterSchema {
  readonly type: 'boolean';
}

export interface IntegerParameterSchema {
  readonly type: 'integer';
}

export interface NumberParameterSchema {
  readonly type: 'number';
}

export type ScalarParameterSchema =
  | StringParameterSchema
  | BooleanParameterSchema
  | IntegerParameterSchema
  | NumberParameterSchema;

export interface ArrayParameterSchema {
  readonly type: 'array';
  readonly items: ScalarParameterSchema;
}

export type OperationParameterSchema = ScalarParameterSchema | ArrayParameterSchema;

interface OperationParameterDescriptorBase {
  readonly name: string;
  readonly required: boolean;
  readonly schema: OperationParameterSchema;
}

export interface PathOperationParameterDescriptor extends OperationParameterDescriptorBase {
  readonly placement: 'path';
  readonly style?: 'simple' | null;
  readonly explode?: boolean | null;
}

export interface QueryOperationParameterDescriptor extends OperationParameterDescriptorBase {
  readonly placement: 'query';
  readonly style?: 'form' | null;
  readonly explode?: boolean | null;
  readonly allowReserved?: false | null;
}

export interface HeaderOperationParameterDescriptor extends OperationParameterDescriptorBase {
  readonly placement: 'header';
  readonly style?: 'simple' | null;
  readonly explode?: boolean | null;
}

export type OperationParameterDescriptor =
  | PathOperationParameterDescriptor
  | QueryOperationParameterDescriptor
  | HeaderOperationParameterDescriptor;

export interface JsonRequestBodyDescriptor {
  readonly required: boolean;
  readonly mediaType: 'application/json';
}

export interface OperationSchemaIssue {
  readonly path?: readonly PropertyKey[];
  readonly message?: string;
  readonly code?: string;
}

export type OperationSchemaResult<T> =
  | { readonly success: true; readonly data: T }
  | {
      readonly success: false;
      readonly error: { readonly issues: readonly OperationSchemaIssue[] };
    };

export interface OperationSchema<T = unknown> {
  readonly safeParse: (value: unknown) => OperationSchemaResult<T>;
}

export interface OperationRequestArguments {
  readonly path?: Readonly<Record<string, unknown>>;
  readonly query?: Readonly<Record<string, unknown>>;
  readonly header?: Readonly<Record<string, unknown>>;
  readonly body?: unknown;
}

export interface ExecutableOperationDescriptor<
  TArguments extends OperationRequestArguments = OperationRequestArguments,
> {
  readonly operationId: string;
  readonly method: OperationHttpMethod;
  readonly path: string;
  readonly parameters: readonly OperationParameterDescriptor[];
  readonly requestBody: JsonRequestBodyDescriptor | null;
  readonly requestSchema?: OperationSchema<TArguments>;
}

export interface ConstructedOperationRequest {
  readonly method: OperationHttpMethod;
  readonly path: string;
  readonly headers: Readonly<Record<string, string>>;
  readonly body?: string;
}

interface ValidatedParameter {
  readonly name: string;
  readonly placement: OperationParameterPlacement;
  readonly required: boolean;
  readonly schema: OperationParameterSchema;
  readonly explode: boolean;
}

interface ValidatedDescriptor {
  readonly operationId: string;
  readonly method: OperationHttpMethod;
  readonly path: string;
  readonly parameters: readonly ValidatedParameter[];
  readonly requestBody: JsonRequestBodyDescriptor | null;
}

const httpMethods: ReadonlySet<string> = new Set([
  'DELETE',
  'GET',
  'HEAD',
  'OPTIONS',
  'PATCH',
  'POST',
  'PUT',
  'TRACE',
]);
const argumentPlacements: readonly OperationParameterPlacement[] = ['path', 'query', 'header'];
const argumentNames: ReadonlySet<string> = new Set([...argumentPlacements, 'body']);
const headerNamePattern: RegExp = /^[!#$%&'*+\-.^_`|~0-9A-Za-z]+$/u;
const placeholderPattern: RegExp = /\{([^{}]+)\}/gu;

export function constructOperationRequest<
  TArguments extends OperationRequestArguments = OperationRequestArguments,
>(
  descriptor: ExecutableOperationDescriptor<TArguments>,
  arguments_: TArguments,
): ConstructedOperationRequest {
  const validated = validateDescriptor(descriptor);
  const argumentObject = validateArgumentsObject(validated, arguments_);
  const valuesByPlacement = collectParameterValues(validated, argumentObject);
  const path = substitutePath(validated, valuesByPlacement.path);
  const query = serializeQuery(validated, valuesByPlacement.query);
  const headers = createHeaderRecord(validated, valuesByPlacement.header);
  const body = serializeBody(validated, argumentObject, headers);
  const requestPath = query.length === 0 ? path : `${path}?${query}`;
  const request: {
    method: OperationHttpMethod;
    path: string;
    headers: Readonly<Record<string, string>>;
    body?: string;
  } = {
    method: validated.method,
    path: requestPath,
    headers: Object.freeze(headers),
  };
  if (body !== undefined) request.body = body;
  return Object.freeze(request);
}

function validateDescriptor(value: unknown): ValidatedDescriptor {
  if (!isRecord(value)) throw new TypeError('Operation descriptor must be an object');
  const operationId = value.operationId;
  if (
    typeof operationId !== 'string' ||
    operationId.length === 0 ||
    operationId !== operationId.trim() ||
    hasControlCharacter(operationId) ||
    hasUnpairedSurrogate(operationId)
  ) {
    throw new TypeError('Operation descriptor operationId must be a non-empty safe string');
  }
  const method = value.method;
  if (!isHttpMethod(method)) {
    throw new TypeError(`Invalid HTTP method in operation descriptor ${operationId}`);
  }
  const path = value.path;
  if (typeof path !== 'string') {
    throw new TypeError(`Invalid path template in operation descriptor ${operationId}`);
  }
  validatePathTemplate(path, operationId);
  if (!Array.isArray(value.parameters)) {
    throw new TypeError(`Operation descriptor ${operationId} parameters must be an array`);
  }
  const parameters = value.parameters.map((parameter, index) =>
    validateParameter(parameter, operationId, index),
  );
  validateParameterIdentities(parameters, operationId);
  validatePathParameters(path, parameters, operationId);
  const requestBody = validateRequestBody(value.requestBody, operationId);
  if (value.requestSchema !== undefined) {
    if (!isRecord(value.requestSchema) || typeof value.requestSchema.safeParse !== 'function') {
      throw new TypeError(
        `Operation descriptor ${operationId} requestSchema must provide safeParse()`,
      );
    }
  }
  if (
    requestBody !== null &&
    parameters.some(
      ({ placement, name }) => placement === 'header' && name.toLowerCase() === 'content-type',
    )
  ) {
    throw new TypeError(
      `Operation descriptor ${operationId} must not declare Content-Type as a parameter`,
    );
  }
  return {
    operationId,
    method,
    path,
    parameters,
    requestBody,
  };
}

function validatePathTemplate(path: string, operationId: string): void {
  if (
    !path.startsWith('/') ||
    path.startsWith('//') ||
    path.includes('?') ||
    path.includes('#') ||
    path.includes('\\') ||
    path.includes('%') ||
    hasControlCharacter(path) ||
    hasUnpairedSurrogate(path) ||
    /\s/u.test(path)
  ) {
    throw new TypeError(`Invalid path template in operation descriptor ${operationId}`);
  }
  const withoutPlaceholders = path.replace(placeholderPattern, 'parameter');
  if (withoutPlaceholders.includes('{') || withoutPlaceholders.includes('}')) {
    throw new TypeError(`Malformed path placeholder in operation descriptor ${operationId}`);
  }
  if (withoutPlaceholders.split('/').some((segment) => segment === '.' || segment === '..')) {
    throw new TypeError(`Unsafe static path segment in operation descriptor ${operationId}`);
  }
}

function validateParameter(value: unknown, operationId: string, index: number): ValidatedParameter {
  if (!isRecord(value)) {
    throw new TypeError(`Operation descriptor ${operationId} parameter ${index} must be an object`);
  }
  const name = value.name;
  if (
    typeof name !== 'string' ||
    name.length === 0 ||
    hasControlCharacter(name) ||
    hasUnpairedSurrogate(name)
  ) {
    throw new TypeError(
      `Operation descriptor ${operationId} parameter ${index} has an invalid name`,
    );
  }
  const placement = value.placement;
  if (!isParameterPlacement(placement)) {
    throw new TypeError(
      `Unsupported parameter placement ${String(placement)} in operation descriptor ${operationId}`,
    );
  }
  if (typeof value.required !== 'boolean') {
    throw new TypeError(
      `Operation descriptor ${operationId} parameter ${name} required must be boolean`,
    );
  }
  const style = value.style;
  const expectedStyle = placement === 'query' ? 'form' : 'simple';
  if (style !== undefined && style !== null && style !== expectedStyle) {
    throw new TypeError(
      `Unsupported ${placement} parameter style ${describeValue(style)} for ${operationId}:${name}`,
    );
  }
  if (value.explode !== undefined && value.explode !== null && typeof value.explode !== 'boolean') {
    throw new TypeError(
      `Operation descriptor ${operationId} parameter ${name} explode must be boolean`,
    );
  }
  if (
    placement === 'query' &&
    value.allowReserved !== undefined &&
    value.allowReserved !== null &&
    value.allowReserved !== false
  ) {
    throw new TypeError(`Reserved query expansion is not supported for ${operationId}:${name}`);
  }
  if (placement !== 'query' && value.allowReserved !== undefined) {
    throw new TypeError(
      `allowReserved is not supported for ${placement} parameter ${operationId}:${name}`,
    );
  }
  if (placement === 'header' && !headerNamePattern.test(name)) {
    throw new TypeError(`Unsafe header name in operation descriptor ${operationId}: ${name}`);
  }
  const schema = validateParameterSchema(value.schema, operationId, name);
  return {
    name,
    placement,
    required: value.required,
    schema,
    explode: value.explode ?? placement === 'query',
  };
}

function validateParameterSchema(
  value: unknown,
  operationId: string,
  parameterName: string,
): OperationParameterSchema {
  if (!isRecord(value) || typeof value.type !== 'string') {
    throw new TypeError(`Invalid parameter schema for ${operationId}:${parameterName}`);
  }
  if (isScalarSchemaType(value.type)) return { type: value.type };
  if (value.type === 'array') {
    if (!isRecord(value.items) || !isScalarSchemaType(value.items.type)) {
      throw new TypeError(`Unsupported array item schema for ${operationId}:${parameterName}`);
    }
    return { type: 'array', items: { type: value.items.type } };
  }
  throw new TypeError(
    `Unsupported parameter schema type ${value.type} for ${operationId}:${parameterName}`,
  );
}

function validateParameterIdentities(
  parameters: readonly ValidatedParameter[],
  operationId: string,
): void {
  const identities = new Set<string>();
  const headerNames = new Set<string>();
  for (const parameter of parameters) {
    const identity = `${parameter.placement}:${parameter.name}`;
    if (identities.has(identity)) {
      throw new TypeError(`Duplicate parameter ${identity} in operation descriptor ${operationId}`);
    }
    identities.add(identity);
    if (parameter.placement !== 'header') continue;
    const lowerName = parameter.name.toLowerCase();
    if (headerNames.has(lowerName)) {
      throw new TypeError(
        `Duplicate case-insensitive header ${parameter.name} in operation descriptor ${operationId}`,
      );
    }
    headerNames.add(lowerName);
  }
}

function validatePathParameters(
  path: string,
  parameters: readonly ValidatedParameter[],
  operationId: string,
): void {
  const placeholders = [...path.matchAll(placeholderPattern)].map((match) => match[1]);
  const pathParameters = parameters.filter(({ placement }) => placement === 'path');
  if (placeholders.some((placeholder) => placeholder.includes('/'))) {
    throw new TypeError(`Malformed path placeholder in operation descriptor ${operationId}`);
  }
  const placeholderSet = new Set(placeholders);
  if (placeholderSet.size !== placeholders.length) {
    throw new TypeError(`Duplicate path placeholder in operation descriptor ${operationId}`);
  }
  for (const placeholder of placeholders) {
    if (!pathParameters.some(({ name }) => name === placeholder)) {
      throw new TypeError(
        `Undeclared path placeholder ${placeholder} in operation descriptor ${operationId}`,
      );
    }
  }
  for (const parameter of pathParameters) {
    if (!parameter.required) {
      throw new TypeError(`Path parameter ${operationId}:${parameter.name} must be required`);
    }
    if (!placeholderSet.has(parameter.name)) {
      throw new TypeError(
        `Path parameter ${operationId}:${parameter.name} has no matching placeholder`,
      );
    }
  }
}

function validateRequestBody(
  value: unknown,
  operationId: string,
): JsonRequestBodyDescriptor | null {
  if (value === null) return null;
  if (!isRecord(value) || typeof value.required !== 'boolean') {
    throw new TypeError(`Invalid request body descriptor for operation ${operationId}`);
  }
  if (value.mediaType !== 'application/json') {
    throw new TypeError(
      `Unsupported request body media type ${String(value.mediaType)} for operation ${operationId}`,
    );
  }
  return { required: value.required, mediaType: 'application/json' };
}

function validateArgumentsObject(
  descriptor: ValidatedDescriptor,
  value: unknown,
): Readonly<Record<string, unknown>> {
  if (!isPlainRecord(value)) {
    throw requestError(
      descriptor.operationId,
      [],
      'Operation arguments must be a plain object',
      'invalid_type',
    );
  }
  assertDataProperties(descriptor.operationId, value, []);
  for (const name of Object.keys(value)) {
    if (!argumentNames.has(name)) {
      throw requestError(
        descriptor.operationId,
        [name],
        `Undeclared operation argument: ${name}`,
        'unrecognized_key',
      );
    }
    if (name === 'body' ? descriptor.requestBody === null : !hasPlacement(descriptor, name)) {
      throw requestError(
        descriptor.operationId,
        [name],
        `Undeclared operation argument group: ${name}`,
        'unrecognized_key',
      );
    }
  }
  return value;
}

function collectParameterValues(
  descriptor: ValidatedDescriptor,
  arguments_: Readonly<Record<string, unknown>>,
): Readonly<Record<OperationParameterPlacement, ReadonlyMap<string, unknown>>> {
  const result: Record<OperationParameterPlacement, Map<string, unknown>> = {
    path: new Map(),
    query: new Map(),
    header: new Map(),
  };
  for (const placement of argumentPlacements) {
    const parameters = descriptor.parameters.filter(
      (parameter) => parameter.placement === placement,
    );
    if (parameters.length === 0) continue;
    const group = arguments_[placement];
    if (group !== undefined && !isPlainRecord(group)) {
      throw requestError(
        descriptor.operationId,
        [placement],
        `${placement} arguments must be a plain object`,
        'invalid_type',
      );
    }
    if (group !== undefined) {
      assertDataProperties(descriptor.operationId, group, [placement]);
      for (const name of Object.keys(group)) {
        if (!parameters.some((parameter) => parameter.name === name)) {
          throw requestError(
            descriptor.operationId,
            [placement, name],
            `Undeclared ${placement} parameter: ${name}`,
            'unrecognized_key',
          );
        }
      }
    }
    for (const parameter of parameters) {
      const parameterValue = group?.[parameter.name];
      if (parameterValue === undefined) {
        if (parameter.required) {
          throw requestError(
            descriptor.operationId,
            [placement, parameter.name],
            `Required ${placement} parameter is missing: ${parameter.name}`,
            'required',
          );
        }
        continue;
      }
      validateParameterValue(descriptor.operationId, parameter, parameterValue);
      result[placement].set(parameter.name, parameterValue);
    }
  }
  return result;
}

function validateParameterValue(
  operationId: string,
  parameter: ValidatedParameter,
  value: unknown,
): void {
  const path: readonly (string | number)[] = [parameter.placement, parameter.name];
  if (parameter.schema.type !== 'array') {
    validateScalar(operationId, parameter.schema, value, path, parameter.placement);
    return;
  }
  if (!Array.isArray(value)) {
    throw requestError(
      operationId,
      path,
      `Parameter ${parameter.name} must be an array`,
      'invalid_type',
    );
  }
  if (parameter.placement === 'path' && value.length === 0) {
    throw requestError(
      operationId,
      path,
      'Path parameter arrays must not be empty',
      'invalid_value',
    );
  }
  for (let index = 0; index < value.length; index += 1) {
    if (!Object.hasOwn(value, index)) {
      throw requestError(
        operationId,
        [...path, index],
        'Parameter arrays must not be sparse',
        'invalid_type',
      );
    }
    validateScalar(
      operationId,
      parameter.schema.items,
      value[index],
      [...path, index],
      parameter.placement,
    );
  }
}

function validateScalar(
  operationId: string,
  schema: ScalarParameterSchema,
  value: unknown,
  path: readonly (string | number)[],
  placement: OperationParameterPlacement,
): void {
  let valid = false;
  if (schema.type === 'string') valid = typeof value === 'string';
  if (schema.type === 'boolean') valid = typeof value === 'boolean';
  if (schema.type === 'number') valid = typeof value === 'number' && Number.isFinite(value);
  if (schema.type === 'integer') {
    valid = typeof value === 'number' && Number.isSafeInteger(value);
  }
  if (!valid) {
    throw requestError(operationId, path, `Parameter must be a ${schema.type}`, 'invalid_type');
  }
  if (placement === 'path' && typeof value === 'string') {
    if (
      value.length === 0 ||
      value === '.' ||
      value === '..' ||
      hasControlCharacter(value) ||
      hasUnpairedSurrogate(value)
    ) {
      throw requestError(
        operationId,
        path,
        'Path parameter contains an unsafe value',
        'invalid_value',
      );
    }
  }
  if (placement === 'query' && typeof value === 'string' && hasUnpairedSurrogate(value)) {
    throw requestError(
      operationId,
      path,
      'Query parameter contains invalid Unicode',
      'invalid_value',
    );
  }
  if (placement === 'header') validateHeaderValue(operationId, path, String(value));
}

function substitutePath(
  descriptor: ValidatedDescriptor,
  values: ReadonlyMap<string, unknown>,
): string {
  return descriptor.path.replace(placeholderPattern, (_placeholder, name: string) => {
    const parameter = descriptor.parameters.find(
      (candidate) => candidate.placement === 'path' && candidate.name === name,
    );
    if (parameter === undefined) {
      throw new TypeError(`Undeclared path placeholder ${name} in ${descriptor.operationId}`);
    }
    return serializePathValue(parameter, values.get(name));
  });
}

function serializePathValue(parameter: ValidatedParameter, value: unknown): string {
  if (parameter.schema.type === 'array') {
    return validatedArray(value)
      .map((item) => encodePathComponent(serializeScalar(item)))
      .join(',');
  }
  return encodePathComponent(serializeScalar(value));
}

function serializeQuery(
  descriptor: ValidatedDescriptor,
  values: ReadonlyMap<string, unknown>,
): string {
  const pairs: string[] = [];
  for (const parameter of descriptor.parameters) {
    if (parameter.placement !== 'query' || !values.has(parameter.name)) continue;
    const encodedName = encodeRfc3986(parameter.name);
    const value = values.get(parameter.name);
    if (parameter.schema.type !== 'array') {
      pairs.push(`${encodedName}=${encodeRfc3986(serializeScalar(value))}`);
      continue;
    }
    const items = validatedArray(value);
    if (parameter.explode) {
      if (items.length === 0) pairs.push(`${encodedName}=`);
      for (const item of items) {
        pairs.push(`${encodedName}=${encodeRfc3986(serializeScalar(item))}`);
      }
      continue;
    }
    pairs.push(
      `${encodedName}=${items.map((item) => encodeRfc3986(serializeScalar(item))).join(',')}`,
    );
  }
  return pairs.join('&');
}

function createHeaderRecord(
  descriptor: ValidatedDescriptor,
  values: ReadonlyMap<string, unknown>,
): Record<string, string> {
  const headers: Record<string, string> = {};
  for (const parameter of descriptor.parameters) {
    if (parameter.placement !== 'header' || !values.has(parameter.name)) continue;
    const value = values.get(parameter.name);
    const serialized =
      parameter.schema.type === 'array'
        ? validatedArray(value).map(serializeScalar).join(',')
        : serializeScalar(value);
    validateHeaderValue(descriptor.operationId, ['header', parameter.name], serialized);
    Object.defineProperty(headers, parameter.name.toLowerCase(), {
      value: serialized,
      enumerable: true,
      configurable: false,
      writable: false,
    });
  }
  return headers;
}

function serializeBody(
  descriptor: ValidatedDescriptor,
  arguments_: Readonly<Record<string, unknown>>,
  headers: Record<string, string>,
): string | undefined {
  const bodyDescriptor = descriptor.requestBody;
  if (bodyDescriptor === null) return undefined;
  const body = arguments_.body;
  if (body === undefined) {
    if (bodyDescriptor.required) {
      throw requestError(
        descriptor.operationId,
        ['body'],
        'Required request body is missing',
        'required',
      );
    }
    return undefined;
  }
  validateJsonValue(descriptor.operationId, body, ['body'], new WeakSet());
  Object.defineProperty(headers, 'content-type', {
    value: bodyDescriptor.mediaType,
    enumerable: true,
    configurable: false,
    writable: false,
  });
  return JSON.stringify(body);
}

function validateJsonValue(
  operationId: string,
  value: unknown,
  path: readonly (string | number)[],
  ancestors: WeakSet<object>,
): void {
  if (value === null || typeof value === 'boolean' || typeof value === 'string') return;
  if (typeof value === 'number') {
    if (Number.isFinite(value)) return;
    throw requestError(operationId, path, 'JSON numbers must be finite', 'invalid_json');
  }
  if (typeof value !== 'object') {
    throw requestError(
      operationId,
      path,
      'Request body must contain only JSON-native values',
      'invalid_json',
    );
  }
  if (ancestors.has(value)) {
    throw requestError(operationId, path, 'Request body must not contain cycles', 'invalid_json');
  }
  ancestors.add(value);
  if (Array.isArray(value)) {
    assertJsonArrayProperties(operationId, value, path);
    for (let index = 0; index < value.length; index += 1) {
      if (!Object.hasOwn(value, index)) {
        throw requestError(
          operationId,
          [...path, index],
          'JSON arrays must not be sparse',
          'invalid_json',
        );
      }
      validateJsonValue(operationId, value[index], [...path, index], ancestors);
    }
  } else {
    if (!isPlainRecord(value)) {
      throw requestError(
        operationId,
        path,
        'Request body objects must be plain objects',
        'invalid_json',
      );
    }
    assertDataProperties(operationId, value, path);
    for (const key of Object.keys(value)) {
      validateJsonValue(operationId, value[key], [...path, key], ancestors);
    }
  }
  ancestors.delete(value);
}

function assertJsonArrayProperties(
  operationId: string,
  value: readonly unknown[],
  path: readonly (string | number)[],
): void {
  for (const key of Reflect.ownKeys(value)) {
    if (key === 'length') continue;
    if (typeof key === 'symbol' || !/^(?:0|[1-9]\d*)$/u.test(key)) {
      throw requestError(
        operationId,
        path,
        'JSON arrays must not contain custom properties',
        'invalid_json',
      );
    }
    const property = Object.getOwnPropertyDescriptor(value, key);
    if (property === undefined || !property.enumerable || !('value' in property)) {
      throw requestError(
        operationId,
        [...path, Number(key)],
        'JSON arrays must contain only enumerable data properties',
        'invalid_json',
      );
    }
  }
}

function assertDataProperties(
  operationId: string,
  value: Readonly<Record<string, unknown>>,
  path: readonly (string | number)[],
): void {
  for (const key of Reflect.ownKeys(value)) {
    if (typeof key === 'symbol') {
      throw requestError(operationId, path, 'Symbol properties are not supported', 'invalid_type');
    }
    const property = Object.getOwnPropertyDescriptor(value, key);
    if (property === undefined || !property.enumerable || !('value' in property)) {
      throw requestError(
        operationId,
        [...path, key],
        'Arguments must contain only enumerable data properties',
        'invalid_type',
      );
    }
  }
}

function validateHeaderValue(
  operationId: string,
  path: readonly (string | number)[],
  value: string,
): void {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint < 0x20 || codePoint > 0x7e) {
      throw requestError(
        operationId,
        path,
        'Header parameter contains an unsafe value',
        'invalid_header',
      );
    }
  }
}

function serializeScalar(value: unknown): string {
  return String(value);
}

function encodeRfc3986(value: string): string {
  return encodeURIComponent(value).replace(
    /[!'()*]/gu,
    (character) => `%${character.codePointAt(0)?.toString(16).toUpperCase()}`,
  );
}

function encodePathComponent(value: string): string {
  return encodeRfc3986(value).replaceAll('.', '%2E');
}

function requestError(
  operationId: string,
  path: readonly (string | number)[],
  message: string,
  code: string,
): EsiRequestValidationError {
  return new EsiRequestValidationError({
    operationId,
    issues: [{ path, message, code }],
  });
}

function hasPlacement(descriptor: ValidatedDescriptor, value: string): boolean {
  return descriptor.parameters.some(({ placement }) => placement === value);
}

function isScalarSchemaType(value: unknown): value is ScalarParameterSchema['type'] {
  return value === 'string' || value === 'boolean' || value === 'integer' || value === 'number';
}

function isHttpMethod(value: unknown): value is OperationHttpMethod {
  return typeof value === 'string' && httpMethods.has(value);
}

function isParameterPlacement(value: unknown): value is OperationParameterPlacement {
  return value === 'path' || value === 'query' || value === 'header';
}

function isRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isPlainRecord(value: unknown): value is Readonly<Record<string, unknown>> {
  if (!isRecord(value)) return false;
  const prototype = Object.getPrototypeOf(value) as unknown;
  return prototype === Object.prototype || prototype === null;
}

function validatedArray(value: unknown): readonly unknown[] {
  if (!Array.isArray(value)) throw new TypeError('Expected a previously validated parameter array');
  return value;
}

function describeValue(value: unknown): string {
  if (typeof value === 'string') return value;
  if (value === null) return 'null';
  return typeof value;
}

function hasControlCharacter(value: string): boolean {
  for (const character of value) {
    const codePoint = character.codePointAt(0) ?? 0;
    if (codePoint < 0x20 || codePoint === 0x7f) return true;
  }
  return false;
}

function hasUnpairedSurrogate(value: string): boolean {
  for (let index = 0; index < value.length; index += 1) {
    const codeUnit = value.charCodeAt(index);
    if (codeUnit >= 0xd800 && codeUnit <= 0xdbff) {
      if (index + 1 >= value.length) return true;
      const nextCodeUnit = value.charCodeAt(index + 1);
      if (nextCodeUnit < 0xdc00 || nextCodeUnit > 0xdfff) return true;
      index += 1;
      continue;
    }
    if (codeUnit >= 0xdc00 && codeUnit <= 0xdfff) return true;
  }
  return false;
}
