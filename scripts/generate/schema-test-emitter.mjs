import { writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createProvenanceHeader } from './artifacts.mjs';
import { isTransportManagedParameter } from './operation-parameters.mjs';
import { operationSchemaName, operationStatusResponseSchemaName } from './zod-schema.mjs';

const unavailable = Symbol('unavailable fixture');
const annotationKeywords = new Set([
  'default',
  'deprecated',
  'description',
  'example',
  'examples',
  'readOnly',
  'title',
  'writeOnly',
]);

export function renderGeneratedSchemaContractTests(models, operations, provenance) {
  if (!Array.isArray(models)) throw new TypeError('Normalized models must be an array');
  if (!Array.isArray(operations)) throw new TypeError('Normalized operations must be an array');

  const state = indexModels(models);
  const cases = [];
  const modelImports = new Set();
  const operationImports = new Set();

  for (const model of [...state.modelsByName.values()].toSorted((left, right) =>
    compareText(left.name, right.name),
  )) {
    const schemaName = `${model.name}Schema`;
    const minimal = deriveSchemaFixture(model.schema, state, { populate: false });
    if (minimal !== unavailable) {
      modelImports.add(schemaName);
      cases.push({
        category: 'valid',
        description: `${model.name} accepts minimal valid data`,
        schemaName,
        fixture: minimal,
      });
    }

    const invalid = deriveInvalidKnownFieldFixture(model.schema, state);
    if (invalid !== unavailable) {
      modelImports.add(schemaName);
      cases.push({
        category: 'invalid',
        description: `${model.name} rejects an invalid known field`,
        schemaName,
        fixture: invalid,
      });
    }

    const unknown = deriveUnknownFieldFixture(model.schema, state);
    if (unknown !== unavailable) {
      modelImports.add(schemaName);
      cases.push({
        category: 'unknown',
        description: `${model.name} preserves an unknown field`,
        schemaName,
        fixture: unknown.fixture,
        expected: unknown.expected,
      });
    }

    if (containsArray(model.schema, state)) {
      const nested = deriveSchemaFixture(model.schema, state, { populate: true });
      if (nested !== unavailable && containsPopulatedArray(nested)) {
        modelImports.add(schemaName);
        cases.push({
          category: 'collection',
          description: `${model.name} validates nested collection data`,
          schemaName,
          fixture: nested,
        });
      }
    }

    const dateTimePath = findDateTimePath(model.schema, state);
    if (dateTimePath !== null) {
      const fixture = deriveSchemaFixture(model.schema, state, {
        populate: true,
        preferNonNull: true,
      });
      if (fixture !== unavailable && typeof readPath(fixture, dateTimePath) === 'string') {
        modelImports.add(schemaName);
        cases.push({
          category: 'date-time',
          description: `${model.name} keeps date-time values as strings`,
          schemaName,
          fixture,
          path: dateTimePath,
        });
      }
    }

    if (isNullableSchema(model.schema)) {
      modelImports.add(schemaName);
      cases.push({
        category: 'nullable',
        description: `${model.name} accepts null`,
        schemaName,
        fixture: null,
      });
    }

    const composition = compositionKeyword(model.schema);
    if (composition !== null) {
      const fixture = deriveSchemaFixture(model.schema, state, {
        populate: true,
        preferNonNull: true,
      });
      if (fixture !== unavailable) {
        modelImports.add(schemaName);
        cases.push({
          category: 'composition',
          description: `${model.name} validates ${composition} composition`,
          schemaName,
          fixture,
        });
      }
    }
  }

  const operationSymbols = new Map();
  for (const operation of [...operations].toSorted((left, right) =>
    compareText(left.operationId, right.operationId),
  )) {
    assertOperation(operation, operationSymbols);
    const requestFixture = deriveRequestFixture(operation, state);
    const requestSchemaName = `${operationSchemaName(operation.operationId)}RequestSchema`;
    if (requestFixture !== unavailable) {
      operationImports.add(requestSchemaName);
      cases.push({
        category: 'valid',
        description: `${operation.operationId} accepts minimal valid request data`,
        schemaName: requestSchemaName,
        fixture: requestFixture,
      });
    }

    for (const response of [...operation.successResponses].toSorted((left, right) =>
      compareText(left.status, right.status),
    )) {
      const schemaName = operationStatusResponseSchemaName(operation.operationId, response.status);
      if (response.noContent === true) {
        operationImports.add(schemaName);
        cases.push({
          category: 'no-content',
          description: `${operation.operationId} ${response.status} accepts only no content`,
          schemaName,
        });
        continue;
      }
      const content = selectJsonContent(response.content);
      if (content === null) continue;
      const fixture = deriveSchemaFixture(content.schema, state, {
        populate: containsArray(content.schema, state),
      });
      if (fixture === unavailable) continue;
      operationImports.add(schemaName);
      cases.push({
        category: containsArray(content.schema, state) ? 'collection' : 'valid',
        description: `${operation.operationId} ${response.status} validates success data`,
        schemaName,
        fixture,
      });
    }
  }

  if (cases.length === 0) {
    throw new Error('No mechanically reliable schema contract fixtures could be generated');
  }

  const imports = [
    "import { describe, expect, it } from 'vitest';",
    renderImport(modelImports, '../../src/generated/schemas/models.js'),
    renderImport(operationImports, '../../src/generated/schemas/operations.js'),
  ].filter(Boolean);
  const needsReadPath = cases.some(({ category }) => category === 'date-time');
  const tests = cases.map(renderCase).join('\n\n');
  const body = `${imports.join('\n')}\n\n// Fixtures are emitted only when their validity follows mechanically from the normalized schema.\n${needsReadPath ? `${renderReadPathHelper()}\n\n` : ''}describe('generated schema contracts', () => {\n${indent(tests, 2)}\n});\n`;
  return `${createProvenanceHeader(provenance, 'typescript')}\n${body}`;
}

