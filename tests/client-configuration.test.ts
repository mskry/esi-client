import { describe, expect, it, vi } from 'vitest';

import {
  DEFAULT_ESI_BASE_URL,
  DEFAULT_ESI_LANGUAGE,
  EsiClientConfiguration,
  PINNED_ESI_COMPATIBILITY_DATE,
} from '../src/client/configuration.js';
import type { EsiLanguage } from '../src/client/configuration.js';

describe('EsiClientConfiguration', () => {
  it('uses safe public-client defaults', () => {
    const configuration = new EsiClientConfiguration();

    expect(configuration).toMatchObject({
      baseUrl: DEFAULT_ESI_BASE_URL,
      compatibilityDate: PINNED_ESI_COMPATIBILITY_DATE,
      language: DEFAULT_ESI_LANGUAGE,
      fetch: globalThis.fetch,
      validateResponses: true,
      validateRequests: false,
      allowGenericMutations: false,
    });
    expect(configuration.token).toBeUndefined();
    expect(configuration.tokenProvider).toBeUndefined();
  });

  it('snapshots and normalizes supported overrides', () => {
    const options = {
      baseUrl: 'http://localhost:3000/esi/',
      compatibilityDate: '2025-05-06',
      language: 'ja' as EsiLanguage,
      validateResponses: false,
      validateRequests: true,
      allowGenericMutations: true,
    };
    const configuration = new EsiClientConfiguration(options);

    options.baseUrl = 'https://changed.example';
    options.compatibilityDate = '2024-01-01';
    options.language = 'en';
    options.validateResponses = true;
    options.validateRequests = false;
    options.allowGenericMutations = false;

    expect(configuration.toJSON()).toEqual({
      baseUrl: 'http://localhost:3000/esi',
      compatibilityDate: '2025-05-06',
      language: 'ja',
      validateResponses: false,
      validateRequests: true,
      allowGenericMutations: true,
    });
  });

  it('freezes configuration and excludes credentials from serialization', () => {
    const token = 'secret-access-token';
    const configuration = new EsiClientConfiguration({ token });

    expect(Object.isFrozen(configuration)).toBe(true);
    expect(Object.isFrozen(configuration.toJSON())).toBe(true);
    expect(Object.keys(configuration)).not.toContain('token');
    expect(Object.prototype.hasOwnProperty.call(configuration, 'token')).toBe(false);
    expect(JSON.stringify(configuration)).not.toContain(token);
    expect(JSON.parse(JSON.stringify(configuration))).toEqual(configuration.toJSON());
    expect(() => {
      (configuration as { baseUrl: string }).baseUrl = 'https://unsafe.example';
    }).toThrow(TypeError);
  });

  it('accepts either a direct token or a deferred async token provider', () => {
    const direct = new EsiClientConfiguration({ token: 'direct-token' });
    const tokenProvider = vi.fn<() => Promise<string>>(async () => 'provided-token');
    const deferred = new EsiClientConfiguration({ tokenProvider });

    expect(direct.token).toBe('direct-token');
    expect(direct.tokenProvider).toBeUndefined();
    expect(deferred.token).toBeUndefined();
    expect(deferred.tokenProvider).toBe(tokenProvider);
    expect(tokenProvider).not.toHaveBeenCalled();
    expect(JSON.stringify(deferred)).not.toContain('tokenProvider');
  });

  it('rejects simultaneous direct and provider authentication', () => {
    expect(
      () =>
        new EsiClientConfiguration({
          token: 'direct-token',
          tokenProvider: async () => 'provided-token',
        }),
    ).toThrow(/either token or tokenProvider/u);
  });

  it('retains a custom browser-compatible fetch implementation', () => {
    const customFetch = vi.fn<typeof fetch>(async () => new Response(null, { status: 204 }));
    const configuration = new EsiClientConfiguration({ fetch: customFetch });

    expect(configuration.fetch).toBe(customFetch);
    expect(customFetch).not.toHaveBeenCalled();
  });

  it.each([
    ['non-object options', null],
    ['unknown options', { typo: true }],
    ['relative base URL', { baseUrl: '/latest' }],
    ['unsafe base URL protocol', { baseUrl: 'file:///etc/passwd' }],
    ['base URL credentials', { baseUrl: 'https://user:password@esi.example' }],
    ['base URL query', { baseUrl: 'https://esi.example?token=secret' }],
    ['invalid date format', { compatibilityDate: '20250818' }],
    ['invalid calendar date', { compatibilityDate: '2025-02-29' }],
    ['unsupported language', { language: 'it' }],
    ['empty token', { token: '' }],
    ['unsafe token whitespace', { token: 'not safe' }],
    ['non-function token provider', { tokenProvider: 'provider' }],
    ['non-function fetch', { fetch: {} }],
    ['non-boolean response validation', { validateResponses: 'yes' }],
    ['non-boolean request validation', { validateRequests: 1 }],
    ['non-boolean generic mutation setting', { allowGenericMutations: null }],
  ])('rejects %s at construction', (_description, options) => {
    expect(() => Reflect.construct(EsiClientConfiguration, [options])).toThrow(TypeError);
  });
});
