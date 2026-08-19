import { readdir, readFile } from 'node:fs/promises';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { initSync, parse } from 'es-module-lexer';

const root = fileURLToPath(new URL('../', import.meta.url));
const approvedRuntimeImports = new Set(['zod']);
const requirePattern = /\brequire(?:\.resolve)?\s*\(\s*(['"])([^'"]+)\1/g;

initSync();

export function findUnexpectedRuntimeImports(source) {
  const imports = new Set();
  for (const specifier of findRuntimeImports(source)) {
    if (
      !specifier.startsWith('.') &&
      !specifier.startsWith('/') &&
      !approvedRuntimeImports.has(specifier)
    ) {
      imports.add(specifier);
    }
  }
  return [...imports];
}

export async function assertNoUnexpectedRuntimeImports(directory) {
  const violations = [];
  const runtimeImports = new Set();
  for (const file of await listFiles(directory)) {
    if (!file.endsWith('.js') && !file.endsWith('.d.ts')) continue;
    const source = await readFile(file, 'utf8');
    const imports = findUnexpectedRuntimeImports(source);
    if (imports.length > 0) violations.push(`${file}: ${imports.join(', ')}`);
    if (file.endsWith('.js')) {
      for (const specifier of findRuntimeImports(source)) runtimeImports.add(specifier);
    }
  }
  if (violations.length > 0) {
    throw new Error(`Unexpected emitted runtime imports:\n${violations.join('\n')}`);
  }
  if (!runtimeImports.has('zod')) {
    throw new Error('Expected emitted JavaScript to retain zod as an external runtime import');
  }
}

export function findRuntimeImports(source) {
  const positionedImports = [];
  const [esmImports] = parse(source);
  for (const entry of esmImports) {
    if (entry.n !== undefined) positionedImports.push([entry.ss, entry.n]);
  }
  for (const match of source.matchAll(requirePattern)) {
    positionedImports.push([match.index, match[2]]);
  }
  positionedImports.sort(([left], [right]) => left - right);
  return [...new Set(positionedImports.map(([, specifier]) => specifier))];
}

async function listFiles(directory) {
  const files = [];
  for (const entry of await readdir(directory, { withFileTypes: true })) {
    const path = join(directory, entry.name);
    if (entry.isDirectory()) files.push(...(await listFiles(path)));
    else files.push(path);
  }
  return files;
}

if (process.argv[1] && import.meta.url === pathToFileURL(resolve(process.argv[1])).href) {
  await assertNoUnexpectedRuntimeImports(join(root, 'dist'));
  process.stdout.write('No unexpected emitted runtime imports.\n');
}
