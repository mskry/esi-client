import { mkdir, readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';

import { describe, expect, it } from 'vitest';

import { compareGeneratedOutputs, generationCheckTargets } from '../scripts/generate/check.mjs';
import { makeTemporaryDirectory } from './helpers/temporary-directory.js';

describe('non-mutating generated output check', () => {
  it('checks source, documentation, examples, tests, and OpenAPI generated targets', () => {
    expect(generationCheckTargets).toEqual([
      'src/generated',
      'llms.txt',
      'docs/generated',
      'docs/llms.txt',
      'examples/generated',
      'tests/generated',
      'openapi/generated',
    ]);
  });

  it('detects stale bytes without rewriting the committed output', async () => {
    const root = await makeTemporaryDirectory('esi-client-generate-check-test-');
    const staged = join(root, 'staged');
    const committed = join(root, 'committed');
    await Promise.all([mkdir(staged), mkdir(committed)]);
    await Promise.all([
      writeFile(join(staged, 'generated.txt'), 'expected\n'),
      writeFile(join(committed, 'generated.txt'), 'stale\n'),
    ]);

    await expect(compareGeneratedOutputs(staged, committed, ['generated.txt'])).rejects.toThrow(
      'content changed generated.txt',
    );
    await expect(readFile(join(committed, 'generated.txt'), 'utf8')).resolves.toBe('stale\n');
  });

  it('detects missing and unexpected generated paths', async () => {
    const root = await makeTemporaryDirectory('esi-client-generate-file-set-test-');
    const staged = join(root, 'staged');
    const committed = join(root, 'committed');
    await Promise.all([
      mkdir(join(staged, 'generated'), { recursive: true }),
      mkdir(join(committed, 'generated'), { recursive: true }),
    ]);
    await Promise.all([
      writeFile(join(staged, 'generated/expected.txt'), 'expected\n'),
      writeFile(join(committed, 'generated/unexpected.txt'), 'unexpected\n'),
    ]);

    await expect(compareGeneratedOutputs(staged, committed, ['generated'])).rejects.toThrow(
      /missing committed path generated\/expected\.txt[\s\S]*unexpected committed path generated\/unexpected\.txt/u,
    );
  });
});
