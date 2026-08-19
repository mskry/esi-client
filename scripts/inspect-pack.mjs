import { cp, mkdir, mkdtemp, readFile, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { npmPack } from './lib/npm-pack.mjs';
import { extractPackageTarball } from './lib/package-tarball.mjs';
import {
  createPackageBudgetBaseline,
  expectedDomainEntryCount,
  measurePackedPackage,
  validateDomainDeclarationSurface,
  validateDomainEntryIsolation,
  validatePackageBudgets,
  validatePackedPackageBoundary,
} from './lib/package-inspection.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const temporaryDirectory = await mkdtemp(join(tmpdir(), 'esi-client-pack-'));
const suppliedPackJson = argumentValue('--pack-json');
const suppliedTarball = argumentValue('--tarball');
const refreshBudgets = process.argv.includes('--refresh-budgets');
const budgetPath = join(root, 'benchmarks/package-baseline.json');

try {
  if (suppliedPackJson !== undefined && suppliedTarball === undefined) {
    throw new Error('--pack-json requires the matching --tarball');
  }
  const packed =
    suppliedPackJson === undefined
      ? await npmPack(root, temporaryDirectory)
      : [JSON.parse(await readFile(suppliedPackJson, 'utf8'))];
  const pack = packed[0];
  const tarball = suppliedTarball ?? join(temporaryDirectory, pack.filename);
  const packageRoot = await extractPackageTarball(tarball, join(temporaryDirectory, 'extracted'));
  const sourceMaps = pack.files.filter(({ path }) => path.endsWith('.map'));
  if (sourceMaps.length > 0) {
    throw new Error(
      `Packed source maps are forbidden: ${sourceMaps.map(({ path }) => path).join(', ')}`,
    );
  }
  const inlineSourceMaps = [];
  const analyzedFiles = await Promise.all(
    pack.files.map(async (file) => {
      const { path } = file;
      if (!path.endsWith('.js') && !/\.d\.(?:ts|mts|cts)$/u.test(path)) return file;
      const source = await readFile(join(packageRoot, path), 'utf8');
      if (/sourceMappingURL\s*=/.test(source)) inlineSourceMaps.push(path);
      return { ...file, source };
    }),
  );
  if (inlineSourceMaps.length > 0) {
    throw new Error(`Packed inline source maps are forbidden: ${inlineSourceMaps.join(', ')}`);
  }

  const packageJson = JSON.parse(await readFile(join(packageRoot, 'package.json'), 'utf8'));
  await installRuntimePackages(packageRoot, packageJson);
  const packedPaths = new Set(pack.files.map(({ path }) => path));
  const packageBoundary = validatePackedPackageBoundary(pack.files, packageJson);
  const missingEntries = [
    packageJson.main,
    packageJson.types,
    ...collectExportTargets(packageJson.exports),
  ]
    .map((path) => path.replace(/^\.\//, ''))
    .filter((path) => !packedPaths.has(path));
  if (missingEntries.length > 0) {
    throw new Error(`Packed package is missing declared entries: ${missingEntries.join(', ')}`);
  }
  const operationsTarget = packageJson.exports['./operations'].import.replace(/^\.\//u, '');
  const operations = await import(pathToFileURL(join(packageRoot, operationsTarget)).href);
  if (
    operations.operationManifest?.operations?.length !== 233 ||
    Object.keys(operations.operationRegistry ?? {}).length !== 233
  ) {
    throw new Error('Packed ./operations export does not expose all 233 runtime metadata entries');
  }
  const measurements = measurePackedPackage({ ...pack, files: analyzedFiles }, packageJson);
  const isolation = validateDomainEntryIsolation(measurements, expectedDomainEntryCount);
  validateDomainDeclarationSurface(measurements, analyzedFiles, expectedDomainEntryCount);
  let baseline;
  if (refreshBudgets) {
    baseline = createPackageBudgetBaseline(measurements);
    await writeFile(budgetPath, `${JSON.stringify(baseline, null, 2)}\n`);
  } else {
    baseline = JSON.parse(await readFile(budgetPath, 'utf8'));
    validatePackageBudgets(measurements, baseline);
  }

  process.stdout.write(
    `${JSON.stringify(
      {
        status: refreshBudgets ? 'refreshed' : 'within budget',
        budgetPath: 'benchmarks/package-baseline.json',
        measurements: measurements.totals,
        budgets: Object.fromEntries(
          Object.entries(baseline.totals).map(([metric, budget]) => [metric, budget.maximum]),
        ),
        publicEntryCount: Object.keys(measurements.publicEntries).length,
        domainEntryCount: isolation.domainEntryCount,
        operationExportTargets: packageBoundary.operationExportTargets,
      },
      null,
      2,
    )}\n`,
  );
} finally {
  await rm(temporaryDirectory, { force: true, recursive: true });
}

function collectExportTargets(value) {
  if (typeof value === 'string') return [value];
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.values(value).flatMap(collectExportTargets);
}

async function installRuntimePackages(packageRoot, packageJson) {
  const packageNames = Object.keys({
    ...packageJson.dependencies,
    ...packageJson.peerDependencies,
  });
  for (const packageName of packageNames) {
    if (!/^(?:@[a-z0-9._~-]+\/)?[a-z0-9._~-]+$/iu.test(packageName)) {
      throw new Error(`Invalid runtime package name: ${packageName}`);
    }
    const segments = packageName.split('/');
    const target = join(packageRoot, 'node_modules', ...segments);
    await mkdir(join(target, '..'), { recursive: true });
    await cp(join(root, 'node_modules', ...segments), target, { recursive: true });
  }
}

function argumentValue(name) {
  const index = process.argv.indexOf(name);
  if (index < 0) return undefined;
  const value = process.argv[index + 1];
  if (value === undefined) throw new Error(`${name} requires a value`);
  return resolve(value);
}
