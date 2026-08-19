import { readFile } from 'node:fs/promises';
import { fileURLToPath } from 'node:url';

export const defaultNamingOverridesPath = fileURLToPath(
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

export async function loadNamingOverrides(model, path = defaultNamingOverridesPath) {
  const config = await readConfig(path, 'facade naming overrides');
  const operationIds = operationIdSet(model);
  const seen = new Set();
  const overrides = config.overrides.map((entry, index) => {
    assertRecord(entry, `Facade naming override ${index}`);
    rejectUnknownKeys(
      entry,
      new Set(['domain', 'method', 'operationId', 'reviewed']),
      `facade naming override ${index}`,
    );
    const operationId = requiredString(
      entry.operationId,
      `Facade naming override ${index} operationId`,
    );
    rejectDuplicateOrStale(operationId, seen, operationIds, 'facade naming override');
    if (entry.reviewed !== true) {
      throw new Error(`Facade naming override is not reviewed: ${operationId}`);
    }
    const domain = validIdentifier(entry.domain, `Facade domain for ${operationId}`);
    const method = validIdentifier(entry.method, `Facade method for ${operationId}`);
    return { domain, method, operationId, reviewed: true };
  });
  return deepFreeze(overrides.toSorted(compareOperationIds));
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
  const [namingOverrides, safetyOverrides] = await Promise.all([
    loadNamingOverrides(model, options.namingOverridesPath),
    loadSafetyOverrides(model, options.safetyOverridesPath),
  ]);
  const namingById = new Map(namingOverrides.map((entry) => [entry.operationId, entry]));
  const safetyById = new Map(safetyOverrides.map((entry) => [entry.operationId, entry]));
  const facadeNames = new Map();

  const metadata = model.operations.map((operation) => {
    const naming = namingById.get(operation.operationId);
    const domain = naming?.domain ?? defaultDomainName(operation);
    const method = naming?.method ?? defaultMethodName(operation.operationId);
    const facadeName = `${domain}.${method}`;
    const collidingOperationId = facadeNames.get(facadeName);
    if (collidingOperationId !== undefined) {
      throw new Error(
        `Facade domain/method collision ${facadeName}: ${collidingOperationId} and ${operation.operationId}`,
      );
    }
    facadeNames.set(facadeName, operation.operationId);
    return {
      classification:
        operation.method === 'GET' || safetyById.has(operation.operationId) ? 'read' : 'mutation',
      domain,
      method,
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

async function readConfig(path, name) {
  let config;
  try {
    config = JSON.parse(await readFile(path, 'utf8'));
  } catch (error) {
    throw new Error(`Failed to read ${name} from ${path}`, { cause: error });
  }
  assertRecord(config, `${name} config`);
  rejectUnknownKeys(config, new Set(['overrides', 'schemaVersion']), `${name} config`);
  if (config.schemaVersion !== 1 || !Array.isArray(config.overrides)) {
    throw new Error(`Invalid ${name} config`);
  }
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

function validIdentifier(value, context) {
  const identifier = requiredString(value, context);
  if (!identifierPattern.test(identifier) || reservedIdentifiers.has(identifier)) {
    throw new Error(`Invalid TypeScript identifier for ${context}: ${identifier}`);
  }
  return identifier;
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
