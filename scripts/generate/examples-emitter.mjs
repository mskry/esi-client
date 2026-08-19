import { lstat, mkdir, writeFile } from 'node:fs/promises';
import { isAbsolute, join, normalize } from 'node:path';

import { createProvenanceHeader } from './artifacts.mjs';
import { domainFileName } from './domain-client.mjs';
import { createSerializableOperationManifest } from './operation-registry.mjs';
import { operationSchemaName } from './zod-schema.mjs';

const examplesTarget = 'examples/generated';
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

const standaloneExamples = Object.freeze([
  {
    fileName: 'public.ts',
    operationId: 'GetStatus',
    title: 'Public operation',
    description: 'Call a public typed domain method without credentials.',
    source: `import { EsiClient } from '@evespace/esi-client';

const client = new EsiClient();

export async function getPublicStatus() {
  return client.status.get();
}`,
  },
  {
    fileName: 'authenticated.ts',
    operationId: 'GetCharactersCharacterIdLocation',
    title: 'Authenticated operation',
    description: 'Read a token from the environment and call an authenticated typed method.',
    source: `import { EsiClient } from '@evespace/esi-client';

const characterId = 90000001;

export async function getAuthenticatedCharacterLocation() {
  const client = new EsiClient({ token: requiredAccessToken() });
  return client.location.get(characterId);
}

function requiredAccessToken(): string {
  const token = process.env.ESI_ACCESS_TOKEN;
  if (!token) throw new Error('Set ESI_ACCESS_TOKEN before making this authorized request.');
  return token;
}`,
  },
  {
    fileName: 'paginated.ts',
    operationId: 'GetUniverseGroups',
    title: 'Single-page pagination',
    description: 'Request one page explicitly and inspect metadata before choosing another page.',
    source: `import { EsiClient } from '@evespace/esi-client';

const client = new EsiClient();

export async function getUniverseGroupPage(page = 1) {
  const response = await client.universe.withMetadata().listItemGroups({ page });
  return {
    groupIds: response.data,
    page,
    pages: response.meta.pagination?.pages,
  };
}`,
  },
  {
    fileName: 'metadata.ts',
    operationId: 'GetMarketsPrices',
    title: 'Response metadata',
    description: 'Use a metadata-enabled domain view while preserving typed response data.',
    source: `import { EsiClient } from '@evespace/esi-client';

const client = new EsiClient();

export async function getMarketPricesWithMetadata() {
  const response = await client.market.withMetadata().listPrices();
  return {
    prices: response.data,
    status: response.meta.status,
    requestId: response.meta.requestId,
    cache: response.meta.cache,
    errorLimit: response.meta.errorLimit,
  };
}`,
  },
  {
    fileName: 'validation-error.ts',
    operationId: 'GetUniverseTypesTypeId',
    title: 'Validation-error handling',
    description: 'Handle structured validation failures for untrusted generic arguments.',
    source: `import { EsiClient, EsiRequestValidationError } from '@evespace/esi-client';
import type { CallOperationArguments } from '@evespace/esi-client/operations';

const client = new EsiClient();

export async function validateUntrustedOperationArguments(serializedArguments: string) {
  const untrusted: unknown = JSON.parse(serializedArguments);

  try {
    // Generic execution validates this externally supplied value before network activity.
    return await client.callOperation(
      'GetUniverseTypesTypeId',
      untrusted as CallOperationArguments<'GetUniverseTypesTypeId'>,
    );
  } catch (error: unknown) {
    if (error instanceof EsiRequestValidationError) return error.toJSON();
    throw error;
  }
}`,
  },
  {
    fileName: 'mutation-safety.ts',
    operationId: 'DeleteCharactersCharacterIdFittingsFittingId',
    title: 'Mutation safety',
    description:
      'Require authorization for a typed mutation and both safety gates for generic execution.',
    source: `import { EsiClient } from '@evespace/esi-client';

const characterId = 90000001;
const fittingId = 12345;

export async function deleteFittingWithTypedIntent(authorizationApproved: boolean) {
  assertAuthorized(authorizationApproved);
  const client = new EsiClient({ token: requiredAccessToken() });

  // Selecting this named typed mutation is explicit intent; generic gates do not apply.
  return client.fittings.deleteFitting(characterId, fittingId);
}

export async function deleteFittingGenerically(authorizationApproved: boolean) {
  assertAuthorized(authorizationApproved);
  const client = new EsiClient({
    token: requiredAccessToken(),
    allowGenericMutations: true,
  });

  // Generic mutation execution additionally requires explicit per-call confirmation.
  return client.callOperation(
    'DeleteCharactersCharacterIdFittingsFittingId',
    { path: { character_id: characterId, fitting_id: fittingId } },
    { confirmMutation: true },
  );
}

function assertAuthorized(authorizationApproved: boolean): asserts authorizationApproved {
  if (!authorizationApproved) throw new Error('Explicit authorization is required.');
}

function requiredAccessToken(): string {
  const token = process.env.ESI_ACCESS_TOKEN;
  if (!token) throw new Error('Set ESI_ACCESS_TOKEN before making this authorized request.');
  return token;
}`,
  },
]);

