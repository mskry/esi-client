import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const defaultExclusionsPath = fileURLToPath(
  new URL('../../openapi/config/exclusions.json', import.meta.url),
);

const httpMethods = ['delete', 'get', 'head', 'options', 'patch', 'post', 'put', 'trace'];
const parameterPlacements = ['path', 'query', 'header', 'cookie'];
const openApiKeywords = new Set([
  '$ref',
  'callbacks',
  'components',
  'content',
  'encoding',
  'examples',
  'externalDocs',
  'headers',
  'links',
  'parameters',
  'paths',
  'requestBody',
  'responses',
  'security',
  'servers',
  'tags',
  'webhooks',
]);
const schemaMapKeywords = new Set(['$defs', 'dependentSchemas', 'patternProperties', 'properties']);
const schemaArrayKeywords = new Set(['allOf', 'anyOf', 'oneOf', 'prefixItems']);
const schemaSingleKeywords = new Set([
  'additionalProperties',
  'contains',
  'else',
  'if',
  'items',
  'not',
  'propertyNames',
  'then',
  'unevaluatedItems',
  'unevaluatedProperties',
]);
const arbitraryValueKeys = new Set(['const', 'default', 'enum', 'example', 'value']);

export async function normalizeOpenApiDocument(document, options = {}) {
  assertRecord(document, 'OpenAPI document');
  if (typeof document.openapi !== 'string' || !document.openapi.startsWith('3.1.')) {
    throw new Error(`Expected an OpenAPI 3.1 document, received ${document.openapi ?? 'unknown'}`);
  }

  validateDocumentReferences(document);
  const inventory = createOpenApiInventory(document);
  const sourceOperations = collectSourceOperations(document);
  const operationIds = new Set(sourceOperations.map(({ operationId }) => operationId));
  const exclusions = await readExclusions(options.exclusionsPath ?? defaultExclusionsPath);
  validateExclusions(exclusions, operationIds);
  const exclusionsById = new Map(exclusions.map((exclusion) => [exclusion.operationId, exclusion]));

  const operations = [];
  for (const source of sourceOperations) {
    if (exclusionsById.has(source.operationId)) continue;
    operations.push(normalizeOperation(document, source));
  }
  const normalizedOperations = operations.toSorted((left, right) =>
    compareText(left.operationId, right.operationId),
  );

  const models = normalizeModels(document);
  const normalizedIds = normalizedOperations.map(({ operationId }) => operationId);
  const excludedIds = exclusions.map(({ operationId }) => operationId);
  const sourceIds = sourceOperations.map(({ operationId }) => operationId).toSorted(compareText);
  if (normalizedIds.length + excludedIds.length !== sourceIds.length) {
    throw new Error('Operation accounting is incomplete');
  }

  return deepFreeze({
    operations: normalizedOperations,
    models,
    exclusions,
    inventory,
    accounting: {
      sourceOperationIds: sourceIds,
      normalizedOperationIds: normalizedIds,
      excludedOperationIds: excludedIds,
    },
  });
}

export function resolveLocalReference(document, reference) {
  if (typeof reference !== 'string' || (!reference.startsWith('#/') && reference !== '#')) {
    throw new Error(`External or unsupported OpenAPI reference: ${String(reference)}`);
  }

  let decodedPointer;
  try {
    decodedPointer = decodeURIComponent(reference.slice(1));
  } catch (error) {
    throw new Error(`Invalid local OpenAPI reference: ${reference}`, { cause: error });
  }

  let value = document;
  const segments = decodedPointer === '' ? [] : decodedPointer.slice(1).split('/');
  for (const encodedSegment of segments) {
    if (/~(?:[^01]|$)/u.test(encodedSegment)) {
      throw new Error(`Invalid local OpenAPI reference: ${reference}`);
    }
    const segment = encodedSegment.replaceAll('~1', '/').replaceAll('~0', '~');
    if (Array.isArray(value)) {
      if (!/^(?:0|[1-9]\d*)$/u.test(segment) || Number(segment) >= value.length) {
        throw new Error(`Unresolved local OpenAPI reference: ${reference}`);
      }
      value = value[Number(segment)];
      continue;
    }
    if (!isObject(value) || !Object.hasOwn(value, segment)) {
      throw new Error(`Unresolved local OpenAPI reference: ${reference}`);
    }
    value = value[segment];
  }
  return value;
}

