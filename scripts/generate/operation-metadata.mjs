import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

import { operationSchemaName } from './zod-schema.mjs';

export const defaultFacadeCatalogPath = fileURLToPath(
  new URL('../../openapi/config/naming-overrides.json', import.meta.url),
);
export const defaultSafetyOverridesPath = fileURLToPath(
  new URL('../../openapi/config/safety-overrides.json', import.meta.url),
);

const identifierPattern = /^[A-Za-z][A-Za-z0-9]*$/u;
const reservedIdentifiers = new Set([
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
  'constructor',
  'debugger',
  'default',
  'delete',
  'do',
  'else',
  'enum',
  'export',
  'extends',
  'false',
  'finally',
  'for',
  'function',
  'if',
  'implements',
  'import',
  'in',
  'instanceof',
  'interface',
  'let',
  'new',
  'null',
  'package',
  'private',
  'protected',
  'public',
  'return',
  'static',
  'super',
  'switch',
  'this',
  'throw',
  'true',
  'try',
  'typeof',
  'var',
  'void',
  'while',
  'with',
  'yield',
]);
const reservedFacadeMembers = new Set([
  ...reservedIdentifiers,
  'callOperation',
  'configuration',
  'hasOwnProperty',
  'isPrototypeOf',
  'propertyIsEnumerable',
  'toLocaleString',
  'toString',
  'valueOf',
  'withMetadata',
]);
const httpMethodWords = new Set([
  'delete',
  'get',
  'head',
  'options',
  'patch',
  'post',
  'put',
  'trace',
]);

export async function loadFacadeCatalog(model, path = defaultFacadeCatalogPath) {
  const config = await readFacadeCatalog(path);
  const operationIds = operationIdSet(model);
  const seen = new Set();
  let previousOperationId;
  const catalog = config.operations.map((entry, index) => {
    assertRecord(entry, `Facade catalog entry ${index}`);
    rejectUnknownKeys(
      entry,
      new Set(['domain', 'method', 'note', 'operationId', 'reviewed']),
      `facade catalog entry ${index}`,
    );
    const operationId = requiredString(
      entry.operationId,
      `Facade catalog entry ${index} operationId`,
    );
    if (seen.has(operationId)) throw new Error(`Duplicate facade catalog entry: ${operationId}`);
    seen.add(operationId);
    if (!operationIds.has(operationId))
      throw new Error(`Stale facade catalog entry: ${operationId}`);
    if (previousOperationId !== undefined && previousOperationId > operationId) {
      throw new Error(
        `Facade catalog entries must be sorted by operationId: ${previousOperationId} before ${operationId}`,
      );
    }
    previousOperationId = operationId;
    if (entry.reviewed !== true) {
      throw new Error(`Facade catalog entry is not reviewed: ${operationId}`);
    }
    const domain = validFacadeIdentifier(entry.domain, 'domain', operationId);
    const method = validFacadeIdentifier(entry.method, 'method', operationId);
    const note = Object.hasOwn(entry, 'note')
      ? requiredString(entry.note, `Facade catalog note for ${operationId}`)
      : undefined;
    return note === undefined
      ? { domain, method, operationId, reviewed: true }
      : { domain, method, note, operationId, reviewed: true };
  });
  const missing = [...operationIds]
    .filter((operationId) => !seen.has(operationId))
    .toSorted(compareText);
  if (missing.length > 0) throw new Error(`Missing facade catalog entries: ${missing.join(', ')}`);
  validateFacadeCatalog(model, catalog);
  return deepFreeze(catalog);
}

export async function loadSafetyOverrides(model, path = defaultSafetyOverridesPath) {
  const config = await readConfig(path, 'operation safety overrides');
  const operationsById = new Map(
    model.operations.map((operation) => [operation.operationId, operation]),
  );
  const seen = new Set();
  const overrides = config.overrides.map((entry, index) => {
    assertRecord(entry, `Operation safety override ${index}`);
    rejectUnknownKeys(
      entry,
      new Set(['classification', 'operationId', 'reason', 'reviewed']),
      `operation safety override ${index}`,
    );
    const operationId = requiredString(
      entry.operationId,
      `Operation safety override ${index} operationId`,
    );
    rejectDuplicateOrStale(
      operationId,
      seen,
      new Set(operationsById.keys()),
      'operation safety override',
    );
    if (entry.reviewed !== true) {
      throw new Error(`Operation safety override is not reviewed: ${operationId}`);
    }
    if (entry.classification !== 'read') {
      throw new Error(`Safety override for ${operationId} must classify the operation as read`);
    }
    const reason = requiredString(
      entry.reason,
      `Operation safety override reason for ${operationId}`,
    );
    const operation = operationsById.get(operationId);
    if (operation.method !== 'POST') {
      throw new Error(
        `Read-like safety override is only valid for POST operations: ${operationId} is ${operation.method}`,
      );
    }
    return { classification: 'read', operationId, reason, reviewed: true };
  });
  return deepFreeze(overrides.toSorted(compareOperationIds));
}

