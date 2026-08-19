import { createHash } from 'node:crypto';
import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { dirname, isAbsolute, join, relative, resolve, sep } from 'node:path';
import { pathToFileURL } from 'node:url';

import { applySpecificationCorrections } from './generate/corrections.mjs';
import { normalizeOpenApiDocument } from './generate/normalize.mjs';
import { defaultSpecificationUrl, stageOpenApiSnapshot } from './generate/openapi.mjs';
import { generatedPaths, repositoryRoot } from './generate/paths.mjs';

const correctionPolicy = 'applicable-date-ranges';

export async function reportSpecificationDrift(options = {}) {
  const root = resolve(options.repositoryRoot ?? repositoryRoot);
  const generatedDirectory = join(root, 'openapi/generated');
  const exclusionsPath = options.exclusionsPath ?? join(root, 'openapi/config/exclusions.json');
  const correctionManifestPath =
    options.correctionManifestPath ?? join(root, 'openapi/corrections/manifest.json');
  const outputPath =
    options.outputPath === undefined ? undefined : resolve(root, options.outputPath);
  if (outputPath !== undefined) assertSafeOutputPath(root, outputPath);
  const [pinnedSource, pinnedModelSource, pinnedProvenance, pinnedDate] = await Promise.all([
    readFile(join(generatedDirectory, 'esi-openapi.json'), 'utf8'),
    readFile(join(generatedDirectory, 'normalized-model.json'), 'utf8'),
    readFile(join(generatedDirectory, 'provenance.json'), 'utf8').then(JSON.parse),
    readFile(join(root, 'openapi/compatibility-date.txt'), 'utf8').then((value) => value.trim()),
  ]);
  const pinnedDocument = JSON.parse(pinnedSource);
  const pinnedModel = JSON.parse(pinnedModelSource);
  const canonicalPinnedSource = serializeJson(pinnedDocument);
  assertPinnedInput(pinnedProvenance, pinnedDate, canonicalPinnedSource);

  const rebuiltPinnedModel = await normalizeOpenApiDocument(pinnedDocument, { exclusionsPath });
  if (stableJson(rebuiltPinnedModel) !== stableJson(pinnedModel)) {
    throw new Error('Committed corrected OpenAPI snapshot and normalized model are inconsistent');
  }

  const latestCompatibilityDate =
    options.latestCompatibilityDate ?? (await resolveLatestCompatibilityDate(options));
  const staged = await stageOpenApiSnapshot({
    fetchImplementation: options.fetchImplementation,
    requestedDate: latestCompatibilityDate,
    specificationUrl: options.specificationUrl ?? defaultSpecificationUrl,
    temporaryRoot: options.temporaryRoot,
    signal: options.signal,
  });

  try {
    const correctedLatest = await applySpecificationCorrections(
      staged.document,
      latestCompatibilityDate,
      {
        expiredCorrectionPolicy: 'skip',
        manifestPath: correctionManifestPath,
      },
    );
    const latestModel = await normalizeOpenApiDocument(correctedLatest.document, {
      exclusionsPath,
    });
    const latestComparedSource = serializeJson(correctedLatest.document);
    const report = compareSpecificationDrift({
      latest: {
        compatibilityDate: latestCompatibilityDate,
        corrections: correctedLatest.appliedCorrections,
        document: correctedLatest.document,
        model: latestModel,
        sha256: sha256(latestComparedSource),
        sourceSha256: staged.sha256,
        specificationUrl: options.specificationUrl ?? defaultSpecificationUrl,
      },
      pinned: {
        compatibilityDate: pinnedDate,
        corrections: pinnedProvenance.appliedCorrections,
        document: pinnedDocument,
        model: pinnedModel,
        sha256: pinnedProvenance.sha256,
        sourceSha256: pinnedProvenance.sourceSha256,
        specificationUrl: pinnedProvenance.specificationUrl,
      },
    });
    const output = serializeJson(report);
    if (outputPath !== undefined) {
      await mkdir(dirname(outputPath), { recursive: true });
      await writeFile(outputPath, output);
    }
    await options.output?.(output, report);
    return report;
  } finally {
    await staged.cleanup();
  }
}

