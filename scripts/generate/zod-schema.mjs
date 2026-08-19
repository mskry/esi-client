import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createProvenanceHeader, renderGeneratedBarrel } from './artifacts.mjs';
import { isTransportManagedParameter } from './operation-parameters.mjs';

const identifierPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/u;
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
const supportedKeywords = new Set([
  '$ref',
  'additionalProperties',
  'allOf',
  'anyOf',
  'const',
  'enum',
  'exclusiveMaximum',
  'exclusiveMinimum',
  'format',
  'items',
  'maximum',
  'maxItems',
  'maxLength',
  'minimum',
  'minItems',
  'minLength',
  'multipleOf',
  'nullable',
  'oneOf',
  'pattern',
  'properties',
  'required',
  'type',
  'uniqueItems',
  ...annotationKeywords,
]);
const numericKeywords = [
  'exclusiveMaximum',
  'exclusiveMinimum',
  'maximum',
  'minimum',
  'multipleOf',
];
const stringKeywords = ['maxLength', 'minLength', 'pattern'];
const arrayKeywords = ['items', 'maxItems', 'minItems', 'uniqueItems'];
const objectKeywords = ['additionalProperties', 'properties', 'required'];
const ignoredReferenceValueKeywords = new Set(['const', 'default', 'enum', 'example', 'examples']);

export class ZodSchemaEmissionError extends Error {
  constructor(message, path) {
    super(`${message} at ${path}`);
    this.name = 'ZodSchemaEmissionError';
    this.path = path;
  }
}

export function emitZodSchemaExpression(schema, options = {}) {
  if (!isObject(options)) throw new TypeError('Zod schema emission options must be an object');
  const path = options.path ?? '#';
  if (typeof path !== 'string' || path.length === 0) {
    throw new TypeError('Zod schema emission path must be a non-empty string');
  }
  const references = normalizeReferenceNames(options.references ?? {}, path);
  return emitSchema(schema, path, { helpers: new Set(), references });
}

export function renderZodSchemaModule(models, provenance) {
  return renderZodModelSchemaModule(models, provenance);
}

export function createSchemaDependencyModel(models, operations, operationMetadata = []) {
  if (!Array.isArray(models)) throw new TypeError('Normalized models must be an array');
  if (!Array.isArray(operations)) throw new TypeError('Normalized operations must be an array');
  if (!Array.isArray(operationMetadata)) {
    throw new TypeError('Resolved operation metadata must be an array');
  }

  const { modelsByName, modelsByPointer } = indexModels(models);
  const directByName = new Map();
  for (const model of modelsByName.values()) {
    directByName.set(
      model.name,
      resolveSchemaReferences(model.schema, model.pointer, modelsByPointer).map(
        ({ model: dependency }) => dependency.name,
      ),
    );
  }

  const closures = new Map();
  const active = [];
  function modelClosure(name) {
    const existing = closures.get(name);
    if (existing !== undefined) return existing;
    const cycleStart = active.indexOf(name);
    if (cycleStart >= 0) {
      throw new ZodSchemaEmissionError(
        `Recursive component references are unsupported: ${[...active.slice(cycleStart), name].join(' -> ')}`,
        modelsByName.get(name)?.pointer ?? '#/components/schemas',
      );
    }
    active.push(name);
    const closure = new Set();
    for (const dependency of directByName.get(name) ?? []) {
      closure.add(dependency);
      for (const transitive of modelClosure(dependency)) closure.add(transitive);
    }
    active.pop();
    const result = [...closure].toSorted(compareText);
    closures.set(name, result);
    return result;
  }

  const modelEntries = [...modelsByName.values()]
    .toSorted((left, right) => compareText(left.name, right.name))
    .map((model) => ({
      dependencies: Object.freeze(modelClosure(model.name)),
      directDependencies: Object.freeze(
        [...(directByName.get(model.name) ?? [])].toSorted(compareText),
      ),
      fileName: schemaFileName(model.name),
      model,
    }));
  assertUniqueFileNames(modelEntries, 'model');

  const metadataById = new Map();
  for (const metadata of operationMetadata) {
    if (
      !isObject(metadata) ||
      typeof metadata.operationId !== 'string' ||
      typeof metadata.domain !== 'string'
    ) {
      throw new TypeError('Resolved operation metadata entry is invalid');
    }
    if (metadataById.has(metadata.operationId)) {
      throw new Error(`Duplicate resolved operation metadata: ${metadata.operationId}`);
    }
    metadataById.set(metadata.operationId, metadata);
  }

  const operationNames = new Map();
  const operationEntries = operations
    .map((operation, index) => {
      if (!isObject(operation) || typeof operation.operationId !== 'string') {
        throw new ZodSchemaEmissionError(
          'Operation must contain an operation ID',
          `operations/${index}`,
        );
      }
      const schemaName = operationSchemaName(operation.operationId);
      const previous = operationNames.get(schemaName);
      if (previous !== undefined) {
        throw new ZodSchemaEmissionError(
          `Operation schema name collision ${schemaName}: ${previous} and ${operation.operationId}`,
          `operations/${index}`,
        );
      }
      operationNames.set(schemaName, operation.operationId);
      const direct = resolveOperationReferences(operation, modelsByPointer);
      const dependencies = new Set();
      for (const dependency of direct) {
        dependencies.add(dependency.name);
        for (const transitive of modelClosure(dependency.name)) dependencies.add(transitive);
      }
      const metadata = metadataById.get(operation.operationId);
      if (operationMetadata.length > 0 && metadata === undefined) {
        throw new Error(`Missing resolved operation metadata: ${operation.operationId}`);
      }
      return {
        dependencies: Object.freeze([...dependencies].toSorted(compareText)),
        directDependencies: Object.freeze(direct.map(({ name }) => name).toSorted(compareText)),
        domain: metadata?.domain ?? null,
        operation,
      };
    })
    .toSorted((left, right) =>
      compareText(left.operation.operationId, right.operation.operationId),
    );
  if (operationMetadata.length > 0 && metadataById.size !== operationEntries.length) {
    const operationIds = new Set(operationEntries.map(({ operation }) => operation.operationId));
    const stale = [...metadataById.keys()].filter((operationId) => !operationIds.has(operationId));
    throw new Error(`Stale resolved operation metadata: ${stale.toSorted(compareText).join(', ')}`);
  }

  const domainsByName = new Map();
  for (const entry of operationEntries) {
    if (entry.domain === null) continue;
    const domain = domainsByName.get(entry.domain) ?? { dependencies: new Set(), operations: [] };
    domain.operations.push(entry.operation);
    for (const dependency of entry.dependencies) domain.dependencies.add(dependency);
    domainsByName.set(entry.domain, domain);
  }
  const domains = [...domainsByName]
    .toSorted(([left], [right]) => compareText(left, right))
    .map(([domain, entry]) => ({
      dependencies: Object.freeze([...entry.dependencies].toSorted(compareText)),
      domain,
      fileName: schemaFileName(domain),
      operations: Object.freeze(
        entry.operations.toSorted((left, right) =>
          compareText(left.operationId, right.operationId),
        ),
      ),
    }));
  assertUniqueFileNames(domains, 'operation schema domain');

  return Object.freeze({
    domains: Object.freeze(domains),
    models: Object.freeze(modelEntries),
    operations: Object.freeze(operationEntries),
  });
}

