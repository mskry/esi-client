import { readFile } from 'node:fs/promises';

import { beforeAll, describe, expect, it } from 'vitest';

describe('scheduled specification drift workflow', () => {
  let workflow: string;

  beforeAll(async () => {
    workflow = await readFile(new URL('../.github/workflows/drift.yml', import.meta.url), 'utf8');
  });

  it('runs on a schedule and by explicit dispatch using the supported frozen toolchain', () => {
    expect(workflow).toMatch(/^  schedule:\n    - cron: ['"][^'"\n]+['"]$/m);
    expect(workflow).toMatch(/^  workflow_dispatch:\s*$/m);
    expect(workflow).toMatch(/^\s+runtime: node@22\.18\.0$/m);
    expect(workflow).toMatch(/^\s+- run: pnpm install --frozen-lockfile$/m);
  });

  it('runs only the structured reporter against its metadata-selected latest date', () => {
    expect(workflow).toMatch(
      /^\s+- run: pnpm drift:report --output drift-report\/esi-specification-drift\.json$/m,
    );
    expect(workflow).not.toMatch(/pnpm drift:report[^\n]*--date/);
  });

  it('publishes the report artifact even when a drift result contains changes', () => {
    expect(workflow).toMatch(/^\s+if: \$\{\{ always\(\) \}\}$/m);
    expect(workflow).toMatch(/^\s+uses: actions\/upload-artifact@v4$/m);
    expect(workflow).toMatch(/^\s+name: esi-specification-drift$/m);
    expect(workflow).toMatch(/^\s+path: drift-report\/esi-specification-drift\.json$/m);
    expect(workflow).toMatch(/^\s+if-no-files-found: error$/m);
  });

  it('has only read permission and cannot persist credentials or write generated state', () => {
    const permissions = workflow.match(/^permissions:\n([\s\S]*?)\n\njobs:/m)?.[1].trim();
    expect(permissions).toBe('contents: read');
    expect(workflow).toMatch(/^\s+persist-credentials: false$/m);
    expect(workflow).not.toMatch(/^\s+[^#\n]+:\s*write\s*$/m);
    expect(workflow).not.toContain('secrets.');
    expect(workflow).not.toMatch(
      /\b(?:pnpm|npm run)\s+generate(?::\S*)?|\bnode\s+scripts\/generate\/|--refresh-snapshot|\bgit\s+(?:add|commit|push)\b/,
    );
  });
});
