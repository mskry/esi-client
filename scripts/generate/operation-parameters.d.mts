import type { NormalizedOperation, NormalizedParameter } from './normalize.mjs';

export function isTransportManagedParameter(parameter: NormalizedParameter): boolean;
export function operationAllowsCompatibilityDateOverride(operation: NormalizedOperation): boolean;