export function renderZodModelSchemaModule(models, provenance) {
  if (!Array.isArray(models)) throw new TypeError('Normalized models must be an array');

  const { modelsByName, modelsByPointer } = indexModels(models);

  const references = Object.fromEntries(
    [...modelsByPointer]
      .toSorted(([left], [right]) => compareText(left, right))
      .map(([pointer, model]) => [pointer, `${model.name}Schema`]),
  );
  const typeReferences = Object.fromEntries(
    [...modelsByPointer]
      .toSorted(([left], [right]) => compareText(left, right))
      .map(([pointer, model]) => [pointer, { input: `${model.name}Input`, output: model.name }]),
  );
  const dependencies = new Map();
  for (const model of modelsByName.values()) {
    const found = [];
    collectReferences(model.schema, model.pointer, found);
    const resolved = found.map(({ path, reference }) => {
      const target = modelsByPointer.get(reference);
      if (target === undefined) {
        throw new ZodSchemaEmissionError(
          `Unresolved local component reference ${JSON.stringify(reference)}`,
          path,
        );
      }
      return { name: target.name, path };
    });
    dependencies.set(
      model.name,
      resolved.toSorted((left, right) => compareText(left.name, right.name)),
    );
  }

  const orderedModels = topologicallyOrderModels(modelsByName, dependencies);
  const state = { helpers: new Set(), references: normalizeReferenceNames(references, '#') };
  const typeState = { references: normalizeTypeReferenceNames(typeReferences, '#') };
  const declarations = orderedModels.map((model) => {
    const expression = emitSchema(model.schema, model.pointer, state);
    const input = emitSchemaType(model.schema, model.pointer, typeState, 'input');
    const output = emitSchemaType(model.schema, model.pointer, typeState, 'output');
    return `type ${model.name}SchemaInput = ${input};
type ${model.name}SchemaOutput = ${output};

export const ${model.name}Schema: z.ZodType<${model.name}SchemaOutput, ${model.name}SchemaInput> = ${expression};
export type ${model.name}Input = z.input<typeof ${model.name}Schema>;
export type ${model.name} = z.output<typeof ${model.name}Schema>;

type ${model.name}InputAssertion = Assert<IsExact<${model.name}Input, ${model.name}SchemaInput>>;
type ${model.name}OutputAssertion = Assert<IsExact<${model.name}, ${model.name}SchemaOutput>>;`;
  });
  const helperSource = state.helpers.has('unique-array') ? renderUniqueArrayHelper() : '';
  const body = [
    "import { z } from 'zod';",
    renderTypeAssertionHelpers(),
    helperSource,
    ...declarations,
  ]
    .filter((section) => section.length > 0)
    .join('\n\n');
  return `${createProvenanceHeader(provenance, 'typescript')}\n${body}\n`;
}

export function renderZodModelDependencyModule(model, models, provenance) {
  if (!isObject(model)) throw new TypeError('Normalized model must be an object');
  const dependencyModel = createSchemaDependencyModel(models, [], []);
  const entry = dependencyModel.models.find(
    (candidate) => candidate.model.pointer === model.pointer,
  );
  if (entry === undefined) throw new Error(`Unknown normalized model: ${String(model.name)}`);
  const { modelsByPointer } = indexModels(models);
  const references = Object.fromEntries(
    [...modelsByPointer].map(([pointer, candidate]) => [pointer, `${candidate.name}Schema`]),
  );
  const typeReferences = Object.fromEntries(
    [...modelsByPointer].map(([pointer, candidate]) => [
      pointer,
      { input: `${candidate.name}Input`, output: candidate.name },
    ]),
  );
  const state = { helpers: new Set(), references: normalizeReferenceNames(references, '#') };
  const typeState = { references: normalizeTypeReferenceNames(typeReferences, '#') };
  const expression = emitSchema(model.schema, model.pointer, state);
  const input = emitSchemaType(model.schema, model.pointer, typeState, 'input');
  const output = emitSchemaType(model.schema, model.pointer, typeState, 'output');
  const imports = entry.directDependencies.map((name) => {
    const dependency = dependencyModel.models.find((candidate) => candidate.model.name === name);
    if (dependency === undefined) throw new Error(`Unresolved model dependency: ${name}`);
    return `import {\n  ${name}Schema,\n  type ${name},\n  type ${name}Input,\n} from './${dependency.fileName}.js';`;
  });
  const helperSource = state.helpers.has('unique-array') ? renderUniqueArrayHelper() : '';
  const body = [
    "import { z } from 'zod';",
    ...imports,
    renderTypeAssertionHelpers(),
    helperSource,
    `type ${model.name}SchemaInput = ${input};
type ${model.name}SchemaOutput = ${output};

export const ${model.name}Schema: z.ZodType<${model.name}SchemaOutput, ${model.name}SchemaInput> = ${expression};
export type ${model.name}Input = z.input<typeof ${model.name}Schema>;
export type ${model.name} = z.output<typeof ${model.name}Schema>;

type ${model.name}InputAssertion = Assert<IsExact<${model.name}Input, ${model.name}SchemaInput>>;
type ${model.name}OutputAssertion = Assert<IsExact<${model.name}, ${model.name}SchemaOutput>>;`,
  ]
    .filter((section) => section.length > 0)
    .join('\n\n');
  return `${createProvenanceHeader(provenance, 'typescript')}\n${body}\n`;
}

export function renderZodOperationSchemaModule(
  operations,
  models,
  provenance,
  modelModulePrefix = './models',
) {
  if (!Array.isArray(operations)) throw new TypeError('Normalized operations must be an array');
  if (!Array.isArray(models)) throw new TypeError('Normalized models must be an array');

  const { modelsByPointer } = indexModels(models);
  const usedModels = resolveOperationsModelClosure(operations, models);
  const usedPointers = new Set(usedModels.map(({ pointer }) => pointer));
  const references = Object.fromEntries(
    [...modelsByPointer]
      .filter(([pointer]) => usedPointers.has(pointer))
      .toSorted(([left], [right]) => compareText(left, right))
      .map(([pointer, model]) => [pointer, `${model.name}Schema`]),
  );
  const typeReferences = Object.fromEntries(
    [...modelsByPointer]
      .filter(([pointer]) => usedPointers.has(pointer))
      .toSorted(([left], [right]) => compareText(left, right))
      .map(([pointer, model]) => [pointer, { input: `${model.name}Input`, output: model.name }]),
  );
  const operationNames = new Map();
  const operationsById = new Map();
  for (const [index, operation] of operations.entries()) {
    const path = `operations/${index}`;
    if (!isObject(operation)) throw new ZodSchemaEmissionError('Operation must be an object', path);
    if (
      typeof operation.operationId !== 'string' ||
      operation.operationId.length === 0 ||
      operation.operationId.trim() !== operation.operationId
    ) {
      throw new ZodSchemaEmissionError('Operation ID must be a non-empty trimmed string', path);
    }
    if (operationsById.has(operation.operationId)) {
      throw new ZodSchemaEmissionError(`Duplicate operation ID ${operation.operationId}`, path);
    }
    const schemaName = operationSchemaName(operation.operationId);
    const collidingOperation = operationNames.get(schemaName);
    if (collidingOperation !== undefined) {
      throw new ZodSchemaEmissionError(
        `Operation schema name collision ${schemaName}: ${collidingOperation} and ${operation.operationId}`,
        path,
      );
    }
    operationNames.set(schemaName, operation.operationId);
    operationsById.set(operation.operationId, operation);
  }

  const state = { helpers: new Set(), references: normalizeReferenceNames(references, '#') };
  const typeState = { references: normalizeTypeReferenceNames(typeReferences, '#') };
  const declarations = [];
  for (const operation of [...operationsById.values()].toSorted((left, right) =>
    compareText(left.operationId, right.operationId),
  )) {
    const name = operationSchemaName(operation.operationId);
    const path = `operations/${escapePointerSegment(operation.operationId)}`;
    const requestExpression = emitOperationRequestSchema(operation, path, state);
    const requestInput = emitOperationRequestType(operation, path, typeState, 'input');
    const requestOutput = emitOperationRequestType(operation, path, typeState, 'output');
    declarations.push(`type ${name}RequestSchemaInput = ${requestInput};
type ${name}RequestSchemaOutput = ${requestOutput};

export const ${name}RequestSchema: z.ZodType<${name}RequestSchemaOutput, ${name}RequestSchemaInput> = ${requestExpression};`);
    declarations.push(...emitOperationResponseSchemas(operation, name, path, state, typeState));
    declarations.push(`export type ${name}Input = z.input<typeof ${name}RequestSchema>;
export type ${name}Output = z.output<typeof ${name}SuccessResponseSchema>;

type ${name}InputAssertion = Assert<IsExact<${name}Input, ${name}RequestSchemaInput>>;
type ${name}OutputAssertion = Assert<IsExact<${name}Output, ${name}SuccessResponseSchemaOutput>>;`);
  }

  const imports = usedModels.map(({ name }) => `${name}Schema`).toSorted(compareText);
  const modelImport =
    imports.length === 0
      ? ''
      : modelModulePrefix.endsWith('/')
        ? imports
            .map((name) => {
              const typeName = name.slice(0, -'Schema'.length);
              return `import {\n  ${name},\n  type ${typeName},\n  type ${typeName}Input,\n} from '${modelModulePrefix}${schemaFileName(typeName)}.js';`;
            })
            .join('\n')
        : `import {\n${imports
            .flatMap((name) => [
              `  ${name},`,
              `  type ${name.slice(0, -'Schema'.length)},`,
              `  type ${name.slice(0, -'Schema'.length)}Input,`,
            ])
            .join('\n')}\n} from '${modelModulePrefix}.js';`;
  const helperSource = state.helpers.has('unique-array') ? renderUniqueArrayHelper() : '';
  const body = [
    "import { z } from 'zod';",
    modelImport,
    renderTypeAssertionHelpers(),
    helperSource,
    ...declarations,
  ]
    .filter((section) => section.length > 0)
    .join('\n\n');
  return `${createProvenanceHeader(provenance, 'typescript')}\n${body}\n`;
}

