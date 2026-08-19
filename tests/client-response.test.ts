import { describe, expect, it, vi } from 'vitest';

import { EsiClientConfiguration } from '../src/client/configuration.js';
import { EsiHttpError } from '../src/client/errors.js';
import { executeOperation } from '../src/client/execute.js';
import type { OperationExecutionDescriptor } from '../src/client/execute.js';
import type { OperationSchema } from '../src/client/request.js';
import { createEsiResponse, extractEsiResponseMetadata } from '../src/client/response.js';

describe('ESI response metadata', () => {
  it('extracts every normalized field while preserving lowercase raw headers', () => {
    const headers = new Headers();
    headers.append('X-Custom', 'first');
    headers.append('x-CUSTOM', 'second');
    headers.set('X-Esi-Request-Id', 'request-42');
    headers.set('X-Pages', '7');
    headers.set('X-Cursor', 'current-cursor');
    headers.set('X-Next-Cursor', 'next-cursor');
    headers.set('X-Previous-Cursor', 'previous-cursor');
    headers.set('ETag', '"revision-3"');
    headers.set('Expires', 'Wed, 19 Aug 2026 12:00:00 GMT');
    headers.set('Last-Modified', 'Tue, 18 Aug 2026 10:00:00 GMT');
    headers.set('Cache-Control', 'public, max-age=300');
    headers.set('X-Esi-Error-Limit-Remain', '98.5');
    headers.set('X-Esi-Error-Limit-Reset', '12');

    const metadata = extractEsiResponseMetadata(200, headers);

    expect(metadata).toEqual({
      status: 200,
      headers: {
        'cache-control': 'public, max-age=300',
        etag: '"revision-3"',
        expires: 'Wed, 19 Aug 2026 12:00:00 GMT',
        'last-modified': 'Tue, 18 Aug 2026 10:00:00 GMT',
        'x-cursor': 'current-cursor',
        'x-custom': 'first, second',
        'x-esi-error-limit-remain': '98.5',
        'x-esi-error-limit-reset': '12',
        'x-esi-request-id': 'request-42',
        'x-next-cursor': 'next-cursor',
        'x-pages': '7',
        'x-previous-cursor': 'previous-cursor',
      },
      requestId: 'request-42',
      pagination: {
        pages: 7,
        cursor: 'current-cursor',
        nextCursor: 'next-cursor',
        previousCursor: 'previous-cursor',
      },
      cache: {
        etag: '"revision-3"',
        expires: 'Wed, 19 Aug 2026 12:00:00 GMT',
        lastModified: 'Tue, 18 Aug 2026 10:00:00 GMT',
        cacheControl: 'public, max-age=300',
      },
      errorLimit: { remaining: 98.5, reset: 12 },
    });
  });

  it('keeps malformed numeric headers raw without exposing normalized numbers', () => {
    const headers = new Headers({
      'X-Pages': '2.5',
      'X-Esi-Error-Limit-Remain': 'many',
      'X-Esi-Error-Limit-Reset': '1e999',
    });

    const metadata = extractEsiResponseMetadata(429, headers);

    expect(metadata.headers).toEqual({
      'x-esi-error-limit-remain': 'many',
      'x-esi-error-limit-reset': '1e999',
      'x-pages': '2.5',
    });
    expect(metadata.pagination).toBeUndefined();
    expect(metadata.errorLimit).toBeUndefined();
  });

  it('creates a deeply immutable serializable envelope without freezing data', () => {
    const data = { mutable: true };
    const metadata = {
      status: 200,
      headers: { etag: '"revision"', 'x-pages': '3' },
      pagination: { pages: 3 },
      cache: { etag: '"revision"' },
    };
    const response = createEsiResponse(data, metadata);

    expect(response.data).toBe(data);
    expect(Object.isFrozen(data)).toBe(false);
    expect(Object.isFrozen(response)).toBe(true);
    expect(Object.isFrozen(response.meta)).toBe(true);
    expect(Object.isFrozen(response.meta.headers)).toBe(true);
    expect(Object.isFrozen(response.meta.pagination)).toBe(true);
    expect(Object.isFrozen(response.meta.cache)).toBe(true);
    metadata.headers['x-pages'] = '99';
    metadata.pagination.pages = 99;
    expect(response.meta.headers['x-pages']).toBe('3');
    expect(response.meta.pagination?.pages).toBe(3);
    expect(() => {
      (response.meta.headers as Record<string, string>)['x-pages'] = '99';
    }).toThrow(TypeError);
    expect(JSON.parse(JSON.stringify(response))).toEqual({
      data: { mutable: true },
      meta: {
        status: 200,
        headers: { etag: '"revision"', 'x-pages': '3' },
        pagination: { pages: 3 },
        cache: { etag: '"revision"' },
      },
    });

    data.mutable = false;
    expect(response.data.mutable).toBe(false);
  });

  it('returns a no-content envelope with undefined data and makes no pagination requests', async () => {
    const fetch = vi.fn<typeof globalThis.fetch>(
      async () => new Response(null, { status: 204, headers: { 'X-Pages': '5' } }),
    );

    const response = await executeOperation(
      new EsiClientConfiguration({ fetch }),
      operation({ successResponses: [{ status: 204, body: 'none' }] }),
      {},
    );

    expect(response).toEqual({
      data: undefined,
      meta: { status: 204, headers: { 'x-pages': '5' }, pagination: { pages: 5 } },
    });
    expect(fetch).toHaveBeenCalledTimes(1);
  });

  it('uses the same extracted metadata for HTTP errors', async () => {
    const headers = new Headers({
      'X-Esi-Request-Id': 'failed-request',
      'X-Pages': '4',
      ETag: '"failed-revision"',
      'X-Esi-Error-Limit-Remain': '17',
      'X-Esi-Error-Limit-Reset': '8',
    });
    const expected = extractEsiResponseMetadata(429, headers);
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json({ error: 'limited' }, { status: 429, headers }),
    );

    let thrown: unknown;
    try {
      await executeOperation(new EsiClientConfiguration({ fetch }), operation(), {});
    } catch (error) {
      thrown = error;
    }

    expect(thrown).toBeInstanceOf(EsiHttpError);
    expect(thrown).toMatchObject({ metadata: expected });
    expect(JSON.parse(JSON.stringify(thrown))).toMatchObject({ metadata: expected });
  });
});

const passthroughSchema: OperationSchema = {
  safeParse: (value: unknown) => ({ success: true, data: value }),
};

function operation(
  overrides: Partial<OperationExecutionDescriptor> = {},
): OperationExecutionDescriptor {
  return {
    operationId: 'get_items',
    method: 'GET',
    path: '/items',
    parameters: [],
    requestBody: null,
    authentication: null,
    successResponses: [{ status: 200, body: 'json', schema: passthroughSchema }],
    ...overrides,
  };
}
