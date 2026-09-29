import crypto from 'crypto';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { CANDIDATES_FILE, POLICY_FILE } from '../load';
import { compilePolicy, compileRulesFromText } from '../compile';

describe('policy compile', () => {
  let tempDir: string;

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-compile-'));
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  describe('pattern matching', () => {
    it('compiles protected_path from "never edit `path`"', () => {
      const content = 'Never edit `internal/gen/**` directly.';
      const rules = compileRulesFromText(content, 'AGENTS.md');
      expect(rules).toHaveLength(1);
      const rule = rules[0];
      expect(rule.kind).toBe('protected_path');
      expect(rule.action).toBe('warn');
      expect(rule.id).toBe('protect-internal-gen');
      if (rule.kind === 'protected_path') {
        expect(rule.paths).toEqual(['internal/gen/**']);
      }
      expect(rule.source).toEqual({
        origin: 'compiled',
        file: 'AGENTS.md',
        line: 1,
        text: content,
        digest: crypto.createHash('sha256').update(content).digest('hex'),
      });
    });

    it('matches protected_path variations: do not modify, touch, write to, change', () => {
      const content = [
        'Do not touch `secrets/*`',
        'Please do not modify `build/**`',
        'Never write to `dist/**`',
        "Don't change `config/locked.json`",
      ].join('\n');

      const rules = compileRulesFromText(content, 'AGENTS.md');
      expect(rules).toHaveLength(4);
      expect(rules[0].id).toBe('protect-secrets');
      expect(rules[1].id).toBe('protect-build');
      expect(rules[2].id).toBe('protect-dist');
      expect(rules[3].id).toBe('protect-config-locked-json');
    });

    it('does not match protected_path near-misses without backticks', () => {
      const content = 'Never edit internal/gen/** directly.';
      const rules = compileRulesFromText(content, 'AGENTS.md');
      expect(rules).toHaveLength(0);
    });

    it('compiles command rewrite from backticked and unbackticked "use X instead of Y"', () => {
      const content = [
        'Use `pnpm` instead of `npm`.',
        'Always use bun instead of yarn for faster builds.',
      ].join('\n');

      const rules = compileRulesFromText(content, 'AGENTS.md');
      expect(rules).toHaveLength(2);

      const r1 = rules[0];
      expect(r1.kind).toBe('command');
      expect(r1.action).toBe('rewrite');
      expect(r1.id).toBe('use-pnpm-not-npm');
      if (r1.kind === 'command') {
        expect(r1.executables).toEqual(['npm']);
        expect(r1.rewrite_to).toBe('pnpm');
      }

      const r2 = rules[1];
      expect(r2.kind).toBe('command');
      expect(r2.id).toBe('use-bun-not-yarn');
      if (r2.kind === 'command') {
        expect(r2.executables).toEqual(['yarn']);
        expect(r2.rewrite_to).toBe('bun');
      }
    });

    it('does not match command rewrite near-misses', () => {
      const content = 'Use pnpm for tests.\nInstead of npm, use pnpm.';
      const rules = compileRulesFromText(content, 'AGENTS.md');
      expect(rules).toHaveLength(0);
    });

    it('compiles required_check from "run `cmd` after changing `glob`"', () => {
      const content = [
        'Must run `pnpm --filter ./cli test` when changing `cli/src/**`.',
        'Run `npm run lint` after editing `src/**/*.ts`.',
      ].join('\n');

      const rules = compileRulesFromText(content, 'AGENTS.md');
      expect(rules).toHaveLength(2);

      const r1 = rules[0];
      expect(r1.kind).toBe('required_check');
      expect(r1.action).toBe('warn');
      expect(r1.id).toBe('check-cli-src');
      if (r1.kind === 'required_check') {
        expect(r1.checks).toEqual(['pnpm --filter ./cli test']);
        expect(r1.when_changed).toEqual(['cli/src/**']);
      }

      const r2 = rules[1];
      expect(r2.kind).toBe('required_check');
      expect(r2.id).toBe('check-src-ts');
      if (r2.kind === 'required_check') {
        expect(r2.checks).toEqual(['npm run lint']);
        expect(r2.when_changed).toEqual(['src/**/*.ts']);
      }
    });

    it('does not match required_check near-misses', () => {
      const content = 'Run tests when you have time.';
      const rules = compileRulesFromText(content, 'AGENTS.md');
      expect(rules).toHaveLength(0);
    });

    it('skips fenced code blocks', () => {
      const content = [
        'Normal instructions:',
        '```markdown',
        'Never edit `internal/gen/**` inside code block.',
        'Use `pnpm` instead of `npm` inside code block.',
        '```',
        'Outside instruction:',
        'Never edit `real/protected/**` outside.',
      ].join('\n');

      const rules = compileRulesFromText(content, 'AGENTS.md');
      expect(rules).toHaveLength(1);
      expect(rules[0].id).toBe('protect-real-protected');
    });

    it('deduplicates rule IDs with -2, -3', () => {
      const content = [
        'Never edit `docs/**` from root.',
        'Never touch `docs/**` again.',
        'Do not change `docs/**` anywhere.',
      ].join('\n');

      const rules = compileRulesFromText(content, 'AGENTS.md');
      expect(rules).toHaveLength(3);
      expect(rules[0].id).toBe('protect-docs');
      expect(rules[1].id).toBe('protect-docs-2');
      expect(rules[2].id).toBe('protect-docs-3');
    });
  });

  describe('compilePolicy', () => {
    it('scans AGENTS.md and CLAUDE.md and writes candidates file without touching policy.json', async () => {
      await fs.writeFile(
        path.join(tempDir, 'AGENTS.md'),
        'Never edit `internal/gen/**`.\nUse `pnpm` instead of `npm`.\n',
        'utf8',
      );
      await fs.writeFile(
        path.join(tempDir, 'CLAUDE.md'),
        'Run `pnpm test` when modifying `src/**`.\n',
        'utf8',
      );

      const result = await compilePolicy(tempDir);
      expect(result.candidates).toHaveLength(3);

      const candidatesPath = path.join(tempDir, CANDIDATES_FILE);
      expect(await fs.pathExists(candidatesPath)).toBe(true);

      const policyPath = path.join(tempDir, POLICY_FILE);
      expect(await fs.pathExists(policyPath)).toBe(false);

      const savedJson = await fs.readJson(candidatesPath);
      expect(savedJson.schema_version).toBe(1);
      expect(savedJson.rules).toHaveLength(3);
    });

    it('skips missing files gracefully', async () => {
      await fs.writeFile(
        path.join(tempDir, 'AGENTS.md'),
        'Never edit `internal/gen/**`.\n',
        'utf8',
      );

      const result = await compilePolicy(tempDir);
      expect(result.candidates).toHaveLength(1);
    });
  });
});
