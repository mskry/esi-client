import type { ExecFileOptions } from 'node:child_process';

export interface NpmPackFile {
  readonly path: string;
  readonly size: number;
}

export interface NpmPackResult {
  readonly filename: string;
  readonly size: number;
  readonly unpackedSize: number;
  readonly entryCount?: number;
  readonly files: readonly NpmPackFile[];
}

export const npmExecutable: string;
export function usesWindowsCommandShell(command: string, platform?: NodeJS.Platform): boolean;
export function execFileAsync(
  command: string,
  arguments_: readonly string[],
  options?: Omit<ExecFileOptions, 'encoding'>,
): Promise<{ stdout: string; stderr: string }>;
export function npmPack(packageDirectory: string, destination: string): Promise<NpmPackResult[]>;
export function parseNpmPackJson(stdout: string): NpmPackResult[];
