import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { npmPack, usesWindowsCommandShell } from './lib/npm-pack.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const pnpmExecutable = process.platform === 'win32' ? 'pnpm.cmd' : 'pnpm';

export const packageValidationSteps = Object.freeze([
  'publint',
  'attw',
  'smoke:package',
  'pack:inspect',
]);

export async function checkPackage({ built = false } = {}) {
  if (!built) await run('build', pnpmExecutable, ['run', 'build']);

  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'esi-client-package-check-'));
  try {
    process.stdout.write('\n> package\nPacking built output once for all package checks.\n');
    const [pack] = await npmPack(root, temporaryDirectory);
    const tarball = join(temporaryDirectory, pack.filename);
    const packJson = join(temporaryDirectory, 'pack.json');
    await writeFile(packJson, JSON.stringify(pack));

    const commands = {
      publint: [pnpmExecutable, ['exec', 'publint', '--strict', tarball]],
      attw: [pnpmExecutable, ['exec', 'attw', tarball, '--profile', 'esm-only']],
      'smoke:package': [
        process.execPath,
        [join(root, 'scripts/smoke-package.mjs'), '--tarball', tarball],
      ],
      'pack:inspect': [
        process.execPath,
        [join(root, 'scripts/inspect-pack.mjs'), '--pack-json', packJson],
      ],
    };

    for (const name of packageValidationSteps) {
      const [command, arguments_] = commands[name];
      await run(name, command, arguments_);
    }
  } finally {
    await rm(temporaryDirectory, { force: true, recursive: true });
  }
}

function run(name, command, arguments_) {
  process.stdout.write(`\n> ${name}\n${command} ${arguments_.join(' ')}\n`);
  return new Promise((resolvePromise, reject) => {
    const child = spawn(command, arguments_, {
      cwd: root,
      shell: usesWindowsCommandShell(command),
      stdio: 'inherit',
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolvePromise();
      else
        reject(new Error(`${name} failed with ${signal === null ? `exit code ${code}` : signal}`));
    });
  });
}

const entryPath = process.argv[1];
if (entryPath !== undefined && import.meta.url === pathToFileURL(resolve(entryPath)).href) {
  await checkPackage({ built: process.argv.includes('--built') });
}