export function renderOperationSnippets(manifest) {
  if (!Array.isArray(manifest?.operations)) {
    throw new TypeError('Operation snippets require a serializable operation manifest');
  }
  const snippets = new Map();
  for (const operation of [...manifest.operations].toSorted((left, right) =>
    compareText(left.operationId, right.operationId),
  )) {
    if (snippets.has(operation.operationId)) {
      throw new Error(`Duplicate operation snippet ID: ${operation.operationId}`);
    }
    const shape = createFacadeShape(operation);
    snippets.set(
      operation.operationId,
      Object.freeze({
        domainMethod: renderDomainMethodSnippet(operation, shape),
        standaloneDomainMethod: renderStandaloneDomainMethodSnippet(operation, shape),
        genericExecution: renderGenericExecutionSnippet(operation, shape),
        standaloneExamples: relatedStandaloneExamples(operation),
      }),
    );
  }
  return snippets;
}

export function renderStandaloneExamples(manifest, provenance) {
  const files = new Map();
  for (const example of standaloneExamples) {
    files.set(
      example.fileName,
      `${createProvenanceHeader(provenance, 'typescript')}\n${example.source.trim()}\n`,
    );
  }
  const snippets = renderOperationSnippets(manifest);
  const firstOperationByDomain = new Map();
  for (const operation of manifest.operations) {
    if (!firstOperationByDomain.has(operation.facade.domain)) {
      firstOperationByDomain.set(operation.facade.domain, operation);
    }
  }
  for (const [domain, operation] of [...firstOperationByDomain].toSorted(([left], [right]) =>
    compareText(left, right),
  )) {
    const snippet = snippets.get(operation.operationId)?.standaloneDomainMethod;
    if (snippet === undefined) {
      throw new Error(`Missing standalone domain example snippet: ${operation.operationId}`);
    }
    files.set(
      `domain-${domainFileName(domain)}.ts`,
      `${createProvenanceHeader(provenance, 'typescript')}\n${snippet.trim()}\n`,
    );
  }
  return files;
}

export function renderStandaloneExampleDocumentation(provenance) {
  const files = new Map();
  const links = standaloneExamples
    .map(
      (example) =>
        `- [${example.title}](./${example.fileName.replace(/\.ts$/u, '.md')}) - ${example.description}`,
    )
    .join('\n');
  files.set(
    'examples/index.md',
    markdownDocument(
      provenance,
      `# Standalone examples

These generated examples use fixed placeholder identifiers and read credentials only from \`process.env.ESI_ACCESS_TOKEN\`. They are never executed during documentation validation.

${links}`,
    ),
  );
  for (const example of standaloneExamples) {
    files.set(
      `examples/${example.fileName.replace(/\.ts$/u, '.md')}`,
      markdownDocument(
        provenance,
        `# ${example.title}

${example.description}

- Operation: [\`${example.operationId}\`](../operations/${example.operationId}.md)
- Repository source: \`examples/generated/${example.fileName}\`

\`\`\`ts
${example.source.trim()}
\`\`\``,
      ),
    );
  }
  return files;
}