export function createOpenApiInventory(document) {
  assertRecord(document, 'OpenAPI document');
  const openapi = new Map();
  const schemas = new Map();

  walkOpenApi(document, openapi, schemas);
  return deepFreeze({
    openapi: sortedConstructs(openapi),
    schemas: sortedConstructs(schemas),
  });
}

function collectSourceOperations(document) {
  assertRecord(document.paths, 'OpenAPI paths');
  const operations = [];
  const operationLocations = new Map();

  for (const path of Object.keys(document.paths).toSorted(compareText)) {
    if (path.startsWith('x-')) continue;
    if (!path.startsWith('/')) throw new Error(`Invalid OpenAPI path key: ${path}`);
    const pathItem = resolveReferenceObject(document, document.paths[path], `path item ${path}`);
    for (const method of httpMethods) {
      if (!Object.hasOwn(pathItem, method)) continue;
      const operation = pathItem[method];
      assertRecord(operation, `${method.toUpperCase()} ${path}`);
      const operationId = operation.operationId;
      if (
        typeof operationId !== 'string' ||
        operationId.length === 0 ||
        operationId.trim() !== operationId
      ) {
        throw new Error(`Missing or invalid operationId for ${method.toUpperCase()} ${path}`);
      }
      const previousLocation = operationLocations.get(operationId);
      if (previousLocation) {
        throw new Error(
          `Duplicate operationId ${operationId}: ${previousLocation} and ${method.toUpperCase()} ${path}`,
        );
      }
      operationLocations.set(operationId, `${method.toUpperCase()} ${path}`);
      operations.push({ method, operation, operationId, path, pathItem });
    }
  }
  return operations;
}

function normalizeOperation(document, source) {
  const { method, operation, operationId, path, pathItem } = source;
  const pathParameters = normalizeParameterList(
    document,
    pathItem.parameters,
    `${method.toUpperCase()} ${path} path parameters`,
  );
  const operationParameters = normalizeParameterList(
    document,
    operation.parameters,
    `${operationId} operation parameters`,
  );
  const mergedParameters = new Map(
    pathParameters.map((parameter) => [parameterIdentity(parameter), parameter]),
  );
  for (const parameter of operationParameters) {
    mergedParameters.set(parameterIdentity(parameter), parameter);
  }
  const parameters = [...mergedParameters.values()].toSorted(compareParameters);
  validatePathParameters(path, parameters, operationId);

  const tags = normalizeStringArray(operation.tags ?? [], `${operationId} tags`);
  const domainSource = tags[0] ?? null;
  const sortedTags = tags.toSorted(compareText);
  const responses = normalizeResponses(document, operation.responses, operationId);
  const extensions = extractExtensions(operation);
  const responseHeaderNames = [
    ...new Set(
      responses.flatMap((response) => response.headers.map(({ name }) => name.toLowerCase())),
    ),
  ].toSorted(compareText);
  const offsetParameters = parameters
    .filter(
      ({ name, placement }) =>
        placement === 'query' && ['offset', 'page'].includes(name.toLowerCase()),
    )
    .map(({ name }) => name)
    .toSorted(compareText);
  const cursorParameters = parameters
    .filter(
      ({ name, placement }) =>
        placement === 'query' &&
        (name.toLowerCase() === 'cursor' || name.toLowerCase().endsWith('_cursor')),
    )
    .map(({ name }) => name)
    .toSorted(compareText);
  const paginationHeaders = responseHeaderNames.filter(
    (name) => name === 'x-pages' || name.includes('cursor') || name.startsWith('x-next-'),
  );
  const hasOffsetPagination = offsetParameters.length > 0 || paginationHeaders.includes('x-pages');
  const hasCursorPagination =
    cursorParameters.length > 0 || paginationHeaders.some((name) => name.includes('cursor'));
  const cacheHeaders = responseHeaderNames.filter((name) =>
    ['cache-control', 'etag', 'expires', 'last-modified'].includes(name),
  );
  const cacheExtensions = Object.fromEntries(
    Object.entries(extensions).filter(([name]) => /cache|expires/u.test(name.toLowerCase())),
  );

  return {
    operationId,
    method: method.toUpperCase(),
    path,
    domainSource,
    tags: sortedTags,
    summary: optionalString(operation.summary, `${operationId} summary`),
    description: optionalString(operation.description, `${operationId} description`),
    parameters,
    requestBody: normalizeRequestBody(document, operation.requestBody, operationId),
    successResponses: responses,
    security: normalizeSecurity(
      document,
      operation.security ?? document.security ?? [],
      operationId,
    ),
    pagination: {
      kind:
        hasOffsetPagination && hasCursorPagination
          ? 'offset-and-cursor'
          : hasOffsetPagination
            ? 'offset'
            : hasCursorPagination
              ? 'cursor'
              : 'none',
      requestParameters: [...offsetParameters, ...cursorParameters].toSorted(compareText),
      responseHeaders: paginationHeaders,
    },
    cache: {
      responseHeaders: cacheHeaders,
      extensions: cacheExtensions,
    },
    extensions,
  };
}

