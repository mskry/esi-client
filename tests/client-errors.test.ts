import { describe, expect, it } from 'vitest';

import {
  ESI_ERROR_BODY_LIMITS,
  EsiAuthenticationRequiredError,
  EsiError,
  EsiGenericMutationDisabledError,
  EsiGenericMutationUnconfirmedError,
  EsiHttpError,
  EsiRequestValidationError,
  EsiResponseParseError,
  EsiResponseValidationError,
  EsiUnknownOperationError,
  EsiValidationError,
} from '../src/client/errors.js';

const operationId = 'get_characters_character_id';

describe('ESI structured errors', () => {
  it('provides stable discovery, authentication, and generic mutation codes', () => {
    const unknown = new EsiUnknownOperationError({ operationId: 'missing_operation' });
    const authentication = new EsiAuthenticationRequiredError({
      operationId,
      scopes: ['esi-characters.read_contacts.v1'],
    });
    const disabled = new EsiGenericMutationDisabledError({ operationId });
    const unconfirmed = new EsiGenericMutationUnconfirmedError({ operationId });

    expect(unknown).toBeInstanceOf(EsiError);
    expect(unknown.toJSON()).toEqual({
      name: 'EsiUnknownOperationError',
      code: 'ESI_UNKNOWN_OPERATION',
      message: 'Unknown ESI operation: missing_operation',
      operationId: 'missing_operation',
    });
    expect(authentication.toJSON()).toMatchObject({
      code: 'ESI_AUTHENTICATION_REQUIRED',
      operationId,
      scopes: ['esi-characters.read_contacts.v1'],
    });
    expect(disabled.code).toBe('ESI_GENERIC_MUTATION_DISABLED');
    expect(unconfirmed.code).toBe('ESI_GENERIC_MUTATION_UNCONFIRMED');
  });

  it('skips malformed collection entries without discarding later valid entries', () => {
    const authentication = new EsiAuthenticationRequiredError({
      operationId,
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      scopes: ['before', 123, 'after'] as unknown as string[],
    });
    const response = new EsiResponseParseError({
      operationId,
      status: 200,
      metadata: {
        // oxlint-disable-next-line typescript/no-unsafe-type-assertion
        headers: {
          before: 'first',
          malformed: 123,
          after: 'last',
        } as unknown as Record<string, string>,
      },
    });
    const validation = new EsiRequestValidationError({
      operationId,
      // oxlint-disable-next-line typescript/no-unsafe-type-assertion
      issues: [
        { path: ['before'], message: 'first', code: 'first' },
        null,
        { path: ['after'], message: 'last', code: 'last' },
      ] as unknown as ConstructorParameters<typeof EsiRequestValidationError>[0]['issues'],
    });

    expect(authentication.scopes).toEqual(['before', 'after']);
    expect(response.metadata.headers).toEqual({ before: 'first', after: 'last' });
    expect(validation.issues).toEqual([
      { path: ['before'], message: 'first', code: 'first' },
      { path: ['after'], message: 'last', code: 'last' },
    ]);
  });

  it('serializes only allowlisted immutable fields and never serializes causes', () => {
    const secret = 'cause-secret-credential';
    const cause = new Error(`provider failed with ${secret}`);
    const error = new EsiUnknownOperationError({
      operationId,
      message: `Unknown operation with ${secret}`,
      redaction: { secrets: [secret] },
      cause,
    });
    const serialized = error.toJSON();

    expect(Object.isFrozen(error)).toBe(true);
    expect(Object.isFrozen(serialized)).toBe(true);
    expect(Object.keys(serialized)).toEqual(['name', 'code', 'message', 'operationId']);
    expect(error.cause).toBe(cause);
    expect(Object.keys(error)).not.toContain('cause');
    expect(JSON.stringify(error)).toBe(JSON.stringify(serialized));
    expect(JSON.stringify(error)).not.toContain(secret);
    expect(JSON.stringify(error)).not.toContain('cause');
    expect(() => {
      (error as { code: string }).code = 'changed';
    }).toThrow(TypeError);
  });

  it('includes immutable response metadata without extracting it from a Response', () => {
    const secret = 'metadata-secret-token';
    const headers = {
      Authorization: `Bearer ${secret}`,
      'Set-Cookie': `session=${secret}`,
      'X-Debug': `value ${secret}`,
    };
    const error = new EsiResponseParseError({
      operationId,
      status: 200,
      message: `Could not parse Bearer ${secret}`,
      redaction: { secrets: [secret] },
      metadata: {
        headers,
        requestId: `request-${secret}`,
        pagination: { pages: 2, nextCursor: secret },
        cache: { etag: secret },
        errorLimit: { remaining: 99, reset: 12 },
      },
    });
    headers['X-Debug'] = secret;
    const serialized = JSON.stringify(error);

    expect(error.code).toBe('ESI_RESPONSE_PARSE_ERROR');
    expect(error.metadata).toMatchObject({
      status: 200,
      headers: {
        authorization: '[REDACTED]',
        'set-cookie': '[REDACTED]',
        'x-debug': 'value [REDACTED]',
      },
      pagination: { pages: 2, nextCursor: '[REDACTED]' },
      cache: { etag: '[REDACTED]' },
      errorLimit: { remaining: 99, reset: 12 },
    });
    expect(Object.isFrozen(error.metadata)).toBe(true);
    expect(Object.isFrozen(error.metadata.headers)).toBe(true);
    expect(Object.isFrozen(error.metadata.pagination)).toBe(true);
    expect(serialized).not.toContain(secret);
    expect(serialized).not.toContain(`Bearer ${secret}`);
  });

  it('parses, redacts, and structurally bounds JSON ESI error bodies', () => {
    const token = 'body-access-token';
    const providerValue = 'provider-return-value';
    let nested: unknown = `deep ${token}`;
    for (let index = 0; index < ESI_ERROR_BODY_LIMITS.depth + 4; index += 1) {
      nested = { nested };
    }
    const responseBody = JSON.stringify({
      error: `Bearer ${token}`,
      detail: providerValue,
      access_token: token,
      password: providerValue,
      nested,
      values: Array.from({ length: ESI_ERROR_BODY_LIMITS.arrayItems + 20 }, (_, index) => index),
    });
    const error = new EsiHttpError({
      operationId,
      status: 403,
      responseBodyText: responseBody,
      redaction: { secrets: [token, providerValue] },
      metadata: {
        headers: {
          authorization: `Basic ${token}`,
          'x-provider-debug': providerValue,
        },
      },
    });
    const serialized = JSON.stringify(error);

    expect(error).toBeInstanceOf(EsiError);
    expect(error.code).toBe('ESI_HTTP_ERROR');
    expect(error.status).toBe(403);
    expect(error.bodyFormat).toBe('json');
    expect(error.bodyTruncated).toBe(true);
    expect(Object.isFrozen(error.body)).toBe(true);
    expect(serialized).not.toContain(token);
    expect(serialized).not.toContain(providerValue);
    expect(serialized).not.toContain(`Basic ${token}`);
    expect(serialized).toContain('[REDACTED]');
    expect(serialized.length).toBeLessThan(ESI_ERROR_BODY_LIMITS.bytes * 2);
  });

  it('falls back to bounded redacted text without parsing an oversized body', () => {
    const secret = 'text-body-secret';
    const error = new EsiHttpError({
      operationId,
      status: 502,
      responseBodyText: `not-json Authorization: ${secret} ${'x'.repeat(50_000)}`,
      redaction: { secrets: [secret] },
    });
    const serialized = JSON.stringify(error);

    expect(error.bodyFormat).toBe('text');
    expect(error.bodyTruncated).toBe(true);
    const body = error.body;
    expect(typeof body).toBe('string');
    if (typeof body !== 'string') throw new TypeError('Expected a text error body');
    expect(body.length).toBeLessThanOrEqual(ESI_ERROR_BODY_LIMITS.characters);
    expect(serialized).not.toContain(secret);
    expect(serialized.length).toBeLessThan(ESI_ERROR_BODY_LIMITS.bytes * 2);
  });

  it('normalizes request and response validation issues without retaining raw input', () => {
    const credential = 'validation-secret-credential';
    const rawInput = { authorization: `Bearer ${credential}`, payload: credential };
    const issues = [
      {
        path: ['body', credential, 3],
        message: `Expected string, received ${credential}`,
        code: `invalid_${credential}`,
        input: rawInput,
      },
    ];
    const request = new EsiRequestValidationError({
      operationId,
      issues,
      redaction: { secrets: [credential] },
    });
    const response = new EsiResponseValidationError({
      operationId,
      issues,
      redaction: { secrets: [credential] },
    });

    expect(request).toBeInstanceOf(EsiValidationError);
    expect(request).toBeInstanceOf(EsiError);
    expect(request.code).toBe('ESI_REQUEST_VALIDATION_ERROR');
    expect(request.direction).toBe('request');
    expect(response.code).toBe('ESI_RESPONSE_VALIDATION_ERROR');
    expect(response.direction).toBe('response');
    expect(request.issues).toEqual([
      {
        path: ['body', '[REDACTED]', 3],
        message: 'Expected string, received [REDACTED]',
        code: 'invalid_[REDACTED]',
      },
    ]);
    expect(Object.isFrozen(request.issues)).toBe(true);
    expect(Object.isFrozen(request.issues[0])).toBe(true);
    expect(Object.isFrozen(request.issues[0]?.path)).toBe(true);
    expect(JSON.stringify(request)).not.toContain(credential);
    expect(JSON.stringify(request)).not.toContain('authorization');
    expect(JSON.stringify(request)).not.toContain('payload');
    expect(JSON.stringify(response)).not.toContain(credential);
  });
});