export function createSchemaContractFixture(schema, models, options = {}) {
  if (!Array.isArray(models)) throw new TypeError('Normalized models must be an array');
  if (!isObject(options)) throw new TypeError('Schema fixture options must be an object');
  const fixture = deriveSchemaFixture(schema, indexModels(models), {
    nonEmptyStrings: options.nonEmptyStrings === true,
    populate: options.populate === true,
    preferNonNull: options.preferNonNull === true,
  });
  if (fixture === unavailable) {
    throw new Error('Schema does not have a mechanically derivable fixture');
  }
  return fixture;
}

export async function emitGeneratedSchemaTests(context, testsDirectory) {
  if (!isObject(context) || !isObject(context.normalizedModel)) {
    throw new TypeError('Generated schema test context must contain a normalized model');
  }
  if (typeof testsDirectory !== 'string' || testsDirectory.length === 0) {
    throw new TypeError('Generated schema test directory must be a non-empty string');
  }
  await writeFile(
    join(testsDirectory, 'schema-contracts.test.ts'),
    renderGeneratedSchemaContractTests(
      context.normalizedModel.models,
      context.normalizedModel.operations,
      context.provenance,
    ),
  );
  return ['schema-contracts.test.ts'];
}

export const generatedSchemaTestsComponent = Object.freeze({
  name: 'schema-contracts',
  emit: emitGeneratedSchemaTests,
});

function renderCase(testCase) {
  const description = JSON.stringify(testCase.description);
  const fixture = stableJson(testCase.fixture);
  switch (testCase.category) {
    case 'invalid':
      return `it(${description}, () => {\n  expect(${testCase.schemaName}.safeParse(${fixture}).success).toBe(false);\n});`;
    case 'unknown':
      return `it(${description}, () => {\n  const parsed = ${testCase.schemaName}.parse(${fixture});\n  expect(parsed).toHaveProperty('__generated_unknown__', ${stableJson(testCase.expected)});\n});`;
    case 'date-time':
      return `it(${description}, () => {\n  const parsed = ${testCase.schemaName}.parse(${fixture});\n  expect(typeof readFixturePath(parsed, ${stableJson(testCase.path)})).toBe('string');\n});`;
    case 'no-content':
      return `it(${description}, () => {\n  expect(${testCase.schemaName}.parse(undefined)).toBeUndefined();\n  expect(${testCase.schemaName}.safeParse(null).success).toBe(false);\n});`;
    default:
      return `it(${description}, () => {\n  expect(${testCase.schemaName}.parse(${fixture})).toEqual(${fixture});\n});`;
  }
}

function renderImport(names, specifier) {
  if (names.size === 0) return '';
  return `import {\n${[...names]
    .toSorted(compareText)
    .map((name) => `  ${name},`)
    .join('\n')}\n} from '${specifier}';`;
}

