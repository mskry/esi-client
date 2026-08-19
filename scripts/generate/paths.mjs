import { resolve, sep } from 'node:path';
import { fileURLToPath } from 'node:url';

export const repositoryRoot = fileURLToPath(new URL('../../', import.meta.url));

export const generatedPaths = Object.freeze({
  source: Object.freeze(['src/generated']),
  documentation: Object.freeze(['llms.txt', 'docs/generated', 'docs/llms.txt']),
  examples: Object.freeze(['examples/generated']),
  tests: Object.freeze(['tests/generated']),
  openapi: Object.freeze(['openapi/generated']),
});

export const generatedReplacementTargets = Object.freeze(Object.values(generatedPaths).flat());

const approvedTargets = new Set(
  generatedReplacementTargets.map((path) => resolve(repositoryRoot, path)),
);

export function classifyProjectPath(path) {
  const absolutePath = resolve(repositoryRoot, path);
  for (const target of approvedTargets) {
    if (absolutePath === target || absolutePath.startsWith(`${target}${sep}`)) return 'generated';
  }
  return 'maintained';
}

export function resolveGeneratedReplacementTargets(paths = generatedReplacementTargets) {
  const resolvedPaths = [];
  const seen = new Set();

  for (const path of paths) {
    const absolutePath = resolve(repositoryRoot, path);
    if (!approvedTargets.has(absolutePath)) {
      throw new Error(`Refusing to replace non-generated path: ${path}`);
    }
    if (seen.has(absolutePath)) {
      throw new Error(`Duplicate generated replacement target: ${path}`);
    }
    seen.add(absolutePath);
    resolvedPaths.push(absolutePath);
  }

  return Object.freeze(resolvedPaths);
}