export async function resolveOperationMetadata(model, options = {}) {
  const [facadeCatalog, safetyOverrides] = await Promise.all([
    loadFacadeCatalog(model, options.facadeCatalogPath),
    loadSafetyOverrides(model, options.safetyOverridesPath),
  ]);
  const namingById = new Map(facadeCatalog.map((entry) => [entry.operationId, entry]));
  const safetyById = new Map(safetyOverrides.map((entry) => [entry.operationId, entry]));

  const metadata = model.operations.map((operation) => {
    const naming = namingById.get(operation.operationId);
    if (naming === undefined) {
      throw new Error(`Resolved facade catalog is missing operation: ${operation.operationId}`);
    }
    return {
      classification:
        operation.method === 'GET' || safetyById.has(operation.operationId) ? 'read' : 'mutation',
      domain: naming.domain,
      method: naming.method,
      operationId: operation.operationId,
      safetyOverrideReason: safetyById.get(operation.operationId)?.reason ?? null,
    };
  });
  return deepFreeze(metadata.toSorted(compareOperationIds));
}

export function defaultDomainName(operation) {
  const tagName = toIdentifier(operation.domainSource ?? '', '');
  if (tagName !== '') return safeDefaultIdentifier(tagName, 'domain');

  const words = splitWords(operation.operationId);
  if (httpMethodWords.has(words[0]?.toLowerCase())) words.shift();
  const operationDomain = words[0] ?? 'esi';
  return safeDefaultIdentifier(toIdentifier(operationDomain, 'esi'), 'domain');
}

export function defaultMethodName(operationId) {
  return safeDefaultIdentifier(toIdentifier(operationId, 'operation'), 'operation');
}

async function readFacadeCatalog(path) {
  const config = await readJsonConfig(path, 'facade catalog');
  rejectUnknownKeys(config, new Set(['operations', 'schemaVersion']), 'facade catalog config');
  if (config.schemaVersion !== 2 || !Array.isArray(config.operations)) {
    throw new Error('Invalid facade catalog config');
  }
  return config;
}

async function readConfig(path, name) {
  const config = await readJsonConfig(path, name);
  rejectUnknownKeys(config, new Set(['overrides', 'schemaVersion']), `${name} config`);
  if (config.schemaVersion !== 1 || !Array.isArray(config.overrides)) {
    throw new Error(`Invalid ${name} config`);
  }
  return config;
}

