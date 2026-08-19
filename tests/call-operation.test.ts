import { describe, expect, it, vi } from 'vitest';

import { EsiClient } from '../src/generated/esi-client.js';
import type { GetStatusOutput } from '../src/generated/schemas/operations.js';
import { callOperation } from '../src/operations.js';
import type { EsiResponse } from '../src/client/response.js';
import {
  EsiAuthenticationRequiredError,
  EsiGenericMutationDisabledError,
  EsiGenericMutationUnconfirmedError,
  EsiRequestValidationError,
  EsiUnknownOperationError,
} from '../src/client/errors.js';
import type { CallOperationArguments } from '../src/client/call-operation.js';

describe('generic operation execution', () => {
  it('executes a public read through EsiClient with typed serializable data', async () => {
    const fetch = statusFetch();
    const client = new EsiClient({ baseUrl: 'https://esi.example.test', fetch });

    const response: EsiResponse<GetStatusOutput> = await client.callOperation('GetStatus', {});

    expect(response.data.players).toBe(42);
    expect(JSON.parse(JSON.stringify(response))).toEqual(response);
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0]?.[0]).toBe('https://esi.example.test/status');
  });

  it('exports a client-bound operation helper and preserves custom fetch metadata', async () => {
    const fetch = statusFetch({
      'cache-control': 'public, max-age=30',
      etag: 'status-etag',
      'x-esi-error-limit-remain': '99',
      'x-esi-error-limit-reset': '12',
      'x-esi-request-id': 'request-generic-1',
      'x-pages': '17',
    });
    const client = new EsiClient({ baseUrl: 'https://custom.example', fetch });

    const response = await callOperation(client, 'GetStatus', {});

    expect(fetch).toHaveBeenCalledOnce();
    expect(response.meta).toMatchObject({
      status: 200,
      requestId: 'request-generic-1',
      pagination: { pages: 17 },
      cache: { cacheControl: 'public, max-age=30', etag: 'status-etag' },
      errorLimit: { remaining: 99, reset: 12 },
    });
    expect(response.meta.headers['x-pages']).toBe('17');
  });

  it('always validates operation arguments before network activity', async () => {
    const fetch = statusFetch();
    const client = new EsiClient({ fetch, validateRequests: false });

    const promise = client.callOperation('GetAlliancesAllianceId', {
      // @ts-expect-error Exercise the generic runtime validation boundary.
      path: { alliance_id: 'not-an-integer' },
    });

    await expect(promise).rejects.toBeInstanceOf(EsiRequestValidationError);
    expect(fetch).not.toHaveBeenCalled();
  });

  it('reports exact unknown IDs with the existing structured error', async () => {
    const fetch = statusFetch();
    const client = new EsiClient({ fetch });

    const promise = client.callOperation(
      // @ts-expect-error Runtime JavaScript callers can provide unknown IDs.
      'getstatus',
      {},
    );

    await expect(promise).rejects.toBeInstanceOf(EsiUnknownOperationError);
    await expect(promise).rejects.toMatchObject({
      code: 'ESI_UNKNOWN_OPERATION',
      operationId: 'getstatus',
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('uses descriptor authentication scopes and fails before network without a token', async () => {
    const fetch = statusFetch();
    const client = new EsiClient({ fetch });

    const promise = client.callOperation('GetCharactersCharacterIdLocation', {
      path: { character_id: 2_112_625_428 },
    });

    await expect(promise).rejects.toBeInstanceOf(EsiAuthenticationRequiredError);
    await expect(promise).rejects.toMatchObject({
      code: 'ESI_AUTHENTICATION_REQUIRED',
      scopes: ['esi-location.read_location.v1'],
    });
    expect(fetch).not.toHaveBeenCalled();
  });

  it('denies a generic mutation by default with a secret-free structured error', async () => {
    const secret = 'default-gate-provider-secret';
    const tokenProvider = vi.fn<() => Promise<string>>(async () => secret);
    const fetch = contactMutationFetch();
    const client = new EsiClient({ fetch, tokenProvider });

    const error = await client
      .callOperation('PostCharactersCharacterIdContacts', contactMutationArguments())
      .catch((caught: unknown) => caught);

    expect(error).toBeInstanceOf(EsiGenericMutationDisabledError);
    expect(error).toMatchObject({
      code: 'ESI_GENERIC_MUTATION_DISABLED',
      operationId: 'PostCharactersCharacterIdContacts',
    });
    expect(JSON.stringify(error)).not.toContain(secret);
    expect(tokenProvider).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('requires per-call confirmation when only the client mutation gate is enabled', async () => {
    const tokenProvider = vi.fn<() => Promise<string>>(async () => 'only-client-gate-secret');
    const fetch = contactMutationFetch();
    const client = new EsiClient({ allowGenericMutations: true, fetch, tokenProvider });

    const promise = client.callOperation(
      'PostCharactersCharacterIdContacts',
      contactMutationArguments(),
    );

    await expect(promise).rejects.toBeInstanceOf(EsiGenericMutationUnconfirmedError);
    await expect(promise).rejects.toMatchObject({ code: 'ESI_GENERIC_MUTATION_UNCONFIRMED' });
    expect(tokenProvider).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('keeps the client gate mandatory when only per-call confirmation is present', async () => {
    const tokenProvider = vi.fn<() => Promise<string>>(async () => 'only-confirm-gate-secret');
    const fetch = contactMutationFetch();
    const client = new EsiClient({ fetch, tokenProvider });

    const promise = client.callOperation(
      'PostCharactersCharacterIdContacts',
      contactMutationArguments(),
      { confirmMutation: true },
    );

    await expect(promise).rejects.toBeInstanceOf(EsiGenericMutationDisabledError);
    expect(tokenProvider).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('executes a true generic mutation with both gates and does not send call options', async () => {
    const fetch = contactMutationFetch();
    const client = new EsiClient({
      allowGenericMutations: true,
      fetch,
      token: 'both-gates-token',
    });

    const response = await client.callOperation(
      'PostCharactersCharacterIdContacts',
      contactMutationArguments(),
      { confirmMutation: true },
    );

    expect(response.data).toEqual([2_112_625_429]);
    expect(fetch).toHaveBeenCalledOnce();
    const request = fetch.mock.calls[0]?.[1];
    expect(request?.method).toBe('POST');
    expect(request?.body).toBe('[2112625429]');
  });

  it('validates generic arguments before mutation gates and rejects confirmation in arguments', async () => {
    const tokenProvider = vi.fn<() => Promise<string>>(async () => 'validation-order-secret');
    const fetch = contactMutationFetch();
    const client = new EsiClient({ allowGenericMutations: true, fetch, tokenProvider });

    const promise = client.callOperation(
      'PostCharactersCharacterIdContacts',
      {
        ...contactMutationArguments(),
        // @ts-expect-error Confirmation belongs to call options, not operation arguments.
        confirmMutation: true,
      },
      { confirmMutation: true },
    );

    await expect(promise).rejects.toBeInstanceOf(EsiRequestValidationError);
    expect(tokenProvider).not.toHaveBeenCalled();
    expect(fetch).not.toHaveBeenCalled();
  });

  it('executes a reviewed read-like POST without either generic mutation gate', async () => {
    const characterId = 2_112_625_428;
    const tokenProvider = vi.fn<() => Promise<string>>(async () => 'unused-read-like-token');
    const fetch = vi.fn<typeof globalThis.fetch>(async () =>
      Response.json([{ character_id: characterId, corporation_id: 98_000_001 }]),
    );
    const client = new EsiClient({ fetch, tokenProvider });

    const response = await client.callOperation('PostCharactersAffiliation', {
      body: [characterId],
    });

    expect(response.data).toEqual([{ character_id: characterId, corporation_id: 98_000_001 }]);
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0]?.[1]?.method).toBe('POST');
    expect(tokenProvider).not.toHaveBeenCalled();
  });

  it('allows a named typed mutation on a default client without generic gates', async () => {
    const fetch = contactMutationFetch();
    const client = new EsiClient({ fetch, token: 'typed-mutation-token' });

    await expect(
      client.contacts.addCharacterContacts(2_112_625_428, {
        body: [2_112_625_429],
        standing: 5,
      }),
    ).resolves.toEqual([2_112_625_429]);
    expect(fetch).toHaveBeenCalledOnce();
    expect(fetch.mock.calls[0]?.[1]?.method).toBe('POST');
  });
});

function contactMutationArguments(): CallOperationArguments<'PostCharactersCharacterIdContacts'> {
  return {
    path: { character_id: 2_112_625_428 },
    query: { standing: 5 },
    body: [2_112_625_429],
  };
}

function contactMutationFetch(): ReturnType<typeof vi.fn<typeof globalThis.fetch>> {
  return vi.fn<typeof globalThis.fetch>(async () =>
    Response.json([2_112_625_429], { status: 201 }),
  );
}

function statusFetch(headers: HeadersInit = {}): ReturnType<typeof vi.fn<typeof globalThis.fetch>> {
  return vi.fn<typeof globalThis.fetch>(async () =>
    Response.json(
      {
        players: 42,
        server_version: 'generic-test',
        start_time: '2026-08-18T00:00:00Z',
        vip: false,
      },
      { headers },
    ),
  );
}