async function resolveLatestCompatibilityDate(options) {
  const specificationUrl = options.specificationUrl ?? defaultSpecificationUrl;
  const compatibilityDatesUrl = new URL('/meta/compatibility-dates', specificationUrl);
  const fetchImplementation = options.fetchImplementation ?? globalThis.fetch;
  const response = await fetchImplementation(compatibilityDatesUrl, {
    headers: { accept: 'application/json' },
    signal: options.signal,
  });
  if (!response.ok) {
    throw new Error(`Failed to retrieve ESI compatibility dates: HTTP ${response.status}`);
  }

  let payload;
  try {
    payload = await response.json();
  } catch (error) {
    throw new Error('Failed to parse ESI compatibility dates as JSON', { cause: error });
  }
  const dates = isObject(payload) ? payload.compatibility_dates : undefined;
  if (!Array.isArray(dates)) throw new Error('Invalid ESI compatibility dates response');
  const validDates = dates.filter(isCompatibilityDate).toSorted(compareText);
  const latestDate = validDates.at(-1);
  if (latestDate === undefined) throw new Error('ESI returned no valid compatibility dates');
  return latestDate;
}

export function compareSpecificationDrift(input) {
  const pinnedOperations = indexBy(input.pinned.model.operations, ({ operationId }) => operationId);
  const latestOperations = indexBy(input.latest.model.operations, ({ operationId }) => operationId);
  const operationChanges = diffIndexed(
    pinnedOperations,
    latestOperations,
    operationIdentity,
    compareOperation,
  );
  const pinnedComponents = indexBy(input.pinned.model.models, ({ name }) => name);
  const latestComponents = indexBy(input.latest.model.models, ({ name }) => name);
  const componentChanges = diffIndexed(
    pinnedComponents,
    latestComponents,
    ({ name, schema }) => ({ name, schema }),
    compareComponent,
  );
  const authenticationSchemeChanges = compareAuthenticationSchemes(
    input.pinned.document,
    input.latest.document,
  );
  const changes = {
    authenticationSchemes: authenticationSchemeChanges,
    componentSchemas: componentChanges,
    operations: operationChanges,
  };
  const summary = summarizeChanges(changes);

  return deepFreeze({
    schemaVersion: 1,
    pinned: versionDescription(input.pinned, 'committed-corrected'),
    latest: versionDescription(input.latest, 'upstream-staged'),
    summary,
    changes,
  });
}

export function renderSpecificationDriftReport(report) {
  return serializeJson(report);
}

function compareOperation(before, after) {
  const change = {
    operationId: before.operationId,
    categories: [],
    parameters: compareParameters(before.parameters, after.parameters),
    responses: compareResponses(before.successResponses, after.successResponses),
  };
  recordScalarChange(change, 'path', before.path, after.path);
  recordScalarChange(change, 'method', before.method, after.method);
  if (hasDiff(change.parameters)) change.categories.push('parameters');
  const requestBody = compareRequestBody(before.requestBody, after.requestBody);
  if (requestBody !== undefined) {
    change.categories.push('requestBody');
    change.requestBody = requestBody;
  }
  if (hasDiff(change.responses)) change.categories.push('responses');
  recordObjectChange(change, 'pagination', before.pagination, after.pagination);
  recordObjectChange(change, 'cache', before.cache, after.cache);
  const authentication = compareOperationAuthentication(before.security, after.security);
  if (authentication !== undefined) {
    change.categories.push('authentication');
    change.authentication = authentication;
  }
  change.categories.sort(compareText);
  return change.categories.length === 0 ? undefined : change;
}

function compareParameters(before, after) {
  const unmatchedBefore = new Map(before.map((parameter) => [parameterKey(parameter), parameter]));
  const unmatchedAfter = new Map(after.map((parameter) => [parameterKey(parameter), parameter]));
  const changed = [];

  for (const key of [...unmatchedBefore.keys()].toSorted(compareText)) {
    if (!unmatchedAfter.has(key)) continue;
    const previous = unmatchedBefore.get(key);
    const next = unmatchedAfter.get(key);
    unmatchedBefore.delete(key);
    unmatchedAfter.delete(key);
    const parameterChange = compareParameter(previous, next);
    if (parameterChange !== undefined) changed.push(parameterChange);
  }

  const beforeByName = groupBy(unmatchedBefore.values(), ({ name }) => name.toLowerCase());
  const afterByName = groupBy(unmatchedAfter.values(), ({ name }) => name.toLowerCase());
  for (const name of [...beforeByName.keys()].toSorted(compareText)) {
    const previous = beforeByName.get(name);
    const next = afterByName.get(name);
    if (previous?.length !== 1 || next?.length !== 1) continue;
    unmatchedBefore.delete(parameterKey(previous[0]));
    unmatchedAfter.delete(parameterKey(next[0]));
    changed.push(compareParameter(previous[0], next[0]));
  }

  return {
    added: [...unmatchedAfter.values()].map(parameterContract).toSorted(compareNamedPlacement),
    removed: [...unmatchedBefore.values()].map(parameterContract).toSorted(compareNamedPlacement),
    changed: changed.filter(Boolean).toSorted(compareNamedPlacement),
  };
}