export function renderZodSchemaContractsModule(operations, operationMetadata, provenance) {
  if (!Array.isArray(operations)) throw new TypeError('Normalized operations must be an array');
  if (!Array.isArray(operationMetadata)) {
    throw new TypeError('Resolved operation metadata must be an array');
  }

  const operationsById = new Map(operations.map((operation) => [operation.operationId, operation]));
  const metadataById = new Map();
  for (const metadata of operationMetadata) {
    if (!isObject(metadata) || typeof metadata.operationId !== 'string') {
      throw new TypeError('Resolved operation metadata entry must contain an operation ID');
    }
    if (metadataById.has(metadata.operationId)) {
      throw new Error(`Duplicate resolved operation metadata: ${metadata.operationId}`);
    }
    if (!operationsById.has(metadata.operationId)) {
      throw new Error(`Stale resolved operation metadata: ${metadata.operationId}`);
    }
    metadataById.set(metadata.operationId, metadata);
  }
  if (metadataById.size !== operationsById.size) {
    throw new Error('Resolved operation metadata does not cover every operation schema');
  }

  const orderedMetadata = [...metadataById.values()].toSorted((left, right) =>
    compareText(left.operationId, right.operationId),
  );
  const importedTypes = orderedMetadata.flatMap(({ operationId }) => {
    const name = operationSchemaName(operationId);
    return [`${name}Input`, `${name}Output`];
  });
  const operationLines = orderedMetadata.map(({ operationId }) => {
    const name = operationSchemaName(operationId);
    return `  readonly ${JSON.stringify(operationId)}: OperationTypeContract<${name}Input, ${name}Output>;`;
  });
  const domains = new Map();
  for (const metadata of orderedMetadata) {
    const methods = domains.get(metadata.domain) ?? [];
    methods.push(metadata);
    domains.set(metadata.domain, methods);
  }
  const domainLines = [...domains]
    .toSorted(([left], [right]) => compareText(left, right))
    .map(
      ([domain, entries]) => `  readonly ${JSON.stringify(domain)}: {
${entries
  .toSorted((left, right) => compareText(left.method, right.method))
  .map(
    ({ method, operationId }) =>
      `    readonly ${JSON.stringify(method)}: GeneratedOperationSignatures[${JSON.stringify(operationId)}];`,
  )
  .join('\n')}
  };`,
    );
  const typeImport =
    importedTypes.length === 0
      ? ''
      : `import type {\n  ${importedTypes.toSorted(compareText).join(',\n  ')},\n} from './operations.js';`;
  const body = [
    typeImport,
    `export interface OperationTypeContract<Input, Output> {
  readonly input: Input;
  readonly output: Output;
}`,
    `export interface GeneratedOperationSignatures {
${operationLines.join('\n')}
}`,
    `export interface GeneratedDomainSignatures {
${domainLines.join('\n')}
}`,
    `export type AssertGeneratedOperationSignatures<
  Actual extends GeneratedOperationSignatures,
> = Actual;

export type AssertGeneratedOperationSignature<
  OperationId extends keyof GeneratedOperationSignatures,
  Actual extends GeneratedOperationSignatures[OperationId],
> = Actual;

export type AssertGeneratedDomainSignatures<Actual extends GeneratedDomainSignatures> = Actual;

export type AssertGeneratedDomainSignature<
  Domain extends keyof GeneratedDomainSignatures,
  Method extends keyof GeneratedDomainSignatures[Domain],
  Actual extends GeneratedDomainSignatures[Domain][Method],
> = Actual;`,
  ]
    .filter((section) => section.length > 0)
    .join('\n\n');
  return `${createProvenanceHeader(provenance, 'typescript')}\n${body}\n`;
}

export async function emitZodSchemaSource(context, sourceDirectory) {
  if (!isObject(context) || !isObject(context.normalizedModel)) {
    throw new TypeError('Zod schema source context must contain a normalized model');
  }
  if (typeof sourceDirectory !== 'string' || sourceDirectory.length === 0) {
    throw new TypeError('Zod schema source directory must be a non-empty string');
  }
  const schemaDirectory = join(sourceDirectory, 'schemas');
  const modelDirectory = join(schemaDirectory, 'models');
  const operationDirectory = join(schemaDirectory, 'operations');
  await Promise.all([
    mkdir(modelDirectory, { recursive: true }),
    mkdir(operationDirectory, { recursive: true }),
  ]);
  const dependencyModel = createSchemaDependencyModel(
    context.normalizedModel.models,
    context.normalizedModel.operations,
    context.operationMetadata,
  );
  const writes = [
    writeFile(
      join(schemaDirectory, 'models.ts'),
      renderGeneratedBarrel(
        dependencyModel.models.map(({ fileName }) => `./models/${fileName}.js`),
        context.provenance,
      ),
    ),
    writeFile(
      join(schemaDirectory, 'operations.ts'),
      renderGeneratedBarrel(
        dependencyModel.domains.map(({ fileName }) => `./operations/${fileName}.js`),
        context.provenance,
      ),
    ),
    writeFile(
      join(schemaDirectory, 'contracts.ts'),
      renderZodSchemaContractsModule(
        context.normalizedModel.operations,
        context.operationMetadata,
        context.provenance,
      ),
    ),
    writeFile(
      join(schemaDirectory, 'index.ts'),
      renderGeneratedBarrel(
        ['./contracts.js', './models.js', './operations.js'],
        context.provenance,
      ),
    ),
  ];
  const outputs = [
    'schemas/contracts.ts',
    'schemas/index.ts',
    'schemas/models.ts',
    'schemas/operations.ts',
  ];
  for (const entry of dependencyModel.models) {
    const path = `schemas/models/${entry.fileName}.ts`;
    outputs.push(path);
    writes.push(
      writeFile(
        join(sourceDirectory, path),
        renderZodModelDependencyModule(
          entry.model,
          context.normalizedModel.models,
          context.provenance,
        ),
      ),
    );
  }
  for (const entry of dependencyModel.domains) {
    const path = `schemas/operations/${entry.fileName}.ts`;
    outputs.push(path);
    writes.push(
      writeFile(
        join(sourceDirectory, path),
        renderZodOperationSchemaModule(
          entry.operations,
          context.normalizedModel.models,
          context.provenance,
          '../models/',
        ),
      ),
    );
  }
  validateGranularSchemaExports(dependencyModel);
  await Promise.all(writes);
  return outputs.toSorted(compareText);
}

