# @evespace/esi-client

An ESM-only TypeScript SDK for EVE Online ESI, centered on `EsiClient` and generated from a pinned, corrected OpenAPI specification.

```ts
import { EsiClient } from '@evespace/esi-client';

const client = new EsiClient();
const status = await client.status.get();
```

`new EsiClient()` uses the standard ESI base URL and the package's pinned compatibility date, **2026-08-18**.

For one domain without loading the aggregate client, construct it from its subpath:

```ts
import { createStatusClient } from '@evespace/esi-client/domains/status';

const statusClient = createStatusClient();
const status = await statusClient.get();
const response = await statusClient.withMetadata().get();
```

## Install

```sh
npm install @evespace/esi-client zod
```

Zod `^4.0.0` is a required peer dependency. The package requires Node.js 22.18 or newer and publishes ESM only: use `import`, not CommonJS `require`.

## Authenticated Domain Call

Configure either `token` or an asynchronous `tokenProvider`. Credentials are resolved only for authenticated requests and are excluded from metadata and structured errors.

```ts
import { EsiClient } from '@evespace/esi-client';

const accessToken = process.env.ESI_ACCESS_TOKEN;
if (!accessToken) throw new Error('Set ESI_ACCESS_TOKEN before making this authorized request.');

const client = new EsiClient({ token: accessToken });
const characterId = 90000001;
const location = await client.location.get(characterId);
```

Required path identifiers are positional. Optional query and header values, including a per-operation compatibility-date override, are grouped in a final typed options object.

## Runtime Behavior

- Date and date-time values remain their JSON wire-format strings. The SDK does not transform them into JavaScript `Date` objects.
- Successful JSON responses are validated with generated Zod schemas by default. Set `validateResponses: false` to opt out.
- Typed request validation is off by default; opt in with `validateRequests: true`. Generic operation arguments are always validated before network activity.
- Domain methods return bare validated data. Use `client.<domain>.withMetadata().<method>(...)` for an `EsiResponse<T>` containing status, headers, request ID, pagination, cache, and ESI error-limit metadata.
- Compatibility date `2026-08-18` is pinned by default. Override it on the client with `new EsiClient({ compatibilityDate: 'YYYY-MM-DD' })` or in a domain method's final options object.

## Discovery And Generic Execution

Import `searchOperations` and `describeOperation` from `@evespace/esi-client/operations` to discover stable operation IDs and serializable contracts. Execute one validated request with `client.callOperation(stableId, arguments)`; generic execution always returns an `EsiResponse<T>` and never follows pagination automatically.

Domain methods use concise reviewed names such as `client.location.get(characterId)`. Stable OpenAPI operation IDs such as `GetCharactersCharacterIdLocation` remain unchanged for discovery, descriptions, schemas, diagnostics, and generic `callOperation` execution.

Generic mutations are denied by default. They require both `allowGenericMutations: true` when constructing the client and `{ confirmMutation: true }` on the individual `callOperation`. Named typed mutation methods express explicit caller intent and do not use these generic gates.

## Imports And Documentation

The root export is the convenient entry point. ESM subpaths provide narrower imports:

- `@evespace/esi-client/operations` for discovery, descriptors, and generic execution types
- `@evespace/esi-client/schemas` for generated Zod schemas and inferred types
- `@evespace/esi-client/domains/<domain>` for one generated domain client

Method option interfaces use stable operation IDs, for example `GetAlliancesAllianceIdIconsOptions`, matching the operation's generated input, output, schemas, descriptor, manifest entry, and discovery identity. Their globally unique names are available from both the package root and corresponding domain subpath.

Every domain subpath exports a `create<Domain>Client` factory, such as `createStatusClient`. Factories accept the same client options applicable to `EsiClient`; domain client contracts are exported as TypeScript interfaces while configuration plumbing remains internal.

Domain subpaths reduce the runtime and TypeScript declaration graph reached by an import. They do not reduce npm installation size: the installed tarball still contains all domains, aggregate discovery metadata, and shared schemas.

Start with the repository [`llms.txt`](llms.txt), then retrieve only the documentation needed:

- Concepts: [client configuration](docs/generated/concepts/client.md), [validation](docs/generated/concepts/validation.md), [metadata and pagination](docs/generated/concepts/metadata-pagination.md), and [mutation safety](docs/generated/concepts/mutation-safety.md)
- Domain: [location](docs/generated/domains/location.md)
- Operation: [`GetCharactersCharacterIdLocation`](docs/generated/operations/GetCharactersCharacterIdLocation.md)

The generated domain indexes link focused references for every supported operation; there is intentionally no monolithic endpoint list here.

## Development

Development uses Node.js 22.18+ and pnpm 11.21.0. Run `pnpm validate` for generation reproducibility, documentation and example checks, formatting, linting, type checking, tests, build and package validation, installed-package smoke tests, and artifact inspection.

## License

MIT © Mykola Skrypets
