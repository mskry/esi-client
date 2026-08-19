import type { ArtifactProvenance } from './artifacts.mjs';
import type { NormalizedOpenApiModel } from './normalize.mjs';
import type { EmitterContext } from './orchestrate.mjs';
import type { GeneratedTestComponent } from './test-emitter.mjs';

export function renderGeneratedOperationContractTests(
  model: NormalizedOpenApiModel,
  provenance: ArtifactProvenance,
): string;

export function emitGeneratedOperationContractTests(
  context: EmitterContext,
  testsDirectory: string,
): Promise<readonly ['operation-contracts.test.ts']>;

export const generatedOperationContractTestsComponent: GeneratedTestComponent;