export function createGeneratedExamplesEmitter(components) {
  if (!Array.isArray(components) || components.length === 0) {
    throw new TypeError('Generated example components must be a non-empty array');
  }
  const exampleComponents = [...components];
  const names = new Set();
  for (const component of exampleComponents) {
    if (
      component === null ||
      typeof component !== 'object' ||
      typeof component.name !== 'string' ||
      component.name.length === 0 ||
      typeof component.emit !== 'function'
    ) {
      throw new TypeError('Invalid generated example component');
    }
    if (names.has(component.name)) {
      throw new Error(`Duplicate generated example component name: ${component.name}`);
    }
    names.add(component.name);
  }

  return Object.freeze({
    name: 'generated-examples',
    async emit(context) {
      const examplesDirectory = context.outputPath(examplesTarget);
      await mkdir(examplesDirectory, { recursive: true });
      const outputs = new Set();
      for (const component of exampleComponents) {
        const componentOutputs = await component.emit(context, examplesDirectory);
        if (!Array.isArray(componentOutputs)) {
          throw new Error(
            `Generated example component ${component.name} did not return output paths`,
          );
        }
        for (const output of componentOutputs) {
          const relativePath = validateRelativeOutputPath(output, component.name);
          if (outputs.has(relativePath)) {
            throw new Error(`Duplicate generated example output: ${relativePath}`);
          }
          outputs.add(relativePath);
          const status = await lstat(join(examplesDirectory, relativePath));
          if (!status.isFile() || status.isSymbolicLink()) {
            throw new Error(`Generated example output must be a regular file: ${relativePath}`);
          }
        }
      }
      return [{ target: examplesTarget, kind: 'directory' }];
    },
  });
}

export async function emitStandaloneExamples(context, examplesDirectory) {
  const manifest = createSerializableOperationManifest(
    context.normalizedModel,
    context.operationMetadata,
    context.provenance,
  );
  const files = renderStandaloneExamples(manifest, context.provenance);
  await Promise.all(
    [...files].map(([relativePath, content]) =>
      writeFile(join(examplesDirectory, relativePath), content),
    ),
  );
  return [...files.keys()];
}

export const standaloneExamplesComponent = Object.freeze({
  name: 'standalone-examples',
  emit: emitStandaloneExamples,
});

export const generatedExamplesEmitter = createGeneratedExamplesEmitter([
  standaloneExamplesComponent,
]);

function renderDomainMethodSnippet(operation, shape) {
  const imports = ["import { EsiClient } from '@evespace/esi-client';"];
  const declarations = renderPathDeclarations(shape.pathParameters);
  let bodyName;
  if (operation.requestBody?.required === true) {
    const optionsName = `${operationSchemaName(operation.operationId)}Options`;
    imports.push(
      `import type { ${optionsName} } from '@evespace/esi-client/domains/${domainFileName(operation.facade.domain)}';`,
    );
    bodyName = 'requestBody';
    declarations.push(`declare const requestBody: NonNullable<${optionsName}['body']>;`);
  }
  const options = renderDomainRequiredOptions(shape.requiredOptions, bodyName);
  const callArguments = [
    ...shape.pathParameters.map(({ identifier }) => identifier),
    ...(options === null ? [] : [options]),
  ];
  const lines = [
    ...imports,
    '',
    ...renderClientSetup(operation),
    ...(declarations.length === 0 ? [] : ['', ...declarations]),
    '',
  ];
  if (operation.classification === 'mutation') {
    lines.push(
      '// This named typed mutation expresses explicit intent. Verify authorization before calling it.',
    );
  }
  lines.push(
    `const data = await client.${operation.facade.domain}.${operation.facade.method}(${callArguments.join(', ')});`,
  );
  return `${lines.join('\n')}\n`;
}

function renderStandaloneDomainMethodSnippet(operation, shape) {
  const factoryName = `create${capitalize(operation.facade.domain)}Client`;
  const domainSubpath = `@evespace/esi-client/domains/${domainFileName(operation.facade.domain)}`;
  const imports = [`import { ${factoryName} } from '${domainSubpath}';`];
  const declarations = renderPathDeclarations(shape.pathParameters);
  let bodyName;
  if (operation.requestBody?.required === true) {
    const optionsName = `${operationSchemaName(operation.operationId)}Options`;
    imports.push(`import type { ${optionsName} } from '${domainSubpath}';`);
    bodyName = 'requestBody';
    declarations.push(`declare const requestBody: NonNullable<${optionsName}['body']>;`);
  }
  const options = renderDomainRequiredOptions(shape.requiredOptions, bodyName);
  const callArguments = [
    ...shape.pathParameters.map(({ identifier }) => identifier),
    ...(options === null ? [] : [options]),
  ];
  const lines = [
    ...imports,
    '',
    ...renderStandaloneClientSetup(operation, factoryName),
    ...(declarations.length === 0 ? [] : ['', ...declarations]),
    '',
  ];
  if (operation.classification === 'mutation') {
    lines.push(
      '// This named typed mutation expresses explicit intent. Verify authorization before calling it.',
    );
  }
  lines.push(`const data = await client.${operation.facade.method}(${callArguments.join(', ')});`);
  return `${lines.join('\n')}\n`;
}

