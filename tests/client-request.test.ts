import { describe, expect, it } from 'vitest';

import { EsiRequestValidationError } from '../src/client/errors.js';
import { constructOperationRequest } from '../src/client/request.js';
import type {
  ExecutableOperationDescriptor,
  OperationParameterDescriptor,
} from '../src/client/request.js';

describe('descriptor-driven request construction', () => {
  it('constructs every supported placement with deterministic encoding', () => {
    const descriptor = operation({
      method: 'POST',
      path: '/characters/{character_id}/contacts/{label}',
      parameters: [
        parameter('character_id', 'path', 'integer', true),
        parameter('label', 'path', 'string', true),
        parameter('page', 'query', 'integer'),
        parameter('include_blocked', 'query', 'boolean'),
        arrayParameter('standing', 'query', 'number', false, true),
        parameter('If-None-Match', 'header', 'string'),
      ],
      requestBody: { required: true, mediaType: 'application/json' },
    });

    const request = constructOperationRequest(descriptor, {
      path: { label: 'blue team/one', character_id: 90000001 },
      query: { standing: [1.5, -2], include_blocked: false, page: 2 },
      header: { 'If-None-Match': '"revision-1"' },
      body: { watched: true, ids: [3, 1], note: null },
    });

    expect(request).toEqual({
      method: 'POST',
      path: '/characters/90000001/contacts/blue%20team%2Fone?page=2&include_blocked=false&standing=1.5&standing=-2',
      headers: {
        'if-none-match': '"revision-1"',
        'content-type': 'application/json',
      },
      body: '{"watched":true,"ids":[3,1],"note":null}',
    });
    expect(Object.isFrozen(request)).toBe(true);
    expect(Object.isFrozen(request.headers)).toBe(true);
  });

  it('uses descriptor order rather than argument insertion order', () => {
    const descriptor = operation({
      parameters: [
        parameter('z', 'query', 'string'),
        parameter('a', 'query', 'string'),
        arrayParameter('ids', 'query', 'integer', false, true),
      ],
    });

    expect(
      constructOperationRequest(descriptor, {
        query: { ids: [4, 2], a: 'second', z: 'first' },
      }).path,
    ).toBe('/items?z=first&a=second&ids=4&ids=2');
  });

  it('applies OpenAPI style and explode defaults and serializes arrays', () => {
    const descriptor = operation({
      path: '/route/{segments}',
      parameters: [
        arrayParameter('segments', 'path', 'string', true),
        arrayParameter('repeated', 'query', 'string'),
        arrayParameter('compact', 'query', 'string', false, false),
        arrayParameter('X-Flags', 'header', 'boolean'),
      ],
    });

    expect(
      constructOperationRequest(descriptor, {
        path: { segments: ['alpha', 'beta/gamma'] },
        query: { repeated: ['one two', 'a&b'], compact: ['x,y', 'z'] },
        header: { 'X-Flags': [true, false] },
      }),
    ).toEqual({
      method: 'GET',
      path: '/route/alpha,beta%2Fgamma?repeated=one%20two&repeated=a%26b&compact=x%2Cy,z',
      headers: { 'x-flags': 'true,false' },
    });
  });

  it('omits optional undefined parameters, groups, and bodies', () => {
    const descriptor = operation({
      parameters: [parameter('page', 'query', 'integer')],
      requestBody: { required: false, mediaType: 'application/json' },
    });

    expect(constructOperationRequest(descriptor, {})).toEqual({
      method: 'GET',
      path: '/items',
      headers: {},
    });
    expect(
      constructOperationRequest(descriptor, { query: { page: undefined }, body: undefined }),
    ).toEqual({
      method: 'GET',
      path: '/items',
      headers: {},
    });
  });

  it('serializes null and top-level scalar JSON bodies', () => {
    const descriptor = operation({
      requestBody: { required: true, mediaType: 'application/json' },
    });

    expect(constructOperationRequest(descriptor, { body: null }).body).toBe('null');
    expect(constructOperationRequest(descriptor, { body: false }).body).toBe('false');
    expect(constructOperationRequest(descriptor, { body: 12.5 }).body).toBe('12.5');
    expect(constructOperationRequest(descriptor, { body: 'value' }).body).toBe('"value"');
  });

  it('encodes traversal-like and URL-delimiter path values as one safe segment', () => {
    const descriptor = operation({
      path: '/route/{value}/result',
      parameters: [parameter('value', 'path', 'string', true)],
    });

    const path = constructOperationRequest(descriptor, {
      path: { value: '../admin?token=x#fragment' },
    }).path;
    expect(path).toBe('/route/%2E%2E%2Fadmin%3Ftoken%3Dx%23fragment/result');
    expect(new URL(path, 'https://esi.example').pathname).toBe(
      '/route/%2E%2E%2Fadmin%3Ftoken%3Dx%23fragment/result',
    );
    expect(() => constructOperationRequest(descriptor, { path: { value: '..' } })).toThrow(
      EsiRequestValidationError,
    );
  });

  it.each([
    ['missing path group', operationWithRequiredPath(), {}],
    ['missing path value', operationWithRequiredPath(), { path: {} }],
    [
      'missing query value',
      operation({ parameters: [parameter('page', 'query', 'integer', true)] }),
      {},
    ],
    [
      'undefined required value',
      operation({ parameters: [parameter('page', 'query', 'integer', true)] }),
      { query: { page: undefined } },
    ],
    [
      'missing header value',
      operation({ parameters: [parameter('X-Required', 'header', 'string', true)] }),
      {},
    ],
    [
      'missing body',
      operation({ requestBody: { required: true, mediaType: 'application/json' } }),
      {},
    ],
  ])('rejects %s before request execution', (_description, descriptor, arguments_) => {
    expect(() => constructUnknown(descriptor, arguments_)).toThrow(EsiRequestValidationError);
    expect(captureError(descriptor, arguments_)).toMatchObject({
      code: 'ESI_REQUEST_VALIDATION_ERROR',
    });
  });

  it.each([
    ['top-level key', operation(), { typo: true }],
    ['unused body', operation(), { body: null }],
    ['unused placement', operation(), { query: {} }],
    [
      'parameter key',
      operation({ parameters: [parameter('page', 'query', 'integer')] }),
      { query: { typo: 1 } },
    ],
  ])('rejects undeclared %s', (_description, descriptor, arguments_) => {
    expect(() => constructUnknown(descriptor, arguments_)).toThrow(EsiRequestValidationError);
  });

  it.each([
    ['path object', operationWithRequiredPath(), { path: { id: { value: 1 } } }],
    [
      'query object',
      operation({ parameters: [parameter('filter', 'query', 'string')] }),
      { query: { filter: { nested: true } } },
    ],
    [
      'header object',
      operation({ parameters: [parameter('X-Value', 'header', 'string')] }),
      { header: { 'X-Value': { nested: true } } },
    ],
    [
      'non-finite number',
      operation({ parameters: [parameter('page', 'query', 'number')] }),
      { query: { page: Number.POSITIVE_INFINITY } },
    ],
    [
      'unsafe integer',
      operation({ parameters: [parameter('page', 'query', 'integer')] }),
      { query: { page: Number.MAX_SAFE_INTEGER + 1 } },
    ],
    [
      'sparse parameter array',
      operation({ parameters: [arrayParameter('ids', 'query', 'integer')] }),
      { query: { ids: Array(1) } },
    ],
  ])('rejects unsupported %s parameter values', (_description, descriptor, arguments_) => {
    expect(() => constructUnknown(descriptor, arguments_)).toThrow(EsiRequestValidationError);
  });

  it.each(['line\r\ninjected: true', 'line\nvalue', 'tab\tvalue', 'snowman \u2603'])(
    'rejects unsafe header value %j',
    (value) => {
      const descriptor = operation({
        parameters: [parameter('X-Value', 'header', 'string', true)],
      });

      expect(() => constructOperationRequest(descriptor, { header: { 'X-Value': value } })).toThrow(
        EsiRequestValidationError,
      );
    },
  );

  it('rejects empty and control-character path values', () => {
    const descriptor = operationWithRequiredPath();

    expect(() => constructOperationRequest(descriptor, { path: { id: '' } })).toThrow(
      EsiRequestValidationError,
    );
    expect(() => constructOperationRequest(descriptor, { path: { id: 'line\nvalue' } })).toThrow(
      EsiRequestValidationError,
    );
    expect(() => constructOperationRequest(descriptor, { path: { id: '\ud800' } })).toThrow(
      EsiRequestValidationError,
    );
  });

  it.each([
    ['undefined property', { nested: undefined }],
    ['bigint', { value: 1n }],
    ['non-finite number', { value: Number.NaN }],
    ['date', { value: new Date('2026-01-01T00:00:00Z') }],
    ['map', { value: new Map([['key', 'value']]) }],
    ['function', { value: () => 'value' }],
    ['symbol', { value: Symbol('value') }],
    ['sparse array', { value: Array(1) }],
  ])('rejects non-JSON-native body value: %s', (_description, body) => {
    const descriptor = operation({
      requestBody: { required: true, mediaType: 'application/json' },
    });

    expect(() => constructOperationRequest(descriptor, { body })).toThrow(
      EsiRequestValidationError,
    );
  });

  it('rejects cyclic bodies but permits repeated non-cyclic references', () => {
    const descriptor = operation({
      requestBody: { required: true, mediaType: 'application/json' },
    });
    const cyclic: { self?: unknown } = {};
    cyclic.self = cyclic;
    const shared = { id: 1 };

    expect(() => constructOperationRequest(descriptor, { body: cyclic })).toThrow(
      EsiRequestValidationError,
    );
    expect(
      constructOperationRequest(descriptor, { body: { first: shared, second: shared } }).body,
    ).toBe('{"first":{"id":1},"second":{"id":1}}');
  });

  it('rejects custom JSON array properties', () => {
    const descriptor = operation({
      requestBody: { required: true, mediaType: 'application/json' },
    });
    const body = [1, 2];
    Object.defineProperty(body, 'extra', { value: true, enumerable: true });

    expect(() => constructOperationRequest(descriptor, { body })).toThrow(
      EsiRequestValidationError,
    );
  });

  it.each([
    ['non-object descriptor', null],
    ['empty operation ID', { ...operation(), operationId: '' }],
    ['lowercase method', { ...operation(), method: 'get' }],
    ['relative path', { ...operation(), path: 'items' }],
    ['path query injection', { ...operation(), path: '/items?admin=true' }],
    ['pre-escaped path', { ...operation(), path: '/items/%2e%2e/admin' }],
    ['malformed placeholder', { ...operation(), path: '/items/{id' }],
    [
      'placeholder spanning a segment',
      malformedOperation({
        path: '/items/{id/value}',
        parameters: [parameter('id/value', 'path', 'string', true)],
      }),
    ],
    ['undeclared placeholder', { ...operation(), path: '/items/{id}' }],
    [
      'unmatched path parameter',
      operation({ parameters: [parameter('id', 'path', 'string', true)] }),
    ],
    [
      'optional path parameter',
      operation({
        path: '/items/{id}',
        parameters: [parameter('id', 'path', 'string', false)],
      }),
    ],
    [
      'duplicate query parameter',
      operation({
        parameters: [parameter('page', 'query', 'integer'), parameter('page', 'query', 'integer')],
      }),
    ],
    [
      'case-insensitive duplicate header',
      operation({
        parameters: [
          parameter('X-Value', 'header', 'string'),
          parameter('x-value', 'header', 'string'),
        ],
      }),
    ],
    [
      'unsafe header name',
      operation({ parameters: [parameter('X-Value\r\nInjected', 'header', 'string')] }),
    ],
    [
      'cookie placement',
      malformedOperation({
        parameters: [{ ...parameter('session', 'query', 'string'), placement: 'cookie' }],
      }),
    ],
    [
      'deep-object query style',
      malformedOperation({
        parameters: [{ ...parameter('filter', 'query', 'string'), style: 'deepObject' }],
      }),
    ],
    [
      'reserved query expansion',
      malformedOperation({
        parameters: [{ ...parameter('filter', 'query', 'string'), allowReserved: true }],
      }),
    ],
    [
      'object parameter schema',
      malformedOperation({
        parameters: [
          {
            ...parameter('filter', 'query', 'string'),
            schema: { type: 'object' },
          },
        ],
      }),
    ],
    [
      'nested array parameter schema',
      malformedOperation({
        parameters: [
          {
            ...arrayParameter('ids', 'query', 'integer'),
            schema: { type: 'array', items: { type: 'array', items: { type: 'integer' } } },
          },
        ],
      }),
    ],
    [
      'unsupported body media type',
      { ...operation(), requestBody: { required: true, mediaType: 'text/plain' } },
    ],
    [
      'body content-type parameter conflict',
      operation({
        parameters: [parameter('Content-Type', 'header', 'string')],
        requestBody: { required: true, mediaType: 'application/json' },
      }),
    ],
    ['invalid request schema', { ...operation(), requestSchema: {} }],
  ])('rejects malformed descriptor: %s', (_description, descriptor) => {
    expect(() => constructUnknown(descriptor, {})).toThrow(TypeError);
  });

  it('retains a request validation schema without invoking it during construction', () => {
    let calls = 0;
    const descriptor = operation({
      requestSchema: {
        safeParse: (_value: unknown) => {
          calls += 1;
          return { success: true as const, data: {} };
        },
      },
    });

    expect(constructOperationRequest(descriptor, {})).toMatchObject({ path: '/items' });
    expect(calls).toBe(0);
  });
});

