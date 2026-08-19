export const forbiddenPackagePaths = Object.freeze([
  'llms.txt',
  'docs/llms.txt',
  'docs/generated/',
  'examples/generated/',
]);

export const packageBudgetSchemaVersion = 1;
export const packageBudgetByteHeadroomPercent = 2;
export const packageBudgetFileCountHeadroom = 0;

const totalByteMetrics = Object.freeze([
  'compressedBytes',
  'unpackedBytes',
  'javascriptBytes',
  'declarationBytes',
]);
const totalMetrics = Object.freeze([...totalByteMetrics, 'fileCount']);

export function findForbiddenPackedPaths(files) {
  const paths = files.map((file) => normalizePackedPath(file.path));
  return paths
    .filter((path) =>
      forbiddenPackagePaths.some((forbidden) =>
        forbidden.endsWith('/') ? path.startsWith(forbidden) : path === forbidden,
      ),
    )
    .toSorted(compareText);
}

export function validatePackedPackageBoundary(files, packageJson) {
  if (!Array.isArray(files)) throw new TypeError('Packed files must be an array');
  const forbidden = findForbiddenPackedPaths(files);
  if (forbidden.length > 0) {
    throw new Error(`Packed documentation artifacts are forbidden: ${forbidden.join(', ')}`);
  }

  const operationsExport = packageJson?.exports?.['./operations'];
  const targets = [
    ...new Set(
      collectExportTargets(operationsExport).map((path) =>
        normalizePackedPath(path.replace(/^\.\//u, '')),
      ),
    ),
  ];
  if (targets.length === 0) {
    throw new Error('Package must export runtime operation metadata through ./operations');
  }
  const packedPaths = new Set(files.map((file) => normalizePackedPath(file.path)));
  if (packageJson?.exports?.['./package.json'] !== './package.json') {
    throw new Error('Package must export ./package.json as package metadata');
  }
  if (!packedPaths.has('package.json')) {
    throw new Error('Packed package is missing its package.json metadata export target');
  }
  const missingTargets = targets.filter((path) => !packedPaths.has(path));
  if (missingTargets.length > 0) {
    throw new Error(`Packed ./operations export targets are missing: ${missingTargets.join(', ')}`);
  }
  if (!targets.some((path) => path.endsWith('.js'))) {
    throw new Error('Package ./operations export must include a runtime JavaScript target');
  }

  return { forbiddenPaths: forbidden, operationExportTargets: targets.toSorted(compareText) };
}

export function measurePackedPackage(pack, packageJson) {
  if (pack === null || typeof pack !== 'object')
    throw new TypeError('Pack result must be an object');
  if (!Array.isArray(pack.files)) throw new TypeError('Packed files must be an array');

  const files = pack.files.map((file) => ({
    path: normalizePackedPath(file.path),
    size: requireNonnegativeInteger(file.size, `Packed file ${String(file.path)} size`),
  }));
  const duplicatePaths = findDuplicates(files.map(({ path }) => path));
  if (duplicatePaths.length > 0) {
    throw new Error(`Packed package contains duplicate paths: ${duplicatePaths.join(', ')}`);
  }

  const fileSizes = new Map(files.map(({ path, size }) => [path, size]));
  const publicEntries = {};
  for (const [entryName, targets] of collectPublicEntryTargets(packageJson)) {
    publicEntries[entryName] = {
      javascript: measureEntryTarget(entryName, 'import', targets.javascript, fileSizes),
      declaration: measureEntryTarget(entryName, 'types', targets.declaration, fileSizes),
    };
  }

  return {
    packageVersion: requireNonemptyString(packageJson?.version, 'Package version'),
    totals: {
      compressedBytes: requireNonnegativeInteger(pack.size, 'Compressed package size'),
      unpackedBytes: requireNonnegativeInteger(pack.unpackedSize, 'Unpacked package size'),
      javascriptBytes: sumFileSizes(files, (path) => path.endsWith('.js')),
      declarationBytes: sumFileSizes(files, (path) => path.endsWith('.d.ts')),
      fileCount: requireNonnegativeInteger(pack.entryCount ?? files.length, 'Packed file count'),
    },
    publicEntries,
    files: files.map(({ path }) => path).toSorted(compareText),
  };
}

export function createPackageBudgetBaseline(measurements) {
  const publicEntries = {};
  for (const [entryName, entry] of Object.entries(measurements.publicEntries)) {
    publicEntries[entryName] = {
      javascript: createEntryBudget(entry.javascript),
      declaration: createEntryBudget(entry.declaration),
    };
  }

  const totals = {};
  for (const metric of totalMetrics) {
    const measured = measurements.totals[metric];
    totals[metric] = {
      measured,
      maximum:
        metric === 'fileCount' ? measured + packageBudgetFileCountHeadroom : maximumBytes(measured),
    };
  }

  return {
    schemaVersion: packageBudgetSchemaVersion,
    policy: {
      byteHeadroomPercent: packageBudgetByteHeadroomPercent,
      fileCountHeadroom: packageBudgetFileCountHeadroom,
      description:
        'Byte maxima are accepted measurements plus 2%; file count and packed paths have no headroom, so every new artifact requires review.',
    },
    totals,
    publicEntries,
    allowedFiles: [...measurements.files],
  };
}

export function validatePackageBudgets(measurements, baseline) {
  const issues = [];
  if (baseline?.schemaVersion !== packageBudgetSchemaVersion) {
    issues.push(
      `budget schema version must be ${packageBudgetSchemaVersion}, received ${String(baseline?.schemaVersion)}`,
    );
  }
  validateBudgetPolicy(baseline?.policy, issues);

  const budgetTotals = isRecord(baseline?.totals) ? baseline.totals : {};
  compareKeys('total metric budgets', totalMetrics, Object.keys(budgetTotals), issues);
  for (const metric of totalMetrics) {
    const budget = budgetTotals[metric];
    if (!validateTotalBudget(metric, budget, issues)) continue;
    const actual = measurements.totals[metric];
    if (actual > budget.maximum) {
      issues.push(`${metric} is ${actual}, exceeding budget ${budget.maximum}`);
    }
  }

  const measuredEntries = measurements.publicEntries;
  const budgetEntries = isRecord(baseline?.publicEntries) ? baseline.publicEntries : {};
  compareKeys(
    'public entry budgets',
    Object.keys(measuredEntries),
    Object.keys(budgetEntries),
    issues,
  );
  for (const entryName of Object.keys(measuredEntries)) {
    const measuredEntry = measuredEntries[entryName];
    const budgetEntry = budgetEntries[entryName];
    if (!isRecord(budgetEntry)) continue;
    compareKeys(
      `public entry ${entryName} artifact budgets`,
      ['javascript', 'declaration'],
      Object.keys(budgetEntry),
      issues,
    );
    validateEntryBudget(
      entryName,
      'javascript',
      measuredEntry.javascript,
      budgetEntry.javascript,
      issues,
    );
    validateEntryBudget(
      entryName,
      'declaration',
      measuredEntry.declaration,
      budgetEntry.declaration,
      issues,
    );
  }

  const allowedFiles = Array.isArray(baseline?.allowedFiles) ? baseline.allowedFiles : [];
  compareKeys('packed files', allowedFiles, measurements.files, issues);

  if (issues.length > 0) {
    throw new Error(`Package budget validation failed:\n- ${issues.join('\n- ')}`);
  }
}

function collectPublicEntryTargets(packageJson) {
  if (!isRecord(packageJson?.exports)) throw new Error('Package exports must be an object');
  return Object.entries(packageJson.exports).flatMap(([entryName, entry]) => {
    if (typeof entry === 'string') {
      if (entryName === './package.json' && entry === './package.json') return [];
      throw new Error(`Public metadata entry ${entryName} must target ./package.json`);
    }
    if (!isRecord(entry)) {
      throw new Error(`Public entry ${entryName} must declare explicit import and types targets`);
    }
    return [
      [
        entryName,
        {
          javascript: normalizePackedPath(
            requireNonemptyString(entry.import, `Public entry ${entryName} import target`).replace(
              /^\.\//u,
              '',
            ),
          ),
          declaration: normalizePackedPath(
            requireNonemptyString(entry.types, `Public entry ${entryName} types target`).replace(
              /^\.\//u,
              '',
            ),
          ),
        },
      ],
    ];
  });
}

function measureEntryTarget(entryName, condition, path, fileSizes) {
  const bytes = fileSizes.get(path);
  if (bytes === undefined) {
    throw new Error(`Public entry ${entryName} ${condition} target is not packed: ${path}`);
  }
  return { path, bytes };
}

function createEntryBudget(measurement) {
  return {
    path: measurement.path,
    measuredBytes: measurement.bytes,
    maximumBytes: maximumBytes(measurement.bytes),
  };
}

function maximumBytes(measuredBytes) {
  return Math.ceil((measuredBytes * (100 + packageBudgetByteHeadroomPercent)) / 100);
}

function validateBudgetPolicy(policy, issues) {
  if (!isRecord(policy)) {
    issues.push('budget policy is missing');
    return;
  }
  if (policy.byteHeadroomPercent !== packageBudgetByteHeadroomPercent) {
    issues.push(`budget byte headroom must be ${packageBudgetByteHeadroomPercent}%`);
  }
  if (policy.fileCountHeadroom !== packageBudgetFileCountHeadroom) {
    issues.push(`budget file-count headroom must be ${packageBudgetFileCountHeadroom}`);
  }
  if (typeof policy.description !== 'string' || policy.description.length === 0) {
    issues.push('budget policy description is missing');
  }
}

function validateTotalBudget(metric, budget, issues) {
  if (!isRecord(budget)) return false;
  const measured = budget.measured;
  const maximum = budget.maximum;
  if (!Number.isSafeInteger(measured) || measured < 0) {
    issues.push(`${metric} accepted measurement must be a nonnegative integer`);
    return false;
  }
  const expectedMaximum =
    metric === 'fileCount' ? measured + packageBudgetFileCountHeadroom : maximumBytes(measured);
  if (maximum !== expectedMaximum) {
    issues.push(`${metric} budget must be ${expectedMaximum} for accepted measurement ${measured}`);
    return false;
  }
  return true;
}

function validateEntryBudget(entryName, kind, measurement, budget, issues) {
  if (!isRecord(budget)) {
    issues.push(`public entry ${entryName} is missing its ${kind} budget`);
    return;
  }
  if (budget.path !== measurement.path) {
    issues.push(
      `public entry ${entryName} ${kind} target changed from ${String(budget.path)} to ${measurement.path}`,
    );
  }
  if (!Number.isSafeInteger(budget.measuredBytes) || budget.measuredBytes < 0) {
    issues.push(`public entry ${entryName} ${kind} accepted measurement must be nonnegative`);
    return;
  }
  const expectedMaximum = maximumBytes(budget.measuredBytes);
  if (budget.maximumBytes !== expectedMaximum) {
    issues.push(
      `public entry ${entryName} ${kind} budget must be ${expectedMaximum} for accepted measurement ${budget.measuredBytes}`,
    );
    return;
  }
  if (measurement.bytes > budget.maximumBytes) {
    issues.push(
      `public entry ${entryName} ${kind} is ${measurement.bytes} bytes, exceeding budget ${budget.maximumBytes}`,
    );
  }
}

function compareKeys(label, expected, actual, issues) {
  const expectedSet = new Set(expected);
  const actualSet = new Set(actual);
  const missing = [...expectedSet].filter((value) => !actualSet.has(value)).toSorted(compareText);
  const stale = [...actualSet].filter((value) => !expectedSet.has(value)).toSorted(compareText);
  if (missing.length > 0) issues.push(`${label} missing: ${missing.join(', ')}`);
  if (stale.length > 0) issues.push(`${label} stale or unexpected: ${stale.join(', ')}`);
}

function sumFileSizes(files, predicate) {
  return files.reduce((total, file) => total + (predicate(file.path) ? file.size : 0), 0);
}

function requireNonnegativeInteger(value, label) {
  if (!Number.isSafeInteger(value) || value < 0) {
    throw new TypeError(`${label} must be a nonnegative integer`);
  }
  return value;
}

function requireNonemptyString(value, label) {
  if (typeof value !== 'string' || value.length === 0) {
    throw new TypeError(`${label} must be a nonempty string`);
  }
  return value;
}

function findDuplicates(values) {
  const seen = new Set();
  const duplicates = new Set();
  for (const value of values) {
    if (seen.has(value)) duplicates.add(value);
    seen.add(value);
  }
  return [...duplicates].toSorted(compareText);
}

function isRecord(value) {
  return value !== null && typeof value === 'object' && !Array.isArray(value);
}

function collectExportTargets(value) {
  if (typeof value === 'string') return [value];
  if (value === null || typeof value !== 'object' || Array.isArray(value)) return [];
  return Object.values(value).flatMap(collectExportTargets);
}

function normalizePackedPath(path) {
  return String(path)
    .replace(/^\.\//u, '')
    .replace(/^package\//u, '')
    .replaceAll('\\', '/');
}

function compareText(left, right) {
  return left < right ? -1 : left > right ? 1 : 0;
}
