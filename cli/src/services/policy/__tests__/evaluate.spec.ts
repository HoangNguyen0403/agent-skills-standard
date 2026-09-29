import { describe, expect, it } from 'vitest';
import {
  bypassFromEnv,
  checkCommand,
  checkPath,
  requiredChecks,
} from '../evaluate';
import { PolicyDocument } from '../schema';

describe('policy evaluate', () => {
  const sampleDoc: PolicyDocument = {
    schema_version: 1,
    rules: [
      {
        id: 'no-gen',
        kind: 'protected_path',
        paths: ['internal/gen/**'],
        action: 'block',
        reason: 'Generated code',
        source: { origin: 'declared' },
      },
      {
        id: 'warn-docs',
        kind: 'protected_path',
        paths: ['docs/**'],
        action: 'warn',
        reason: 'Review doc changes',
        source: { origin: 'declared' },
      },
      {
        id: 'warn-gen-also',
        kind: 'protected_path',
        paths: ['internal/gen/special/**'],
        action: 'warn',
        reason: 'Special gen',
        source: { origin: 'declared' },
      },
      {
        id: 'use-pnpm',
        kind: 'command',
        executables: ['npm', 'yarn'],
        action: 'rewrite',
        rewrite_to: 'pnpm',
        reason: 'Repo uses pnpm',
        source: { origin: 'compiled', file: 'AGENTS.md', line: 1 },
      },
      {
        id: 'block-rm',
        kind: 'command',
        executables: ['rm'],
        action: 'block',
        reason: 'Use trash instead',
        source: { origin: 'declared' },
      },
      {
        id: 'check-cli',
        kind: 'required_check',
        when_changed: ['cli/src/**'],
        checks: ['pnpm --filter ./cli test'],
        action: 'block',
        reason: 'CLI test needed',
        source: { origin: 'declared' },
      },
      {
        id: 'check-docs',
        kind: 'required_check',
        when_changed: ['docs/**'],
        checks: ['pnpm check:docs'],
        action: 'warn',
        reason: 'Doc check',
        source: { origin: 'declared' },
      },
    ],
  };

  describe('bypassFromEnv', () => {
    it('returns true for 1 and true', () => {
      expect(bypassFromEnv({ AGS_POLICY_BYPASS: '1' })).toBe(true);
      expect(bypassFromEnv({ AGS_POLICY_BYPASS: 'true' })).toBe(true);
    });

    it('returns false for other values and undefined', () => {
      expect(bypassFromEnv({ AGS_POLICY_BYPASS: '0' })).toBe(false);
      expect(bypassFromEnv({ AGS_POLICY_BYPASS: 'false' })).toBe(false);
      expect(bypassFromEnv({})).toBe(false);
      expect(bypassFromEnv(undefined)).toBe(false);
    });
  });

  describe('checkPath', () => {
    it('returns block when a matching rule has block action', () => {
      const decision = checkPath(sampleDoc, 'internal/gen/x.go');
      expect(decision.outcome).toBe('block');
      expect(decision.bypassed).toBe(false);
      expect(decision.waived).toEqual([]);
      expect(decision.matched.map((m) => m.id)).toEqual(['no-gen']);
    });

    it('returns block over warn when both match (precedence)', () => {
      const decision = checkPath(sampleDoc, 'internal/gen/special/foo.go');
      expect(decision.outcome).toBe('block');
      expect(decision.matched).toHaveLength(2);
      expect(decision.matched.map((m) => m.id)).toEqual([
        'no-gen',
        'warn-gen-also',
      ]);
    });

    it('returns warn when only warn matches', () => {
      const decision = checkPath(sampleDoc, 'docs/readme.md');
      expect(decision.outcome).toBe('warn');
      expect(decision.matched.map((m) => m.id)).toEqual(['warn-docs']);
    });

    it('returns allow when no rule matches', () => {
      const decision = checkPath(sampleDoc, 'src/index.ts');
      expect(decision.outcome).toBe('allow');
      expect(decision.matched).toEqual([]);
    });

    it('returns allow with bypassed true and waived rules when bypass is active', () => {
      const decision = checkPath(sampleDoc, 'internal/gen/x.go', {
        bypass: true,
      });
      expect(decision.outcome).toBe('allow');
      expect(decision.bypassed).toBe(true);
      expect(decision.waived).toEqual(['no-gen']);
      expect(decision.matched.map((m) => m.id)).toEqual(['no-gen']);
    });
  });

  describe('checkCommand', () => {
    it('returns rewrite with rewrite_to when command matches rewrite rule', () => {
      const decision = checkCommand(sampleDoc, 'npm');
      expect(decision.outcome).toBe('rewrite');
      expect(decision.rewrite_to).toBe('pnpm');
      expect(decision.matched.map((m) => m.id)).toEqual(['use-pnpm']);
    });

    it('returns block when command matches block rule', () => {
      const decision = checkCommand(sampleDoc, 'rm');
      expect(decision.outcome).toBe('block');
      expect(decision.matched.map((m) => m.id)).toEqual(['block-rm']);
    });

    it('returns allow when command does not match', () => {
      const decision = checkCommand(sampleDoc, 'git');
      expect(decision.outcome).toBe('allow');
      expect(decision.matched).toEqual([]);
    });

    it('bypasses rewrite and block when bypass is active', () => {
      const decision = checkCommand(sampleDoc, 'npm', { bypass: true });
      expect(decision.outcome).toBe('allow');
      expect(decision.bypassed).toBe(true);
      expect(decision.waived).toEqual(['use-pnpm']);
      expect(decision.rewrite_to).toBe('pnpm');
    });
  });

  describe('requiredChecks', () => {
    it('returns checks for changed files matching when_changed', () => {
      const checks = requiredChecks(sampleDoc, [
        'cli/src/services/HookService.ts',
      ]);
      expect(checks).toEqual([
        {
          id: 'check-cli',
          action: 'block',
          checks: ['pnpm --filter ./cli test'],
          reason: 'CLI test needed',
        },
      ]);
    });

    it('returns multiple checks when multiple when_changed patterns match', () => {
      const checks = requiredChecks(sampleDoc, [
        'cli/src/foo.ts',
        'docs/bar.md',
      ]);
      expect(checks.map((c) => c.id)).toEqual(['check-cli', 'check-docs']);
    });

    it('returns empty array when no paths match', () => {
      const checks = requiredChecks(sampleDoc, ['other/file.txt']);
      expect(checks).toEqual([]);
    });
  });
});
