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

For detailed API documentation, please refer to the [EVE Swagger Interface](https://esi.evetech.net/ui/).

## License

ISC © Mykola Skrypets
