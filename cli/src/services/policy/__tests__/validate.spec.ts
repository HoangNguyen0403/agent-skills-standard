import crypto from 'crypto';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PolicyDocument } from '../schema';
import { validatePolicy } from '../validate';

describe('policy validate', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-validate-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('conflicts', () => {
    it('detects conflict for same protected_path pattern with different actions', () => {
      const doc: PolicyDocument = {
        schema_version: 1,
        rules: [
          {
            id: 'rule-block',
            kind: 'protected_path',
            paths: ['internal/gen/**'],
            action: 'block',
            reason: 'Block gen',
            source: { origin: 'declared' },
          },
          {
            id: 'rule-warn',
            kind: 'protected_path',
            paths: ['internal/gen/**'],
            action: 'warn',
            reason: 'Warn gen',
            source: { origin: 'declared' },
          },
        ],
      };

      const result = validatePolicy(doc, tempDir);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toContain('internal/gen/**');
    });

    it('detects conflict for same executable with different actions', () => {
      const doc: PolicyDocument = {
        schema_version: 1,
        rules: [
          {
            id: 'rule-cmd-block',
            kind: 'command',
            executables: ['npm'],
            action: 'block',
            reason: 'No npm',
            source: { origin: 'declared' },
          },
          {
            id: 'rule-cmd-warn',
            kind: 'command',
            executables: ['npm'],
            action: 'warn',
            reason: 'Warn npm',
            source: { origin: 'declared' },
          },
        ],
      };

      const result = validatePolicy(doc, tempDir);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toContain('npm');
    });

    it('detects conflict for same executable with different rewrite_to targets', () => {
      const doc: PolicyDocument = {
        schema_version: 1,
        rules: [
          {
            id: 'rule-pnpm',
            kind: 'command',
            executables: ['npm'],
            action: 'rewrite',
            rewrite_to: 'pnpm',
            reason: 'Use pnpm',
            source: { origin: 'declared' },
          },
          {
            id: 'rule-yarn',
            kind: 'command',
            executables: ['npm'],
            action: 'rewrite',
            rewrite_to: 'yarn',
            reason: 'Use yarn',
            source: { origin: 'declared' },
          },
        ],
      };

      const result = validatePolicy(doc, tempDir);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toContain('npm');
    });

    it('detects conflict if a compiled rule has block action', () => {
      const doc: PolicyDocument = {
        schema_version: 1,
        rules: [
          {
            id: 'rule-compiled-block',
            kind: 'protected_path',
            paths: ['secret/**'],
            action: 'block',
            reason: 'Should not block',
            source: { origin: 'compiled', file: 'AGENTS.md', line: 1 },
          },
        ],
      };

      const result = validatePolicy(doc, tempDir);
      expect(result.conflicts).toHaveLength(1);
      expect(result.conflicts[0]).toContain('compiled');
    });

    it('returns empty conflicts for compatible rules', () => {
      const doc: PolicyDocument = {
        schema_version: 1,
        rules: [
          {
            id: 'rule-1',
            kind: 'protected_path',
            paths: ['src/**'],
            action: 'warn',
            reason: 'Warn 1',
            source: { origin: 'declared' },
          },
          {
            id: 'rule-2',
            kind: 'protected_path',
            paths: ['docs/**'],
            action: 'block',
            reason: 'Block 2',
            source: { origin: 'declared' },
          },
        ],
      };

      const result = validatePolicy(doc, tempDir);
      expect(result.conflicts).toHaveLength(0);
    });
  });

  describe('stale detection', () => {
    it('detects stale rule when source file is missing', () => {
      const doc: PolicyDocument = {
        schema_version: 1,
        rules: [
          {
            id: 'compiled-rule',
            kind: 'command',
            executables: ['npm'],
            action: 'rewrite',
            rewrite_to: 'pnpm',
            reason: 'Use pnpm',
            source: {
              origin: 'compiled',
              file: 'AGENTS.md',
              line: 1,
              text: 'Use pnpm instead of npm.',
              digest: 'abc',
            },
          },
        ],
      };

      const result = validatePolicy(doc, tempDir);
      expect(result.stale).toHaveLength(1);
      expect(result.stale[0]).toContain('AGENTS.md');
    });

    it('detects stale rule when line number is out of bounds', async () => {
      await fs.writeFile(
        path.join(tempDir, 'AGENTS.md'),
        'Line 1\nLine 2\n',
        'utf8',
      );
      const doc: PolicyDocument = {
        schema_version: 1,
        rules: [
          {
            id: 'compiled-rule',
            kind: 'command',
            executables: ['npm'],
            action: 'rewrite',
            rewrite_to: 'pnpm',
            reason: 'Use pnpm',
            source: {
              origin: 'compiled',
              file: 'AGENTS.md',
              line: 99,
              text: 'Nonexistent',
            },
          },
        ],
      };

      const result = validatePolicy(doc, tempDir);
      expect(result.stale).toHaveLength(1);
    });

    it('detects stale rule when line content/digest does not match', async () => {
      await fs.writeFile(
        path.join(tempDir, 'AGENTS.md'),
        'Line 1: something else\n',
        'utf8',
      );
      const originalText = 'Line 1: original text';
      const digest = crypto
        .createHash('sha256')
        .update(originalText)
        .digest('hex');

      const doc: PolicyDocument = {
        schema_version: 1,
        rules: [
          {
            id: 'compiled-rule',
            kind: 'command',
            executables: ['npm'],
            action: 'rewrite',
            rewrite_to: 'pnpm',
            reason: 'Use pnpm',
            source: {
              origin: 'compiled',
              file: 'AGENTS.md',
              line: 1,
              text: originalText,
              digest,
            },
          },
        ],
      };

      const result = validatePolicy(doc, tempDir);
      expect(result.stale).toHaveLength(1);
      expect(result.stale[0]).toContain('compiled-rule');
    });

    it('reports not stale when line content and digest match', async () => {
      const lineText = 'Use pnpm instead of npm.';
      await fs.writeFile(
        path.join(tempDir, 'AGENTS.md'),
        `${lineText}\n`,
        'utf8',
      );
      const digest = crypto.createHash('sha256').update(lineText).digest('hex');

      const doc: PolicyDocument = {
        schema_version: 1,
        rules: [
          {
            id: 'compiled-rule',
            kind: 'command',
            executables: ['npm'],
            action: 'rewrite',
            rewrite_to: 'pnpm',
            reason: 'Use pnpm',
            source: {
              origin: 'compiled',
              file: 'AGENTS.md',
              line: 1,
              text: lineText,
              digest,
            },
          },
        ],
      };

      const result = validatePolicy(doc, tempDir);
      expect(result.stale).toHaveLength(0);
    });
  });
});
