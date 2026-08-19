import type { GeneratedOperationSignatures } from '../generated/schemas/contracts.js';
import { operationRegistry } from '../generated/operations/registry.js';
import type { EsiClientConfiguration } from './configuration.js';
import {
  EsiGenericMutationDisabledError,
  EsiGenericMutationUnconfirmedError,
  EsiRequestValidationError,
  EsiUnknownOperationError,
} from './errors.js';
import { executeOperation, validateOperationRequestArguments } from './execute.js';
import type { OperationExecutionDescriptor } from './execute.js';
import type { OperationRequestArguments } from './request.js';
import type { EsiResponse } from './response.js';

export type StableOperationId = keyof GeneratedOperationSignatures;

export type CallOperationArguments<TStableId extends StableOperationId> =
  GeneratedOperationSignatures[TStableId]['input'] & OperationRequestArguments;

export type CallOperationResult<TStableId extends StableOperationId> =
  GeneratedOperationSignatures[TStableId]['output'];

export interface CallOperationOptions {
  readonly confirmMutation?: boolean;
}

export interface EsiOperationCaller {
  callOperation<TStableId extends StableOperationId>(
    stableId: TStableId,
    arguments_: CallOperationArguments<TStableId>,
    options?: CallOperationOptions,
  ): Promise<EsiResponse<CallOperationResult<TStableId>>>;
}

export function callOperation<TStableId extends StableOperationId>(
  client: EsiOperationCaller,
  stableId: TStableId,
  arguments_: CallOperationArguments<TStableId>,
  options: CallOperationOptions = {},
): Promise<EsiResponse<CallOperationResult<TStableId>>> {
  if (typeof client !== 'object' || client === null || typeof client.callOperation !== 'function') {
    throw new TypeError('callOperation requires an ESI client');
  }
  return client.callOperation(stableId, arguments_, options);
}

export async function executeRegisteredOperation<TStableId extends StableOperationId>(
  configuration: EsiClientConfiguration,
  stableId: TStableId,
  arguments_: CallOperationArguments<TStableId>,
  options: CallOperationOptions = {},
): Promise<EsiResponse<CallOperationResult<TStableId>>> {
  const entry =
    typeof stableId === 'string' && Object.hasOwn(operationRegistry, stableId)
      ? operationRegistry[stableId]
      : undefined;
  if (entry === undefined) {
    throw new EsiUnknownOperationError({
      operationId: typeof stableId === 'string' ? stableId : 'unknown',
    });
  }

  // The generated signature map restores the input/output types intentionally erased by the
  // serializable Record-shaped registry export.
  // oxlint-disable-next-line typescript/no-unsafe-type-assertion
  const descriptor = entry.transport as OperationExecutionDescriptor<
    CallOperationArguments<TStableId>,
    CallOperationResult<TStableId>
  >;
  const validatedArguments = validateOperationRequestArguments(descriptor, arguments_);
  const validatedOptions = validateCallOperationOptions(descriptor.operationId, options);
  assertGenericOperationSafety(
    configuration,
    descriptor.operationId,
    entry.classification,
    validatedOptions,
  );
  return executeOperation(configuration, descriptor, validatedArguments);
}

function assertGenericOperationSafety(
  configuration: EsiClientConfiguration,
  operationId: string,
  classification: 'read' | 'mutation',
  options: CallOperationOptions,
): void {
  if (classification === 'read') return;

  if (!configuration.allowGenericMutations) {
    throw new EsiGenericMutationDisabledError({ operationId });
  }
  if (options.confirmMutation !== true) {
    throw new EsiGenericMutationUnconfirmedError({ operationId });
  }
}

function validateCallOperationOptions(
  operationId: string,
  options: CallOperationOptions,
): CallOperationOptions {
  if (typeof options !== 'object' || options === null || Array.isArray(options)) {
    throw callOptionsValidationError(operationId, [], 'Call options must be an object');
  }
  for (const key of Object.keys(options)) {
    if (key !== 'confirmMutation') {
      throw callOptionsValidationError(operationId, [key], `Unknown call option: ${key}`);
    }
  }
  if (options.confirmMutation !== undefined && typeof options.confirmMutation !== 'boolean') {
    throw callOptionsValidationError(
      operationId,
      ['confirmMutation'],
      'confirmMutation must be a boolean',
    );
  }
  return options;
}

function callOptionsValidationError(
  operationId: string,
  path: readonly (string | number)[],
  message: string,
): EsiRequestValidationError {
  return new EsiRequestValidationError({
    operationId,
    issues: [{ path, message, code: 'invalid_call_option' }],
  });
}
