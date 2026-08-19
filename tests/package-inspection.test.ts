import { describe, expect, it } from 'vitest';

import {
  createPackageBudgetBaseline,
  findForbiddenPackedPaths,
  forbiddenPackagePaths,
  measurePackedPackage,
  validatePackageBudgets,
  validatePackedPackageBoundary,
} from '../scripts/lib/package-inspection.mjs';

const packageJson = {
  exports: {
    './package.json': './package.json',
    './operations': {
      types: './dist/operations/index.d.ts',
      import: './dist/operations/index.js',
    },
  },
};
const runtimeFiles = [
  { path: 'package.json' },
  { path: 'dist/operations/index.d.ts' },
  { path: 'dist/operations/index.js' },
];

const budgetPackageJson = {
  version: '2.0.0',
  exports: {
    './package.json': './package.json',
    '.': { types: './dist/root.d.ts', import: './dist/root.js' },
    './operations': {
      types: './dist/operations/index.d.ts',
      import: './dist/operations/index.js',
    },
  },
};
const packedPackage = {
  size: 500,
  unpackedSize: 2_000,
  entryCount: 8,
  files: [
    { path: 'LICENSE', size: 100 },
    { path: 'README.md', size: 200 },
    { path: 'package.json', size: 300 },
    { path: 'dist/root.js', size: 400 },
    { path: 'dist/root.d.ts', size: 500 },
    { path: 'dist/operations/index.js', size: 600 },
    { path: 'dist/operations/index.d.ts', size: 700 },
    { path: 'dist/shared.js', size: 100 },
  ],
};

function budgetFixture() {
  const measurements = measurePackedPackage(structuredClone(packedPackage), budgetPackageJson);
  return { measurements, baseline: createPackageBudgetBaseline(measurements) };
}

describe('npm package documentation boundary', () => {
  it('enumerates every forbidden generated documentation and example path', () => {
    const files = [
      ...runtimeFiles,
      { path: 'llms.txt' },
      { path: 'docs/llms.txt' },
      { path: 'docs/generated/operations/GetStatus.md' },
      { path: 'examples/generated/public.ts' },
    ];

    expect(forbiddenPackagePaths).toEqual([
      'llms.txt',
      'docs/llms.txt',
      'docs/generated/',
      'examples/generated/',
    ]);
    expect(findForbiddenPackedPaths(files)).toEqual([
      'docs/generated/operations/GetStatus.md',
      'docs/llms.txt',
      'examples/generated/public.ts',
      'llms.txt',
    ]);
    expect(() => validatePackedPackageBoundary(files, packageJson)).toThrow(
      'docs/generated/operations/GetStatus.md, docs/llms.txt, examples/generated/public.ts, llms.txt',
    );
  });

  it('requires packed runtime operation metadata export targets', () => {
    expect(validatePackedPackageBoundary(runtimeFiles, packageJson)).toEqual({
      forbiddenPaths: [],
      operationExportTargets: ['dist/operations/index.d.ts', 'dist/operations/index.js'],
    });
    expect(() => validatePackedPackageBoundary(runtimeFiles, { exports: {} })).toThrow(
      'must export runtime operation metadata through ./operations',
    );
    expect(() => validatePackedPackageBoundary(runtimeFiles.slice(0, 2), packageJson)).toThrow(
      'Packed ./operations export targets are missing: dist/operations/index.js',
    );
    expect(() =>
      validatePackedPackageBoundary(runtimeFiles, {
        exports: { './operations': packageJson.exports['./operations'] },
      }),
    ).toThrow('must export ./package.json as package metadata');
  });
});

