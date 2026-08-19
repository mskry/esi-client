import { readFile } from 'node:fs/promises';
import { relative } from 'node:path';
import { fileURLToPath } from 'node:url';

import { describe, expect, it } from 'vitest';

import {
  inspectExamplesProject,
  validateDocumentedPackageImports,
} from '../scripts/check-examples.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

describe('generated example type-check project', () => {
  it('includes every generated TypeScript example', async () => {
    const inspection = await inspectExamplesProject(root);

    expect(inspection.projectFiles).toEqual(inspection.generatedFiles);
    expect(inspection.generatedFiles.map((path) => relative(root, path))).toEqual([
      'examples/generated/authenticated.ts',
      'examples/generated/metadata.ts',
      'examples/generated/mutation-safety.ts',
      'examples/generated/paginated.ts',
      'examples/generated/public.ts',
      'examples/generated/validation-error.ts',
    ]);
  });

  it('rejects a package subpath absent from the actual export map', async () => {
    const packageManifest = JSON.parse(
      await readFile(new URL('../package.json', import.meta.url), 'utf8'),
    );

    expect(() =>
      validateDocumentedPackageImports(
        [
          {
            path: 'examples/generated/invalid.ts',
            source: "import { missing } from '@evespace/esi-client/not-exported';\nvoid missing;\n",
          },
        ],
        packageManifest,
      ),
    ).toThrow(
      'examples/generated/invalid.ts imports package subpath @evespace/esi-client/not-exported, which is not exported',
    );
  });
});