function compareParameter(before, after) {
  const changes = [];
  if (before.name !== after.name) changes.push('name');
  if (before.placement !== after.placement) changes.push('placement');
  if (before.required !== after.required) changes.push('required');
  if (!sameJson(before.schema, after.schema)) changes.push('schema');
  if (changes.length === 0) return undefined;
  return {
    name: after.name,
    changes: changes.toSorted(compareText),
    before: parameterContract(before),
    after: parameterContract(after),
  };
}

function compareRequestBody(before, after) {
  if (sameJson(before, after)) return undefined;
  if (before === null || after === null) return { before, after };
  return {
    before: { required: before.required },
    after: { required: after.required },
    content: compareContent(before.content, after.content),
  };
}

function compareResponses(before, after) {
  return diffIndexed(
    indexBy(before, ({ status }) => status),
    indexBy(after, ({ status }) => status),
    responseContract,
    compareResponse,
  );
}

function compareResponse(before, after) {
  const change = { status: before.status, categories: [] };
  if (before.noContent !== after.noContent) {
    change.categories.push('noContent');
    change.noContent = { before: before.noContent, after: after.noContent };
  }
  const content = compareContent(before.content, after.content);
  if (hasDiff(content)) {
    change.categories.push('shape');
    change.content = content;
  }
  const headers = compareResponseHeaders(before.headers, after.headers);
  if (hasDiff(headers)) {
    change.categories.push('fields');
    change.headers = headers;
  }
  change.categories.sort(compareText);
  return change.categories.length === 0 ? undefined : change;
}

function compareContent(before, after) {
  return diffIndexed(
    indexBy(before, ({ mediaType }) => mediaType),
    indexBy(after, ({ mediaType }) => mediaType),
    mediaContract,
    (previous, next) => {
      if (sameJson(previous.schema, next.schema)) return undefined;
      return {
        mediaType: previous.mediaType,
        schema: { before: previous.schema, after: next.schema },
        fields: compareSchemaFields(previous.schema, next.schema),
      };
    },
  );
}

function compareResponseHeaders(before, after) {
  return diffIndexed(
    indexBy(before, ({ name }) => name.toLowerCase()),
    indexBy(after, ({ name }) => name.toLowerCase()),
    ({ name, schema }) => ({ name, schema }),
    (previous, next) => {
      if (sameJson(previous.schema, next.schema) && previous.name === next.name) return undefined;
      return {
        name: next.name,
        before: { name: previous.name, schema: previous.schema },
        after: { name: next.name, schema: next.schema },
      };
    },
  );
}

function compareComponent(before, after) {
  if (sameJson(before.schema, after.schema)) return undefined;
  return {
    name: before.name,
    schema: { before: before.schema, after: after.schema },
    fields: compareSchemaFields(before.schema, after.schema),
  };
}

function compareSchemaFields(before, after) {
  const beforeFields = collectSchemaFields(before);
  const afterFields = collectSchemaFields(after);
  return diffIndexed(
    beforeFields,
    afterFields,
    (field) => field,
    (previous, next) => {
      if (sameJson(previous, next)) return undefined;
      const changes = [];
      if (previous.required !== next.required) changes.push('required');
      if (!sameJson(previous.schema, next.schema)) changes.push('schema');
      return { path: next.path, changes, before: previous, after: next };
    },
  );
}

function collectSchemaFields(schema) {
  const fields = new Map();
  visitSchemaFields(schema, '', fields, new Set());
  return fields;
}

