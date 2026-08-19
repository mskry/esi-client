import { execFile } from 'node:child_process';
import { symlink, writeFile } from 'node:fs/promises';
import { join } from 'node:path';
import { promisify } from 'node:util';

const executeFile = promisify(execFile);

export async function prepareIsolatedDeclarationsProject(directory: string): Promise<void> {
  await symlink(join(process.cwd(), 'node_modules'), join(directory, 'node_modules'), 'dir');
  await writeFile(join(directory, 'package.json'), '{"type":"module"}\n');
  await writeFile(
    join(directory, 'tsconfig.json'),
    `${JSON.stringify(
      {
        compilerOptions: {
          declaration: true,
          isolatedDeclarations: true,
          lib: ['ES2022', 'DOM', 'DOM.Iterable'],
          module: 'NodeNext',
          moduleResolution: 'NodeNext',
          noEmit: true,
          skipLibCheck: true,
          strict: true,
          target: 'ES2022',
          verbatimModuleSyntax: true,
        },
        exclude: ['node_modules'],
        include: ['**/*.ts'],
      },
      null,
      2,
    )}\n`,
  );
}

export async function executeTypeScript(directory: string): Promise<void> {
  await executeFile(
    process.execPath,
    [join(process.cwd(), 'node_modules/typescript/bin/tsc'), '--project', 'tsconfig.json'],
    { cwd: directory },
  );
}

export async function expectIsolatedDeclarationsCompilation(directory: string): Promise<void> {
  await prepareIsolatedDeclarationsProject(directory);
  await executeTypeScript(directory);
}