export const zodSchemaSourceComponent = Object.freeze({
  name: 'zod-schemas',
  emit: emitZodSchemaSource,
});

function emitOperationRequestSchema(operation, path, state) {
  if (!Array.isArray(operation.parameters)) {
    throw new ZodSchemaEmissionError(
      'Operation parameters must be an array',
      joinPointer(path, 'parameters'),
    );
  }
  const properties = [];
  for (const placement of ['path', 'query', 'header', 'cookie']) {
    const parameters = operation.parameters.filter(
      (parameter) => parameter.placement === placement && !isTransportManagedParameter(parameter),
    );
    if (parameters.length === 0) continue;
    const seen = new Set();
    const fields = parameters
      .toSorted((left, right) => compareText(left.name, right.name))
      .map((parameter) => {
        if (
          !isObject(parameter) ||
          typeof parameter.name !== 'string' ||
          parameter.name.length === 0
        ) {
          throw new ZodSchemaEmissionError(
            'Operation parameter must have a non-empty name',
            joinPointer(path, 'parameters'),
          );
        }
        if (seen.has(parameter.name)) {
          throw new ZodSchemaEmissionError(
            `Duplicate ${placement} parameter ${parameter.name}`,
            joinPointer(path, 'parameters'),
          );
        }
        seen.add(parameter.name);
        let expression = emitSchema(
          parameter.schema,
          joinPointer(joinPointer(path, 'parameters'), `${placement}:${parameter.name}`),
          state,
        );
        if (parameter.required !== true) expression += '.optional()';
        return `    ${JSON.stringify(parameter.name)}: ${expression},`;
      });
    let group = `z.strictObject({\n${fields.join('\n')}\n  })`;
    if (!parameters.some(({ required }) => required === true)) group += '.optional()';
    properties.push(`  ${JSON.stringify(placement)}: ${group},`);
  }

  if (operation.requestBody !== null && operation.requestBody !== undefined) {
    if (!isObject(operation.requestBody)) {
      throw new ZodSchemaEmissionError(
        'Request body must be an object or null',
        joinPointer(path, 'requestBody'),
      );
    }
    const content = selectJsonContent(
      operation.requestBody.content,
      joinPointer(joinPointer(path, 'requestBody'), 'content'),
    );
    let body = emitSchema(
      content.schema,
      joinPointer(joinPointer(joinPointer(path, 'requestBody'), 'content'), content.mediaType),
      state,
    );
    if (operation.requestBody.required !== true) body += '.optional()';
    properties.push(`  "body": ${body},`);
  }

  return `z.strictObject({${properties.length === 0 ? '' : `\n${properties.join('\n')}\n`}})`;
}

function emitOperationRequestType(operation, path, state, direction) {
  const properties = [];
  for (const placement of ['path', 'query', 'header', 'cookie']) {
    const parameters = operation.parameters.filter(
      (parameter) => parameter.placement === placement && !isTransportManagedParameter(parameter),
    );
    if (parameters.length === 0) continue;
    const fields = parameters
      .toSorted((left, right) => compareText(left.name, right.name))
      .map((parameter) => {
        const type = emitSchemaType(
          parameter.schema,
          joinPointer(joinPointer(path, 'parameters'), `${placement}:${parameter.name}`),
          state,
          direction,
        );
        return `    ${JSON.stringify(parameter.name)}${parameter.required === true ? '' : '?'}: ${type}${parameter.required === true ? '' : ' | undefined'};`;
      });
    const optional = parameters.some(({ required }) => required === true) ? '' : '?';
    properties.push(
      `  ${JSON.stringify(placement)}${optional}: {\n${fields.join('\n')}\n  }${optional ? ' | undefined' : ''};`,
    );
  }
  if (operation.requestBody !== null && operation.requestBody !== undefined) {
    const content = selectJsonContent(
      operation.requestBody.content,
      joinPointer(joinPointer(path, 'requestBody'), 'content'),
    );
    const type = emitSchemaType(
      content.schema,
      joinPointer(joinPointer(joinPointer(path, 'requestBody'), 'content'), content.mediaType),
      state,
      direction,
    );
    const optional = operation.requestBody.required === true ? '' : '?';
    properties.push(`  "body"${optional}: ${type}${optional ? ' | undefined' : ''};`);
  }
  return `{${properties.length === 0 ? '' : `\n${properties.join('\n')}\n`}}`;
}

function emitOperationResponseSchemas(operation, name, path, state, typeState) {
  if (!Array.isArray(operation.successResponses) || operation.successResponses.length === 0) {
    throw new ZodSchemaEmissionError(
      'Operation must have at least one success response',
      joinPointer(path, 'successResponses'),
    );
  }

  const responses = operation.successResponses.toSorted((left, right) =>
    compareStatusCodes(left.status, right.status),
  );
  const seenStatuses = new Set();
  const emitted = responses.map((response, index) => {
    const responsePath = joinPointer(joinPointer(path, 'successResponses'), index);
    if (
      !isObject(response) ||
      typeof response.status !== 'string' ||
      !/^2(?:\d{2}|XX)$/u.test(response.status)
    ) {
      throw new ZodSchemaEmissionError('Invalid success response status', responsePath);
    }
    if (seenStatuses.has(response.status)) {
      throw new ZodSchemaEmissionError(
        `Duplicate success response status ${response.status}`,
        responsePath,
      );
    }
    seenStatuses.add(response.status);
    if (response.status !== '2XX' && seenStatuses.has('2XX')) {
      throw new ZodSchemaEmissionError(
        `Success response status ${response.status} overlaps 2XX`,
        responsePath,
      );
    }
    if (response.status === '2XX' && seenStatuses.size > 1) {
      throw new ZodSchemaEmissionError(
        'Success response status 2XX overlaps an exact status',
        responsePath,
      );
    }

    let expression;
    let signature;
    let inputType;
    let outputType;
    if (response.noContent === true) {
      if (!Array.isArray(response.content) || response.content.length !== 0) {
        throw new ZodSchemaEmissionError(
          'No-content success response must not declare content',
          joinPointer(responsePath, 'content'),
        );
      }
      expression = 'z.undefined()';
      signature = 'undefined';
      inputType = 'undefined';
      outputType = 'undefined';
    } else {
      const content = selectJsonContent(response.content, joinPointer(responsePath, 'content'));
      expression = emitSchema(
        content.schema,
        joinPointer(joinPointer(responsePath, 'content'), content.mediaType),
        state,
      );
      signature = canonicalSchemaJson(content.schema);
      inputType = emitSchemaType(
        content.schema,
        joinPointer(joinPointer(responsePath, 'content'), content.mediaType),
        typeState,
        'input',
      );
      outputType = emitSchemaType(
        content.schema,
        joinPointer(joinPointer(responsePath, 'content'), content.mediaType),
        typeState,
        'output',
      );
    }
    const declarationName = `${name}Status${statusIdentifier(response.status)}SuccessResponseSchema`;
    return { declarationName, expression, inputType, outputType, response, signature };
  });

  const declarations = emitted.map(
    ({ declarationName, expression, inputType, outputType }) =>
      `export const ${declarationName}: z.ZodType<${outputType}, ${inputType}> = ${expression};`,
  );
  declarations.push(
    `export const ${name}SuccessResponseSchemasByStatus: Readonly<{\n${emitted
      .map(
        ({ declarationName, response }) =>
          `  ${JSON.stringify(response.status)}: typeof ${declarationName};`,
      )
      .join('\n')}\n}> = {\n${emitted
      .map(
        ({ declarationName, response }) =>
          `  ${JSON.stringify(response.status)}: ${declarationName},`,
      )
      .join('\n')}\n};`,
  );
  const uniqueSignatures = new Set(emitted.map(({ signature }) => signature));
  const aggregateInput = [...new Set(emitted.map(({ inputType }) => inputType))].join(' | ');
  const aggregateOutput = [...new Set(emitted.map(({ outputType }) => outputType))].join(' | ');
  const aggregate =
    uniqueSignatures.size === 1
      ? emitted[0].declarationName
      : `z.union([${emitted.map(({ declarationName }) => declarationName).join(', ')}])`;
  declarations.push(`type ${name}SuccessResponseSchemaInput = ${aggregateInput};
type ${name}SuccessResponseSchemaOutput = ${aggregateOutput};

export const ${name}SuccessResponseSchema: z.ZodType<${name}SuccessResponseSchemaOutput, ${name}SuccessResponseSchemaInput> = ${aggregate};`);
  return declarations;
}

