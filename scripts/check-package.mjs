import { spawn } from 'node:child_process';
import { mkdtemp, rm, writeFile } from 'node:fs/promises';
import { tmpdir } from 'node:os';
import { join, resolve } from 'node:path';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { npmPack } from './lib/npm-pack.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));
const attwCli = fileURLToPath(
  new URL('./index.js', import.meta.resolve('@arethetypeswrong/cli/internal/getExitCode')),
);
const publintCli = fileURLToPath(new URL('./cli.js', import.meta.resolve('publint')));
const tsdownCli = fileURLToPath(import.meta.resolve('tsdown/run'));

export const packageValidationSteps = Object.freeze([
  'publint',
  'attw',
  'smoke:package',
  'pack:inspect',
]);

export async function checkPackage({ built = false } = {}) {
  if (!built) await run('build', process.execPath, [tsdownCli]);

  const temporaryDirectory = await mkdtemp(join(tmpdir(), 'esi-client-package-check-'));
  try {
    process.stdout.write('\n> package\nPacking built output once for all package checks.\n');
    const [pack] = await npmPack(root, temporaryDirectory);
    const tarball = join(temporaryDirectory, pack.filename);
    const packJson = join(temporaryDirectory, 'pack.json');
    await writeFile(packJson, JSON.stringify(pack));

    const commands = {
      publint: [process.execPath, [publintCli, '--strict', tarball]],
      attw: [process.execPath, [attwCli, tarball, '--profile', 'esm-only']],
      'smoke:package': [
        process.execPath,
        [join(root, 'scripts/smoke-package.mjs'), '--tarball', tarball],
      ],
      'pack:inspect': [
        process.execPath,
        [join(root, 'scripts/inspect-pack.mjs'), '--pack-json', packJson, '--tarball', tarball],
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
    let output = '';
    const child = spawn(command, arguments_, {
      cwd: root,
      stdio: ['inherit', 'pipe', 'pipe'],
    });
    child.stdout.on('data', (chunk) => {
      output += chunk;
      process.stdout.write(chunk);
    });
    child.stderr.on('data', (chunk) => {
      output += chunk;
      process.stderr.write(chunk);
    });
    child.once('error', reject);
    child.once('exit', (code, signal) => {
      if (code === 0) resolvePromise();
      else {
        const details = output.trim();
        reject(
          new Error(
            `${name} failed with ${signal === null ? `exit code ${code}` : signal}${details ? `\n\n${details}` : ''}`,
          ),
        );
      }
    });
  });
}

const entryPath = process.argv[1];
if (entryPath !== undefined && import.meta.url === pathToFileURL(resolve(entryPath)).href) {
  try {
    await checkPackage({ built: process.argv.includes('--built') });
  } catch (error) {
    if (process.env.GITHUB_ACTIONS === 'true') {
      const message = error instanceof Error ? (error.stack ?? error.message) : String(error);
      process.stderr.write(
        `::error title=Package validation failed::${escapeWorkflowData(message)}\n`,
      );
    }
    throw error;
  }
}

function escapeWorkflowData(value) {
  return value.replaceAll('%', '%25').replaceAll('\r', '%0D').replaceAll('\n', '%0A');
}