async function readJsonConfig(path, name) {
  let config;
  try {
    config = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to read ${name} from ${path}`, { cause: error });
  }
  assertRecord(config, `${name} config`);
  return config;
}

function operationIdSet(model) {
  if (model === null || typeof model !== 'object' || !Array.isArray(model.operations)) {
    throw new Error('Normalized OpenAPI model must contain operations');
  }
  return new Set(model.operations.map(({ operationId }) => operationId));
}

function rejectDuplicateOrStale(operationId, seen, operationIds, name) {
  if (seen.has(operationId)) throw new Error(`Duplicate ${name}: ${operationId}`);
  if (!operationIds.has(operationId)) throw new Error(`Stale or unknown ${name}: ${operationId}`);
  seen.add(operationId);
}

function validFacadeIdentifier(value, kind, operationId) {
  const context = `Facade ${kind} for ${operationId}`;
  const identifier = requiredString(value, context);
  if (!identifierPattern.test(identifier)) {
    throw new Error(`Invalid TypeScript identifier for ${context}: ${identifier}`);
  }
  if (!/^[a-z]/u.test(identifier)) {
    throw new Error(
      `Facade ${kind} must begin with a lowercase letter for ${operationId}: ${identifier}`,
    );
  }
  if (reservedFacadeMembers.has(identifier)) {
    throw new Error(`Reserved facade ${kind} for ${operationId}: ${identifier}`);
  }
  return identifier;
}

function validateFacadeCatalog(model, catalog) {
  const operationsById = new Map(
    model.operations.map((operation) => [operation.operationId, operation]),
  );
  const facadeNames = new Map();
  const domains = new Map();
  const optionNames = new Map();

  for (const entry of catalog) {
    const facadeName = `${entry.domain}.${entry.method}`;
    rejectDerivedCollision(
      facadeNames,
      facadeName,
      entry.operationId,
      `Facade domain/method collision ${facadeName}`,
    );
    if (!domains.has(entry.domain)) domains.set(entry.domain, entry.operationId);

    const operation = operationsById.get(entry.operationId);
    if (operationHasOptions(operation)) {
      const optionsName = `${operationSchemaName(entry.operationId)}Options`;
      assertDerivedIdentifier(optionsName, 'options type', entry.operationId);
      rejectDerivedCollision(
        optionNames,
        optionsName,
        entry.operationId,
        `Facade options type collision: ${optionsName}`,
      );
    }
  }

  const files = new Map();
  const classes = new Map();
  const factories = new Map();
  for (const [domain, operationId] of domains) {
    const className = `${capitalize(domain)}DomainClient`;
    const metadataClassName = `${className}WithMetadata`;
    const factoryName = `create${capitalize(domain)}Client`;
    const fileName = domainFileName(domain);
    assertDerivedIdentifier(className, 'domain class', operationId);
    assertDerivedIdentifier(metadataClassName, 'metadata domain class', operationId);
    assertDerivedIdentifier(factoryName, 'domain factory', operationId);
    rejectDerivedCollision(
      files,
      fileName.toLowerCase(),
      operationId,
      `Case-insensitive domain path collision ${fileName}`,
    );
    rejectDerivedCollision(
      classes,
      className,
      operationId,
      `Facade domain class collision ${className}`,
    );
    rejectDerivedCollision(
      classes,
      metadataClassName,
      operationId,
      `Facade domain class collision ${metadataClassName}`,
    );
    rejectDerivedCollision(
      factories,
      factoryName,
      operationId,
      `Facade domain factory collision ${factoryName}`,
    );
  }
}

function operationHasOptions(operation) {
  return (
    operation.requestBody !== null ||
    operation.parameters.some((parameter) => parameter.placement !== 'path')
  );
}

function assertDerivedIdentifier(identifier, kind, operationId) {
  if (!identifierPattern.test(identifier) || reservedIdentifiers.has(identifier)) {
    throw new Error(`Invalid derived facade ${kind} for ${operationId}: ${identifier}`);
  }
}

function rejectDerivedCollision(symbols, symbol, operationId, context) {
  const previousOperationId = symbols.get(symbol);
  if (previousOperationId !== undefined) {
    throw new Error(`${context}: ${previousOperationId} and ${operationId}`);
  }
  symbols.set(symbol, operationId);
}

function domainFileName(domain) {
  return domain
    .replaceAll(/([a-z0-9])([A-Z])/gu, '$1-$2')
    .replaceAll(/([A-Z]+)([A-Z][a-z])/gu, '$1-$2')
    .toLowerCase();
}

function safeDefaultIdentifier(identifier, prefix) {
  let value = identifier;
  if (!/^[A-Za-z]/u.test(value)) value = `${prefix}${capitalize(value)}`;
  if (reservedIdentifiers.has(value)) value = `${prefix}${capitalize(value)}`;
  return value;
}

function toIdentifier(value, fallback) {
  const words = splitWords(value);
  if (words.length === 0) return fallback;
  return `${words[0].toLowerCase()}${words
    .slice(1)
    .map((word) => capitalize(word.toLowerCase()))
    .join('')}`;
}

function splitWords(value) {
  return value
    .replaceAll(/([a-z0-9])([A-Z])/gu, '$1 $2')
    .replaceAll(/([A-Z]+)([A-Z][a-z])/gu, '$1 $2')
    .split(/[^A-Za-z0-9]+/u)
    .filter(Boolean);
}

function capitalize(value) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function compareOperationIds(left, right) {
  return left.operationId < right.operationId ? -1 : left.operationId > right.operationId ? 1 : 0;
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function requiredString(value, context) {
  if (typeof value !== 'string' || value.length === 0 || value.trim() !== value) {
    throw new Error(`${context} must be a non-empty trimmed string`);
  }
  return value;
}

function rejectUnknownKeys(value, allowed, context) {
  const unknown = Object.keys(value).filter((key) => !allowed.has(key));
  if (unknown.length > 0) {
    throw new Error(`Unknown ${context} field: ${unknown.toSorted().join(', ')}`);
  }
}

function assertRecord(value, context) {
  if (value === null || typeof value !== 'object' || Array.isArray(value)) {
    throw new Error(`${context} must be an object`);
  }
}

function deepFreeze(value) {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const entry of Object.values(value)) deepFreeze(entry);
  }
  return value;
}
