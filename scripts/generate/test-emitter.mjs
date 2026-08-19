import { lstat, mkdir, readFile, writeFile } from 'node:fs/promises';
import { isAbsolute, join, normalize } from 'node:path';

import { format } from 'oxfmt';

import { domainClientTestsComponent } from './domain-client.mjs';
import { generatedOperationContractTestsComponent } from './operation-contract-test-emitter.mjs';
import { generatedSchemaTestsComponent } from './schema-test-emitter.mjs';

const testsTarget = 'tests/generated';

export function createGeneratedTestsEmitter(components) {
  if (!Array.isArray(components) || components.length === 0) {
    throw new TypeError('Generated test components must be a non-empty array');
  }
  const testComponents = [...components];
  const names = new Set();
  for (const component of testComponents) {
    if (
      component === null ||
      typeof component !== 'object' ||
      typeof component.name !== 'string' ||
      component.name.length === 0 ||
      typeof component.emit !== 'function'
    ) {
      throw new TypeError('Invalid generated test component');
    }
    if (names.has(component.name)) {
      throw new Error(`Duplicate generated test component name: ${component.name}`);
    }
    names.add(component.name);
  }

  return Object.freeze({
    name: 'generated-tests',
    async emit(context) {
      const testsDirectory = context.outputPath(testsTarget);
      await mkdir(testsDirectory, { recursive: true });
      const outputs = new Set();
      for (const component of testComponents) {
        const componentOutputs = await component.emit(context, testsDirectory);
        if (!Array.isArray(componentOutputs)) {
          throw new Error(`Generated test component ${component.name} did not return output paths`);
        }
        for (const output of componentOutputs) {
          const relativePath = validateRelativeOutputPath(output, component.name);
          if (outputs.has(relativePath)) {
            throw new Error(`Duplicate generated test output: ${relativePath}`);
          }
          outputs.add(relativePath);
          const outputPath = join(testsDirectory, relativePath);
          const status = await lstat(outputPath);
          if (!status.isFile() || status.isSymbolicLink()) {
            throw new Error(`Generated test output must be a regular file: ${relativePath}`);
          }
          const source = await readFile(outputPath, 'utf8');
          const formatted = await format(relativePath, source, {
            printWidth: 100,
            singleQuote: true,
            trailingComma: 'all',
          });
          if (formatted.errors.length > 0) {
            throw new Error(`Generated test output could not be formatted: ${relativePath}`);
          }
          await writeFile(outputPath, formatted.code);
        }
      }
      return [{ target: testsTarget, kind: 'directory' }];
    },
  });
}

export const generatedTestsEmitter = createGeneratedTestsEmitter([
  generatedSchemaTestsComponent,
  generatedOperationContractTestsComponent,
  domainClientTestsComponent,
]);

function validateRelativeOutputPath(path, componentName) {
  if (typeof path !== 'string' || path.length === 0 || isAbsolute(path)) {
    throw new Error(`Generated test component ${componentName} returned an invalid output path`);
  }
  const normalized = normalize(path).replaceAll('\\', '/');
  if (normalized === '..' || normalized.startsWith('../') || normalized === '.') {
    throw new Error(`Generated test component ${componentName} returned an unsafe output path`);
  }
  return normalized;
}
