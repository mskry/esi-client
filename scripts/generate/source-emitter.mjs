import { lstat, mkdir } from 'node:fs/promises';
import { isAbsolute, join, normalize } from 'node:path';

import { domainClientSourceComponent } from './domain-client.mjs';
import { operationRegistrySourceComponent } from './operation-registry.mjs';
import { zodSchemaSourceComponent } from './zod-schema.mjs';

const sourceTarget = 'src/generated';

export function createGeneratedSourceEmitter(components) {
  if (!Array.isArray(components) || components.length === 0) {
    throw new TypeError('Generated source components must be a non-empty array');
  }
  const sourceComponents = [...components];
  const names = new Set();
  for (const component of sourceComponents) {
    if (
      component === null ||
      typeof component !== 'object' ||
      typeof component.name !== 'string' ||
      component.name.length === 0 ||
      typeof component.emit !== 'function'
    ) {
      throw new TypeError('Invalid generated source component');
    }
    if (names.has(component.name)) {
      throw new Error(`Duplicate generated source component name: ${component.name}`);
    }
    names.add(component.name);
  }

  return Object.freeze({
    name: 'generated-source',
    async emit(context) {
      const sourceDirectory = context.outputPath(sourceTarget);
      await mkdir(sourceDirectory, { recursive: true });
      const outputs = new Set();
      for (const component of sourceComponents) {
        const componentOutputs = await component.emit(context, sourceDirectory);
        if (!Array.isArray(componentOutputs)) {
          throw new Error(
            `Generated source component ${component.name} did not return output paths`,
          );
        }
        for (const output of componentOutputs) {
          const relativePath = validateRelativeOutputPath(output, component.name);
          if (outputs.has(relativePath)) {
            throw new Error(`Duplicate generated source output: ${relativePath}`);
          }
          outputs.add(relativePath);
          const status = await lstat(join(sourceDirectory, relativePath));
          if (!status.isFile() || status.isSymbolicLink()) {
            throw new Error(`Generated source output must be a regular file: ${relativePath}`);
          }
        }
      }
      return [{ target: sourceTarget, kind: 'directory' }];
    },
  });
}

export const generatedSourceEmitter = createGeneratedSourceEmitter([
  zodSchemaSourceComponent,
  domainClientSourceComponent,
  operationRegistrySourceComponent,
]);

function validateRelativeOutputPath(path, componentName) {
  if (typeof path !== 'string' || path.length === 0 || isAbsolute(path)) {
    throw new Error(`Generated source component ${componentName} returned an invalid output path`);
  }
  const normalized = normalize(path).replaceAll('\\', '/');
  if (normalized === '..' || normalized.startsWith('../') || normalized === '.') {
    throw new Error(`Generated source component ${componentName} returned an unsafe output path`);
  }
  return normalized;
}
