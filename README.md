# ESI TypeScript Client

A TypeScript client for the ESI (EVE Swagger Interface) API.

## Installation

```bash
npm install @evespace/esi-client
```

## Usage

```typescript
import { Configuration, DefaultApi } from 'esi-client';

const config = new Configuration({
    basePath: 'https://esi.evetech.net/latest'
});

const api = new DefaultApi(config);

// Example: Get character information
const characterInfo = await api.getCharactersCharacterId(12345);
```

## Features

- Full TypeScript support with type definitions
- Complete coverage of EVE Online ESI API endpoints
- Built with fetch API
- ESM and CommonJS support

## Documentation

This client was regenerated from the OpenAPI 3.1 specification published in the [EVE Online API Explorer](https://developers.eveonline.com/api-explorer).

## License

MIT © Mykola Skrypets
