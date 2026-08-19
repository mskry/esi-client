import { readFile, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { gzipSync } from 'node:zlib';

import { expect, it } from 'vitest';

import { extractPackageTarball } from '../scripts/lib/package-tarball.mjs';
import { makeTemporaryDirectory } from './helpers/temporary-directory.js';

it('extracts package contents from the supplied tarball', async () => {
  const directory = await makeTemporaryDirectory('esi-client-tarball-');
  const tarball = join(directory, 'package.tgz');
  await writeFile(
    tarball,
    createTarball({
      'package/package.json': '{"name":"fixture"}\n',
      'package/dist/index.js': 'export const source = "tarball";\n',
    }),
  );

  const packageRoot = await extractPackageTarball(tarball, join(directory, 'extracted'));

  await expect(readFile(join(packageRoot, 'package.json'), 'utf8')).resolves.toBe(
    '{"name":"fixture"}\n',
  );
  await expect(readFile(join(packageRoot, 'dist/index.js'), 'utf8')).resolves.toBe(
    'export const source = "tarball";\n',
  );
});

function createTarball(files: Readonly<Record<string, string>>): Buffer {
  const blocks: Buffer[] = [];
  for (const [path, source] of Object.entries(files)) {
    const body = Buffer.from(source);
    const header = Buffer.alloc(512);
    header.write(path, 0, 100, 'utf8');
    writeOctal(header, 100, 8, 0o644);
    writeOctal(header, 108, 8, 0);
    writeOctal(header, 116, 8, 0);
    writeOctal(header, 124, 12, body.length);
    writeOctal(header, 136, 12, 0);
    header.fill(0x20, 148, 156);
    header.write('0', 156, 1, 'ascii');
    header.write('ustar\0', 257, 6, 'ascii');
    header.write('00', 263, 2, 'ascii');
    const checksum = header.reduce((total, byte) => total + byte, 0);
    writeOctal(header, 148, 8, checksum);
    blocks.push(header, body, Buffer.alloc((512 - (body.length % 512)) % 512));
  }
  blocks.push(Buffer.alloc(1024));
  return gzipSync(Buffer.concat(blocks));
}

function writeOctal(target: Buffer, offset: number, length: number, value: number): void {
  const source = value.toString(8).padStart(length - 2, '0');
  target.write(`${source}\0 `, offset, length, 'ascii');
}
