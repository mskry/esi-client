import { executeRegisteredOperation } from './call-operation.js';
import type {
  CallOperationArguments,
  CallOperationOptions,
  CallOperationResult,
  StableOperationId,
} from './call-operation.js';
import { EsiClientConfiguration } from './configuration.js';
import type { EsiClientOptions } from './options.js';
import type { EsiResponse } from './response.js';

export abstract class EsiClientBase {
  readonly configuration: EsiClientConfiguration;

  protected constructor(options: EsiClientOptions = {}) {
    this.configuration = new EsiClientConfiguration(options);
  }

  callOperation<TStableId extends StableOperationId>(
    stableId: TStableId,
    arguments_: CallOperationArguments<TStableId>,
    options: CallOperationOptions = {},
  ): Promise<EsiResponse<CallOperationResult<TStableId>>> {
    return executeRegisteredOperation(this.configuration, stableId, arguments_, options);
  }
}
