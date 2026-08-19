import { describe, expect, it } from 'vitest';

import {
  findRuntimeImports,
  findUnexpectedRuntimeImports,
} from '../scripts/check-runtime-imports.mjs';
import { packageValidationSteps } from '../scripts/check-package.mjs';
import { parseNpmPackJson, usesWindowsCommandShell } from '../scripts/lib/npm-pack.mjs';
import packageJson from '../package.json' with { type: 'json' };

describe('build gates', () => {
  it('rejects static, dynamic, and CommonJS runtime dependencies', () => {
    const source = `
      import value from 'static-package';
      export { value as other } from 'exported-package';
      import { z } from 'zod';
      const lazy = import('dynamic-package');
      const commonJs = require('commonjs-package');
      export type Local = import('./local').Local;
    `;

    expect(findUnexpectedRuntimeImports(source)).toEqual([
      'static-package',
      'exported-package',
      'dynamic-package',
      'commonjs-package',
    ]);
    expect(findRuntimeImports(source)).toEqual([
      'static-package',
      'exported-package',
      'zod',
      'dynamic-package',
      'commonjs-package',
      './local',
    ]);
  });

  it('detects compact, side-effect, exported, and multiline ESM imports', () => {
    const source = `
      import{z}from"compact-package";
      export{a}from"exported-compact-package";
      import"side-effect-package";
      import {
        multiline,
      } from 'multiline-package';
    `;

    expect(findRuntimeImports(source)).toEqual([
      'compact-package',
      'exported-compact-package',
      'side-effect-package',
      'multiline-package',
    ]);
    expect(findUnexpectedRuntimeImports(source)).toEqual(findRuntimeImports(source));
  });

  it('uses a shell only for Windows command scripts', () => {
    expect(usesWindowsCommandShell('pnpm.cmd', 'win32')).toBe(true);
    expect(usesWindowsCommandShell('npm.CMD', 'win32')).toBe(true);
    expect(usesWindowsCommandShell('node.exe', 'win32')).toBe(false);
    expect(usesWindowsCommandShell('pnpm.cmd', 'darwin')).toBe(false);
  });

  it('parses npm 10 pack output after lifecycle logs', () => {
    const output = `ℹ tsdown build output\n${JSON.stringify([{ filename: 'package.tgz' }])}\n`;

    expect(parseNpmPackJson(output)).toEqual([{ filename: 'package.tgz' }]);
  });

  it.each(['[warn] npm pack failed\n', '[]'])('rejects malformed pack output: %j', (output) => {
    expect(() => parseNpmPackJson(output)).toThrow('npm pack did not produce a JSON result');
  });

  it('keeps aggregate validation complete and dependency ordered', () => {
    expect(packageJson.scripts.validate.split(' && ')).toEqual([
      'pnpm generate:check',
      'pnpm docs:check',
      'pnpm format:check',
      'pnpm lint',
      'pnpm typecheck',
      'pnpm test',
      'pnpm examples:check',
      'pnpm build',
      'pnpm run package:check -- --built',
    ]);
    expect(packageJson.scripts.typecheck.split(' && ')).toEqual([
      'tsc --project tsconfig.json --noEmit',
      'tsc --project tsconfig.test.json --noEmit',
    ]);
    expect(packageJson.scripts.lint).toContain('--type-aware --deny-warnings');
    expect(packageJson.scripts['package:budgets:refresh']).toBe(
      'pnpm build && node scripts/inspect-pack.mjs --refresh-budgets',
    );
    expect(packageJson.scripts.validate).not.toContain('budgets:refresh');
    expect(Object.hasOwn(packageJson.scripts, 'preexamples:check')).toBe(false);
    expect(packageValidationSteps).toEqual(['publint', 'attw', 'smoke:package', 'pack:inspect']);
  });
});
