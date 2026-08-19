export type ProjectPathClassification = 'generated' | 'maintained';
export type GeneratedPathKind = 'source' | 'documentation' | 'examples' | 'tests' | 'openapi';

export const repositoryRoot: string;
export const generatedPaths: Readonly<Record<GeneratedPathKind, readonly string[]>>;
export const generatedReplacementTargets: readonly string[];

export function classifyProjectPath(path: string): ProjectPathClassification;
export function resolveGeneratedReplacementTargets(paths?: readonly string[]): readonly string[];