function renderGenericExecutionSnippet(operation, shape) {
  const lines = [
    "import { EsiClient } from '@evespace/esi-client';",
    "import type { CallOperationArguments } from '@evespace/esi-client/operations';",
    '',
    ...renderClientSetup(operation, operation.classification === 'mutation'),
  ];
  const declarations = renderPathDeclarations(shape.pathParameters);
  if (operation.requestBody?.required === true) {
    declarations.push(
      `declare const requestBody: NonNullable<CallOperationArguments<'${operation.operationId}'>['body']>;`,
    );
  }
  if (declarations.length > 0) lines.push('', ...declarations);
  const argumentsValue = renderGenericArguments(operation, shape);
  lines.push(
    '',
    `const arguments_: CallOperationArguments<'${operation.operationId}'> = ${argumentsValue};`,
    '',
  );
  if (operation.classification === 'mutation') {
    lines.push(
      '// Generic mutation execution requires authorization, client enablement, and confirmation.',
      `const response = await client.callOperation('${operation.operationId}', arguments_, {`,
      '  confirmMutation: true,',
      '});',
    );
  } else {
    lines.push(
      `const response = await client.callOperation('${operation.operationId}', arguments_);`,
    );
  }
  return `${lines.join('\n')}\n`;
}

function renderClientSetup(operation, allowGenericMutations = false) {
  if (!operation.authentication.required && !allowGenericMutations) {
    return ['const client = new EsiClient();'];
  }
  const lines = [];
  if (operation.authentication.required) {
    lines.push(
      'const accessToken = process.env.ESI_ACCESS_TOKEN;',
      "if (!accessToken) throw new Error('Set ESI_ACCESS_TOKEN before making this authorized request.');",
      '',
    );
  }
  const options = [];
  if (operation.authentication.required) options.push('token: accessToken');
  if (allowGenericMutations) options.push('allowGenericMutations: true');
  lines.push(`const client = new EsiClient({ ${options.join(', ')} });`);
  return lines;
}

function renderStandaloneClientSetup(operation, factoryName) {
  if (!operation.authentication.required) return [`const client = ${factoryName}();`];
  return [
    'const accessToken = process.env.ESI_ACCESS_TOKEN;',
    "if (!accessToken) throw new Error('Set ESI_ACCESS_TOKEN before making this authorized request.');",
    '',
    `const client = ${factoryName}({ token: accessToken });`,
  ];
}

function createFacadeShape(operation) {
  const pathByName = new Map(
    operation.parameters
      .filter(({ placement }) => placement === 'path')
      .map((parameter) => [parameter.name, parameter]),
  );
  const pathParameters = [];
  const usedIdentifiers = new Set(['options']);
  for (const match of operation.http.path.matchAll(/\{([^{}]+)\}/gu)) {
    const parameter = pathByName.get(match[1]);
    if (parameter === undefined || parameter.required !== true) {
      throw new Error(`Missing required path parameter ${match[1]} for ${operation.operationId}`);
    }
    let identifier = facadeParameterName(parameter.name);
    if (reservedIdentifiers.has(identifier) || usedIdentifiers.has(identifier)) {
      identifier = `${identifier}Value`;
    }
    const base = identifier;
    let suffix = 2;
    while (usedIdentifiers.has(identifier)) {
      identifier = `${base}${suffix}`;
      suffix += 1;
    }
    usedIdentifiers.add(identifier);
    pathParameters.push({ identifier, parameter });
    pathByName.delete(parameter.name);
  }
  if (pathByName.size > 0) {
    throw new Error(
      `Unused path parameters for ${operation.operationId}: ${[...pathByName.keys()].join(', ')}`,
    );
  }

  const requiredOptions = operation.parameters
    .filter(({ placement, required }) => placement !== 'path' && required)
    .map((parameter) => ({
      name: facadeParameterName(parameter.name),
      parameter,
    }));
  if (operation.requestBody?.required === true) requiredOptions.push({ name: 'body' });
  return { pathParameters, requiredOptions };
}

function renderPathDeclarations(pathParameters) {
  return pathParameters.map(
    ({ identifier, parameter }) =>
      `const ${identifier} = ${renderParameterPlaceholder(parameter)};`,
  );
}

function renderDomainRequiredOptions(requiredOptions, bodyName) {
  if (requiredOptions.length === 0) return null;
  return `{ ${requiredOptions
    .map(({ name, parameter }) =>
      name === 'body' ? `body: ${bodyName}` : `${name}: ${renderParameterPlaceholder(parameter)}`,
    )
    .join(', ')} }`;
}

