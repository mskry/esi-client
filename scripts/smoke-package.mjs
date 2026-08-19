import { mkdtemp, mkdir, readdir, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath } from 'node:url';

import { build } from 'esbuild';

import { execFileAsync, npmExecutable, npmPack } from './lib/npm-pack.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'esi-client-smoke-'));
const suppliedTarball = argumentValue('--tarball');
const packageJson = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
const publicCodeSpecifiers = Object.entries(packageJson.exports)
  .filter(([, entry]) => typeof entry === 'object')
  .map(([subpath]) =>
    subpath === '.' ? packageJson.name : `${packageJson.name}${subpath.slice(1)}`,
  );
const generatedDomains = (await readdir(join(root, 'src/generated/domains')))
  .filter((file) => file.endsWith('.ts') && file !== 'index.ts' && file !== 'operation-coverage.ts')
  .map((file) => file.slice(0, -3))
  .toSorted();
const exportedDomains = Object.keys(packageJson.exports)
  .filter((subpath) => subpath.startsWith('./domains/'))
  .map((subpath) => subpath.slice('./domains/'.length))
  .toSorted();
if (JSON.stringify(exportedDomains) !== JSON.stringify(generatedDomains)) {
  throw new Error(
    `Package domain exports do not match generated domains (${exportedDomains.length}/${generatedDomains.length})`,
  );
}

