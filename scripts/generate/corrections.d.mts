export interface SpecificationCorrectionOptions {
  manifestPath?: string;
  expiredCorrectionPolicy?: 'fail' | 'skip';
}

export interface AppliedSpecificationCorrections<T> {
  readonly appliedCorrections: readonly string[];
  readonly document: T;
}

export const defaultCorrectionManifestPath: string;

export function applySpecificationCorrections<T>(
  document: T,
  compatibilityDate: string,
  options?: SpecificationCorrectionOptions,
): Promise<AppliedSpecificationCorrections<T>>;
