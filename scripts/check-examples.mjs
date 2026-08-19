import { execFile } from 'node:child_process';
import { readdir, readFile } from 'node:fs/promises';
import { join, relative, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';
import { promisify } from 'node:util';

import { findRuntimeImports } from './check-runtime-imports.mjs';

const defaultRoot = fileURLToPath(new URL('../', import.meta.url));
const executeFile = promisify(execFile);

export async function inspectExamplesProject(root = defaultRoot) {
  const generatedDirectory = join(root, 'examples/generated');
  const generatedFiles = (await readdir(generatedDirectory, { withFileTypes: true }))
    .filter((entry) => entry.isFile() && entry.name.endsWith('.ts'))
    .map((entry) => join(generatedDirectory, entry.name))
    .toSorted();
  const configPath = join(root, 'tsconfig.examples.json');
  const { stdout } = await executeFile(
    process.execPath,
    [join(root, 'node_modules/typescript/bin/tsc'), '--project', configPath, '--showConfig'],
    { cwd: root },
  );
  const project = JSON.parse(stdout);
  const projectFiles = project.files.map((path) => resolve(root, path)).toSorted();

  if (!samePaths(generatedFiles, projectFiles)) {
    throw new Error(
      `tsconfig.examples.json must include every generated example and no other roots.\n` +
        `Generated: ${formatPaths(generatedFiles, root)}\n` +
        `Project: ${formatPaths(projectFiles, root)}`,
    );
  }

  return { generatedFiles, projectFiles };
}

export function validateDocumentedPackageImports(files, packageManifest) {
  const packageName = packageManifest.name;
  const packageExports = packageManifest.exports;
  if (
    typeof packageName !== 'string' ||
    packageExports === null ||
    typeof packageExports !== 'object'
  ) {
    throw new TypeError('Package manifest must define a name and exports object');
  }

  for (const file of files) {
    for (const specifier of findRuntimeImports(file.source)) {
      if (specifier !== packageName && !specifier.startsWith(`${packageName}/`)) continue;
      const subpath = specifier === packageName ? '.' : `.${specifier.slice(packageName.length)}`;
      if (!Object.hasOwn(packageExports, subpath)) {
        throw new Error(`${file.path} imports package subpath ${specifier}, which is not exported`);
      }
    }
  }
}

export async function checkExamplesProject(root = defaultRoot) {
  const { generatedFiles } = await inspectExamplesProject(root);
  const packageManifest = JSON.parse(await readFile(join(root, 'package.json'), 'utf8'));
  const files = await Promise.all(
    generatedFiles.map(async (path) => ({
      path: relative(root, path),
      source: await readFile(path, 'utf8'),
    })),
  );
  validateDocumentedPackageImports(files, packageManifest);
  await executeFile(
    process.execPath,
    [join(root, 'node_modules/typescript/bin/tsc'), '--project', 'tsconfig.examples.json'],
    { cwd: root },
  );
}

function formatPaths(paths, root) {
  return paths.map((path) => relative(root, path)).join(', ') || '(none)';
}

function samePaths(left, right) {
  return left.length === right.length && left.every((path, index) => path === right[index]);
}

const entryPath = process.argv[1];
if (entryPath !== undefined && import.meta.url === pathToFileURL(resolve(entryPath)).href) {
  await checkExamplesProject();
}
