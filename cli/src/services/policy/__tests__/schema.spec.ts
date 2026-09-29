import { describe, expect, it } from 'vitest';
import { parsePolicy, policyDocumentSchema } from '../schema';

describe('policy schema', () => {
  const contractDoc = {
    schema_version: 1,
    rules: [
      {
        id: 'no-generated-edits',
        kind: 'protected_path',
        paths: ['internal/gen/**'],
        action: 'block',
        reason: 'Generated code; edit the .proto instead',
        source: { origin: 'declared' },
      },
      {
        id: 'use-pnpm',
        kind: 'command',
        executables: ['npm'],
        action: 'rewrite',
        rewrite_to: 'pnpm',
        reason: 'Repo uses pnpm',
        source: {
          origin: 'compiled',
          file: 'AGENTS.md',
          line: 12,
          text: 'Use pnpm instead of npm.',
          digest:
            'e3b0c44298fc1c149afbf4c8996fb92427ae41e4649b934ca495991b7852b855',
        },
      },
      {
        id: 'cli-tests',
        kind: 'required_check',
        when_changed: ['cli/src/**'],
        checks: ['pnpm --filter ./cli test'],
        action: 'warn',
        reason: 'CLI changes need tests',
        source: { origin: 'declared' },
      },
    ],
  };

  it('accepts the contract example', () => {
    const result = parsePolicy(contractDoc);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.schema_version).toBe(1);
      expect(result.doc.rules).toHaveLength(3);
    }
  });

  it('defaults action to warn when omitted', () => {
    const docWithoutActions = {
      schema_version: 1,
      rules: [
        {
          id: 'path-rule',
          kind: 'protected_path',
          paths: ['config/**'],
          reason: 'Protected config',
          source: { origin: 'declared' },
        },
        {
          id: 'cmd-rule',
          kind: 'command',
          executables: ['yarn'],
          reason: 'Yarn warning',
          source: { origin: 'declared' },
        },
        {
          id: 'check-rule',
          kind: 'required_check',
          when_changed: ['src/**'],
          checks: ['npm test'],
          reason: 'Run tests',
          source: { origin: 'declared' },
        },
      ],
    };

    const result = parsePolicy(docWithoutActions);
    expect(result.ok).toBe(true);
    if (result.ok) {
      expect(result.doc.rules[0].action).toBe('warn');
      expect(result.doc.rules[1].action).toBe('warn');
      expect(result.doc.rules[2].action).toBe('warn');
    }
  });

  it('rejects unknown kind', () => {
    const doc = {
      schema_version: 1,
      rules: [
        {
          id: 'unknown-rule',
          kind: 'unsupported_kind',
          reason: 'Test',
          source: { origin: 'declared' },
        },
      ],
    };
    const result = parsePolicy(doc);
    expect(result.ok).toBe(false);
  });

  it('rejects foreign fields (e.g. paths on a command rule)', () => {
    const doc = {
      schema_version: 1,
      rules: [
        {
          id: 'cmd-with-paths',
          kind: 'command',
          executables: ['npm'],
          paths: ['src/**'],
          reason: 'Invalid command rule',
          source: { origin: 'declared' },
        },
      ],
    };
    const result = parsePolicy(doc);
    expect(result.ok).toBe(false);
  });

  it('rejects rewrite action without rewrite_to', () => {
    const doc = {
      schema_version: 1,
      rules: [
        {
          id: 'missing-rewrite-target',
          kind: 'command',
          executables: ['npm'],
          action: 'rewrite',
          reason: 'Need rewrite target',
          source: { origin: 'declared' },
        },
      ],
    };
    const result = parsePolicy(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('rewrite_to'))).toBe(true);
    }
  });

  it('rejects compiled rule with block action', () => {
    const doc = {
      schema_version: 1,
      rules: [
        {
          id: 'compiled-block',
          kind: 'protected_path',
          paths: ['secret/**'],
          action: 'block',
          reason: 'Compiled should not block',
          source: { origin: 'compiled', file: 'AGENTS.md', line: 1 },
        },
      ],
    };
    const result = parsePolicy(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(
        result.errors.some((e) =>
          e.includes('compiled rule cannot have block action'),
        ),
      ).toBe(true);
    }
  });

  it('rejects bad rule id', () => {
    const badIds = ['BadId', 'bad_id', '-bad', 'bad-', 'bad id', 'bad--id', ''];
    for (const badId of badIds) {
      const doc = {
        schema_version: 1,
        rules: [
          {
            id: badId,
            kind: 'protected_path',
            paths: ['foo/**'],
            reason: 'Testing id format',
            source: { origin: 'declared' },
          },
        ],
      };
      const result = parsePolicy(doc);
      expect(result.ok).toBe(false);
    }
  });

  it('rejects duplicate rule id', () => {
    const doc = {
      schema_version: 1,
      rules: [
        {
          id: 'duplicate-rule',
          kind: 'protected_path',
          paths: ['a/**'],
          reason: 'First',
          source: { origin: 'declared' },
        },
        {
          id: 'duplicate-rule',
          kind: 'command',
          executables: ['npm'],
          reason: 'Second',
          source: { origin: 'declared' },
        },
      ],
    };
    const result = parsePolicy(doc);
    expect(result.ok).toBe(false);
    if (!result.ok) {
      expect(result.errors.some((e) => e.includes('duplicate rule id'))).toBe(
        true,
      );
    }
  });

  it('rejects schema_version: 2', () => {
    const doc = {
      schema_version: 2,
      rules: [],
    };
    const result = parsePolicy(doc);
    expect(result.ok).toBe(false);
  });
});
