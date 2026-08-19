import { EsiUnknownOperationError } from './client/errors.js';
import {
  operationManifest,
  type SerializableOperationManifestEntry,
} from './generated/operations/manifest.js';

const descriptionsByOperationId: ReadonlyMap<string, SerializableOperationManifestEntry> = new Map(
  operationManifest.operations.map((operation) => [operation.operationId, operation]),
);

export function describeOperation(stableId: string): SerializableOperationManifestEntry;
export function describeOperation(stableId: unknown): SerializableOperationManifestEntry {
  const operation =
    typeof stableId === 'string' ? descriptionsByOperationId.get(stableId) : undefined;
  if (operation !== undefined) return operation;

  throw new EsiUnknownOperationError({
    operationId: typeof stableId === 'string' ? stableId : 'unknown',
  });
}
