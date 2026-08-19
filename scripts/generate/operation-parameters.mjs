const transportManagedHeaderNames = new Set(['accept-language', 'x-compatibility-date']);
const compatibilityDatePattern = /^\d{4}-\d{2}-\d{2}$/u;

export function isTransportManagedParameter(parameter) {
  return (
    parameter?.placement === 'header' &&
    typeof parameter.name === 'string' &&
    transportManagedHeaderNames.has(parameter.name.toLowerCase())
  );
}

export function operationAllowsCompatibilityDateOverride(operation) {
  if (operation === null || typeof operation !== 'object' || !Array.isArray(operation.parameters)) {
    throw new TypeError('Normalized operation must contain parameters');
  }
  const parameter = operation.parameters.find(
    (candidate) =>
      candidate.placement === 'header' && candidate.name.toLowerCase() === 'x-compatibility-date',
  );
  const declaredDate = operation.extensions?.['x-compatibility-date'];
  if (parameter === undefined && declaredDate === undefined) return false;
  if (
    parameter === undefined ||
    parameter.required !== true ||
    typeof declaredDate !== 'string' ||
    !compatibilityDatePattern.test(declaredDate)
  ) {
    throw new Error(
      `Operation ${operation.operationId} has inconsistent compatibility-date metadata`,
    );
  }
  return true;
}
