# Changelog

## 2.0.0 - 2026-08-19

Version 2.0 replaces the previous OpenAPI Generator surface with a maintained, ESM-only SDK generated from a pinned and corrected ESI OpenAPI 3.1 specification.

### Breaking Changes

- Node.js 22.18 or newer is required.
- CommonJS is no longer supported.
- Zod 4 is a required peer dependency.
- `Configuration`, generated `*Api` classes, and the previous root model exports have been removed.
- Date and date-time values remain JSON strings instead of being converted to `Date` objects.

### Added

- `EsiClient` with typed domain clients for all 233 supported operations.
- Request and response validation with generated Zod schemas.
- Typed metadata, pagination, authentication, structured errors, and mutation-safety controls.
- Operation discovery and generic execution through `@evespace/esi-client/operations`.
- Narrow schema and domain subpath exports.
- Reproducible generation, drift reporting, package budgets, and installed-package smoke tests.

### Migration

Replace generated API class construction with one `EsiClient` instance:

```ts
import { EsiClient } from '@evespace/esi-client';

const client = new EsiClient({ token: process.env.ESI_ACCESS_TOKEN });
const status = await client.status.getStatus();
```

Required path identifiers are positional arguments. Optional query and header values are passed in the final options object. Use `client.<domain>.withMetadata()` when response headers or status metadata are needed.
