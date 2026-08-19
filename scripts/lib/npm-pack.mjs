import { execFile } from 'node:child_process';
import { promisify } from 'node:util';

const executeFile = promisify(execFile);
export const npmExecutable = process.platform === 'win32' ? 'npm.cmd' : 'npm';

export function usesWindowsCommandShell(command, platform = process.platform) {
  return platform === 'win32' && /\.(?:cmd|bat)$/iu.test(command);
}

export function execFileAsync(command, arguments_, options = {}) {
  return executeFile(command, arguments_, {
    ...options,
    encoding: 'utf8',
    shell: options.shell ?? usesWindowsCommandShell(command),
  });
}

export async function npmPack(packageDirectory, destination) {
  const { stdout } = await execFileAsync(
    npmExecutable,
    ['pack', '--json', '--ignore-scripts', '--pack-destination', destination],
    { cwd: packageDirectory },
  );
  return parseNpmPackJson(stdout);
}

export function parseNpmPackJson(stdout) {
  let index = stdout.lastIndexOf('[');
  while (index >= 0) {
    try {
      const result = JSON.parse(stdout.slice(index).trim());
      if (Array.isArray(result) && result.length > 0) return result;
    } catch {
      // npm 10 may print lifecycle output before the final JSON payload.
    }
    if (index === 0) break;
    index = stdout.lastIndexOf('[', index - 1);
  }
  throw new Error('npm pack did not produce a JSON result');
}