function operation(
  overrides: Partial<ExecutableOperationDescriptor> = {},
): ExecutableOperationDescriptor {
  return {
    operationId: 'get_items',
    method: 'GET',
    path: '/items',
    parameters: [],
    requestBody: null,
    ...overrides,
  };
}

function operationWithRequiredPath(): ExecutableOperationDescriptor {
  return operation({
    path: '/items/{id}',
    parameters: [parameter('id', 'path', 'string', true)],
  });
}

function parameter(
  name: string,
  placement: 'path' | 'query' | 'header',
  type: 'string' | 'boolean' | 'integer' | 'number',
  required = false,
): OperationParameterDescriptor {
  return { name, placement, required, schema: { type } };
}

function arrayParameter(
  name: string,
  placement: 'path' | 'query' | 'header',
  itemType: 'string' | 'boolean' | 'integer' | 'number',
  required = false,
  explode?: boolean,
): OperationParameterDescriptor {
  return {
    name,
    placement,
    required,
    schema: { type: 'array', items: { type: itemType } },
    ...(explode === undefined ? {} : { explode }),
  };
}

function constructUnknown(descriptor: unknown, arguments_: unknown): unknown {
  return Reflect.apply(constructOperationRequest, undefined, [descriptor, arguments_]);
}

function malformedOperation(overrides: Readonly<Record<string, unknown>>): unknown {
  return { ...operation(), ...overrides };
}

function captureError(descriptor: unknown, arguments_: unknown): unknown {
  try {
    constructUnknown(descriptor, arguments_);
  } catch (error) {
    return error;
  }
  throw new Error('Expected request construction to fail');
}
