import type { ArtifactProvenance } from './artifacts.mjs';
import type { NormalizedModel, NormalizedOperation } from './normalize.mjs';
import type { EmitterContext } from './orchestrate.mjs';
import type { GeneratedTestComponent } from './test-emitter.mjs';

export interface SchemaContractFixtureOptions {
  readonly nonEmptyStrings?: boolean;
  readonly populate?: boolean;
  readonly preferNonNull?: boolean;
}

export function createSchemaContractFixture(
  schema: import('./normalize.mjs').NormalizedSchema,
  models: readonly NormalizedModel[],
  options?: SchemaContractFixtureOptions,
): unknown;

export function renderGeneratedSchemaContractTests(
  models: readonly NormalizedModel[],
  operations: readonly NormalizedOperation[],
  provenance: ArtifactProvenance,
): string;

export function emitGeneratedSchemaTests(
  context: EmitterContext,
  testsDirectory: string,
): Promise<readonly ['schema-contracts.test.ts']>;

export const generatedSchemaTestsComponent: GeneratedTestComponent;