function selectJsonContent(content, path) {
  if (!Array.isArray(content) || content.length === 0) {
    throw new ZodSchemaEmissionError('Content must contain a JSON representation', path);
  }
  const jsonContent = content
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
    });
  if (jsonContent.length === 0) {
    throw new ZodSchemaEmissionError('Content has no JSON representation', path);
  }
  const signatures = new Set(jsonContent.map(({ schema }) => canonicalSchemaJson(schema)));
  if (signatures.size !== 1) {
    throw new ZodSchemaEmissionError(
      `JSON representations have incompatible schemas: ${jsonContent
        .map(({ mediaType }) => mediaType)
        .join(', ')}`,
      path,
    );
  }
  return jsonContent[0];
}

export function operationSchemaName(operationId) {
  const words = operationId
    .replaceAll(/([a-z0-9])([A-Z])/gu, '$1 $2')
    .split(/[^A-Za-z0-9]+/u)
    .filter(Boolean);
  let identifier = words
    .map((word) => `${word.slice(0, 1).toUpperCase()}${word.slice(1)}`)
    .join('');
  if (identifier === '') identifier = 'Operation';
  if (!/^[A-Za-z_$]/u.test(identifier)) identifier = `Operation${identifier}`;
  return identifier;
}

export function operationStatusResponseSchemaName(operationId, status) {
  return `${operationSchemaName(operationId)}Status${statusIdentifier(status)}SuccessResponseSchema`;
}

function statusIdentifier(status) {
  return status === '2XX' ? '2xx' : status;
}

function compareStatusCodes(left, right) {
  const leftNumber = /^\d{3}$/u.test(left) ? Number(left) : Number.POSITIVE_INFINITY;
  const rightNumber = /^\d{3}$/u.test(right) ? Number(right) : Number.POSITIVE_INFINITY;
  return leftNumber - rightNumber || compareText(left, right);
}

function canonicalSchemaJson(value) {
  if (Array.isArray(value)) return `[${value.map(canonicalSchemaJson).join(',')}]`;
  if (isObject(value)) {
    return `{${Object.keys(value)
      .toSorted(compareText)
      .map((key) => `${JSON.stringify(key)}:${canonicalSchemaJson(value[key])}`)
      .join(',')}}`;
  }
  return JSON.stringify(value);
}

function indexModels(models) {
  const modelsByName = new Map();
  const modelsByPointer = new Map();
  for (const [index, model] of models.entries()) {
    const path = `models/${index}`;
    if (!isObject(model)) throw new ZodSchemaEmissionError('Model must be an object', path);
    if (typeof model.name !== 'string' || !identifierPattern.test(model.name)) {
      throw new ZodSchemaEmissionError(`Invalid model name ${JSON.stringify(model.name)}`, path);
    }
    if (typeof model.pointer !== 'string' || !model.pointer.startsWith('#/components/schemas/')) {
      throw new ZodSchemaEmissionError(
        `Invalid local component pointer ${JSON.stringify(model.pointer)}`,
        joinPointer(path, 'pointer'),
      );
    }
    if (modelsByName.has(model.name)) {
      throw new ZodSchemaEmissionError(`Duplicate model name ${model.name}`, path);
    }
    if (modelsByPointer.has(model.pointer)) {
      throw new ZodSchemaEmissionError(`Duplicate model pointer ${model.pointer}`, path);
    }
    modelsByName.set(model.name, model);
    modelsByPointer.set(model.pointer, model);
  }
  return { modelsByName, modelsByPointer };
}

function emitSchema(schema, path, state) {
  if (typeof schema === 'boolean') {
    throw new ZodSchemaEmissionError(
      `Boolean schema ${schema} is unsupported because it cannot be emitted without a catch-all`,
      path,
    );
  }
  if (!isObject(schema)) throw new ZodSchemaEmissionError('Schema must be an object', path);
  validateKeywords(schema, path);

  const parsedType = parseSchemaType(schema.type, joinPointer(path, 'type'));
  validateKeywordTypes(schema, parsedType.type, path);
  const nullable = parseNullable(schema.nullable, joinPointer(path, 'nullable'));
  if (nullable && (parsedType.nullable || parsedType.type === 'null')) {
    throw new ZodSchemaEmissionError(
      'nullable cannot be combined with an already nullable type',
      joinPointer(path, 'nullable'),
    );
  }

  const clauses = [];
  if (schema.$ref !== undefined) {
    if (typeof schema.$ref !== 'string') {
      throw new ZodSchemaEmissionError('$ref must be a string', joinPointer(path, '$ref'));
    }
    const referenceName = state.references.get(schema.$ref);
    if (referenceName === undefined) {
      throw new ZodSchemaEmissionError(
        `Unresolved local component reference ${JSON.stringify(schema.$ref)}`,
        joinPointer(path, '$ref'),
      );
    }
    clauses.push(referenceName);
  }
  if (parsedType.type !== null) clauses.push(emitType(schema, parsedType.type, path, state));
  if (schema.const !== undefined) clauses.push(emitConst(schema.const, joinPointer(path, 'const')));
  if (schema.enum !== undefined) clauses.push(emitEnum(schema.enum, joinPointer(path, 'enum')));

  for (const keyword of ['allOf', 'oneOf', 'anyOf']) {
    if (schema[keyword] === undefined) continue;
    clauses.push(emitComposition(keyword, schema[keyword], joinPointer(path, keyword), state));
  }

  if (clauses.length === 0) {
    return 'z.json()';
  }
  let expression = clauses.reduce((left, right) => `z.intersection(${left}, ${right})`);
  if (nullable || parsedType.nullable) expression = `${expression}.nullable()`;
  return expression;
}