function normalizeParameterList(document, value, context) {
  if (value === undefined) return [];
  if (!Array.isArray(value)) throw new Error(`${context} must be an array`);
  const parameters = value.map((entry, index) => {
    const parameter = resolveReferenceObject(document, entry, `${context}[${index}]`);
    const name = requiredString(parameter.name, `${context}[${index}].name`);
    if (!parameterPlacements.includes(parameter.in)) {
      throw new Error(`Invalid parameter placement for ${name}: ${String(parameter.in)}`);
    }
    if (parameter.content !== undefined) {
      throw new Error(`Parameter content is not supported for ${name}; a schema is required`);
    }
    if (parameter.schema === undefined) throw new Error(`Missing schema for parameter ${name}`);
    const required = parameter.required === true;
    if (parameter.in === 'path' && !required) {
      throw new Error(`Path parameter ${name} must be required`);
    }
    return {
      name,
      placement: parameter.in,
      required,
      description: optionalString(parameter.description, `${name} parameter description`),
      deprecated: parameter.deprecated === true,
      style: optionalString(parameter.style, `${name} parameter style`),
      explode: optionalBoolean(parameter.explode, `${name} parameter explode`),
      allowReserved: optionalBoolean(parameter.allowReserved, `${name} parameter allowReserved`),
      schema: normalizeSchema(parameter.schema, `${context}[${index}].schema`),
      extensions: extractExtensions(parameter),
    };
  });

  const seen = new Set();
  for (const parameter of parameters) {
    const identity = parameterIdentity(parameter);
    if (seen.has(identity))
      throw new Error(`Duplicate parameter ${parameter.placement}:${parameter.name}`);
    seen.add(identity);
  }
  return parameters;
}

function normalizeRequestBody(document, value, operationId) {
  if (value === undefined) return null;
  const requestBody = resolveReferenceObject(document, value, `${operationId} request body`);
  return {
    required: requestBody.required === true,
    description: optionalString(requestBody.description, `${operationId} request body description`),
    content: normalizeContent(requestBody.content, `${operationId} request body`),
    extensions: extractExtensions(requestBody),
  };
}

function normalizeResponses(document, value, operationId) {
  assertRecord(value, `${operationId} responses`);
  const statuses = Object.keys(value).filter((status) => /^2(?:\d{2}|XX)$/iu.test(status));
  if (statuses.length === 0) throw new Error(`Operation ${operationId} has no success response`);

  return statuses.toSorted(compareStatusCodes).map((status) => {
    const response = resolveReferenceObject(
      document,
      value[status],
      `${operationId} response ${status}`,
    );
    const content =
      response.content === undefined
        ? []
        : normalizeContent(response.content, `${operationId} response ${status}`);
    if (status === '204' && content.length > 0) {
      throw new Error(`No-content response ${operationId} ${status} declares content`);
    }
    return {
      status,
      description: requiredString(
        response.description,
        `${operationId} response ${status} description`,
      ),
      noContent: content.length === 0,
      content,
      headers: normalizeResponseHeaders(
        document,
        response.headers,
        `${operationId} response ${status}`,
      ),
      extensions: extractExtensions(response),
    };
  });
}

