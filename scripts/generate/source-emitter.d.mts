import type { EmitterContext, GeneratedOutputEmitter } from './orchestrate.mjs';

export interface GeneratedSourceComponent {
  readonly name: string;
  emit(context: EmitterContext, sourceDirectory: string): Promise<readonly string[]>;
}

export function createGeneratedSourceEmitter(
  components: readonly GeneratedSourceComponent[],
): GeneratedOutputEmitter;
export const generatedSourceEmitter: GeneratedOutputEmitter;
