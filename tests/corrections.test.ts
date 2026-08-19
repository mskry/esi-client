import { mkdir, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { applySpecificationCorrections } from '../scripts/generate/corrections.mjs';
import { makeTemporaryDirectory } from './helpers/temporary-directory.js';

describe('specification corrections', () => {
  it('applies active corrections in manifest order without mutating the input', async () => {
    const source = { info: { title: 'before', version: '1' } };
    const manifestPath = await writeCorrections(
      [correction('title', 'title.json'), correction('version', 'version.json')],
      {
        'title.json': [
          { op: 'test', path: '/info/title', value: 'before' },
          { op: 'replace', path: '/info/title', value: 'after' },
        ],
        'version.json': [
          { op: 'test', path: '/info/title', value: 'after' },
          { op: 'replace', path: '/info/version', value: '2' },
        ],
      },
    );

    const result = await applySpecificationCorrections(source, '2026-08-18', { manifestPath });

    expect(result.document).toEqual({ info: { title: 'after', version: '2' } });
    expect(result.appliedCorrections).toEqual(['title', 'version']);
    expect(source).toEqual({ info: { title: 'before', version: '1' } });
  });

  it('fails when an active correction precondition is stale', async () => {
    const manifestPath = await writeCorrections([correction('stale', 'stale.json')], {
      'stale.json': [
        { op: 'test', path: '/value', value: 'expected' },
        { op: 'replace', path: '/value', value: 'corrected' },
      ],
    });

    await expect(
      applySpecificationCorrections({ value: 'changed' }, '2026-08-18', { manifestPath }),
    ).rejects.toThrow('Failed to apply correction stale');
  });

  it('fails when an expired correction still applies', async () => {
    const manifestPath = await writeCorrections(
      [{ ...correction('expired', 'expired.json'), through: '2026-01-01' }],
      {
        'expired.json': [
          { op: 'test', path: '/value', value: 'bad' },
          { op: 'replace', path: '/value', value: 'fixed' },
        ],
      },
    );

    await expect(
      applySpecificationCorrections({ value: 'bad' }, '2026-08-18', { manifestPath }),
    ).rejects.toThrow('Expired correction still applies: expired');
  });
});

function correction(id: string, patch: string) {
  return {
    id,
    patch,
    reason: `Correct ${id}`,
    from: '2026-01-01',
    through: '2026-12-31',
  };
}

async function writeCorrections(
  corrections: object[],
  patches: Record<string, object[]>,
): Promise<string> {
  const directory = await makeTemporaryDirectory('esi-client-corrections-');
  await mkdir(directory, { recursive: true });
  await Promise.all(
    Object.entries(patches).map(([name, operations]) =>
      writeFile(join(directory, name), `${JSON.stringify(operations)}\n`),
    ),
  );
  const manifestPath = join(directory, 'manifest.json');
  await writeFile(manifestPath, `${JSON.stringify({ schemaVersion: 1, corrections })}\n`);
  return manifestPath;
}
