import { describe, expect, it, vi } from 'vitest';

import {
  EsiClient,
  EsiHttpError,
  EsiRequestValidationError,
  EsiResponseValidationError,
} from '../src/index.js';
import { createContactsClient } from '../src/generated/domains/contacts.js';
import { createLocationClient } from '../src/generated/domains/location.js';
import { createStatusClient } from '../src/generated/domains/status.js';

describe('standalone domain parity', () => {
  it('matches aggregate request construction, compatibility dates, data, and metadata', async () => {
    const standaloneRequests: Request[] = [];
    const aggregateRequests: Request[] = [];
    const standalone = createStatusClient({
      baseUrl: 'https://esi.example.test',
      fetch: statusFetch(standaloneRequests),
    });
    const aggregate = new EsiClient({
      baseUrl: 'https://esi.example.test',
      fetch: statusFetch(aggregateRequests),
    });
    const options = {
      compatibilityDate: '2026-08-19',
      ifNoneMatch: 'status-etag',
      xTenant: 'tranquility',
    } as const;

    expect(standalone).toEqual(expect.objectContaining({ get: expect.any(Function) }));
    await expect(standalone.get(options)).resolves.toEqual(await aggregate.status.get(options));
    expect(requestSnapshot(standaloneRequests[0])).toEqual(requestSnapshot(aggregateRequests[0]));
    expect(standaloneRequests[0]?.headers.get('x-compatibility-date')).toBe('2026-08-19');

    const standaloneMetadata = await standalone.withMetadata().get(options);
    const aggregateMetadata = await aggregate.status.withMetadata().get(options);
    expect(standaloneMetadata).toEqual(aggregateMetadata);
    expect(Object.isFrozen(standaloneMetadata)).toBe(true);
    expect(Object.isFrozen(standaloneMetadata.meta)).toBe(true);
    expect(Object.isFrozen(standalone.withMetadata())).toBe(true);
  });

  it('matches authentication and keeps credentials out of results and metadata', async () => {
    const secret = 'standalone-parity-secret';
    const standaloneRequests: Request[] = [];
    const aggregateRequests: Request[] = [];
    const standalone = createLocationClient({
      token: secret,
      fetch: locationFetch(standaloneRequests),
    });
    const aggregate = new EsiClient({
      token: secret,
      fetch: locationFetch(aggregateRequests),
    });

    const standaloneResult = await standalone.withMetadata().get(2_112_625_428);
    const aggregateResult = await aggregate.location.withMetadata().get(2_112_625_428);

    expect(standaloneResult).toEqual(aggregateResult);
    expect(standaloneRequests[0]?.headers.get('authorization')).toBe(`Bearer ${secret}`);
    expect(requestSnapshot(standaloneRequests[0])).toEqual(requestSnapshot(aggregateRequests[0]));
    expect(JSON.stringify(standaloneResult)).not.toContain(secret);
  });

  it.each([
    {
      name: 'response validation',
      fetch: async () => Response.json({ players: 'invalid' }),
      error: EsiResponseValidationError,
    },
    {
      name: 'HTTP errors',
      fetch: async () => new Response('unavailable', { status: 503 }),
      error: EsiHttpError,
    },
  ])('matches $name', async ({ fetch, error }) => {
    const standalone = createStatusClient({ fetch });
    const aggregate = new EsiClient({ fetch });

    await expect(standalone.get()).rejects.toBeInstanceOf(error);
    await expect(aggregate.status.get()).rejects.toBeInstanceOf(error);
  });

  it('matches request validation and named typed-mutation intent', async () => {
    const standaloneRequests: Request[] = [];
    const aggregateRequests: Request[] = [];
    const standaloneFetch = contactFetch(standaloneRequests);
    const aggregateFetch = contactFetch(aggregateRequests);
    const standalone = createContactsClient({
      fetch: standaloneFetch,
      token: 'standalone-contact-token',
      validateRequests: true,
    });
    const aggregate = new EsiClient({
      fetch: aggregateFetch,
      token: 'standalone-contact-token',
      validateRequests: true,
    });
    const options = { body: [2_112_625_429], standing: 5 };

    await expect(standalone.addCharacterContacts(2_112_625_428, options)).resolves.toEqual([
      2_112_625_429,
    ]);
    await expect(aggregate.contacts.addCharacterContacts(2_112_625_428, options)).resolves.toEqual([
      2_112_625_429,
    ]);
    expect(requestSnapshot(standaloneRequests[0])).toEqual(requestSnapshot(aggregateRequests[0]));
    expect(standaloneRequests[0]?.method).toBe('POST');

    const invalid = { body: ['invalid'], standing: 5 };
    await expect(
      // @ts-expect-error The fixture deliberately violates the generated request type.
      standalone.addCharacterContacts(2_112_625_428, invalid),
    ).rejects.toBeInstanceOf(EsiRequestValidationError);
    await expect(
      // @ts-expect-error The aggregate path must reject the same invalid fixture.
      aggregate.contacts.addCharacterContacts(2_112_625_428, invalid),
    ).rejects.toBeInstanceOf(EsiRequestValidationError);
    expect(standaloneFetch).toHaveBeenCalledOnce();
    expect(aggregateFetch).toHaveBeenCalledOnce();
  });
});

function statusFetch(requests: Request[]): typeof fetch {
  return async (input, init) => {
    requests.push(new Request(input, init));
    return Response.json(
      {
        players: 42,
        server_version: 'parity',
        start_time: '2026-08-18T00:00:00Z',
        vip: false,
      },
      { headers: { 'x-request-id': 'parity-request' } },
    );
  };
}

function locationFetch(requests: Request[]): typeof fetch {
  return async (input, init) => {
    requests.push(new Request(input, init));
    return Response.json({ solar_system_id: 30_000_142 });
  };
}

function contactFetch(requests: Request[]): ReturnType<typeof vi.fn<typeof fetch>> {
  return vi.fn<typeof fetch>(async (input, init) => {
    requests.push(new Request(input, init));
    return Response.json([2_112_625_429], { status: 201 });
  });
}

function requestSnapshot(request: Request | undefined): unknown {
  if (request === undefined) throw new Error('Expected a request');
  return {
    headers: Object.fromEntries(request.headers),
    method: request.method,
    url: request.url,
  };
}