function normalizeResponseHeaders(document, value, context) {
  if (value === undefined) return [];
  assertRecord(value, `${context} headers`);
  return Object.keys(value)
    .toSorted(compareText)
    .map((name) => {
      const header = resolveReferenceObject(document, value[name], `${context} header ${name}`);
      if (header.content !== undefined) {
        throw new Error(
          `Response header content is not supported for ${name}; a schema is required`,
        );
      }
      if (header.schema === undefined)
        throw new Error(`Missing schema for response header ${name}`);
      return {
        name,
        description: optionalString(header.description, `${context} header ${name} description`),
        schema: normalizeSchema(header.schema, `${context} header ${name} schema`),
        extensions: extractExtensions(header),
      };
    });
}

function normalizeContent(value, context) {
  assertRecord(value, `${context} content`);
  const mediaTypes = Object.keys(value).toSorted(compareText);
  if (mediaTypes.length === 0) throw new Error(`${context} content must not be empty`);
  return mediaTypes.map((mediaType) => {
    const media = value[mediaType];
    assertRecord(media, `${context} content ${mediaType}`);
    if (media.schema === undefined)
      throw new Error(`Missing schema for ${context} content ${mediaType}`);
    return {
      mediaType,
      schema: normalizeSchema(media.schema, `${context} content ${mediaType} schema`),
      extensions: extractExtensions(media),
    };
  });
}

function normalizeSecurity(document, value, operationId) {
  if (!Array.isArray(value)) throw new Error(`${operationId} security must be an array`);
  const securitySchemes =
    isObject(document.components) && isObject(document.components.securitySchemes)
      ? document.components.securitySchemes
      : {};
  const requirements = value.map((requirement, index) => {
    assertRecord(requirement, `${operationId} security requirement ${index}`);
    const schemes = Object.keys(requirement)
      .toSorted(compareText)
      .map((name) => {
        if (!Object.hasOwn(securitySchemes, name)) {
          throw new Error(`Unknown security scheme ${name} for operation ${operationId}`);
        }
        resolveReferenceObject(document, securitySchemes[name], `security scheme ${name}`);
        const scopes = normalizeStringArray(
          requirement[name],
          `${operationId} security scopes for ${name}`,
        );
        return { name, scopes: scopes.toSorted(compareText) };
      });
    return { schemes };
  });
  return requirements.toSorted((left, right) =>
    compareText(JSON.stringify(left), JSON.stringify(right)),
  );
}

function normalizeModels(document) {
  const schemas =
    isObject(document.components) && document.components.schemas !== undefined
      ? document.components.schemas
      : {};
  assertRecord(schemas, 'OpenAPI component schemas');
  return Object.keys(schemas)
    .toSorted(compareText)
    .map((name) => ({
      name,
      pointer: `#/components/schemas/${escapePointerSegment(name)}`,
      schema: normalizeSchema(schemas[name], `component schema ${name}`),
    }));
}

function normalizeSchema(schema, context) {
  if (typeof schema !== 'boolean' && !isObject(schema)) {
    throw new Error(`${context} must be a schema object or boolean`);
  }
  return sortJsonValue(schema);
}

function validatePathParameters(path, parameters, operationId) {
  const placeholders = [...path.matchAll(/\{([^}]+)\}/gu)].map((match) => match[1]);
  const pathParameterNames = parameters
    .filter(({ placement }) => placement === 'path')
    .map(({ name }) => name);
  for (const placeholder of placeholders) {
    if (!pathParameterNames.includes(placeholder)) {
      throw new Error(`Missing path parameter ${placeholder} for operation ${operationId}`);
    }
  }
  for (const name of pathParameterNames) {
    if (!placeholders.includes(name)) {
      throw new Error(`Path parameter ${name} is not present in path ${path}`);
    }
  }
}

function validateDocumentReferences(document) {
  function visit(value) {
    if (Array.isArray(value)) {
      for (const entry of value) visit(entry);
      return;
    }
    if (!isObject(value)) return;
    if (Object.hasOwn(value, '$ref')) resolveLocalReference(document, value.$ref);
    for (const [key, entry] of Object.entries(value)) {
      if (key === '$ref' || key.startsWith('x-') || arbitraryValueKeys.has(key)) continue;
      visit(entry);
    }
  }
  visit(document);
}