function renderReadPathHelper() {
  return `function readFixturePath(value: unknown, path: readonly (number | string)[]): unknown {
  let current = value;
  for (const segment of path) {
    if (current === null || typeof current !== 'object') return undefined;
    current = Reflect.get(current, segment);
  }
  return current;
}`;
}

function deriveRequestFixture(operation, state) {
  if (!Array.isArray(operation.parameters)) return unavailable;
  const fixture = {};
  for (const placement of ['path', 'query', 'header', 'cookie']) {
    const required = operation.parameters
      .filter(
        (parameter) =>
          parameter.placement === placement &&
          parameter.required === true &&
          !isTransportManagedParameter(parameter),
      )
      .toSorted((left, right) => compareText(left.name, right.name));
    if (required.length === 0) continue;
    const group = {};
    for (const parameter of required) {
      const value = deriveSchemaFixture(parameter.schema, state, { populate: false });
      if (value === unavailable) return unavailable;
      group[parameter.name] = value;
    }
    fixture[placement] = group;
  }
  if (operation.requestBody?.required === true) {
    const content = selectJsonContent(operation.requestBody.content);
    if (content === null) return unavailable;
    const body = deriveSchemaFixture(content.schema, state, { populate: false });
    if (body === unavailable) return unavailable;
    fixture.body = body;
  }
  return fixture;
}

function deriveInvalidKnownFieldFixture(schema, state) {
  const resolved = resolveDirectSchema(schema, state);
  if (
    resolved === unavailable ||
    schemaType(resolved) !== 'object' ||
    !isObject(resolved.properties)
  ) {
    return unavailable;
  }
  const fixture = deriveSchemaFixture(schema, state, { populate: false, preferNonNull: true });
  if (!isObject(fixture)) return unavailable;
  for (const name of Object.keys(resolved.properties).toSorted(compareText)) {
    const invalid = incompatibleValue(resolved.properties[name], state);
    if (invalid === unavailable) continue;
    return { ...fixture, [name]: invalid };
  }
  return unavailable;
}

function deriveUnknownFieldFixture(schema, state) {
  const resolved = resolveDirectSchema(schema, state);
  if (resolved === unavailable || schemaType(resolved) !== 'object') return unavailable;
  const fixture = deriveSchemaFixture(schema, state, { populate: false, preferNonNull: true });
  if (!isObject(fixture) || resolved.additionalProperties === false) return unavailable;
  const expected =
    resolved.additionalProperties === undefined || resolved.additionalProperties === true
      ? { preserved: true }
      : deriveSchemaFixture(resolved.additionalProperties, state, { populate: false });
  if (expected === unavailable) return unavailable;
  return { expected, fixture: { ...fixture, __generated_unknown__: expected } };
}

function deriveSchemaFixture(schema, state, options, active = new Set()) {
  if (!isObject(schema)) return unavailable;
  if (isNullableSchema(schema) && options.preferNonNull !== true) return null;

  const meaningfulKeys = Object.keys(schema).filter(
    (key) => !annotationKeywords.has(key) && !key.startsWith('x-') && key !== 'nullable',
  );
  if (schema.$ref !== undefined) {
    if (meaningfulKeys.some((key) => key !== '$ref')) return unavailable;
    const target = state.modelsByPointer.get(schema.$ref);
    if (target === undefined || active.has(target.pointer)) return unavailable;
    const nextActive = new Set(active);
    nextActive.add(target.pointer);
    return deriveSchemaFixture(target.schema, state, options, nextActive);
  }

  const composition = compositionKeyword(schema);
  if (composition !== null) {
    if (meaningfulKeys.some((key) => key !== composition)) return unavailable;
    return deriveCompositionFixture(composition, schema[composition], state, options, active);
  }

  const type = schemaType(schema);
  const candidates = schema.const !== undefined ? [schema.const] : schema.enum;
  if (candidates !== undefined) {
    if (!Array.isArray(candidates)) return unavailable;
    const candidate = candidates.find((value) => valueSatisfiesSimpleSchema(value, schema, type));
    return candidate === undefined ? unavailable : candidate;
  }
  switch (type) {
    case null:
      return meaningfulKeys.length === 0 ? null : unavailable;
    case 'null':
      return null;
    case 'boolean':
      return true;
    case 'string':
      return deriveStringFixture(schema, options);
    case 'number':
    case 'integer':
      return deriveNumberFixture(schema, type === 'integer');
    case 'array': {
      if (!isObject(schema.items)) return unavailable;
      const minimum = integerConstraint(schema.minItems, 0);
      const maximum = integerConstraint(schema.maxItems, Number.POSITIVE_INFINITY);
      if (minimum === unavailable || maximum === unavailable || minimum > maximum)
        return unavailable;
      const count = options.populate === true && maximum > 0 ? Math.max(1, minimum) : minimum;
      if (count > maximum || (schema.uniqueItems === true && count > 1)) return unavailable;
      const item = deriveSchemaFixture(schema.items, state, options, active);
      if (item === unavailable) return unavailable;
      return Array.from({ length: count }, () => item);
    }
    case 'object': {
      const properties = schema.properties ?? {};
      if (!isObject(properties) || !Array.isArray(schema.required ?? [])) return unavailable;
      const required = new Set(schema.required ?? []);
      const fixture = {};
      for (const name of Object.keys(properties).toSorted(compareText)) {
        if (!required.has(name) && options.populate !== true) continue;
        const value = deriveSchemaFixture(properties[name], state, options, active);
        if (value === unavailable) {
          if (required.has(name)) return unavailable;
          continue;
        }
        fixture[name] = value;
      }
      return fixture;
    }
    default:
      return unavailable;
  }
}

