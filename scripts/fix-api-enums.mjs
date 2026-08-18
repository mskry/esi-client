import { readdir, readFile, writeFile } from 'node:fs/promises';

const apiDirectory = new URL('../src/apis/', import.meta.url);

for (const entry of await readdir(apiDirectory)) {
  if (!entry.endsWith('.ts')) continue;

  const apiFile = new URL(entry, apiDirectory);
  let source = await readFile(apiFile, 'utf8');
  source = replaceMissingEnums(source, 'XCompatibilityDateEnum');
  source = replaceMissingEnums(source, 'AcceptLanguageEnum');
  await writeFile(apiFile, source);
}

function replaceMissingEnums(source, suffix) {
  const declaration = new RegExp(`export type (\\w+${suffix})\\s*=`, 'g');
  const declared = new Set([...source.matchAll(declaration)].map(([, name]) => name));
  const fallback = declared.values().next().value;
  const reference = new RegExp(`\\b\\w+${suffix}\\b`, 'g');

  // ESI reuses these header parameters, but the generator can omit duplicate enums.
  return source.replace(reference, (name) => {
    if (declared.has(name)) return name;
    if (!fallback) throw new Error(`Missing generated ${suffix} type: ${name}`);
    return fallback;
  });
}
