export interface EsiPaginationMetadata {
  readonly pages?: number;
  readonly cursor?: string;
  readonly nextCursor?: string;
  readonly previousCursor?: string;
}

export interface EsiCacheMetadata {
  readonly etag?: string;
  readonly expires?: string;
  readonly lastModified?: string;
  readonly cacheControl?: string;
}

export interface EsiErrorLimitMetadata {
  readonly remaining?: number;
  readonly reset?: number;
}

export interface EsiResponseMetadataInput {
  readonly headers?: Readonly<Record<string, string>>;
  readonly requestId?: string;
  readonly pagination?: EsiPaginationMetadata;
  readonly cache?: EsiCacheMetadata;
  readonly errorLimit?: EsiErrorLimitMetadata;
}

export interface EsiResponseMetadata {
  readonly status: number;
  readonly headers: Readonly<Record<string, string>>;
  readonly requestId?: string;
  readonly pagination?: EsiPaginationMetadata;
  readonly cache?: EsiCacheMetadata;
  readonly errorLimit?: EsiErrorLimitMetadata;
}

export interface EsiResponse<T> {
  readonly data: T;
  readonly meta: EsiResponseMetadata;
}

const nonnegativeIntegerPattern: RegExp = /^(?:0|[1-9]\d*)$/u;
const finiteNumberPattern: RegExp = /^-?(?:0|[1-9]\d*)(?:\.\d+)?(?:e[+-]?\d+)?$/iu;

export function extractEsiResponseMetadata(status: number, headers: Headers): EsiResponseMetadata {
  if (!Number.isInteger(status) || status < 0 || status > 999) {
    throw new TypeError('Response status must be an integer between 0 and 999');
  }

  const headerRecord = headersToRecord(headers);
  const metadata: {
    status: number;
    headers: Readonly<Record<string, string>>;
    requestId?: string;
    pagination?: EsiPaginationMetadata;
    cache?: EsiCacheMetadata;
    errorLimit?: EsiErrorLimitMetadata;
  } = { status, headers: headerRecord };

  const requestId = firstPresentHeader(headerRecord, ['x-esi-request-id', 'x-request-id']);
  if (requestId !== undefined) metadata.requestId = requestId;

  const pagination = extractPagination(headerRecord);
  if (pagination !== undefined) metadata.pagination = pagination;

  const cache = extractCache(headerRecord);
  if (cache !== undefined) metadata.cache = cache;

  const errorLimit = extractErrorLimit(headerRecord);
  if (errorLimit !== undefined) metadata.errorLimit = errorLimit;

  return Object.freeze(metadata);
}

export function createEsiResponse<T>(data: T, meta: EsiResponseMetadata): EsiResponse<T> {
  return Object.freeze({ data, meta: freezeMetadata(meta) });
}

function freezeMetadata(input: EsiResponseMetadata): EsiResponseMetadata {
  const metadata: {
    status: number;
    headers: Readonly<Record<string, string>>;
    requestId?: string;
    pagination?: EsiPaginationMetadata;
    cache?: EsiCacheMetadata;
    errorLimit?: EsiErrorLimitMetadata;
  } = {
    status: input.status,
    headers: freezeRecord(input.headers),
  };
  if (input.requestId !== undefined) metadata.requestId = input.requestId;
  if (input.pagination !== undefined) metadata.pagination = Object.freeze({ ...input.pagination });
  if (input.cache !== undefined) metadata.cache = Object.freeze({ ...input.cache });
  if (input.errorLimit !== undefined) metadata.errorLimit = Object.freeze({ ...input.errorLimit });
  return Object.freeze(metadata);
}

function freezeRecord(input: Readonly<Record<string, string>>): Readonly<Record<string, string>> {
  const result: Record<string, string> = {};
  for (const [name, value] of Object.entries(input)) {
    Object.defineProperty(result, name, {
      value,
      enumerable: true,
      configurable: false,
      writable: false,
    });
  }
  return Object.freeze(result);
}

function headersToRecord(headers: Headers): Readonly<Record<string, string>> {
  const result: Record<string, string> = {};
  headers.forEach((value, rawName) => {
    Object.defineProperty(result, rawName.toLowerCase(), {
      value,
      enumerable: true,
      configurable: false,
      writable: false,
    });
  });
  return Object.freeze(result);
}

function extractPagination(
  headers: Readonly<Record<string, string>>,
): EsiPaginationMetadata | undefined {
  const pagination: {
    pages?: number;
    cursor?: string;
    nextCursor?: string;
    previousCursor?: string;
  } = {};
  const pages = parseNonnegativeInteger(headers['x-pages']);
  if (pages !== undefined) pagination.pages = pages;
  const cursor = nonemptyHeader(headers['x-cursor']);
  if (cursor !== undefined) pagination.cursor = cursor;
  const nextCursor = nonemptyHeader(headers['x-next-cursor']);
  if (nextCursor !== undefined) pagination.nextCursor = nextCursor;
  const previousCursor = nonemptyHeader(headers['x-previous-cursor']);
  if (previousCursor !== undefined) pagination.previousCursor = previousCursor;
  return Object.keys(pagination).length === 0 ? undefined : Object.freeze(pagination);
}

function extractCache(headers: Readonly<Record<string, string>>): EsiCacheMetadata | undefined {
  const cache: {
    etag?: string;
    expires?: string;
    lastModified?: string;
    cacheControl?: string;
  } = {};
  const etag = nonemptyHeader(headers.etag);
  if (etag !== undefined) cache.etag = etag;
  const expires = nonemptyHeader(headers.expires);
  if (expires !== undefined) cache.expires = expires;
  const lastModified = nonemptyHeader(headers['last-modified']);
  if (lastModified !== undefined) cache.lastModified = lastModified;
  const cacheControl = nonemptyHeader(headers['cache-control']);
  if (cacheControl !== undefined) cache.cacheControl = cacheControl;
  return Object.keys(cache).length === 0 ? undefined : Object.freeze(cache);
}

function extractErrorLimit(
  headers: Readonly<Record<string, string>>,
): EsiErrorLimitMetadata | undefined {
  const errorLimit: { remaining?: number; reset?: number } = {};
  const remaining = parseFiniteNumber(headers['x-esi-error-limit-remain']);
  if (remaining !== undefined) errorLimit.remaining = remaining;
  const reset = parseFiniteNumber(headers['x-esi-error-limit-reset']);
  if (reset !== undefined) errorLimit.reset = reset;
  return Object.keys(errorLimit).length === 0 ? undefined : Object.freeze(errorLimit);
}

function firstPresentHeader(
  headers: Readonly<Record<string, string>>,
  names: readonly string[],
): string | undefined {
  for (const name of names) {
    const value = nonemptyHeader(headers[name]);
    if (value !== undefined) return value;
  }
  return undefined;
}

function nonemptyHeader(value: string | undefined): string | undefined {
  return value === undefined || value.length === 0 ? undefined : value;
}

function parseNonnegativeInteger(value: string | undefined): number | undefined {
  if (value === undefined || !nonnegativeIntegerPattern.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isSafeInteger(parsed) ? parsed : undefined;
}

function parseFiniteNumber(value: string | undefined): number | undefined {
  if (value === undefined || !finiteNumberPattern.test(value)) return undefined;
  const parsed = Number(value);
  return Number.isFinite(parsed) ? parsed : undefined;
}