function deriveCompositionFixture(keyword, branches, state, options, active) {
  if (!Array.isArray(branches) || branches.length === 0) return unavailable;
  if (keyword === 'allOf') {
    const merged = {};
    for (const branch of branches) {
      const resolved = resolveDirectSchema(branch, state);
      if (
        resolved === unavailable ||
        schemaType(resolved) !== 'object' ||
        (resolved.additionalProperties !== undefined && resolved.additionalProperties !== true)
      ) {
        return unavailable;
      }
      const fixture = deriveSchemaFixture(branch, state, options, active);
      if (!isObject(fixture)) return unavailable;
      for (const [key, value] of Object.entries(fixture)) {
        if (Object.hasOwn(merged, key) && stableJson(merged[key]) !== stableJson(value)) {
          return unavailable;
        }
        merged[key] = value;
      }
    }
    return merged;
  }
  if (keyword === 'anyOf') {
    for (const branch of branches) {
      const fixture = deriveSchemaFixture(branch, state, options, active);
      if (fixture !== unavailable) return fixture;
    }
    return unavailable;
  }

  const kinds = branches.map((branch) => disjointJsonKind(branch, state));
  for (const [index, branch] of branches.entries()) {
    const kind = kinds[index];
    if (kind === null || kinds.filter((entry) => entry === kind).length !== 1) continue;
    const fixture = deriveSchemaFixture(branch, state, options, active);
    if (fixture !== unavailable) return fixture;
  }
  return unavailable;
}

function deriveStringFixture(schema, options) {
  const declaredMinimum = integerConstraint(schema.minLength, 0);
  if (declaredMinimum === unavailable) return unavailable;
  const minimum = options.nonEmptyStrings === true ? Math.max(1, declaredMinimum) : declaredMinimum;
  const maximum = integerConstraint(schema.maxLength, Number.POSITIVE_INFINITY);
  if (minimum === unavailable || maximum === unavailable || minimum > maximum) return unavailable;
  const formatted =
    schema.format === 'date-time'
      ? '2026-08-18T12:30:00Z'
      : schema.format === 'date'
        ? '2026-08-18'
        : schema.format === 'uuid'
          ? '123e4567-e89b-42d3-a456-426614174000'
          : schema.format === undefined
            ? null
            : unavailable;
  if (formatted === unavailable) return unavailable;
  const candidates =
    formatted === null
      ? ['x'.repeat(minimum), 'a'.repeat(minimum), '0'.repeat(minimum)]
      : [formatted];
  return (
    candidates.find((value) => valueSatisfiesSimpleSchema(value, schema, 'string')) ?? unavailable
  );
}

function deriveNumberFixture(schema, integer) {
  const multiple =
    typeof schema.multipleOf === 'number' && schema.multipleOf > 0 ? schema.multipleOf : 1;
  const candidates = [0, multiple, -multiple];
  for (const bound of [
    schema.minimum,
    schema.maximum,
    schema.exclusiveMinimum,
    schema.exclusiveMaximum,
  ]) {
    if (typeof bound === 'number' && Number.isFinite(bound)) {
      candidates.push(bound, bound + multiple, bound - multiple);
    }
  }
  return (
    candidates.find((value) =>
      valueSatisfiesSimpleSchema(value, schema, integer ? 'integer' : 'number'),
    ) ?? unavailable
  );
}