function visitSchemaFields(schema, parentPath, fields, ancestors) {
  if (!isObject(schema) || ancestors.has(schema)) return;
  const nextAncestors = new Set(ancestors).add(schema);
  const required = new Set(Array.isArray(schema.required) ? schema.required : []);
  if (isObject(schema.properties)) {
    for (const name of Object.keys(schema.properties).toSorted(compareText)) {
      const path = `${parentPath}/${escapePointer(name)}`;
      const fieldSchema = schema.properties[name];
      fields.set(path, { path, required: required.has(name), schema: fieldSchema });
      visitSchemaFields(fieldSchema, path, fields, nextAncestors);
    }
  }
  if (isObject(schema.items))
    visitSchemaFields(schema.items, `${parentPath}/*`, fields, nextAncestors);
  for (const keyword of ['allOf', 'anyOf', 'oneOf']) {
    if (!Array.isArray(schema[keyword])) continue;
    for (const nested of schema[keyword])
      visitSchemaFields(nested, parentPath, fields, nextAncestors);
  }
}

function compareOperationAuthentication(before, after) {
  if (sameJson(before, after)) return undefined;
  return {
    before,
    after,
    schemes: compareScopeSets(flattenOperationSecurity(before), flattenOperationSecurity(after)),
  };
}

function flattenOperationSecurity(requirements) {
  const scopes = new Map();
  for (const requirement of requirements) {
    for (const scheme of requirement.schemes) {
      const current = scopes.get(scheme.name) ?? new Set();
      for (const scope of scheme.scopes) current.add(scope);
      scopes.set(scheme.name, current);
    }
  }
  return new Map(
    [...scopes]
      .toSorted(([left], [right]) => compareText(left, right))
      .map(([name, values]) => [name, { name, scopes: [...values].toSorted(compareText) }]),
  );
}

function compareAuthenticationSchemes(beforeDocument, afterDocument) {
  return diffIndexed(
    extractAuthenticationSchemes(beforeDocument),
    extractAuthenticationSchemes(afterDocument),
    (entry) => entry,
    (before, after) => {
      if (sameJson(before, after)) return undefined;
      return {
        name: before.name,
        definition: { before: before.definition, after: after.definition },
        scopes: diffScopeDescriptions(before.scopes, after.scopes),
      };
    },
  );
}

function extractAuthenticationSchemes(document) {
  const source =
    isObject(document.components) && isObject(document.components.securitySchemes)
      ? document.components.securitySchemes
      : {};
  return new Map(
    Object.keys(source)
      .toSorted(compareText)
      .map((name) => {
        const definition = source[name];
        const scopes = [];
        if (isObject(definition) && isObject(definition.flows)) {
          for (const flowName of Object.keys(definition.flows).toSorted(compareText)) {
            const flow = definition.flows[flowName];
            if (!isObject(flow) || !isObject(flow.scopes)) continue;
            for (const scope of Object.keys(flow.scopes).toSorted(compareText)) {
              scopes.push({ flow: flowName, name: scope, description: flow.scopes[scope] });
            }
          }
        }
        return [name, { name, definition, scopes }];
      }),
  );
}

function compareScopeSets(before, after) {
  return diffIndexed(
    before,
    after,
    (entry) => entry,
    (previous, next) => {
      if (sameJson(previous.scopes, next.scopes)) return undefined;
      return {
        name: previous.name,
        scopes: diffStrings(previous.scopes, next.scopes),
      };
    },
  );
}

function diffScopeDescriptions(before, after) {
  const beforeMap = indexBy(before, ({ flow, name }) => `${flow}:${name}`);
  const afterMap = indexBy(after, ({ flow, name }) => `${flow}:${name}`);
  return diffIndexed(
    beforeMap,
    afterMap,
    (entry) => entry,
    (previous, next) =>
      previous.description === next.description
        ? undefined
        : {
            flow: next.flow,
            name: next.name,
            description: { before: previous.description, after: next.description },
          },
  );
}

function diffStrings(before, after) {
  const beforeSet = new Set(before);
  const afterSet = new Set(after);
  return {
    added: [...afterSet].filter((value) => !beforeSet.has(value)).toSorted(compareText),
    removed: [...beforeSet].filter((value) => !afterSet.has(value)).toSorted(compareText),
  };
}

