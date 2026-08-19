import { describe, expect, it, vi } from 'vitest';

import {
  EsiClient,
  EsiHttpError,
  GetStatusSuccessResponseSchema,
  StatusDomainClient,
} from '../src/index';
import * as sdk from '../src/index';

describe('root client surface', () => {
  it('exports the generated client, domain, and schema behavior', async () => {
    const fetchApi = vi.fn<typeof fetch>(
      async () =>
        new Response(
          JSON.stringify({
            players: 42,
            server_version: 'test',
            start_time: '2026-08-18T00:00:00Z',
            vip: false,
          }),
          { status: 200, headers: { 'content-type': 'application/json' } },
        ),
    );
    const client = new EsiClient({ baseUrl: 'https://example.test', fetch: fetchApi });

    expect(client.status).toBeInstanceOf(StatusDomainClient);
    const status = await client.status.getStatus({ compatibilityDate: '2020-01-01' });

    expect(fetchApi).toHaveBeenCalledOnce();
    const [url, init] = fetchApi.mock.calls[0];
    expect(url).toBe('https://example.test/status');
    expect(init?.method).toBe('GET');
    expect(new Headers(init?.headers).get('x-compatibility-date')).toBe('2020-01-01');
    expect(status).toEqual({
      players: 42,
      server_version: 'test',
      start_time: '2026-08-18T00:00:00Z',
      vip: false,
    });
    expect(GetStatusSuccessResponseSchema.parse(status)).toEqual(status);
  });

  it('exports structured HTTP errors without prototype exports', async () => {
    const client = new EsiClient({
      baseUrl: 'https://example.test',
      fetch: async () => new Response('unavailable', { status: 503 }),
    });

    const error = await client.status.getStatus().catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(EsiHttpError);
    if (!(error instanceof EsiHttpError)) throw error;
    expect(error.status).toBe(503);
    expect(error.code).toBe('ESI_HTTP_ERROR');
    expect(sdk).not.toHaveProperty('Configuration');
    expect(sdk).not.toHaveProperty('StatusApi');
  });
});