function emitSchemaType(schema, path, state, direction) {
  if (typeof schema === 'boolean' || !isObject(schema)) {
    throw new ZodSchemaEmissionError('Schema must be an object', path);
  }
  const parsedType = parseSchemaType(schema.type, joinPointer(path, 'type'));
  const nullable = parseNullable(schema.nullable, joinPointer(path, 'nullable'));
  const clauses = [];
  if (schema.$ref !== undefined) {
    const reference = state.references.get(schema.$ref);
    if (reference === undefined) {
      throw new ZodSchemaEmissionError(
        `Unresolved local component reference ${JSON.stringify(schema.$ref)}`,
        joinPointer(path, '$ref'),
      );
    }
    clauses.push(reference[direction]);
  }
  if (parsedType.type !== null) {
    clauses.push(emitTypeScriptType(schema, parsedType.type, path, state, direction));
  }
  if (schema.const !== undefined) clauses.push(serializeLiteral(schema.const));
  if (schema.enum !== undefined) {
    clauses.push(schema.enum.map(serializeLiteral).join(' | '));
  }
  for (const keyword of ['allOf', 'oneOf', 'anyOf']) {
    if (schema[keyword] === undefined) continue;
    const separator = keyword === 'allOf' ? ' & ' : ' | ';
    clauses.push(
      schema[keyword]
        .map((branch, index) =>
          parenthesizeType(
            emitSchemaType(
              branch,
              joinPointer(joinPointer(path, keyword), index),
              state,
              direction,
            ),
          ),
        )
        .join(separator),
    );
  }
  let type = clauses.length === 0 ? 'z.output<ReturnType<typeof z.json>>' : clauses.join(' & ');
  if (nullable || parsedType.nullable) type = `${parenthesizeType(type)} | null`;
  return type;
}

function emitTypeScriptType(schema, type, path, state, direction) {
  switch (type) {
    case 'string':
      return 'string';
    case 'number':
    case 'integer':
      return 'number';
    case 'boolean':
      return 'boolean';
    case 'null':
      return 'null';
    case 'array':
      return `Array<${emitSchemaType(schema.items, joinPointer(path, 'items'), state, direction)}>`;
    case 'object':
      return emitObjectType(schema, path, state, direction);
    default:
      throw new ZodSchemaEmissionError(
        `Unsupported schema type ${JSON.stringify(type)}`,
        joinPointer(path, 'type'),
      );
  }
}

function emitObjectType(schema, path, state, direction) {
  const properties = schema.properties ?? {};
  const required = new Set(schema.required ?? []);
  const propertyLines = Object.keys(properties)
    .toSorted(compareText)
    .map((name) => {
      const optional = required.has(name) ? '' : '?';
      const type = emitSchemaType(
        properties[name],
        joinPointer(joinPointer(path, 'properties'), name),
        state,
        direction,
      );
      return `  ${JSON.stringify(name)}${optional}: ${type}${optional ? ' | undefined' : ''};`;
    });
  const object = `{${propertyLines.length === 0 ? '' : `\n${propertyLines.join('\n')}\n`}}`;
  const additionalType =
    schema.additionalProperties === undefined || schema.additionalProperties === true
      ? 'unknown'
      : emitSchemaType(
          schema.additionalProperties,
          joinPointer(path, 'additionalProperties'),
          state,
          direction,
        );
  return `${parenthesizeType(object)} & Record<string, ${additionalType}>`;
}

function emitType(schema, type, path, state) {
  switch (type) {
    case 'string':
      return emitString(schema, path);
    case 'number':
      return emitNumber(schema, path, false);
    case 'integer':
      return emitNumber(schema, path, true);
    case 'boolean':
      return 'z.boolean()';
    case 'null':
      return 'z.null()';
    case 'array':
      return emitArray(schema, path, state);
    case 'object':
      return emitObject(schema, path, state);
    default:
      throw new ZodSchemaEmissionError(
        `Unsupported schema type ${JSON.stringify(type)}`,
        joinPointer(path, 'type'),
      );
  }
}

function emitString(schema, path) {
  let expression;
  switch (schema.format) {
    case undefined:
      expression = 'z.string()';
      break;
    case 'date':
      expression = 'z.iso.date()';
      break;
    case 'date-time':
      expression = 'z.iso.datetime({ offset: true })';
      break;
    case 'uuid':
      expression = 'z.uuid()';
      break;
    default:
      throw new ZodSchemaEmissionError(
        `Unsupported string format ${JSON.stringify(schema.format)}`,
        joinPointer(path, 'format'),
      );
  }
  if (schema.minLength !== undefined) {
    expression += `.min(${nonnegativeInteger(schema.minLength, joinPointer(path, 'minLength'))})`;
  }
  if (schema.maxLength !== undefined) {
    expression += `.max(${nonnegativeInteger(schema.maxLength, joinPointer(path, 'maxLength'))})`;
  }
  if (
    schema.minLength !== undefined &&
    schema.maxLength !== undefined &&
    schema.minLength > schema.maxLength
  ) {
    throw new ZodSchemaEmissionError(
      'minLength must not exceed maxLength',
      joinPointer(path, 'minLength'),
    );
  }
  if (schema.pattern !== undefined) {
    if (typeof schema.pattern !== 'string') {
      throw new ZodSchemaEmissionError('pattern must be a string', joinPointer(path, 'pattern'));
    }
    try {
      RegExp(schema.pattern, 'u');
    } catch (error) {
      throw new ZodSchemaEmissionError(
        `Invalid ECMAScript Unicode pattern ${JSON.stringify(schema.pattern)}: ${error.message}`,
        joinPointer(path, 'pattern'),
      );
    }
    expression += `.regex(new RegExp(${JSON.stringify(schema.pattern)}, 'u'))`;
  }
  return expression;
}

function emitNumber(schema, path, integer) {
  let expression;
  if (integer) {
    if (schema.format === undefined || schema.format === 'int64') expression = 'z.int()';
    else if (schema.format === 'int32') expression = 'z.int32()';
    else {
      throw new ZodSchemaEmissionError(
        `Unsupported integer format ${JSON.stringify(schema.format)}`,
        joinPointer(path, 'format'),
      );
    }
  } else if (schema.format === undefined || schema.format === 'double') expression = 'z.number()';
  else if (schema.format === 'float') expression = 'z.float32()';
  else {
    throw new ZodSchemaEmissionError(
      `Unsupported number format ${JSON.stringify(schema.format)}`,
      joinPointer(path, 'format'),
    );
  }

  const checks = [
    ['minimum', 'min'],
    ['maximum', 'max'],
    ['exclusiveMinimum', 'gt'],
    ['exclusiveMaximum', 'lt'],
    ['multipleOf', 'multipleOf'],
  ];
  for (const [keyword, method] of checks) {
    if (schema[keyword] === undefined) continue;
    const value = finiteNumber(schema[keyword], joinPointer(path, keyword));
    if (keyword === 'multipleOf' && value <= 0) {
      throw new ZodSchemaEmissionError(
        'multipleOf must be greater than zero',
        joinPointer(path, keyword),
      );
    }
    expression += `.${method}(${serializeNumber(value)})`;
  }
  return expression;
}

function emitArray(schema, path, state) {
  if (schema.items === undefined) {
    throw new ZodSchemaEmissionError(
      'Array items are required because unconstrained values are unsupported',
      joinPointer(path, 'items'),
    );
  }
  let expression = `z.array(${emitSchema(schema.items, joinPointer(path, 'items'), state)})`;
  if (schema.minItems !== undefined) {
    expression += `.min(${nonnegativeInteger(schema.minItems, joinPointer(path, 'minItems'))})`;
  }
  if (schema.maxItems !== undefined) {
    expression += `.max(${nonnegativeInteger(schema.maxItems, joinPointer(path, 'maxItems'))})`;
  }
  if (
    schema.minItems !== undefined &&
    schema.maxItems !== undefined &&
    schema.minItems > schema.maxItems
  ) {
    throw new ZodSchemaEmissionError(
      'minItems must not exceed maxItems',
      joinPointer(path, 'minItems'),
    );
  }
  if (schema.uniqueItems !== undefined) {
    if (typeof schema.uniqueItems !== 'boolean') {
      throw new ZodSchemaEmissionError(
        'uniqueItems must be a boolean',
        joinPointer(path, 'uniqueItems'),
      );
    }
    if (schema.uniqueItems) {
      state.helpers.add('unique-array');
      expression += ".refine(isJsonArrayUnique, { message: 'Array items must be unique' })";
    }
  }
  return expression;
}