function resolveReferenceObject(document, value, context) {
  assertRecord(value, context);
  let current = value;
  let overlay = {};
  const seen = new Set();
  while (Object.hasOwn(current, '$ref')) {
    const reference = current.$ref;
    if (typeof reference !== 'string') throw new Error(`Invalid reference in ${context}`);
    if (seen.has(reference))
      throw new Error(`Circular Reference Object in ${context}: ${reference}`);
    seen.add(reference);
    const { $ref: _reference, ...siblings } = current;
    overlay = { ...siblings, ...overlay };
    const target = resolveLocalReference(document, reference);
    assertRecord(target, `reference target ${reference} for ${context}`);
    current = target;
  }
  return { ...current, ...overlay };
}

async function readExclusions(path) {
  let config;
  try {
    config = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to read operation exclusions from ${path}`, { cause: error });
  }
  assertRecord(config, 'Operation exclusions config');
  if (config.schemaVersion !== 1 || !Array.isArray(config.exclusions)) {
    throw new Error('Invalid operation exclusions config');
  }
  rejectUnknownKeys(
    config,
    new Set(['exclusions', 'schemaVersion']),
    'operation exclusions config',
  );

  return config.exclusions
    .map((entry, index) => {
      assertRecord(entry, `Operation exclusion ${index}`);
      rejectUnknownKeys(
        entry,
        new Set(['operationId', 'reason', 'reviewed']),
        `operation exclusion ${index}`,
      );
      assertRecord(entry.reason, `Operation exclusion ${index} reason`);
      rejectUnknownKeys(
        entry.reason,
        new Set(['code', 'detail']),
        `operation exclusion ${index} reason`,
      );
      const operationId = requiredString(
        entry.operationId,
        `Operation exclusion ${index} operationId`,
      );
      const code = requiredString(
        entry.reason.code,
        `Operation exclusion ${operationId} reason code`,
      );
      const detail = requiredString(
        entry.reason.detail,
        `Operation exclusion ${operationId} reason detail`,
      );
      if (!/^[a-z][a-z0-9]*(?:-[a-z0-9]+)*$/u.test(code)) {
        throw new Error(
          `Invalid machine-readable exclusion reason code for ${operationId}: ${code}`,
        );
      }
      if (entry.reviewed !== true)
        throw new Error(`Operation exclusion is not reviewed: ${operationId}`);
      return { operationId, reason: { code, detail }, reviewed: true };
    })
    .toSorted((left, right) => compareText(left.operationId, right.operationId));
}

function validateExclusions(exclusions, operationIds) {
  const seen = new Set();
  for (const exclusion of exclusions) {
    if (seen.has(exclusion.operationId)) {
      throw new Error(`Duplicate operation exclusion: ${exclusion.operationId}`);
    }
    if (!operationIds.has(exclusion.operationId)) {
      throw new Error(`Stale or unknown operation exclusion: ${exclusion.operationId}`);
    }
    seen.add(exclusion.operationId);
  }
}

function walkOpenApi(value, openapi, schemas) {
  if (Array.isArray(value)) {
    for (const entry of value) walkOpenApi(entry, openapi, schemas);
    return;
  }
  if (!isObject(value)) return;

  if (typeof value.openapi === 'string') increment(openapi, `version:${value.openapi}`);
  if (
    typeof value.in === 'string' &&
    parameterPlacements.includes(value.in) &&
    typeof value.name === 'string'
  ) {
    increment(openapi, `parameter:${value.in}`);
  }
  if (isObject(value.responses)) {
    for (const status of Object.keys(value.responses)) increment(openapi, `response:${status}`);
  }
  if (isObject(value.content)) {
    for (const mediaType of Object.keys(value.content))
      increment(openapi, `media-type:${mediaType}`);
  }

  for (const [key, entry] of Object.entries(value)) {
    if (httpMethods.includes(key) && isObject(entry)) increment(openapi, `operation:${key}`);
    if (key.startsWith('x-')) {
      increment(openapi, `extension:${key}`);
      continue;
    }
    if (openApiKeywords.has(key)) increment(openapi, `keyword:${key}`);
    if (key === 'schema') {
      walkSchema(entry, schemas);
      continue;
    }
    if (key === 'schemas' && isObject(entry)) {
      for (const schema of Object.values(entry)) walkSchema(schema, schemas);
      continue;
    }
    if (arbitraryValueKeys.has(key)) continue;
    walkOpenApi(entry, openapi, schemas);
  }
}

function walkSchema(schema, inventory) {
  if (typeof schema === 'boolean') {
    increment(inventory, `boolean:${schema}`);
    return;
  }
  if (!isObject(schema)) return;
  for (const [key, value] of Object.entries(schema)) {
    increment(inventory, `keyword:${key}`);
    if (key === 'type') {
      const types = Array.isArray(value) ? value : [value];
      for (const type of types) if (typeof type === 'string') increment(inventory, `type:${type}`);
    }
    if (key === 'format' && typeof value === 'string') increment(inventory, `format:${value}`);
    if (schemaMapKeywords.has(key) && isObject(value)) {
      for (const nestedSchema of Object.values(value)) walkSchema(nestedSchema, inventory);
    } else if (schemaArrayKeywords.has(key) && Array.isArray(value)) {
      for (const nestedSchema of value) walkSchema(nestedSchema, inventory);
    } else if (schemaSingleKeywords.has(key)) {
      walkSchema(value, inventory);
    }
  }
}

function sortedConstructs(inventory) {
  return [...inventory]
    .map(([construct, count]) => ({ construct, count }))
    .toSorted((left, right) => compareText(left.construct, right.construct));
}

function increment(inventory, construct) {
  inventory.set(construct, (inventory.get(construct) ?? 0) + 1);
}

function extractExtensions(value) {
  return Object.fromEntries(
    Object.entries(value)
      .filter(([key]) => key.startsWith('x-'))
      .toSorted(([left], [right]) => compareText(left, right))
      .map(([key, entry]) => [key, sortJsonValue(entry)]),
  );
}

function sortJsonValue(value) {
  if (Array.isArray(value)) return value.map(sortJsonValue);
  if (!isObject(value)) return value;
  return Object.fromEntries(
    Object.entries(value)
      .toSorted(([left], [right]) => compareText(left, right))
      .map(([key, entry]) => [key, sortJsonValue(entry)]),
  );
}

function normalizeStringArray(value, context) {
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new Error(`${context} must be an array of strings`);
  }
  const strings = [...value];
  if (new Set(strings).size !== strings.length) throw new Error(`${context} contains duplicates`);
  return strings;
}

function parameterIdentity(parameter) {
  const name = parameter.placement === 'header' ? parameter.name.toLowerCase() : parameter.name;
  return `${parameter.placement}:${name}`;
}

function compareParameters(left, right) {
  const placementDifference =
    parameterPlacements.indexOf(left.placement) - parameterPlacements.indexOf(right.placement);
  return placementDifference || compareText(left.name, right.name);
}

function compareStatusCodes(left, right) {
  const leftNumber = /^\d{3}$/u.test(left) ? Number(left) : Number.POSITIVE_INFINITY;
  const rightNumber = /^\d{3}$/u.test(right) ? Number(right) : Number.POSITIVE_INFINITY;
  return leftNumber - rightNumber || compareText(left, right);
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function requiredString(value, context) {
  if (typeof value !== 'string' || value.length === 0)
    throw new Error(`${context} must be a non-empty string`);
  return value;
}

function optionalString(value, context) {
  if (value === undefined) return null;
  if (typeof value !== 'string') throw new Error(`${context} must be a string`);
  return value;
}

function optionalBoolean(value, context) {
  if (value === undefined) return null;
  if (typeof value !== 'boolean') throw new Error(`${context} must be a boolean`);
  return value;
}

function rejectUnknownKeys(value, allowed, context) {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    throw new Error(`Unknown ${context} field: ${unknown.toSorted(compareText).join(', ')}`);
  }
}

function assertRecord(value, context) {
  if (!isObject(value)) throw new Error(`${context} must be an object`);
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function escapePointerSegment(value) {
  return value.replaceAll('~', '~0').replaceAll('/', '~1');
}

function deepFreeze(value) {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const entry of Object.values(value)) deepFreeze(entry);
  }
  return value;
}