try {
  const packDirectory = join(temporaryDirectory, 'pack');
  const consumerDirectory = join(temporaryDirectory, 'consumer');
  await mkdir(consumerDirectory);

  let tarball = suppliedTarball;
  if (tarball === undefined) {
    await mkdir(packDirectory);
    const [{ filename }] = await npmPack(root, packDirectory);
    tarball = join(packDirectory, filename);
  }

  await writeFile(
    join(consumerDirectory, 'package.json'),
    JSON.stringify({ name: 'esi-client-smoke', private: true, type: 'module' }),
  );
  await execFileAsync(
    npmExecutable,
    ['install', '--ignore-scripts', '--no-audit', '--no-fund', tarball],
    { cwd: consumerDirectory },
  );

  await writeFile(
    join(consumerDirectory, 'runtime-smoke.mjs'),
    `import * as sdk from '@evespace/esi-client';
import {
  EsiClient,
  EsiHttpError,
} from '@evespace/esi-client';
import * as operations from '@evespace/esi-client/operations';
import { describeOperation, operationManifest, operationRegistry, searchOperations } from '@evespace/esi-client/operations';
import { GetStatusSuccessResponseSchema } from '@evespace/esi-client/schemas';
import { StatusDomainClient } from '@evespace/esi-client/domains/status';

for (const specifier of ${JSON.stringify(publicCodeSpecifiers)}) await import(specifier);
const packageMetadata = (await import('@evespace/esi-client/package.json', { with: { type: 'json' } })).default;
if (packageMetadata.name !== '@evespace/esi-client') throw new Error('Invalid package metadata export');
if (Object.keys(operationRegistry).length !== 233) throw new Error('Incomplete operation registry');
if (operationManifest.operations.length !== 233) throw new Error('Incomplete operation manifest');
JSON.stringify(operationManifest);
const searchResults = searchOperations({
  domain: 'market',
  method: 'GET',
  authenticated: false,
  classification: 'read',
});
if (searchResults.length === 0 || searchResults.length > 20) {
  throw new Error('Invalid installed operation search results');
}
if (!Object.isFrozen(searchResults) || !Object.isFrozen(searchResults[0])) {
  throw new Error('Mutable installed operation search results');
}
const statusDescription = describeOperation('GetStatus');
if (statusDescription.http.method !== 'GET' || statusDescription.http.path !== '/status') {
  throw new Error('Invalid installed operation description');
}
if (!Object.isFrozen(statusDescription) || !Object.isFrozen(statusDescription.responses)) {
  throw new Error('Mutable installed operation description');
}
if (JSON.parse(JSON.stringify(statusDescription)).operationId !== 'GetStatus') {
  throw new Error('Non-serializable installed operation description');
}
try {
  describeOperation('getstatus');
  throw new Error('Unknown installed operation did not fail');
} catch (error) {
  if (error.code !== 'ESI_UNKNOWN_OPERATION') throw error;
  if (error.toJSON().operationId !== 'getstatus') throw new Error('Unsafe unknown-operation JSON');
}
void operations;

let request;
const client = new EsiClient({
  baseUrl: 'https://example.test',
  fetch: async (input, init) => {
    request = { input, init };
    return new Response(JSON.stringify({
      players: 42,
      server_version: 'smoke',
      start_time: '2026-08-18T00:00:00Z',
      vip: false,
    }), { status: 200, headers: { 'content-type': 'application/json' } });
  },
});

if (!(client.status instanceof StatusDomainClient)) throw new Error('Missing status domain');
const status = await client.status.getStatus({ compatibilityDate: '2020-01-01' });
if (request.input !== 'https://example.test/status') throw new Error('Unexpected request URL');
if (request.init.method !== 'GET') throw new Error('Unexpected request method');
if (new Headers(request.init.headers).get('x-compatibility-date') !== '2020-01-01') {
  throw new Error('Missing compatibility header');
}
if (status.players !== 42 || status.server_version !== 'smoke') {
  throw new Error('Unexpected JSON-native response');
}
GetStatusSuccessResponseSchema.parse(status);
if (typeof EsiHttpError !== 'function') throw new Error('Missing structured error export');
if ('Configuration' in sdk || 'StatusApi' in sdk) throw new Error('Prototype exports remain');
`,
  );
  await execFileAsync(process.execPath, ['runtime-smoke.mjs'], { cwd: consumerDirectory });

  await writeFile(
    join(consumerDirectory, 'types-smoke.ts'),
    `${publicCodeSpecifiers
      .map(
        (specifier, index) =>
          `import type * as PublicExport${index} from ${JSON.stringify(specifier)};`,
      )
      .join('\n')}
import {
  EsiClient,
  EsiHttpError,
  type EsiClientOptions,
  type EsiResponse,
} from '@evespace/esi-client';
import {
  describeOperation,
  operationManifest,
  operationRegistry,
  searchOperations,
  type ExecutableOperationRegistry,
  type OperationExecutionDescriptor,
  type OperationSearchResult,
  type SerializableOperationManifestEntry,
  type SerializableOperationManifest,
  type SearchOperationsOptions,
} from '@evespace/esi-client/operations';
import {
  GetStatusSuccessResponseSchema,
  type GetStatusOutput,
} from '@evespace/esi-client/schemas';
import { StatusDomainClient } from '@evespace/esi-client/domains/status';

const options: EsiClientOptions = { compatibilityDate: '2026-08-18' };
const client = new EsiClient(options);
const domain: StatusDomainClient = client.status;
const status: Promise<GetStatusOutput> = domain.getStatus();
const parsed: GetStatusOutput = GetStatusSuccessResponseSchema.parse({
  players: 1,
  server_version: 'smoke',
  start_time: '2026-08-18T00:00:00Z',
  vip: false,
});
type StatusEnvelope = EsiResponse<GetStatusOutput>;
type Descriptor = OperationExecutionDescriptor;
const registry: ExecutableOperationRegistry = operationRegistry;
const manifest: SerializableOperationManifest = operationManifest;
const searchOptions: SearchOperationsOptions = { query: 'market', limit: 20 };
const searchResults: readonly OperationSearchResult[] = searchOperations(searchOptions);
const description: SerializableOperationManifestEntry = describeOperation('GetStatus');
const errorConstructor: typeof EsiHttpError = EsiHttpError;
void status;
void parsed;
void errorConstructor;
void (undefined as StatusEnvelope | undefined);
void (undefined as Descriptor | undefined);
void registry;
void manifest;
void searchResults;
void description;
${publicCodeSpecifiers
  .map((_, index) => `void (undefined as typeof PublicExport${index} | undefined);`)
  .join('\n')}
`,
  );
  await writeFile(
    join(consumerDirectory, 'tsconfig.json'),
    JSON.stringify({
      compilerOptions: {
        lib: ['ES2022', 'DOM', 'DOM.Iterable'],
        module: 'NodeNext',
        moduleResolution: 'NodeNext',
        noEmit: true,
        strict: true,
        target: 'ES2022',
      },
      include: ['types-smoke.ts'],
    }),
  );
  await execFileAsync(
    process.execPath,
    [join(root, 'node_modules/typescript/bin/tsc'), '--project', 'tsconfig.json'],
    { cwd: consumerDirectory },
  );

  const browserEntry = join(consumerDirectory, 'browser-entry.mjs');
  await writeFile(
    browserEntry,
    `import { EsiClient, GetStatusSuccessResponseSchema } from '@evespace/esi-client';
export const client = new EsiClient({ baseUrl: 'https://example.test' });
export const statusSchema = GetStatusSuccessResponseSchema;
`,
  );
  await build({
    absWorkingDir: consumerDirectory,
    bundle: true,
    entryPoints: [browserEntry],
    format: 'esm',
    logLevel: 'silent',
    outfile: join(consumerDirectory, 'browser-bundle.js'),
    platform: 'browser',
    target: 'es2022',
  });
} finally {
  await rm(temporaryDirectory, { force: true, recursive: true });
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (value === undefined) throw new Error(`${name} requires a value`);
  return resolve(value);
}
