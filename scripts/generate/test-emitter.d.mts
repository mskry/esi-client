import type { EmitterContext, GeneratedOutputEmitter } from './orchestrate.mjs';

export interface GeneratedTestComponent {
  readonly name: string;
  emit(context: EmitterContext, testsDirectory: string): Promise<readonly string[]>;
}

export function createGeneratedTestsEmitter(
  components: readonly GeneratedTestComponent[],
): GeneratedOutputEmitter;

export const generatedTestsEmitter: GeneratedOutputEmitter;