function valueSatisfiesSimpleSchema(value, schema, type) {
  if (type === 'string') {
    if (typeof value !== 'string') return false;
    if (typeof schema.minLength === 'number' && value.length < schema.minLength) return false;
    if (typeof schema.maxLength === 'number' && value.length > schema.maxLength) return false;
    if (typeof schema.pattern === 'string' && !new RegExp(schema.pattern, 'u').test(value))
      return false;
    if (schema.format === 'date' && !/^\d{4}-\d{2}-\d{2}$/u.test(value)) return false;
    if (
      schema.format === 'date-time' &&
      !/^\d{4}-\d{2}-\d{2}T\d{2}:\d{2}:\d{2}(?:\.\d+)?(?:Z|[+-]\d{2}:\d{2})$/u.test(value)
    )
      return false;
    if (
      schema.format === 'uuid' &&
      !/^[0-9a-f]{8}-[0-9a-f]{4}-[1-8][0-9a-f]{3}-[89ab][0-9a-f]{3}-[0-9a-f]{12}$/iu.test(value)
    )
      return false;
    return schema.format === undefined || ['date', 'date-time', 'uuid'].includes(schema.format);
  }
  if (type === 'integer' || type === 'number') {
    if (
      typeof value !== 'number' ||
      !Number.isFinite(value) ||
      (type === 'integer' && !Number.isInteger(value))
    )
      return false;
    if (schema.format === 'int32' && (value < -2_147_483_648 || value > 2_147_483_647))
      return false;
    if (typeof schema.minimum === 'number' && value < schema.minimum) return false;
    if (typeof schema.maximum === 'number' && value > schema.maximum) return false;
    if (typeof schema.exclusiveMinimum === 'number' && value <= schema.exclusiveMinimum)
      return false;
    if (typeof schema.exclusiveMaximum === 'number' && value >= schema.exclusiveMaximum)
      return false;
    if (typeof schema.multipleOf === 'number' && !Number.isInteger(value / schema.multipleOf))
      return false;
    return true;
  }
  if (type === 'boolean') return typeof value === 'boolean';
  if (type === 'null') return value === null;
  if (type === 'array') return Array.isArray(value);
  if (type === 'object') return isObject(value);
  return false;
}

function incompatibleValue(schema, state) {
  const resolved = resolveDirectSchema(schema, state);
  if (resolved === unavailable) return unavailable;
  switch (schemaType(resolved)) {
    case 'string':
    case 'number':
    case 'integer':
    case 'array':
    case 'object':
    case 'null':
      return false;
    case 'boolean':
      return 'invalid';
    default:
      return unavailable;
  }
}

function containsArray(schema, state, active = new Set()) {
  if (!isObject(schema)) return false;
  if (schema.$ref !== undefined) {
    const target = state.modelsByPointer.get(schema.$ref);
    if (target === undefined || active.has(target.pointer)) return false;
    const next = new Set(active);
    next.add(target.pointer);
    return containsArray(target.schema, state, next);
  }
  if (schemaType(schema) === 'array') return true;
  if (
    isObject(schema.properties) &&
    Object.values(schema.properties).some((entry) => containsArray(entry, state, active))
  )
    return true;
  return ['allOf', 'anyOf', 'oneOf'].some(
    (keyword) =>
      Array.isArray(schema[keyword]) &&
      schema[keyword].some((entry) => containsArray(entry, state, active)),
  );
}

function containsPopulatedArray(value) {
  if (Array.isArray(value)) return value.length > 0 || value.some(containsPopulatedArray);
  return isObject(value) && Object.values(value).some(containsPopulatedArray);
}

function findDateTimePath(schema, state, path = [], active = new Set()) {
  if (!isObject(schema)) return null;
  if (schema.$ref !== undefined) {
    const target = state.modelsByPointer.get(schema.$ref);
    if (target === undefined || active.has(target.pointer)) return null;
    const next = new Set(active);
    next.add(target.pointer);
    return findDateTimePath(target.schema, state, path, next);
  }
  if (schemaType(schema) === 'string' && schema.format === 'date-time') return path;
  if (schemaType(schema) === 'array' && isObject(schema.items)) {
    return findDateTimePath(schema.items, state, [...path, 0], active);
  }
  if (isObject(schema.properties)) {
    for (const name of Object.keys(schema.properties).toSorted(compareText)) {
      const found = findDateTimePath(schema.properties[name], state, [...path, name], active);
      if (found !== null) return found;
    }
  }
  return null;
}