describe('npm package budgets', () => {
  it('records tight aggregate and per-public-entry budgets with explicit packed files', () => {
    const { measurements, baseline } = budgetFixture();

    expect(measurements.totals).toEqual({
      compressedBytes: 500,
      unpackedBytes: 2_000,
      javascriptBytes: 1_100,
      declarationBytes: 1_200,
      fileCount: 8,
    });
    expect(baseline.policy).toEqual({
      byteHeadroomPercent: 2,
      fileCountHeadroom: 0,
      description:
        'Byte maxima are accepted measurements plus 2%; file count and packed paths have no headroom, so every new artifact requires review.',
    });
    expect(baseline.totals.compressedBytes).toEqual({ measured: 500, maximum: 510 });
    expect(baseline.totals.fileCount).toEqual({ measured: 8, maximum: 8 });
    expect(baseline.publicEntries['.'].javascript).toEqual({
      path: 'dist/root.js',
      measuredBytes: 400,
      maximumBytes: 408,
    });
    expect(() => validatePackageBudgets(measurements, baseline)).not.toThrow();
    const nextVersion = structuredClone(measurements);
    nextVersion.packageVersion = '2.1.0';
    expect(() => validatePackageBudgets(nextVersion, baseline)).not.toThrow();
  });

  it.each([
    ['compressedBytes', 'compressedBytes'],
    ['unpackedBytes', 'unpackedBytes'],
    ['javascriptBytes', 'javascriptBytes'],
    ['declarationBytes', 'declarationBytes'],
    ['fileCount', 'fileCount'],
  ] as const)(
    'rejects aggregate %s growth',
    (
      metric:
        | 'compressedBytes'
        | 'unpackedBytes'
        | 'javascriptBytes'
        | 'declarationBytes'
        | 'fileCount',
      message: string,
    ) => {
      const { measurements, baseline } = budgetFixture();
      const changed = structuredClone(measurements);
      changed.totals[metric] = baseline.totals[metric].maximum + 1;

      expect(() => validatePackageBudgets(changed, baseline)).toThrow(
        `${message} is ${changed.totals[metric]}, exceeding budget`,
      );
    },
  );

  it.each([
    ['javascript', 'javascript'],
    ['declaration', 'declaration'],
  ] as const)(
    'rejects per-entry %s growth',
    (kind: 'javascript' | 'declaration', message: string) => {
      const { measurements, baseline } = budgetFixture();
      const changed = structuredClone(measurements);
      changed.publicEntries['.'][kind].bytes = baseline.publicEntries['.'][kind].maximumBytes + 1;

      expect(() => validatePackageBudgets(changed, baseline)).toThrow(
        `public entry . ${message} is ${changed.publicEntries['.'][kind].bytes} bytes, exceeding budget`,
      );
    },
  );

  it('rejects missing, stale, and newly exported public-entry budgets', () => {
    const { measurements, baseline } = budgetFixture();
    const missing = structuredClone(baseline);
    delete missing.publicEntries['./operations'];
    expect(() => validatePackageBudgets(measurements, missing)).toThrow(
      'public entry budgets missing: ./operations',
    );

    const stale = structuredClone(baseline);
    stale.publicEntries['./stale'] = structuredClone(stale.publicEntries['.']);
    expect(() => validatePackageBudgets(measurements, stale)).toThrow(
      'public entry budgets stale or unexpected: ./stale',
    );

    const addedExport = structuredClone(measurements);
    addedExport.publicEntries['./new'] = structuredClone(addedExport.publicEntries['.']);
    expect(() => validatePackageBudgets(addedExport, baseline)).toThrow(
      'public entry budgets missing: ./new',
    );
  });

  it('rejects unexplained new chunks and stale allowed files', () => {
    const { measurements, baseline } = budgetFixture();
    const newChunk = structuredClone(measurements);
    newChunk.files.push('dist/new-shared.js');
    expect(() => validatePackageBudgets(newChunk, baseline)).toThrow(
      'packed files stale or unexpected: dist/new-shared.js',
    );

    const missingChunk = structuredClone(measurements);
    missingChunk.files = missingChunk.files.filter((path) => path !== 'dist/shared.js');
    expect(() => validatePackageBudgets(missingChunk, baseline)).toThrow(
      'packed files missing: dist/shared.js',
    );
  });
});