function renderGenericArguments(operation, shape) {
  const groups = [];
  if (shape.pathParameters.length > 0) {
    groups.push(
      `path: { ${shape.pathParameters
        .map(({ identifier, parameter }) => `${JSON.stringify(parameter.name)}: ${identifier}`)
        .join(', ')} }`,
    );
  }
  for (const placement of ['query', 'header']) {
    const parameters = operation.parameters.filter(
      (parameter) => parameter.placement === placement && parameter.required,
    );
    if (parameters.length === 0) continue;
    groups.push(
      `${placement}: { ${parameters
        .map(
          (parameter) =>
            `${JSON.stringify(parameter.name)}: ${renderParameterPlaceholder(parameter)}`,
        )
        .join(', ')} }`,
    );
  }
  if (operation.requestBody?.required === true) groups.push('body: requestBody');
  return `{${groups.length === 0 ? '' : ` ${groups.join(', ')} `}}`;
}

function renderParameterPlaceholder(parameter) {
  return renderSchemaPlaceholder(parameter.schema, parameter.name);
}

function renderSchemaPlaceholder(schema, name) {
  if (schema === null || typeof schema !== 'object' || Array.isArray(schema)) return 'null';
  if (Array.isArray(schema.enum) && schema.enum.length > 0) return JSON.stringify(schema.enum[0]);
  if (schema.const !== undefined) return JSON.stringify(schema.const);
  if (typeof schema.$ref === 'string') {
    const referenceName = schema.$ref.split('/').at(-1) ?? '';
    if (referenceName === 'UUID') return JSON.stringify('00000000-0000-4000-8000-000000000000');
    return String(identifierNumber(name, referenceName));
  }
  if (Array.isArray(schema.type)) {
    const nonNull = schema.type.find((entry) => entry !== 'null');
    return renderSchemaPlaceholder({ ...schema, type: nonNull }, name);
  }
  if (schema.type === 'array') {
    return `[${renderSchemaPlaceholder(schema.items, singular(name))}]`;
  }
  if (schema.type === 'boolean') return 'true';
  if (schema.type === 'integer' || schema.type === 'number') {
    return String(identifierNumber(name));
  }
  if (schema.type === 'string') {
    if (schema.format === 'date') return JSON.stringify('2026-08-18');
    if (schema.format === 'date-time') return JSON.stringify('2026-08-18T12:30:00Z');
    if (schema.format === 'uuid') return JSON.stringify('00000000-0000-4000-8000-000000000000');
    if (/hash/iu.test(name)) return JSON.stringify('0000000000000000000000000000000000000000');
    return JSON.stringify(`example-${name.replaceAll('_', '-')}`);
  }
  return 'null';
}

function identifierNumber(name, referenceName = '') {
  const key = `${name} ${referenceName}`.toLowerCase();
  if (key.includes('character')) return 90000001;
  if (key.includes('corporation')) return 98000001;
  if (key.includes('alliance')) return 99000001;
  if (key.includes('solar') || key.includes('system')) return 30000142;
  if (key.includes('constellation')) return 20000020;
  if (key.includes('region')) return 10000002;
  if (key.includes('station')) return 60003760;
  if (key.includes('structure')) return 1020000000000;
  if (key.includes('item')) return 1000000000001;
  if (key.includes('type')) return 34;
  return 12345;
}

function relatedStandaloneExamples(operation) {
  const fileNames = new Set([
    operation.authentication.required ? 'authenticated.md' : 'public.md',
    'metadata.md',
    'validation-error.md',
  ]);
  if (operation.pagination.kind !== 'none') fileNames.add('paginated.md');
  if (operation.classification === 'mutation') fileNames.add('mutation-safety.md');
  return [...fileNames].toSorted(compareText);
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

function validateRelativeOutputPath(path, componentName) {
  if (typeof path !== 'string' || path.length === 0 || isAbsolute(path)) {
    throw new Error(`Generated example component ${componentName} returned an invalid output path`);
  }
  const normalized = normalize(path).replaceAll('\\', '/');
  if (normalized === '..' || normalized.startsWith('../') || normalized === '.') {
    throw new Error(`Generated example component ${componentName} returned an unsafe output path`);
  }
  return normalized;
}

function markdownDocument(provenance, body) {
  return `${createProvenanceHeader(provenance, 'markdown')}\n${body.trim()}\n`;
}

function singular(value) {
  return value.endsWith('s') ? value.slice(0, -1) : value;
}

function capitalize(value) {
  return `${value.slice(0, 1).toUpperCase()}${value.slice(1)}`;
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
