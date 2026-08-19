import { describe, expect, it } from 'vitest';

import {
  inspectDocumentationConsistency,
  validateDocumentationConsistency,
} from '../scripts/check-documentation.mjs';

describe('documentation consistency validation', () => {
  it('accepts exactly all 233 operation references and snippets and 39 domain indexes', async () => {
    const inspection = await inspectDocumentationConsistency();

    expect(validateDocumentationConsistency(inspection)).toMatchObject({
      domainCount: 39,
      operationCount: 233,
    });
  });

  it('rejects a missing operation reference', async () => {
    const inspection = await inspectDocumentationConsistency();
    const documents = new Map(inspection.documents);
    documents.delete(`docs/generated/operations/${inspection.operationIds[0]}.md`);

    expect(() => validateDocumentationConsistency({ ...inspection, documents })).toThrow(
      'operation references are inconsistent',
    );
  });

  it('rejects a missing domain index', async () => {
    const inspection = await inspectDocumentationConsistency();
    const documents = new Map(inspection.documents);
    documents.delete(inspection.domainPaths[0]);

    expect(() => validateDocumentationConsistency({ ...inspection, documents })).toThrow(
      'domain indexes are inconsistent',
    );
  });

  it('rejects a missing operation snippet', async () => {
    const inspection = await inspectDocumentationConsistency();
    const operationId = inspection.operationIds[0];
    const path = `docs/generated/operations/${operationId}.md`;
    const documents = replaceArtifact(inspection.documents, path, (content) =>
      content.replace('## Generic-execution snippet', '## Removed snippet'),
    );

    expect(() => validateDocumentationConsistency({ ...inspection, documents })).toThrow(
      `${operationId} generic snippet`,
    );
  });

  it('rejects a missing standalone operation snippet', async () => {
    const inspection = await inspectDocumentationConsistency();
    const operationId = inspection.operationIds[0];
    const path = `docs/generated/operations/${operationId}.md`;
    const documents = replaceArtifact(inspection.documents, path, (content) =>
      content.replace('## Standalone domain-factory snippet', '## Removed standalone snippet'),
    );

    expect(() => validateDocumentationConsistency({ ...inspection, documents })).toThrow(
      `${operationId} standalone domain snippet`,
    );
  });

  it('rejects provenance that differs from openapi/generated/provenance', async () => {
    const inspection = await inspectDocumentationConsistency();
    const path = inspection.examples.keys().next().value;
    if (path === undefined) throw new Error('Expected a generated example');
    const examples = replaceArtifact(inspection.examples, path, (content) =>
      content.replace(inspection.provenance.sha256, '0'.repeat(64)),
    );

    expect(() => validateDocumentationConsistency({ ...inspection, examples })).toThrow(
      'provenance does not match openapi/generated/provenance',
    );
  });

  it.each([
    ['an escaping link', '[escape](../../outside.md)', 'escapes the repository'],
    ['a missing link', '[missing](docs/generated/missing.md)', 'target is missing'],
  ])('rejects %s', async (_name, link, message) => {
    const inspection = await inspectDocumentationConsistency();
    const documents = replaceArtifact(
      inspection.documents,
      'llms.txt',
      (content) => `${content}\n${link}\n`,
    );

    expect(() => validateDocumentationConsistency({ ...inspection, documents })).toThrow(message);
  });

  it.each([
    ['token-looking value', 'const token = "live-token-value-123456789";'],
    ['non-placeholder token source', 'token: secretValue'],
    ['authorization value', 'Authorization: "opaque-authorization-value"'],
    ['bearer credential', 'Authorization: Bearer secret-token-value'],
  ])('rejects a generated %s', async (_name, credential) => {
    const inspection = await inspectDocumentationConsistency();
    const path = inspection.examples.keys().next().value;
    if (path === undefined) throw new Error('Expected a generated example');
    const examples = replaceArtifact(
      inspection.examples,
      path,
      (content) => `${content}\n${credential}\n`,
    );

    expect(() => validateDocumentationConsistency({ ...inspection, examples })).toThrow(
      'contains a credential or authorization value',
    );
  });
});

function replaceArtifact(
  artifacts: ReadonlyMap<string, string>,
  path: string,
  transform: (content: string) => string,
): ReadonlyMap<string, string> {
  const result = new Map(artifacts);
  const content = result.get(path);
  if (content === undefined) throw new Error(`Missing test artifact: ${path}`);
  result.set(path, transform(content));
  return result;
}
