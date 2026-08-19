import { lstat, readdir, rm } from 'node:fs/promises';
import { basename, dirname, join } from 'node:path';
import { fileURLToPath } from 'node:url';

import { generatedReplacementTargets } from './generate/paths.mjs';

const root = fileURLToPath(new URL('../', import.meta.url));

await Promise.all(['dist', '.package-smoke', '.pack'].map((path) => remove(join(root, path))));

for (const entry of await readdir(root, { withFileTypes: true })) {
  if (entry.name.startsWith('.esi-source-generation-')) {
    await remove(join(root, entry.name));
  }
}

for (const target of generatedReplacementTargets) {
  const targetPath = join(root, target);
  const parent = dirname(targetPath);
  const name = basename(targetPath);
  let siblings;
  try {
    siblings = await readdir(parent);
  } catch (error) {
    if (error?.code === 'ENOENT') continue;
    throw error;
  }

  const backups = siblings.filter(
    (entry) =>
      entry.startsWith(`${name}.backup-`) || entry.startsWith(`.${name}.esi-client-backup-`),
  );
  if (backups.length > 0 && !(await exists(targetPath))) {
    throw new Error(
      `Refusing to remove generation backup because its target is missing: ${target}`,
    );
  }
  await Promise.all(backups.map((entry) => remove(join(parent, entry))));

  const incoming = siblings.filter((entry) => entry.startsWith(`.${name}.esi-client-incoming-`));
  await Promise.all(incoming.map((entry) => remove(join(parent, entry))));
}

async function exists(path) {
  try {
    await lstat(path);
    return true;
  } catch (error) {
    if (error?.code === 'ENOENT') return false;
    throw error;
  }
}

async function remove(path) {
  await rm(path, { force: true, recursive: true });
}
