export const packageValidationSteps: readonly ['publint', 'attw', 'smoke:package', 'pack:inspect'];

export function checkPackage(options?: { readonly built?: boolean }): Promise<void>;
