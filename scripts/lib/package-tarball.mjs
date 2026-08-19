import { readFile, mkdir, writeFile } from 'node:fs/promises';
import { dirname, join, posix } from 'node:path';
import { promisify } from 'node:util';
import { gunzip as gunzipCallback } from 'node:zlib';

const gunzip = promisify(gunzipCallback);
const blockSize = 512;

export async function extractPackageTarball(tarball, destination) {
  const archive = await gunzip(await readFile(tarball));
  const extracted = new Set();
  let globalPax = {};
  let nextPax = {};
  let nextLongPath;

  await mkdir(destination, { recursive: true });

  for (let offset = 0; offset + blockSize <= archive.length;) {
    const header = archive.subarray(offset, offset + blockSize);
    offset += blockSize;
    if (header.every((byte) => byte === 0)) break;
    validateChecksum(header);

    const size = parseOctal(header.subarray(124, 136), 'entry size');
    const bodyEnd = offset + size;
    if (bodyEnd > archive.length) throw new Error('Truncated package tarball entry');
    const body = archive.subarray(offset, bodyEnd);
    offset += Math.ceil(size / blockSize) * blockSize;

    const type = decode(header.subarray(156, 157));
    if (type === 'g' || type === 'x') {
      const values = parsePax(body);
      if (type === 'g') globalPax = { ...globalPax, ...values };
      else nextPax = values;
      continue;
    }
    if (type === 'L') {
      nextLongPath = decode(body);
      continue;
    }

    const name = decode(header.subarray(0, 100));
    const prefix = decode(header.subarray(345, 500));
    const headerPath = prefix.length === 0 ? name : `${prefix}/${name}`;
    const archivePath = globalPax.path ?? nextPax.path ?? nextLongPath ?? headerPath;
    nextPax = {};
    nextLongPath = undefined;
    const normalizedPath = safePackagePath(archivePath);
    if (extracted.has(normalizedPath)) {
      throw new Error(`Duplicate package tarball entry: ${normalizedPath}`);
    }
    extracted.add(normalizedPath);
    const outputPath = join(destination, ...normalizedPath.split('/'));

    if (type === '5') {
      await mkdir(outputPath, { recursive: true });
      continue;
    }
    if (type !== '' && type !== '0') {
      throw new Error(`Unsupported package tarball entry type ${JSON.stringify(type)}`);
    }
    await mkdir(dirname(outputPath), { recursive: true });
    await writeFile(outputPath, body);
  }

  if (!extracted.has('package/package.json')) {
    throw new Error('Package tarball does not contain package/package.json');
  }
  return join(destination, 'package');
}

function safePackagePath(value) {
  const normalized = posix.normalize(value);
  if (
    value.length === 0 ||
    posix.isAbsolute(value) ||
    normalized === '..' ||
    normalized.startsWith('../') ||
    (normalized !== 'package' && !normalized.startsWith('package/'))
  ) {
    throw new Error(`Unsafe package tarball path: ${value}`);
  }
  return normalized;
}

function parsePax(body) {
  const source = body.toString('utf8');
  const values = {};
  let offset = 0;
  while (offset < source.length) {
    const separator = source.indexOf(' ', offset);
    if (separator < 0) throw new Error('Invalid package tarball PAX record');
    const length = Number(source.slice(offset, separator));
    if (!Number.isSafeInteger(length) || length <= 0 || offset + length > source.length) {
      throw new Error('Invalid package tarball PAX record length');
    }
    const record = source.slice(separator + 1, offset + length - 1);
    const equals = record.indexOf('=');
    if (equals > 0) values[record.slice(0, equals)] = record.slice(equals + 1);
    offset += length;
  }
  return values;
}

function validateChecksum(header) {
  const expected = parseOctal(header.subarray(148, 156), 'checksum');
  let actual = 0;
  for (let index = 0; index < header.length; index += 1) {
    actual += index >= 148 && index < 156 ? 0x20 : header[index];
  }
  if (actual !== expected) throw new Error('Invalid package tarball checksum');
}

function parseOctal(value, label) {
  const source = decode(value).trim();
  if (!/^[0-7]+$/u.test(source)) throw new Error(`Invalid package tarball ${label}`);
  const parsed = Number.parseInt(source, 8);
  if (!Number.isSafeInteger(parsed) || parsed < 0) {
    throw new Error(`Invalid package tarball ${label}`);
  }
  return parsed;
}

function decode(value) {
  const zero = value.indexOf(0);
  return value
    .subarray(0, zero < 0 ? value.length : zero)
    .toString('utf8')
    .trimEnd();
}
