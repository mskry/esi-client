import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { createProvenanceHeader, renderGeneratedBarrel } from './artifacts.mjs';
import {
  isTransportManagedParameter,
  operationAllowsCompatibilityDateOverride,
} from './operation-parameters.mjs';
import { operationSchemaName, operationStatusResponseSchemaName } from './zod-schema.mjs';

const identifierPattern = /^[A-Za-z_$][A-Za-z0-9_$]*$/u;
const reservedIdentifiers = new Set([
  'await',
  'break',
  'case',
  'catch',
  'class',
  'const',
  'continue',
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

export function renderDomainClientArtifacts(model, operationMetadata, provenance) {
  const indexed = indexOperations(model, operationMetadata);
  const domains = [];
  for (const [domain, entries] of indexed.domains) {
    const fileName = domainFileName(domain);
    const className = `${capitalize(domain)}DomainClient`;
    const metadataClassName = `${className}WithMetadata`;
    domains.push({
      binderName: `bind${className}`,
      className,
      descriptorSource: renderDescriptorModule(entries, indexed.modelsByPointer, provenance),
      domain,
      entries,
      factoryName: `create${capitalize(domain)}Client`,
      fileName,
      metadataClassName,
      contractSource: renderDomainContractModule(
        domain,
        className,
        metadataClassName,
        entries,
        provenance,
      ),
      domainSource: renderDomainModule(domain, className, provenance),
      implementationSource: renderDomainImplementationModule(
        domain,
        className,
        metadataClassName,
        entries,
        provenance,
      ),
    });
  }
  validateGeneratedNames(domains);

  const artifacts = Object.freeze({
    clientSource: renderEsiClientModule(domains, provenance),
    contractsSource: renderContractsModule(domains, provenance),
    domains: Object.freeze(domains),
    indexSource: renderGeneratedBarrel(
      domains.map(({ fileName }) => `./${fileName}.js`),
      provenance,
    ),
    rootIndexSource: renderGeneratedBarrel(
      ['./domains/index.js', './esi-client.js', './schemas/index.js'],
      provenance,
    ),
  });
  validateDomainClientArtifacts(artifacts);
  return artifacts;
}

export async function emitDomainClientSource(context, sourceDirectory) {
  if (!isObject(context) || !isObject(context.normalizedModel)) {
    throw new TypeError('Domain client source context must contain a normalized model');
  }
  if (typeof sourceDirectory !== 'string' || sourceDirectory.length === 0) {
    throw new TypeError('Domain client source directory must be a non-empty string');
  }
  const artifacts = renderDomainClientArtifacts(
    context.normalizedModel,
    context.operationMetadata,
    context.provenance,
  );
  const domainsDirectory = join(sourceDirectory, 'domains');
  const descriptorsDirectory = join(sourceDirectory, 'internal/descriptors');
  const implementationsDirectory = join(sourceDirectory, 'internal/domains');
  await Promise.all([
    mkdir(domainsDirectory, { recursive: true }),
    mkdir(descriptorsDirectory, { recursive: true }),
    mkdir(implementationsDirectory, { recursive: true }),
  ]);
  const outputs = ['domains/index.ts', 'esi-client.ts', 'index.ts'];
  const writes = [
    writeFile(join(domainsDirectory, 'index.ts'), artifacts.indexSource),
    writeFile(join(sourceDirectory, 'esi-client.ts'), artifacts.clientSource),
    writeFile(join(sourceDirectory, 'index.ts'), artifacts.rootIndexSource),
  ];
  for (const domain of artifacts.domains) {
    const domainPath = `domains/${domain.fileName}.ts`;
    const descriptorPath = `internal/descriptors/${domain.fileName}.ts`;
    const contractPath = `internal/domains/${domain.fileName}-contract.ts`;
    const implementationPath = `internal/domains/${domain.fileName}.ts`;
    outputs.push(domainPath, descriptorPath, contractPath, implementationPath);
    writes.push(
      writeFile(join(sourceDirectory, domainPath), domain.domainSource),
      writeFile(join(sourceDirectory, descriptorPath), domain.descriptorSource),
      writeFile(join(sourceDirectory, contractPath), domain.contractSource),
      writeFile(join(sourceDirectory, implementationPath), domain.implementationSource),
    );
  }
  await Promise.all(writes);
  return outputs.toSorted(compareText);
}

export const domainClientSourceComponent = Object.freeze({
  name: 'domain-clients',
  emit: emitDomainClientSource,
});

export async function emitDomainClientTests(context, testsDirectory) {
  if (!isObject(context) || !isObject(context.normalizedModel)) {
    throw new TypeError('Domain client test context must contain a normalized model');
  }
  const artifacts = renderDomainClientArtifacts(
    context.normalizedModel,
    context.operationMetadata,
    context.provenance,
  );
  const output = 'domain-operation-coverage.ts';
  await writeFile(join(testsDirectory, output), artifacts.contractsSource);
  return [output];
}

export const domainClientTestsComponent = Object.freeze({
  name: 'domain-client-contracts',
  emit: emitDomainClientTests,
});

function indexOperations(model, operationMetadata) {
  if (!isObject(model) || !Array.isArray(model.operations) || !Array.isArray(model.models)) {
    throw new TypeError('Normalized model must contain operations and models');
  }
  if (!Array.isArray(operationMetadata)) {
    throw new TypeError('Resolved operation metadata must be an array');
  }
  const operationsById = new Map();
  for (const operation of model.operations) {
    if (!isObject(operation) || typeof operation.operationId !== 'string') {
      throw new TypeError('Normalized operation must contain an operation ID');
    }
    if (operationsById.has(operation.operationId)) {
      throw new Error(`Duplicate normalized operation: ${operation.operationId}`);
    }
    operationsById.set(operation.operationId, operation);
  }
  const domains = new Map();
  const seenMetadata = new Set();
  for (const metadata of operationMetadata) {
    if (
      !isObject(metadata) ||
      typeof metadata.operationId !== 'string' ||
      typeof metadata.domain !== 'string' ||
      typeof metadata.method !== 'string'
    ) {
      throw new TypeError('Resolved operation metadata entry is invalid');
    }
    if (seenMetadata.has(metadata.operationId)) {
      throw new Error(`Duplicate resolved operation metadata: ${metadata.operationId}`);
    }
    const operation = operationsById.get(metadata.operationId);
    if (operation === undefined) {
      throw new Error(`Stale resolved operation metadata: ${metadata.operationId}`);
    }
    seenMetadata.add(metadata.operationId);
    const entries = domains.get(metadata.domain) ?? [];
    entries.push(createOperationEntry(operation, metadata));
    domains.set(metadata.domain, entries);
  }
  if (seenMetadata.size !== operationsById.size) {
    throw new Error('Resolved operation metadata does not cover every domain operation');
  }
  const modelsByPointer = new Map(model.models.map((entry) => [entry.pointer, entry]));
  return {
    domains: [...domains]
      .toSorted(([left], [right]) => compareText(left, right))
      .map(([domain, entries]) => [
        domain,
        entries.toSorted((left, right) => compareText(left.metadata.method, right.metadata.method)),
      ]),
    modelsByPointer,
  };
}

function createOperationEntry(operation, metadata) {
  const managedParameters = operation.parameters.filter(isTransportManagedParameter);
  const parameters = operation.parameters.filter(
    (parameter) => !isTransportManagedParameter(parameter),
  );
  if (parameters.some(({ placement }) => placement === 'cookie')) {
    throw new Error(`Cookie parameters are unsupported for operation ${operation.operationId}`);
  }
  const compatibilityDateOverride = operationAllowsCompatibilityDateOverride(operation);
  const compatibilityParameter = managedParameters.find(
    ({ name }) => name.toLowerCase() === 'x-compatibility-date',
  );
  if (compatibilityDateOverride !== (compatibilityParameter !== undefined)) {
    throw new Error(`Operation ${operation.operationId} has inconsistent transport parameters`);
  }
  const pathParameters = pathParametersInOrder(operation, parameters);
  const optionFields = createOptionFields(operation, parameters, compatibilityDateOverride);
  const requiredOptions = optionFields.some(({ required }) => required);
  const schemaName = operationSchemaName(operation.operationId);
  return {
    compatibilityDateOverride,
    descriptorName: operationDescriptorName(operation.operationId),
    metadata,
    operation,
    optionFields,
    optionsName: `${schemaName}Options`,
    parameters,
    pathParameters,
    requestTypeName: `${schemaName}Input`,
    requiredOptions,
    responseTypeName: `${schemaName}Output`,
    schemaName,
  };
}

function createOptionFields(operation, parameters, compatibilityDateOverride) {
  const fields = [];
  const names = new Map();
  for (const parameter of parameters) {
    if (parameter.placement === 'path') continue;
    const name = facadeParameterName(parameter.name);
    addOptionField(
      fields,
      names,
      {
        kind: parameter.placement,
        name,
        required: parameter.required === true,
        wireName: parameter.name,
      },
      operation.operationId,
    );
  }
  if (operation.requestBody !== null) {
    addOptionField(
      fields,
      names,
      {
        kind: 'body',
        name: 'body',
        required: operation.requestBody.required === true,
        wireName: 'body',
      },
      operation.operationId,
    );
  }
  if (compatibilityDateOverride) {
    addOptionField(
      fields,
      names,
      {
        kind: 'compatibilityDate',
        name: 'compatibilityDate',
        required: false,
        wireName: 'compatibilityDate',
      },
      operation.operationId,
    );
  }
  return fields.toSorted((left, right) => compareText(left.name, right.name));
}

function addOptionField(fields, names, field, operationId) {
  const previous = names.get(field.name);
  if (previous !== undefined) {
    throw new Error(
      `Facade option collision for ${operationId}: ${previous} and ${field.kind}:${field.wireName} both map to ${field.name}`,
    );
  }
  names.set(field.name, `${field.kind}:${field.wireName}`);
  fields.push(field);
}

function pathParametersInOrder(operation, parameters) {
  const byName = new Map(
    parameters
      .filter(({ placement }) => placement === 'path')
      .map((parameter) => [parameter.name, parameter]),
  );
  const ordered = [];
  const usedIdentifiers = new Set(['options']);
  for (const match of operation.path.matchAll(/\{([^{}]+)\}/gu)) {
    const wireName = match[1];
    const parameter = byName.get(wireName);
    if (parameter === undefined || parameter.required !== true) {
      throw new Error(`Missing required path parameter ${wireName} for ${operation.operationId}`);
    }
    let identifier = facadeParameterName(wireName);
    if (reservedIdentifiers.has(identifier) || usedIdentifiers.has(identifier)) {
      identifier = `${identifier}Value`;
    }
    let suffix = 2;
    const base = identifier;
    while (usedIdentifiers.has(identifier)) {
      identifier = `${base}${suffix}`;
      suffix += 1;
    }
    usedIdentifiers.add(identifier);
    ordered.push({ identifier, parameter });
    byName.delete(wireName);
  }
  if (byName.size > 0) {
    throw new Error(
      `Unused path parameters for ${operation.operationId}: ${[...byName.keys()].join(', ')}`,
    );
  }
  return ordered;
}

function renderDescriptorModule(entries, modelsByPointer, provenance) {
  const schemaImports = new Set();
  const declarations = [];
  for (const entry of entries) {
    schemaImports.add(`${entry.schemaName}RequestSchema`);
    schemaImports.add(`type ${entry.requestTypeName}`);
    schemaImports.add(`type ${entry.responseTypeName}`);
    for (const response of entry.operation.successResponses) {
      schemaImports.add(
        operationStatusResponseSchemaName(entry.operation.operationId, response.status),
      );
    }
    declarations.push(renderDescriptor(entry, modelsByPointer));
  }
  const imports = `import type { OperationExecutionDescriptor } from '../../../client/execute.js';
import {
${[...schemaImports]
  .toSorted(compareText)
  .map((name) => `  ${name},`)
  .join('\n')}
} from '../../schemas/operations/${domainFileName(entries[0].metadata.domain)}.js';`;
  return `${createProvenanceHeader(provenance, 'typescript')}\n${imports}\n\n${declarations.join('\n\n')}\n`;
}

function renderDescriptor(entry, modelsByPointer) {
  const parameters = entry.parameters.map((parameter) =>
    renderParameterDescriptor(parameter, modelsByPointer, entry.operation.operationId),
  );
  const responses = entry.operation.successResponses.map((response) => {
    const status = response.status === '2XX' ? "'2XX'" : String(Number(response.status));
    if (response.noContent) return `    { status: ${status}, body: 'none' },`;
    const schemaName = operationStatusResponseSchemaName(
      entry.operation.operationId,
      response.status,
    );
    return `    { status: ${status}, body: 'json', schema: ${schemaName} },`;
  });
  const authentication = renderAuthentication(entry.operation);
  const body = entry.operation.requestBody;
  const requestBody =
    body === null
      ? 'null'
      : `{ required: ${body.required === true}, mediaType: 'application/json' }`;
  return `export const ${entry.descriptorName}: OperationExecutionDescriptor<${entry.requestTypeName}, ${entry.responseTypeName}> = {
  operationId: ${JSON.stringify(entry.operation.operationId)},
  method: ${JSON.stringify(entry.operation.method)},
  path: ${JSON.stringify(entry.operation.path)},
  parameters: [${parameters.length === 0 ? '' : `\n${parameters.join('\n')}\n  `}],
  requestBody: ${requestBody},
  requestSchema: ${entry.schemaName}RequestSchema,
  authentication: ${authentication},
  successResponses: [
${responses.join('\n')}
  ],${entry.compatibilityDateOverride ? '\n  transport: { compatibilityDateOverride: true },' : ''}
};`;
}

function renderParameterDescriptor(parameter, modelsByPointer, operationId) {
  const schema = resolveParameterSchema(parameter.schema, modelsByPointer, new Set(), operationId);
  const properties = [
    `name: ${JSON.stringify(parameter.name)}`,
    `placement: ${JSON.stringify(parameter.placement)}`,
    `required: ${parameter.required === true}`,
    `schema: ${renderParameterSchema(schema, modelsByPointer, operationId)}`,
  ];
  if (parameter.style !== null) properties.push(`style: ${JSON.stringify(parameter.style)}`);
  if (parameter.explode !== null) properties.push(`explode: ${parameter.explode}`);
  if (parameter.placement === 'query' && parameter.allowReserved !== null) {
    properties.push(`allowReserved: ${parameter.allowReserved}`);
  }
  return `    { ${properties.join(', ')} },`;
}

function resolveParameterSchema(schema, modelsByPointer, active, operationId) {
  if (!isObject(schema)) {
    throw new Error(`Invalid parameter schema for operation ${operationId}`);
  }
  if (typeof schema.$ref !== 'string') return schema;
  if (active.has(schema.$ref)) {
    throw new Error(`Recursive parameter schema reference for operation ${operationId}`);
  }
  const model = modelsByPointer.get(schema.$ref);
  if (model === undefined) {
    throw new Error(`Unresolved parameter schema reference ${schema.$ref} for ${operationId}`);
  }
  const next = new Set(active);
  next.add(schema.$ref);
  return { ...resolveParameterSchema(model.schema, modelsByPointer, next, operationId), ...schema };
}

function renderParameterSchema(schema, modelsByPointer, operationId) {
  const resolved = resolveParameterSchema(schema, modelsByPointer, new Set(), operationId);
  if (typeof resolved.type !== 'string') {
    throw new Error(`Parameter schema has no scalar type for operation ${operationId}`);
  }
  if (['boolean', 'integer', 'number', 'string'].includes(resolved.type)) {
    return `{ type: ${JSON.stringify(resolved.type)} }`;
  }
  if (resolved.type === 'array') {
    const items = resolveParameterSchema(resolved.items, modelsByPointer, new Set(), operationId);
    if (!['boolean', 'integer', 'number', 'string'].includes(items.type)) {
      throw new Error(`Parameter array has unsupported items for operation ${operationId}`);
    }
    return `{ type: 'array', items: { type: ${JSON.stringify(items.type)} } }`;
  }
  throw new Error(
    `Unsupported parameter schema type ${resolved.type} for operation ${operationId}`,
  );
}

function renderAuthentication(operation) {
  const authentication = resolveOperationAuthentication(operation);
  if (authentication === null) return 'null';
  return `{ scopes: [${authentication.scopes.map((scope) => JSON.stringify(scope)).join(', ')}] }`;
}

export function resolveOperationAuthentication(operation) {
  if (
    operation.security.length === 0 ||
    operation.security.some(({ schemes }) => schemes.length === 0)
  ) {
    return null;
  }
  if (operation.security.length !== 1) {
    throw new Error(
      `Multiple authentication alternatives are unsupported for ${operation.operationId}`,
    );
  }
  const scopes = [
    ...new Set(operation.security[0].schemes.flatMap((scheme) => scheme.scopes)),
  ].toSorted(compareText);
  return Object.freeze({ scopes: Object.freeze(scopes) });
}

function renderDomainContractModule(domain, className, metadataClassName, entries, provenance) {
  const schemaTypeNames = entries.flatMap((entry) => [
    entry.requestTypeName,
    entry.responseTypeName,
  ]);
  const options = entries
    .filter(({ optionFields }) => optionFields.length > 0)
    .map(renderOptionsInterface);
  const regularMethods = entries.map((entry) => renderContractMethod(entry, false));
  const metadataMethods = entries.map((entry) => renderContractMethod(entry, true));
  const source = `import type { EsiResponse } from '../../../client/response.js';
import type {
${[...new Set(schemaTypeNames)]
  .toSorted(compareText)
  .map((name) => `  ${name},`)
  .join('\n')}
} from '../../schemas/operations/${domainFileName(domain)}.js';

${options.join('\n\n')}${options.length > 0 ? '\n\n' : ''}export interface ${className} {
${indent(regularMethods.join('\n\n'), 2)}

  withMetadata(): ${metadataClassName};
}

export interface ${metadataClassName} {
${indent(metadataMethods.join('\n\n'), 2)}
}
`;
  return `${createProvenanceHeader(provenance, 'typescript')}\n${source}`;
}

function renderDomainModule(domain, className, provenance) {
  const factoryName = `create${capitalize(domain)}Client`;
  const binderName = `bind${className}`;
  const fileName = domainFileName(domain);
  const source = `import { EsiClientConfiguration } from '../../client/configuration.js';
import type { EsiClientOptions } from '../../client/options.js';
import { ${binderName} } from '../internal/domains/${fileName}.js';
import type { ${className} } from '../internal/domains/${fileName}-contract.js';

export type * from '../internal/domains/${fileName}-contract.js';

export function ${factoryName}(options: EsiClientOptions = {}): ${className} {
  return ${binderName}(new EsiClientConfiguration(options));
}
`;
  return `${createProvenanceHeader(provenance, 'typescript')}\n${source}`;
}

function renderDomainImplementationModule(
  domain,
  className,
  metadataClassName,
  entries,
  provenance,
) {
  const fileName = domainFileName(domain);
  const descriptorNames = entries.map(({ descriptorName }) => descriptorName);
  const schemaTypeNames = entries.flatMap((entry) => [
    entry.requestTypeName,
    entry.responseTypeName,
  ]);
  const regularMethods = entries.map(renderRegularMethod);
  const metadataMethods = entries.map(renderMetadataMethod);
  const implementationName = `${className}Implementation`;
  const metadataImplementationName = `${metadataClassName}Implementation`;
  const binderName = `bind${className}`;
  const source = `import type { EsiClientConfiguration } from '../../../client/configuration.js';
import { executeOperation } from '../../../client/execute.js';
import type { EsiResponse } from '../../../client/response.js';
import {
${descriptorNames.map((name) => `  ${name},`).join('\n')}
} from '../descriptors/${fileName}.js';
import type {
  ${className},
  ${metadataClassName},
${entries
  .filter(({ optionFields }) => optionFields.length > 0)
  .map(({ optionsName }) => `  ${optionsName},`)
  .join('\n')}
} from './${fileName}-contract.js';
import type {
${[...new Set(schemaTypeNames)]
  .toSorted(compareText)
  .map((name) => `  ${name},`)
  .join('\n')}
} from '../../schemas/operations/${fileName}.js';

class ${metadataImplementationName} implements ${metadataClassName} {
  readonly #configuration: EsiClientConfiguration;

  constructor(configuration: EsiClientConfiguration) {
    this.#configuration = configuration;
    Object.freeze(this);
  }

${indent(metadataMethods.join('\n\n'), 2)}
}

class ${implementationName} implements ${className} {
  readonly #metadata: ${metadataImplementationName};

  constructor(configuration: EsiClientConfiguration) {
    this.#metadata = new ${metadataImplementationName}(configuration);
    Object.freeze(this);
  }

${indent(regularMethods.join('\n\n'), 2)}

  withMetadata(): ${metadataClassName} {
    return this.#metadata;
  }
}

export function ${binderName}(configuration: EsiClientConfiguration): ${className} {
  return new ${implementationName}(configuration);
}
`;
  return `${createProvenanceHeader(provenance, 'typescript')}\n${source}`;
}

function renderOptionsInterface(entry) {
  const fields = entry.optionFields.map((field) => {
    const optional = field.required ? '' : '?';
    return `  readonly ${JSON.stringify(field.name)}${optional}: ${optionFieldType(entry, field)};`;
  });
  return `export interface ${entry.optionsName} {\n${fields.join('\n')}\n}`;
}

function optionFieldType(entry, field) {
  if (field.kind === 'compatibilityDate') return 'string';
  if (field.kind === 'body') return `${entry.requestTypeName}['body']`;
  return `NonNullable<${entry.requestTypeName}[${JSON.stringify(field.kind)}]>[${JSON.stringify(field.wireName)}]`;
}

function renderMethodParameters(entry) {
  const parameters = entry.pathParameters.map(
    ({ identifier, parameter }) =>
      `${identifier}: NonNullable<${entry.requestTypeName}['path']>[${JSON.stringify(parameter.name)}]`,
  );
  if (entry.optionFields.length > 0) {
    parameters.push(`options${entry.requiredOptions ? '' : '?'}: ${entry.optionsName}`);
  }
  return parameters;
}

function renderContractMethod(entry, metadata) {
  const resultType = metadata ? `EsiResponse<${entry.responseTypeName}>` : entry.responseTypeName;
  return `${entry.metadata.method}(${renderMethodParameters(entry).join(', ')}): Promise<${resultType}>;`;
}

function renderRegularMethod(entry) {
  const parameters = renderMethodParameters(entry);
  const methodArguments = entry.pathParameters.map(({ identifier }) => identifier);
  if (entry.optionFields.length > 0) methodArguments.push('options');
  return `${entry.metadata.method}(${parameters.join(', ')}): Promise<${entry.responseTypeName}> {
  return this.#metadata.${entry.metadata.method}(${methodArguments.join(', ')}).then((response) => response.data);
}`;
}

function renderMetadataMethod(entry) {
  const parameters = renderMethodParameters(entry);
  const lines = [
    `${entry.metadata.method}(${parameters.join(', ')}): Promise<EsiResponse<${entry.responseTypeName}>> {`,
    `  const arguments_: ${entry.requestTypeName} = ${renderRequestArguments(entry)};`,
  ];
  const executionOptions = entry.compatibilityDateOverride
    ? ', { compatibilityDate: options?.compatibilityDate }'
    : '';
  lines.push(
    `  return executeOperation(this.#configuration, ${entry.descriptorName}, arguments_${executionOptions});`,
  );
  lines.push('}');
  return lines.join('\n');
}

function renderRequestArguments(entry) {
  const groups = [];
  if (entry.pathParameters.length > 0) {
    groups.push(
      `path: { ${entry.pathParameters
        .map(({ identifier, parameter }) => `${JSON.stringify(parameter.name)}: ${identifier}`)
        .join(', ')} }`,
    );
  }
  for (const placement of ['query', 'header']) {
    const fields = entry.optionFields.filter(({ kind }) => kind === placement);
    if (fields.length === 0) continue;
    groups.push(
      `${placement}: { ${fields
        .map(
          (field) => `${JSON.stringify(field.wireName)}: options?.[${JSON.stringify(field.name)}]`,
        )
        .join(', ')} }`,
    );
  }
  const body = entry.optionFields.find(({ kind }) => kind === 'body');
  if (body !== undefined) groups.push(`body: options?.[${JSON.stringify(body.name)}]`);
  return `{${groups.length === 0 ? '' : ` ${groups.join(', ')} `}}`;
}

function renderContractsModule(domains, provenance) {
  const domainImports = [];
  const operationImports = [];
  const coverage = [];
  const assertions = [];
  for (const domain of domains) {
    const imported = new Set([domain.className, domain.factoryName, domain.metadataClassName]);
    const domainOperationImports = new Set();
    for (const entry of domain.entries) {
      domainOperationImports.add(entry.requestTypeName);
      domainOperationImports.add(entry.responseTypeName);
      if (entry.optionFields.length > 0) imported.add(entry.optionsName);
      const parameters = entry.pathParameters.map(
        ({ identifier, parameter }) =>
          `${identifier}: NonNullable<${entry.requestTypeName}['path']>[${JSON.stringify(parameter.name)}]`,
      );
      if (entry.optionFields.length > 0) {
        parameters.push(`options${entry.requiredOptions ? '' : '?'}: ${entry.optionsName}`);
      }
      const assertionName = entry.schemaName;
      assertions.push(
        `export type ${assertionName}DomainMethodAssertion = Assert<IsExact<${domain.className}[${JSON.stringify(entry.metadata.method)}], (${parameters.join(', ')}) => Promise<${entry.responseTypeName}>>>;`,
        `export type ${assertionName}MetadataMethodAssertion = Assert<IsExact<${domain.metadataClassName}[${JSON.stringify(entry.metadata.method)}], (${parameters.join(', ')}) => Promise<EsiResponse<${entry.responseTypeName}>>>>;`,
      );
      if (entry.optionFields.length > 0) {
        assertions.push(
          `export type ${assertionName}OptionsAssertion = Assert<IsExact<${entry.optionsName}, {\n${entry.optionFields
            .map(
              (field) =>
                `  readonly ${JSON.stringify(field.name)}${field.required ? '' : '?'}: ${optionFieldType(entry, field)};`,
            )
            .join('\n')}\n}>>;`,
        );
      }
      coverage.push(`  readonly ${JSON.stringify(entry.operation.operationId)}: {
    readonly domain: ${JSON.stringify(domain.domain)};
    readonly method: ${JSON.stringify(entry.metadata.method)};
    readonly input: ${entry.requestTypeName};
    readonly output: ${entry.responseTypeName};
  };`);
    }
    domainImports.push(`import {
${[...imported]
  .toSorted(compareText)
  .map((name) => (name === domain.factoryName ? `  ${name},` : `  type ${name},`))
  .join('\n')}
} from '../../src/generated/domains/${domain.fileName}.js';`);
    operationImports.push(`import type {
${[...domainOperationImports]
  .toSorted(compareText)
  .map((name) => `  ${name},`)
  .join('\n')}
} from '../../src/generated/schemas/operations/${domain.fileName}.js';`);
    assertions.push(
      `export type ${domain.className}FactoryAssertion = Assert<IsExact<typeof ${domain.factoryName}, (options?: EsiClientOptions) => ${domain.className}>>;`,
      `export type ${domain.className}MetadataViewAssertion = Assert<IsExact<${domain.className}['withMetadata'], () => ${domain.metadataClassName}>>;`,
    );
  }
  const source = `import type { EsiClientOptions } from '../../src/client/options.js';
import type { EsiResponse } from '../../src/client/response.js';
import type { GeneratedOperationSignatures } from '../../src/generated/schemas/contracts.js';
${operationImports.join('\n')}
${domainImports.join('\n')}

/* oxlint-disable typescript/no-unnecessary-type-parameters */
type IsExact<Left, Right> =
  (<Value>() => Value extends Left ? 1 : 2) extends <Value>() => Value extends Right ? 1 : 2
    ? (<Value>() => Value extends Right ? 1 : 2) extends <Value>() => Value extends Left ? 1 : 2
      ? true
      : false
    : false;

type Assert<Value extends true> = Value;

interface GeneratedDomainOperationCoverage {
${coverage.join('\n')}
}

export type GeneratedDomainOperationCoverageAssertion = Assert<
  IsExact<keyof GeneratedDomainOperationCoverage, keyof GeneratedOperationSignatures>
>;

${assertions.join('\n')}
`;
  return `${createProvenanceHeader(provenance, 'typescript')}\n${source}`;
}

function renderEsiClientModule(domains, provenance) {
  const imports = domains
    .map(
      ({ binderName, className, fileName }) =>
        `import type { ${className} } from './internal/domains/${fileName}-contract.js';\nimport { ${binderName} } from './internal/domains/${fileName}.js';`,
    )
    .join('\n');
  const properties = domains
    .map(
      ({ className, domain }) =>
        `  /** Operations for the ESI \`${domain}\` domain. */\n  readonly ${domain}: ${className};`,
    )
    .join('\n\n');
  const assignments = domains
    .map(({ binderName, domain }) => `    this.${domain} = ${binderName}(this.configuration);`)
    .join('\n');
  const source = `import type { EsiClientOptions } from '../client/options.js';
import { EsiClientBase } from '../client/esi-client.js';
${imports}

export class EsiClient extends EsiClientBase {
${properties}

  constructor(options: EsiClientOptions = {}) {
    super(options);
${assignments}
    Object.freeze(this);
  }
}
`;
  return `${createProvenanceHeader(provenance, 'typescript')}\n${source}`;
}

export function validateDomainClientArtifacts(artifacts) {
  if (!isObject(artifacts) || !Array.isArray(artifacts.domains)) {
    throw new TypeError('Generated domain client artifacts are invalid');
  }
  for (const domain of artifacts.domains) {
    if (!domain.domainSource.includes(`export function ${domain.factoryName}(`)) {
      throw new Error(`Missing domain factory: ${domain.factoryName}`);
    }
    if (!domain.contractSource.includes(`export interface ${domain.className}`)) {
      throw new Error(`Missing domain contract: ${domain.className}`);
    }
    if (!domain.implementationSource.includes(`export function ${domain.binderName}(`)) {
      throw new Error(`Missing internal domain binder: ${domain.binderName}`);
    }
    const marshallingBodies = domain.implementationSource.match(/const arguments_:/gu) ?? [];
    if (marshallingBodies.length !== domain.entries.length) {
      throw new Error(`Domain ${domain.domain} must emit one marshalling body per operation`);
    }
    for (const entry of domain.entries) {
      for (const metadata of [false, true]) {
        if (!domain.contractSource.includes(renderContractMethod(entry, metadata))) {
          throw new Error(
            `Domain ${domain.domain} contract has an invalid ${entry.metadata.method} signature`,
          );
        }
      }
    }
    const expectedSchemaModule = `../../schemas/operations/${domain.fileName}.js`;
    const imports = [
      ...domain.descriptorSource.matchAll(/from ['"]([^'"]*schemas\/operations\/[^'"]+)['"]/gu),
    ].map((match) => match[1]);
    if (imports.length !== 1 || imports[0] !== expectedSchemaModule) {
      throw new Error(
        `Descriptor for ${domain.domain} imports an operation-schema module outside its domain`,
      );
    }
  }
}

function validateGeneratedNames(domains) {
  const fileNames = new Map();
  const classNames = new Map();
  for (const domain of domains) {
    if (domain.domain === 'configuration') {
      throw new Error('EsiClient domain property collision: configuration');
    }
    const fileKey = domain.fileName.toLowerCase();
    const previousFile = fileNames.get(fileKey);
    if (previousFile !== undefined) {
      throw new Error(`Domain file collision: ${previousFile} and ${domain.domain}`);
    }
    fileNames.set(fileKey, domain.domain);
    const previousClass = classNames.get(domain.className);
    if (previousClass !== undefined) {
      throw new Error(`Domain class collision: ${previousClass} and ${domain.domain}`);
    }
    classNames.set(domain.className, domain.domain);
    const optionNames = new Set();
    for (const entry of domain.entries) {
      if (entry.optionFields.length === 0) continue;
      if (optionNames.has(entry.optionsName)) {
        throw new Error(`Domain options type collision in ${domain.domain}: ${entry.optionsName}`);
      }
      optionNames.add(entry.optionsName);
    }
  }
}

function facadeParameterName(value) {
  const words = value
    .replaceAll(/([a-z0-9])([A-Z])/gu, '$1 $2')
    .replaceAll(/([A-Z]+)([A-Z][a-z])/gu, '$1 $2')
    .split(/[^A-Za-z0-9]+/u)
    .filter(Boolean);
  if (words.length === 0) throw new Error(`Cannot derive facade parameter name from ${value}`);
  let identifier = `${words[0].toLowerCase()}${words
    .slice(1)
    .map((word) => capitalize(word.toLowerCase()))
    .join('')}`;
  if (!/^[A-Za-z_$]/u.test(identifier)) identifier = `value${capitalize(identifier)}`;
  if (!identifierPattern.test(identifier)) {
    throw new Error(`Invalid generated facade parameter identifier: ${identifier}`);
  }
  return identifier;
}

export function operationDescriptorName(operationId) {
  return `${operationSchemaName(operationId)}Descriptor`;
}

export function domainFileName(domain) {
  return domain
    .replaceAll(/([a-z0-9])([A-Z])/gu, '$1-$2')
    .replaceAll(/([A-Z]+)([A-Z][a-z])/gu, '$1-$2')
    .toLowerCase();
}

function capitalize(value) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function indent(value, spaces) {
  const prefix = ' '.repeat(spaces);
  return value
    .split('\n')
    .map((line) => (line === '' ? '' : `${prefix}${line}`))
    .join('\n');
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}

function isObject(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}
