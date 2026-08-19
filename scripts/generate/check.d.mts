export interface GenerationCheckResult {
  readonly compatibilityDate: string;
  readonly fileCount: number;
  readonly sha256: string;
}

export const generationCheckTargets: readonly string[];
export function compareGeneratedOutputs(
  stagedRoot: string,
  projectRoot: string,
  targets?: readonly string[],
): Promise<{ readonly fileCount: number }>;
export function checkGeneratedOutputs(root?: string): Promise<GenerationCheckResult>;