function diffIndexed(before, after, project, compare) {
  const added = [];
  const removed = [];
  const changed = [];
  for (const key of [...new Set([...before.keys(), ...after.keys()])].toSorted(compareText)) {
    const previous = before.get(key);
    const next = after.get(key);
    if (previous === undefined) added.push(project(next));
    else if (next === undefined) removed.push(project(previous));
    else {
      const difference = compare(previous, next);
      if (difference !== undefined) changed.push(difference);
    }
  }
  return { added, removed, changed };
}

function summarizeChanges(changes) {
  const changedOperations = changes.operations.changed;
  const responseChanges = changedOperations.flatMap(({ responses }) => responses.changed);
  const contentChanges = responseChanges.flatMap(({ content }) =>
    content === undefined ? [] : content.changed,
  );
  const componentFieldChanges = changes.componentSchemas.changed.map(({ fields }) => fields);
  const responseFieldChanges = contentChanges.map(({ fields }) => fields);
  const summary = {
    authenticationChanged: changedOperations.filter(({ categories }) =>
      categories.includes('authentication'),
    ).length,
    authenticationSchemesAdded: changes.authenticationSchemes.added.length,
    authenticationSchemesChanged: changes.authenticationSchemes.changed.length,
    authenticationSchemesRemoved: changes.authenticationSchemes.removed.length,
    cacheChanged: changedOperations.filter(({ categories }) => categories.includes('cache')).length,
    componentFieldsAdded: countChanges(componentFieldChanges, 'added'),
    componentFieldsChanged: countChanges(componentFieldChanges, 'changed'),
    componentFieldsRemoved: countChanges(componentFieldChanges, 'removed'),
    componentSchemasAdded: changes.componentSchemas.added.length,
    componentSchemasChanged: changes.componentSchemas.changed.length,
    componentSchemasRemoved: changes.componentSchemas.removed.length,
    operationsAdded: changes.operations.added.length,
    operationsChanged: changedOperations.length,
    operationsRemoved: changes.operations.removed.length,
    paginationChanged: changedOperations.filter(({ categories }) =>
      categories.includes('pagination'),
    ).length,
    parametersAdded: countChanges(
      changedOperations.map(({ parameters }) => parameters),
      'added',
    ),
    parametersChanged: countChanges(
      changedOperations.map(({ parameters }) => parameters),
      'changed',
    ),
    parametersRemoved: countChanges(
      changedOperations.map(({ parameters }) => parameters),
      'removed',
    ),
    responseFieldsAdded: countChanges(responseFieldChanges, 'added'),
    responseFieldsChanged: countChanges(responseFieldChanges, 'changed'),
    responseFieldsRemoved: countChanges(responseFieldChanges, 'removed'),
    responsesAdded: countChanges(
      changedOperations.map(({ responses }) => responses),
      'added',
    ),
    responsesChanged: responseChanges.length,
    responsesRemoved: countChanges(
      changedOperations.map(({ responses }) => responses),
      'removed',
    ),
  };
  const totalChanges = Object.values(summary).reduce((total, value) => total + value, 0);
  return { hasChanges: totalChanges > 0, totalChanges, ...summary };
}

function countChanges(groups, kind) {
  return groups.reduce((total, group) => total + group[kind].length, 0);
}

function versionDescription(version, source) {
  const appliedIds = [...version.corrections].toSorted(compareText);
  return {
    compatibilityDate: version.compatibilityDate,
    sha256: version.sha256,
    sourceSha256: version.sourceSha256,
    specificationUrl: version.specificationUrl,
    source,
    comparison:
      source === 'upstream-staged' ? 'upstream-with-applicable-corrections' : 'committed-corrected',
    corrections: {
      policy: correctionPolicy,
      applied: appliedIds.length > 0,
      appliedIds,
    },
  };
}

function assertSafeOutputPath(root, outputPath) {
  const protectedTargets = Object.values(generatedPaths).flat();
  for (const target of protectedTargets) {
    if (isPathInside(outputPath, resolve(root, target))) {
      throw new Error(`Drift report output cannot overwrite generated path: ${target}`);
    }
  }
}

function isPathInside(path, parent) {
  const pathFromParent = relative(parent, path);
  return (
    pathFromParent === '' ||
    (!isAbsolute(pathFromParent) &&
      pathFromParent !== '..' &&
      !pathFromParent.startsWith(`..${sep}`))
  );
}