function emitObject(schema, path, state) {
  const properties = schema.properties ?? {};
  if (!isObject(properties)) {
    throw new ZodSchemaEmissionError(
      'properties must be an object',
      joinPointer(path, 'properties'),
    );
  }
  const required = schema.required ?? [];
  if (!Array.isArray(required) || required.some((name) => typeof name !== 'string')) {
    throw new ZodSchemaEmissionError(
      'required must be an array of property names',
      joinPointer(path, 'required'),
    );
  }
  if (new Set(required).size !== required.length) {
    throw new ZodSchemaEmissionError(
      'required must not contain duplicate property names',
      joinPointer(path, 'required'),
    );
  }
  for (const name of required) {
    if (!Object.hasOwn(properties, name)) {
      throw new ZodSchemaEmissionError(
        `Required property ${JSON.stringify(name)} has no declared schema`,
        joinPointer(path, 'required'),
      );
    }
  }

  const requiredNames = new Set(required);
  const propertyLines = Object.keys(properties)
    .toSorted(compareText)
    .map((name) => {
      let expression = emitSchema(
        properties[name],
        joinPointer(joinPointer(path, 'properties'), name),
        state,
      );
      if (!requiredNames.has(name)) expression += '.optional()';
      return `  ${JSON.stringify(name)}: ${expression},`;
    });
  let expression = `z.looseObject({${propertyLines.length === 0 ? '' : `\n${propertyLines.join('\n')}\n`}})`;

  if (schema.additionalProperties !== undefined) {
    if (schema.additionalProperties === false) {
      throw new ZodSchemaEmissionError(
        'additionalProperties: false conflicts with forward-compatible loose objects',
        joinPointer(path, 'additionalProperties'),
      );
    }
    if (schema.additionalProperties !== true) {
      expression += `.catchall(${emitSchema(
        schema.additionalProperties,
        joinPointer(path, 'additionalProperties'),
        state,
      )})`;
    }
  }
  return expression;
}

function emitConst(value, path) {
  assertLiteral(value, path);
  return `z.literal(${serializeLiteral(value)})`;
}

function emitEnum(value, path) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ZodSchemaEmissionError('enum must be a non-empty array', path);
  }
  const serialized = value.map((entry, index) => {
    assertLiteral(entry, joinPointer(path, index));
    return serializeLiteral(entry);
  });
  if (new Set(serialized).size !== serialized.length) {
    throw new ZodSchemaEmissionError('enum must not contain duplicate values', path);
  }
  return serialized.length === 1
    ? `z.literal(${serialized[0]})`
    : `z.literal([${serialized.join(', ')}])`;
}

function emitComposition(keyword, value, path, state) {
  if (!Array.isArray(value) || value.length === 0) {
    throw new ZodSchemaEmissionError(`${keyword} must be a non-empty array`, path);
  }
  const branches = value.map((branch, index) =>
    emitSchema(branch, joinPointer(path, index), state),
  );
  if (branches.length === 1) return branches[0];
  if (keyword === 'allOf') {
    return branches.reduce((left, right) => `z.intersection(${left}, ${right})`);
  }
  const constructor = keyword === 'oneOf' ? 'z.xor' : 'z.union';
  return `${constructor}([${branches.join(', ')}])`;
}

function parseSchemaType(value, path) {
  if (value === undefined) return { nullable: false, type: null };
  if (typeof value === 'string') return { nullable: false, type: value };
  if (!Array.isArray(value) || value.some((entry) => typeof entry !== 'string')) {
    throw new ZodSchemaEmissionError('type must be a string or string array', path);
  }
  if (new Set(value).size !== value.length) {
    throw new ZodSchemaEmissionError('type array must not contain duplicates', path);
  }
  if (value.length !== 2 || !value.includes('null')) {
    throw new ZodSchemaEmissionError(
      'Type arrays are supported only for one value type plus null',
      path,
    );
  }
  return { nullable: true, type: value.find((entry) => entry !== 'null') };
}

function parseNullable(value, path) {
  if (value === undefined) return false;
  if (typeof value !== 'boolean') {
    throw new ZodSchemaEmissionError('nullable must be a boolean', path);
  }
  return value;
}

function validateKeywords(schema, path) {
  for (const keyword of Object.keys(schema)) {
    if (supportedKeywords.has(keyword) || keyword.startsWith('x-')) continue;
    throw new ZodSchemaEmissionError(
      `Unsupported schema keyword ${JSON.stringify(keyword)}`,
      joinPointer(path, keyword),
    );
  }
}

function validateKeywordTypes(schema, type, path) {
  const groups = [
    [numericKeywords, new Set(['integer', 'number'])],
    [stringKeywords, new Set(['string'])],
    [arrayKeywords, new Set(['array'])],
    [objectKeywords, new Set(['object'])],
  ];
  for (const [keywords, allowedTypes] of groups) {
    for (const keyword of keywords) {
      if (schema[keyword] !== undefined && !allowedTypes.has(type)) {
        throw new ZodSchemaEmissionError(
          `${keyword} requires type ${[...allowedTypes].join(' or ')}`,
          joinPointer(path, keyword),
        );
      }
    }
  }
  if (schema.format !== undefined && !new Set(['integer', 'number', 'string']).has(type)) {
    throw new ZodSchemaEmissionError(
      'format requires type string, number, or integer',
      joinPointer(path, 'format'),
    );
  }
}

function normalizeReferenceNames(references, path) {
  if (!isObject(references)) {
    throw new ZodSchemaEmissionError('references must be an object', path);
  }
  const normalized = new Map();
  for (const [reference, identifier] of Object.entries(references).toSorted(([left], [right]) =>
    compareText(left, right),
  )) {
    if (!reference.startsWith('#/components/schemas/')) {
      throw new ZodSchemaEmissionError(
        `External or unsupported schema reference ${JSON.stringify(reference)}`,
        path,
      );
    }
    if (typeof identifier !== 'string' || !identifierPattern.test(identifier)) {
      throw new ZodSchemaEmissionError(
        `Invalid schema reference identifier ${JSON.stringify(identifier)}`,
        path,
      );
    }
    normalized.set(reference, identifier);
  }
  return normalized;
}

function normalizeTypeReferenceNames(references, path) {
  if (!isObject(references)) {
    throw new ZodSchemaEmissionError('type references must be an object', path);
  }
  const normalized = new Map();
  for (const [reference, names] of Object.entries(references).toSorted(([left], [right]) =>
    compareText(left, right),
  )) {
    if (
      !reference.startsWith('#/components/schemas/') ||
      !isObject(names) ||
      typeof names.input !== 'string' ||
      !identifierPattern.test(names.input) ||
      typeof names.output !== 'string' ||
      !identifierPattern.test(names.output)
    ) {
      throw new ZodSchemaEmissionError(
        `Invalid schema type reference ${JSON.stringify(reference)}`,
        path,
      );
    }
    normalized.set(reference, names);
  }
  return normalized;
}