function resolveDirectSchema(schema, state, active = new Set()) {
  if (!isObject(schema)) return unavailable;
  if (schema.$ref === undefined) return schema;
  const meaningful = Object.keys(schema).filter(
    (key) => !annotationKeywords.has(key) && !key.startsWith('x-') && key !== 'nullable',
  );
  if (meaningful.some((key) => key !== '$ref')) return unavailable;
  const target = state.modelsByPointer.get(schema.$ref);
  if (target === undefined || active.has(target.pointer)) return unavailable;
  const next = new Set(active);
  next.add(target.pointer);
  return resolveDirectSchema(target.schema, state, next);
}

function disjointJsonKind(schema, state) {
  const resolved = resolveDirectSchema(schema, state);
  if (resolved === unavailable || compositionKeyword(resolved) !== null) return null;
  const type = schemaType(resolved);
  return type === 'integer' ? 'number' : type;
}

function schemaType(schema) {
  if (typeof schema.type === 'string') return schema.type;
  if (Array.isArray(schema.type) && schema.type.length === 2 && schema.type.includes('null')) {
    return schema.type.find((entry) => entry !== 'null') ?? null;
  }
  return null;
}

function isNullableSchema(schema) {
  return (
    isObject(schema) &&
    (schema.nullable === true || (Array.isArray(schema.type) && schema.type.includes('null')))
  );
}

function compositionKeyword(schema) {
  if (!isObject(schema)) return null;
  const found = ['allOf', 'oneOf', 'anyOf'].filter((keyword) => schema[keyword] !== undefined);
  return found.length === 1 ? found[0] : null;
}

function selectJsonContent(content) {
  if (!Array.isArray(content)) return null;
  return (
    content
      .filter(
        (entry) =>
          isObject(entry) &&
          typeof entry.mediaType === 'string' &&
          /^application\/(?:[A-Za-z0-9!#$&^_.+-]+\+)?json(?:\s*;.*)?$/iu.test(entry.mediaType),
      )
      .toSorted((left, right) => {
        const leftExact = left.mediaType.toLowerCase() === 'application/json' ? 0 : 1;
        const rightExact = right.mediaType.toLowerCase() === 'application/json' ? 0 : 1;
        return leftExact - rightExact || compareText(left.mediaType, right.mediaType);
      })[0] ?? null
  );
}

function assertOperation(operation, symbols) {
  if (
    !isObject(operation) ||
    typeof operation.operationId !== 'string' ||
    !Array.isArray(operation.successResponses)
  ) {
    throw new TypeError('Normalized operation must contain an operation ID and success responses');
  }
  const symbol = operationSchemaName(operation.operationId);
  const previous = symbols.get(symbol);
  if (previous !== undefined) {
    throw new Error(
      `Operation schema name collision ${symbol}: ${previous} and ${operation.operationId}`,
    );
  }
  symbols.set(symbol, operation.operationId);
}

function indexModels(models) {
  const modelsByName = new Map();
  const modelsByPointer = new Map();
  for (const model of models) {
    if (!isObject(model) || typeof model.name !== 'string' || typeof model.pointer !== 'string') {
      throw new TypeError('Normalized model must contain a name and pointer');
    }
    if (modelsByName.has(model.name) || modelsByPointer.has(model.pointer)) {
      throw new Error(`Duplicate normalized model: ${model.name}`);
    }
    modelsByName.set(model.name, model);
    modelsByPointer.set(model.pointer, model);
  }
  return { modelsByName, modelsByPointer };
}

function integerConstraint(value, fallback) {
  if (value === undefined) return fallback;
  return Number.isInteger(value) && value >= 0 ? value : unavailable;
}

function readPath(value, path) {
  let current = value;
  for (const segment of path) {
    if (current === null || typeof current !== 'object') return undefined;
    current = current[segment];
  }
  return current;
}

function stableJson(value) {
  return JSON.stringify(sortJsonValue(value));
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

function indent(value, spaces) {
  const prefix = ' '.repeat(spaces);
  return value
    .split('\n')
    .map((line) => `${prefix}${line}`)
    .join('\n');
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
