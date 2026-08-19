import type { OperationHttpMethod } from './client/request.js';
import {
  operationManifest,
  type SerializableOperationManifestEntry,
} from './generated/operations/manifest.js';

export type OperationSearchClassification = SerializableOperationManifestEntry['classification'];

export interface SearchOperationsOptions {
  readonly query?: string;
  readonly domain?: string;
  readonly method?: OperationHttpMethod;
  readonly authenticated?: boolean;
  readonly scopes?: readonly string[];
  readonly classification?: OperationSearchClassification;
  readonly limit?: number;
}

export interface OperationSearchResult {
  readonly operationId: string;
  readonly domain: string;
  readonly facadeMethod: string;
  readonly summary: string | null;
  readonly httpMethod: OperationHttpMethod;
  readonly authenticated: boolean;
  readonly scopes: readonly string[];
  readonly classification: OperationSearchClassification;
}

interface SearchField {
  readonly text: string;
  readonly priority: number;
}

interface OperationSearchDocument {
  readonly entry: SerializableOperationManifestEntry;
  readonly fields: readonly SearchField[];
  readonly text: string;
  readonly tokens: ReadonlySet<string>;
}

interface RankedOperation {
  readonly document: OperationSearchDocument;
  readonly score: number;
}

const DEFAULT_SEARCH_LIMIT = 20;
const MAX_SEARCH_LIMIT = 100;

const searchDocuments: readonly OperationSearchDocument[] = Object.freeze(
  operationManifest.operations.map(createSearchDocument),
);

export function searchOperations(
  options: SearchOperationsOptions = {},
): readonly OperationSearchResult[] {
  const limit = validateLimit(options.limit);
  if (limit === 0) return Object.freeze([]);

  const query = normalizeSearchText(options.query ?? '');
  const queryTokens = query === '' ? [] : query.split(' ');
  const domain = options.domain === undefined ? undefined : normalizeSearchText(options.domain);
  const scopes = options.scopes?.map(normalizeSearchText);
  const ranked: RankedOperation[] = [];

  for (const document of searchDocuments) {
    if (!matchesFilters(document.entry, options, domain, scopes)) continue;
    const score = query === '' ? 0 : scoreDocument(document, query, queryTokens);
    if (score !== null) ranked.push({ document, score });
  }

  ranked.sort(compareRankedOperations);
  return Object.freeze(
    ranked.slice(0, limit).map(({ document }) => createSearchResult(document.entry)),
  );
}

function createSearchDocument(entry: SerializableOperationManifestEntry): OperationSearchDocument {
  const authenticationTerms = entry.authentication.required
    ? ['authenticated', 'authentication required']
    : ['public', 'unauthenticated', 'authentication not required'];
  const fields: SearchField[] = [];
  appendSearchFields(fields, [entry.operationId], 10);
  appendSearchFields(fields, [entry.facade.domain], 9);
  appendSearchFields(fields, [entry.facade.method], 8);
  appendSearchFields(fields, [entry.summary], 7);
  appendSearchFields(fields, [entry.description], 6);
  appendSearchFields(fields, [entry.http.method], 5);
  appendSearchFields(fields, authenticationTerms, 4);
  appendSearchFields(fields, entry.authentication.scopes, 3);
  appendSearchFields(fields, [entry.classification], 2);
  const text = fields.map((field) => field.text).join(' ');
  return Object.freeze({
    entry,
    fields: Object.freeze(fields),
    text,
    tokens: new Set(text.split(' ')),
  });
}

function appendSearchFields(
  fields: SearchField[],
  values: readonly (string | null)[],
  priority: number,
): void {
  for (const value of values) {
    if (value === null) continue;
    const text = normalizeSearchText(value);
    if (text !== '') fields.push({ text, priority });
  }
}

function scoreDocument(
  document: OperationSearchDocument,
  query: string,
  queryTokens: readonly string[],
): number | null {
  let exactPriority = -1;
  let prefixPriority = -1;
  for (const field of document.fields) {
    if (field.text === query) exactPriority = Math.max(exactPriority, field.priority);
    else if (field.text.startsWith(query))
      prefixPriority = Math.max(prefixPriority, field.priority);
  }
  if (exactPriority >= 0) return 400 + exactPriority;
  if (prefixPriority >= 0) return 300 + prefixPriority;
  if (queryTokens.every((token) => document.tokens.has(token))) return 200;
  if (queryTokens.every((token) => document.text.includes(token))) return 100;
  return null;
}

function matchesFilters(
  entry: SerializableOperationManifestEntry,
  options: SearchOperationsOptions,
  domain: string | undefined,
  scopes: readonly string[] | undefined,
): boolean {
  if (domain !== undefined && normalizeSearchText(entry.facade.domain) !== domain) return false;
  if (options.method !== undefined && entry.http.method !== options.method) return false;
  if (
    options.authenticated !== undefined &&
    entry.authentication.required !== options.authenticated
  ) {
    return false;
  }
  if (options.classification !== undefined && entry.classification !== options.classification) {
    return false;
  }
  if (scopes !== undefined) {
    const operationScopes = new Set(entry.authentication.scopes.map(normalizeSearchText));
    if (!scopes.every((scope) => operationScopes.has(scope))) return false;
  }
  return true;
}

function createSearchResult(entry: SerializableOperationManifestEntry): OperationSearchResult {
  return Object.freeze({
    operationId: entry.operationId,
    domain: entry.facade.domain,
    facadeMethod: entry.facade.method,
    summary: entry.summary,
    httpMethod: entry.http.method,
    authenticated: entry.authentication.required,
    scopes: Object.freeze([...entry.authentication.scopes]),
    classification: entry.classification,
  });
}

function validateLimit(limit: number | undefined): number {
  if (limit === undefined) return DEFAULT_SEARCH_LIMIT;
  if (!Number.isInteger(limit)) throw new TypeError('Operation search limit must be an integer');
  if (limit < 0 || limit > MAX_SEARCH_LIMIT) {
    throw new RangeError(`Operation search limit must be between 0 and ${MAX_SEARCH_LIMIT}`);
  }
  return limit;
}

function normalizeSearchText(value: string): string {
  return value
    .normalize('NFKC')
    .replaceAll(/([\p{Ll}\p{N}])(\p{Lu})/gu, '$1 $2')
    .replaceAll(/[^\p{L}\p{N}]+/gu, ' ')
    .trim()
    .toLowerCase()
    .replaceAll(/\s+/gu, ' ');
}

function compareRankedOperations(left: RankedOperation, right: RankedOperation): number {
  if (left.score !== right.score) return right.score - left.score;
  const leftId = left.document.entry.operationId;
  const rightId = right.document.entry.operationId;
  return leftId < rightId ? -1 : leftId > rightId ? 1 : 0;
}
