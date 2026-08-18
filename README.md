# ESI TypeScript Client

A TypeScript client for the ESI (EVE Swagger Interface) API.

## Installation

```bash
npm install @evespace/esi-client
```

## Usage

```typescript
import {
    CharacterApi,
    Configuration,
    GetCharactersCharacterIdXCompatibilityDateEnum,
} from '@evespace/esi-client';

const config = new Configuration({
    basePath: 'https://esi.evetech.net/latest',
});

const api = new CharacterApi(config);

// Example: Get character information
const characterInfo = await api.getCharactersCharacterId({
    characterId: 12345,
    xCompatibilityDate: GetCharactersCharacterIdXCompatibilityDateEnum._20200101,
});
```

## Features

- Full TypeScript support with type definitions
- Complete coverage of EVE Online ESI API endpoints
- Built with fetch API
- ESM and CommonJS support

## Documentation

This client was regenerated on 2026-08-18 from the OpenAPI 3.1 specification published in the [EVE Online API Explorer](https://developers.eveonline.com/api-explorer).

## License

MIT © Mykola Skrypets