function responseContract(response) {
  return {
    status: response.status,
    noContent: response.noContent,
    content: response.content.map(mediaContract),
    headers: response.headers.map(({ name, schema }) => ({ name, schema })),
  };
}

function mediaContract(media) {
  return {
    mediaType: media.mediaType,
    schema: media.schema,
    fields: [...collectSchemaFields(media.schema).values()],
  };
}

function parameterContract(parameter) {
  return {
    name: parameter.name,
    placement: parameter.placement,
    required: parameter.required,
    schema: parameter.schema,
  };
}

function operationIdentity(operation) {
  return { operationId: operation.operationId, path: operation.path, method: operation.method };
}

function parameterKey(parameter) {
  const name = parameter.placement === 'header' ? parameter.name.toLowerCase() : parameter.name;
  return `${parameter.placement}:${name}`;
}

function recordScalarChange(target, category, before, after) {
  if (before === after) return;
  target.categories.push(category);
  target[category] = { before, after };
}

function recordObjectChange(target, category, before, after) {
  if (sameJson(before, after)) return;
  target.categories.push(category);
  target[category] = { before, after };
}

function hasDiff(value) {
  return value.added.length > 0 || value.removed.length > 0 || value.changed.length > 0;
}

function groupBy(values, keyOf) {
  const groups = new Map();
  for (const value of values) {
    const key = keyOf(value);
    const group = groups.get(key) ?? [];
    group.push(value);
    groups.set(key, group);
  }
  return groups;
}

function indexBy(values, keyOf) {
  return new Map([...values].map((value) => [keyOf(value), value]));
}

function compareNamedPlacement(left, right) {
  return (
    compareText(left.name, right.name) || compareText(left.placement ?? '', right.placement ?? '')
  );
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function sameJson(left, right) {
  return stableJson(left) === stableJson(right);
}

function stableJson(value) {
  return JSON.stringify(sortJsonValue(value));
}

function serializeJson(value) {
  return `${JSON.stringify(sortJsonValue(value), null, 2)}\n`;
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

function escapePointer(value) {
  return value.replaceAll('~', '~0').replaceAll('/', '~1');
}

function sha256(value) {
  return createHash('sha256').update(value).digest('hex');
}

function assertPinnedInput(provenance, compatibilityDate, source) {
  if (
    !isObject(provenance) ||
    provenance.compatibilityDate !== compatibilityDate ||
    provenance.sha256 !== sha256(source) ||
    !Array.isArray(provenance.appliedCorrections) ||
    typeof provenance.sourceSha256 !== 'string' ||
    typeof provenance.specificationUrl !== 'string'
  ) {
    throw new Error('Committed corrected OpenAPI snapshot provenance is inconsistent');
  }
}

function deepFreeze(value) {
  if (value !== null && typeof value === 'object' && !Object.isFrozen(value)) {
    Object.freeze(value);
    for (const entry of Object.values(value)) deepFreeze(entry);
  }
  return value;
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function isCompatibilityDate(value) {
  if (typeof value !== 'string' || !/^\d{4}-\d{2}-\d{2}$/.test(value)) return false;
  const date = new Date(`${value}T00:00:00.000Z`);
  return !Number.isNaN(date.valueOf()) && date.toISOString().slice(0, 10) === value;
}

function parseArguments(arguments_) {
  const options = {};
  for (let index = 0; index < arguments_.length; index += 1) {
    const argument = arguments_[index];
    const value = arguments_[index + 1];
    if (!['--date', '--output', '--url'].includes(argument) || value === undefined) {
      throw new Error(`Usage: pnpm drift:report [--date YYYY-MM-DD] [--output path] [--url URL]`);
    }
    if (argument === '--date') options.latestCompatibilityDate = value;
    else if (argument === '--output') options.outputPath = value;
    else options.specificationUrl = value;
    index += 1;
  }
  return options;
}

const entryPath = process.argv[1];
if (entryPath !== undefined && import.meta.url === pathToFileURL(resolve(entryPath)).href) {
  const options = parseArguments(process.argv.slice(2));
  const report = await reportSpecificationDrift(options);
  if (options.outputPath === undefined)
    process.stdout.write(renderSpecificationDriftReport(report));
}