function collectReferences(schema, path, output) {
  if (!isObject(schema)) return;
  if (typeof schema.$ref === 'string') {
    output.push({ path: joinPointer(path, '$ref'), reference: schema.$ref });
  }
  for (const [keyword, value] of Object.entries(schema)) {
    if (
      keyword === '$ref' ||
      ignoredReferenceValueKeywords.has(keyword) ||
      keyword.startsWith('x-')
    ) {
      continue;
    }
    if (keyword === 'properties' && isObject(value)) {
      for (const [name, property] of Object.entries(value)) {
        collectReferences(property, joinPointer(joinPointer(path, keyword), name), output);
      }
    } else if (['allOf', 'anyOf', 'oneOf'].includes(keyword) && Array.isArray(value)) {
      value.forEach((branch, index) =>
        collectReferences(branch, joinPointer(joinPointer(path, keyword), index), output),
      );
    } else if (['additionalProperties', 'items'].includes(keyword)) {
      collectReferences(value, joinPointer(path, keyword), output);
    }
  }
}

function resolveSchemaReferences(schema, path, modelsByPointer) {
  const references = [];
  collectReferences(schema, path, references);
  const resolved = new Map();
  for (const reference of references) {
    const model = modelsByPointer.get(reference.reference);
    if (model === undefined) {
      throw new ZodSchemaEmissionError(
        `Unresolved local component reference ${JSON.stringify(reference.reference)}`,
        reference.path,
      );
    }
    resolved.set(model.name, { model, path: reference.path });
  }
  return [...resolved.values()].toSorted((left, right) =>
    compareText(left.model.name, right.model.name),
  );
}

function resolveOperationReferences(operation, modelsByPointer) {
  const schemas = [
    ...operation.parameters.map(({ schema }) => schema),
    ...(operation.requestBody?.content.map(({ schema }) => schema) ?? []),
    ...operation.successResponses.flatMap(({ content }) => content.map(({ schema }) => schema)),
  ];
  const resolved = new Map();
  for (const [index, schema] of schemas.entries()) {
    for (const entry of resolveSchemaReferences(
      schema,
      `operations/${escapePointerSegment(operation.operationId)}/schemas/${index}`,
      modelsByPointer,
    )) {
      resolved.set(entry.model.name, entry.model);
    }
  }
  return [...resolved.values()].toSorted((left, right) => compareText(left.name, right.name));
}

function resolveOperationsModelClosure(operations, models) {
  const dependencyModel = createSchemaDependencyModel(models, operations, []);
  const names = new Set(dependencyModel.operations.flatMap(({ dependencies }) => dependencies));
  return dependencyModel.models
    .filter(({ model }) => names.has(model.name))
    .map(({ model }) => model);
}

function validateGranularSchemaExports(dependencyModel) {
  const modelExports = new Map();
  for (const { model } of dependencyModel.models) {
    for (const name of [`${model.name}Schema`, `${model.name}Input`, model.name]) {
      const previous = modelExports.get(name);
      if (previous !== undefined) throw new Error(`Duplicate granular model export ${name}`);
      modelExports.set(name, model.name);
    }
  }
  const operationExports = new Map();
  for (const { operation } of dependencyModel.operations) {
    const base = operationSchemaName(operation.operationId);
    const names = [
      `${base}RequestSchema`,
      `${base}SuccessResponseSchema`,
      `${base}SuccessResponseSchemasByStatus`,
      `${base}Input`,
      `${base}Output`,
      ...operation.successResponses.map(({ status }) =>
        operationStatusResponseSchemaName(operation.operationId, status),
      ),
    ];
    for (const name of names) {
      const previous = operationExports.get(name);
      const model = modelExports.get(name);
      if (model !== undefined) {
        throw new Error(
          `Duplicate granular schema export ${name}: model ${model} and operation ${operation.operationId}`,
        );
      }
      if (previous !== undefined) {
        throw new Error(
          `Duplicate granular operation export ${name}: ${previous} and ${operation.operationId}`,
        );
      }
      operationExports.set(name, operation.operationId);
    }
  }
}

function assertUniqueFileNames(entries, label) {
  const names = new Map();
  for (const entry of entries) {
    const key = entry.fileName.toLowerCase();
    const previous = names.get(key);
    const name = entry.model?.name ?? entry.domain;
    if (previous !== undefined) {
      throw new Error(`Duplicate ${label} module file ${entry.fileName}: ${previous} and ${name}`);
    }
    names.set(key, name);
  }
}

export function schemaFileName(value) {
  return value
    .replaceAll(/([a-z0-9])([A-Z])/gu, '$1-$2')
    .replaceAll(/([A-Z]+)([A-Z][a-z])/gu, '$1-$2')
    .replaceAll(/[^A-Za-z0-9]+/gu, '-')
    .replaceAll(/^-|-$/gu, '')
    .toLowerCase();
}

function topologicallyOrderModels(modelsByName, dependencies) {
  const ordered = [];
  const active = [];
  const states = new Map();

  function visit(name) {
    const state = states.get(name);
    if (state === 'done') return;
    states.set(name, 'active');
    active.push(name);
    for (const dependency of dependencies.get(name) ?? []) {
      if (states.get(dependency.name) === 'active') {
        const cycleStart = active.indexOf(dependency.name);
        const cycle = [...active.slice(cycleStart), dependency.name];
        throw new ZodSchemaEmissionError(
          `Recursive component references are unsupported: ${cycle.join(' -> ')}`,
          dependency.path,
        );
      }
      visit(dependency.name);
    }
    active.pop();
    states.set(name, 'done');
    ordered.push(modelsByName.get(name));
  }

  for (const name of [...modelsByName.keys()].toSorted(compareText)) visit(name);
  return ordered;
}

function renderUniqueArrayHelper() {
  return `function canonicalJson(value: unknown): string {
  return (
    JSON.stringify(value, (_key: string, current: unknown): unknown => {
      if (current === null || typeof current !== 'object' || Array.isArray(current)) return current;
      return Object.fromEntries(
        Object.entries(current).sort(([left], [right]) =>
          left < right ? -1 : left > right ? 1 : 0,
        ),
      );
    }) ?? 'undefined'
  );
}

function isJsonArrayUnique(values: readonly unknown[]): boolean {
  const seen = new Set<string>();
  for (const value of values) {
    const key = canonicalJson(value);
    if (seen.has(key)) return false;
    seen.add(key);
  }
  return true;
}`;
}

function renderTypeAssertionHelpers() {
  return `type IsExact<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <Value>() => Value extends Left ? 1 : 2
      ? true
      : false
    : false;

type Assert<Value extends true> = Value;`;
}

function parenthesizeType(type) {
  return /[&|]/u.test(type) ? `(${type})` : type;
}

function assertLiteral(value, path) {
  if (
    value !== null &&
    typeof value !== 'string' &&
    typeof value !== 'boolean' &&
    (typeof value !== 'number' || !Number.isFinite(value))
  ) {
    throw new ZodSchemaEmissionError(
      'Only finite JSON primitive const and enum values are supported',
      path,
    );
  }
}

function finiteNumber(value, path) {
  if (typeof value !== 'number' || !Number.isFinite(value)) {
    throw new ZodSchemaEmissionError('Constraint must be a finite number', path);
  }
  return value;
}

function nonnegativeInteger(value, path) {
  if (!Number.isInteger(value) || value < 0) {
    throw new ZodSchemaEmissionError('Constraint must be a non-negative integer', path);
  }
  return value;
}

function serializeLiteral(value) {
  if (typeof value === 'number') return serializeNumber(value);
  return JSON.stringify(value);
}

function serializeNumber(value) {
  return Object.is(value, -0) ? '-0' : String(value);
}

function joinPointer(path, segment) {
  return `${path}/${String(segment).replaceAll('~', '~0').replaceAll('/', '~1')}`;
}

function escapePointerSegment(value) {
  return value.replaceAll('~', '~0').replaceAll('/', '~1');
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
