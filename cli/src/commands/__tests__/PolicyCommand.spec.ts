import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { PolicyCommand } from '../policy';

describe('PolicyCommand', () => {
  let tempDir: string;
  let exitCode: number | undefined;
  let logs: string[];
  let errors: string[];

  const mockExit = (code: number) => {
    exitCode = code;
  };
  const mockLog = (msg: string) => {
    logs.push(msg);
  };
  const mockError = (msg: string) => {
    errors.push(msg);
  };

  beforeEach(async () => {
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-policy-cmd-'));
    exitCode = undefined;
    logs = [];
    errors = [];
  });

  afterEach(async () => {
    await fs.remove(tempDir);
  });

  function createCommand(gitDiffFiles: string[] = []): PolicyCommand {
    return new PolicyCommand(
      tempDir,
      () => gitDiffFiles,
      mockExit,
      mockLog,
      mockError,
    );
  }

  describe('status', () => {
    it('shows rules in force and built-in rules', async () => {
      const policyPath = path.join(tempDir, '.ags/policy.json');
      await fs.ensureDir(path.dirname(policyPath));
      await fs.writeJson(policyPath, {
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
        ],
      });

      const cmd = createCommand();
      await cmd.status({});

      expect(exitCode).toBeUndefined();
      const output = logs.join('\n');
      expect(output).toContain('no-gen');
      expect(output).toContain('internal/gen/**');
      expect(output).toContain(
        'built-in (active with ags hooks install --enforce)',
      );
    });

    it('outputs JSON envelope for status', async () => {
      const policyPath = path.join(tempDir, '.ags/policy.json');
      await fs.ensureDir(path.dirname(policyPath));
      await fs.writeJson(policyPath, {
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
        ],
      });

      const cmd = createCommand();
      await cmd.status({ json: true });

      expect(exitCode).toBeUndefined();
      expect(logs).toHaveLength(1);
      const parsed = JSON.parse(logs[0]);
      expect(parsed.schema_version).toBe(1);
      expect(parsed.kind).toBe('policy.status');
      expect(parsed.data.rules).toHaveLength(1);
      expect(parsed.data.builtin_rules.length).toBeGreaterThan(0);
    });

    it('exits 1 and prints problem when policy fails to load', async () => {
      const policyPath = path.join(tempDir, '.ags/policy.json');
      await fs.ensureDir(path.dirname(policyPath));
      await fs.writeFile(policyPath, '{ bad json');

      const cmd = createCommand();
      await cmd.status({});

      expect(exitCode).toBe(1);
      const errOut = errors.join('\n');
      expect(errOut).toContain('Failed to load policy');
    });

    // Test intent: outputs JSON error envelope and exits 1 when policy fails to load
    it('outputs JSON error envelope and exits 1 when policy fails to load', async () => {
      const policyPath = path.join(tempDir, '.ags/policy.json');
      await fs.ensureDir(path.dirname(policyPath));
      await fs.writeFile(policyPath, '{ bad json');

      const cmd = createCommand();
      await cmd.status({ json: true });

      expect(exitCode).toBe(1);
      expect(logs).toHaveLength(1);
      const parsed = JSON.parse(logs[0]);
      expect(parsed.schema_version).toBe(1);
      expect(parsed.kind).toBe('policy.status');
      expect(parsed.data.ok).toBe(false);
      expect(parsed.data.problems.length).toBeGreaterThan(0);
    });

    // Test intent: displays (no rules in force) when policy document has an empty rules array
    it('displays (no rules in force) when policy has empty rules list', async () => {
      const policyPath = path.join(tempDir, '.ags/policy.json');
      await fs.ensureDir(path.dirname(policyPath));
      await fs.writeJson(policyPath, {
        schema_version: 1,
        rules: [],
      });

      const cmd = createCommand();
      await cmd.status({});

      expect(exitCode).toBeUndefined();
      expect(logs.join('\n')).toContain('(no rules in force)');
    });

    // Test intent: displays compiled rules, command rules, required checks, and rewrite actions with their respective formatting
    it('formats rules by kind, origin, and action in status output', async () => {
      const policyPath = path.join(tempDir, '.ags/policy.json');
      await fs.ensureDir(path.dirname(policyPath));
      await fs.writeJson(policyPath, {
        schema_version: 1,
        rules: [
          {
            id: 'compiled-cmd',
            kind: 'command',
            executables: ['npm', 'npx'],
            action: 'rewrite',
            rewrite_to: 'pnpm',
            reason: 'Prefer pnpm',
            source: { origin: 'compiled', file: 'AGENTS.md', line: 15 },
          },
          {
            id: 'check-tests',
            kind: 'required_check',
            when_changed: ['src/**', 'tests/**'],
            checks: ['pnpm test'],
            action: 'warn',
            reason: 'Run tests',
            source: { origin: 'compiled' },
          },
        ],
      });

      const cmd = createCommand();
      await cmd.status({});

      expect(exitCode).toBeUndefined();
      const output = logs.join('\n');
      expect(output).toContain('compiled-cmd');
      expect(output).toContain('[npm, npx]');
      expect(output).toContain('compiled (AGENTS.md:15)');
      expect(output).toContain('check-tests');
      expect(output).toContain('[src/**, tests/**]');
      expect(output).toContain('compiled (unknown:?)');
    });
  });

  describe('check', () => {
    beforeEach(async () => {
      const policyPath = path.join(tempDir, '.ags/policy.json');
      await fs.ensureDir(path.dirname(policyPath));
      await fs.writeJson(policyPath, {
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
            reason: 'Docs change',
            source: { origin: 'declared' },
          },
          {
            id: 'use-pnpm',
            kind: 'command',
            executables: ['npm'],
            action: 'rewrite',
            rewrite_to: 'pnpm',
            reason: 'Use pnpm',
            source: { origin: 'declared' },
          },
          {
            id: 'block-rm',
            kind: 'command',
            executables: ['rm'],
            action: 'block',
            reason: 'No rm',
            source: { origin: 'declared' },
          },
          {
            id: 'check-cli',
            kind: 'required_check',
            when_changed: ['cli/**'],
            checks: ['pnpm test'],
            action: 'block',
            reason: 'CLI test',
            source: { origin: 'declared' },
          },
        ],
      });
    });

    it('exits 1 on block for --path', async () => {
      const cmd = createCommand();
      await cmd.check({ path: 'internal/gen/x.go' });
      expect(exitCode).toBe(1);
      expect(errors.join('\n')).toContain('Blocked');
    });

    it('exits 0 on warn for --path', async () => {
      const cmd = createCommand();
      await cmd.check({ path: 'docs/a.md' });
      expect(exitCode).toBeUndefined();
      expect(logs.join('\n')).toContain('Warning');
    });

    it('exits 0 on allow for --path', async () => {
      const cmd = createCommand();
      await cmd.check({ path: 'src/main.ts' });
      expect(exitCode).toBeUndefined();
      expect(logs.join('\n')).toContain('Allowed');
    });

    it('bypasses block when AGS_POLICY_BYPASS=1', async () => {
      process.env.AGS_POLICY_BYPASS = '1';
      try {
        const cmd = createCommand();
        await cmd.check({ path: 'internal/gen/x.go' });
        expect(exitCode).toBeUndefined();
        expect(logs.join('\n')).toContain('Allowed');
        expect(logs.join('\n')).toContain('no-gen');
      } finally {
        delete process.env.AGS_POLICY_BYPASS;
      }
    });

    it('ignores AGS_POLICY_BYPASS when --no-bypass is set', async () => {
      process.env.AGS_POLICY_BYPASS = '1';
      try {
        const cmd = createCommand();
        await cmd.check({ path: 'internal/gen/x.go', noBypass: true });
        expect(exitCode).toBe(1);
      } finally {
        delete process.env.AGS_POLICY_BYPASS;
      }
    });

    it('handles --command rewrite and block', async () => {
      const cmd = createCommand();
      await cmd.check({ command: 'npm' });
      expect(exitCode).toBeUndefined();
      expect(logs.join('\n')).toContain('pnpm');

      await cmd.check({ command: 'rm' });
      expect(exitCode).toBe(1);
    });

    it('handles --diff with blocking required check', async () => {
      const cmd = createCommand(['cli/src/a.ts']);
      await cmd.check({ diff: true });
      expect(exitCode).toBe(1);
      expect(errors.join('\n')).toContain('check-cli');
    });

    it('handles --diff with no matching check', async () => {
      const cmd = createCommand(['other/file.txt']);
      await cmd.check({ diff: true });
      expect(exitCode).toBeUndefined();
      expect(logs.join('\n')).toContain('No required checks');
    });

    it('prints JSON envelope for check', async () => {
      const cmd = createCommand();
      await cmd.check({ path: 'internal/gen/x.go', json: true });
      expect(exitCode).toBe(1);
      expect(logs).toHaveLength(1);
      const parsed = JSON.parse(logs[0]);
      expect(parsed.schema_version).toBe(1);
      expect(parsed.kind).toBe('policy.check');
      expect(parsed.data.outcome).toBe('block');
    });

    // Test intent: exits 1 when neither path, command, nor diff option is provided in text and JSON modes
    it('exits 1 when neither path, command, nor diff option is provided in text and JSON modes', async () => {
      const cmd = createCommand();
      await cmd.check({});
      expect(exitCode).toBe(1);
      expect(errors.join('\n')).toContain('One of --path, --command, or --diff is required.');

      errors = [];
      logs = [];
      exitCode = undefined;
      await cmd.check({ json: true });
      expect(exitCode).toBe(1);
      const parsed = JSON.parse(logs[0]);
      expect(parsed.schema_version).toBe(1);
      expect(parsed.kind).toBe('policy.check');
      expect(parsed.data.ok).toBe(false);
      expect(parsed.data.error).toContain('One of --path, --command, or --diff is required.');
    });

    // Test intent: outputs error message and exits 1 when policy fails to load in check command
    it('exits 1 and formats error when policy fails to load in check command', async () => {
      const policyPath = path.join(tempDir, '.ags/policy.json');
      await fs.writeFile(policyPath, '{ invalid');

      const cmd = createCommand();
      await cmd.check({ path: 'src/file.ts' });
      expect(exitCode).toBe(1);
      expect(errors.join('\n')).toContain('Failed to load policy');

      errors = [];
      logs = [];
      exitCode = undefined;
      await cmd.check({ path: 'src/file.ts', json: true });
      expect(exitCode).toBe(1);
      const parsed = JSON.parse(logs[0]);
      expect(parsed.data.ok).toBe(false);
      expect(parsed.data.problems.length).toBeGreaterThan(0);
    });

    // Test intent: handles git diff failure with error message or JSON envelope
    it('handles git diff error in diff check mode for text and JSON output', async () => {
      const failingCmd = new PolicyCommand(
        tempDir,
        () => {
          throw new Error('git binary not found');
        },
        mockExit,
        mockLog,
        mockError,
      );

      await failingCmd.check({ diff: true });
      expect(exitCode).toBe(1);
      expect(errors.join('\n')).toContain('git binary not found');

      errors = [];
      logs = [];
      exitCode = undefined;
      await failingCmd.check({ diff: true, json: true });
      expect(exitCode).toBe(1);
      const parsed = JSON.parse(logs[0]);
      expect(parsed.data.ok).toBe(false);
      expect(parsed.data.error).toContain('git binary not found');

      const stringThrowCmd = new PolicyCommand(
        tempDir,
        () => {
          throw 'plain string error';
        },
        mockExit,
        mockLog,
        mockError,
      );
      errors = [];
      logs = [];
      exitCode = undefined;
      await stringThrowCmd.check({ diff: true });
      expect(exitCode).toBe(1);
      expect(errors.join('\n')).toContain('plain string error');
    });

    // Test intent: reports suggested checks with warning when matched diff rules have warn action
    it('reports suggested required checks when diff rules have warn action', async () => {
      const policyPath = path.join(tempDir, '.ags/policy.json');
      await fs.writeJson(policyPath, {
        schema_version: 1,
        rules: [
          {
            id: 'suggest-test',
            kind: 'required_check',
            when_changed: ['docs/**'],
            checks: ['spellcheck'],
            action: 'warn',
            reason: 'Docs spelling',
            source: { origin: 'declared' },
          },
        ],
      });

      const cmd = createCommand(['docs/readme.md']);
      await cmd.check({ diff: true });
      expect(exitCode).toBeUndefined();
      expect(logs.join('\n')).toContain('Suggested check [suggest-test]');

      logs = [];
      await cmd.check({ diff: true, json: true });
      expect(exitCode).toBeUndefined();
      const parsed = JSON.parse(logs[0]);
      expect(parsed.kind).toBe('policy.check');
      expect(parsed.data.type).toBe('diff');
      expect(parsed.data.outcome).toBe('warn');
      expect(parsed.data.checks).toHaveLength(1);
    });

    // Test intent: outputs bypass waiver information when path check is bypassed
    it('displays bypass waiver note when path check is bypassed', async () => {
      process.env.AGS_POLICY_BYPASS = '1';
      try {
        const cmd = createCommand();
        await cmd.check({ path: 'internal/gen/code.go' });
        expect(logs.join('\n')).toContain('(Bypassed: waived no-gen)');
      } finally {
        delete process.env.AGS_POLICY_BYPASS;
      }
    });

    // Test intent: outputs JSON envelope and warning/allow messages for command check
    it('handles command check outcomes in text and JSON modes with bypasses', async () => {
      const policyPath = path.join(tempDir, '.ags/policy.json');
      await fs.writeJson(policyPath, {
        schema_version: 1,
        rules: [
          {
            id: 'warn-curl',
            kind: 'command',
            executables: ['curl'],
            action: 'warn',
            reason: 'Prefer fetch',
            source: { origin: 'declared' },
          },
          {
            id: 'block-rm',
            kind: 'command',
            executables: ['rm'],
            action: 'block',
            reason: 'Dangerous',
            source: { origin: 'declared' },
          },
        ],
      });

      const cmd = createCommand();
      await cmd.check({ command: 'curl' });
      expect(exitCode).toBeUndefined();
      expect(logs.join('\n')).toContain('Warning: curl');

      logs = [];
      await cmd.check({ command: 'ls' });
      expect(exitCode).toBeUndefined();
      expect(logs.join('\n')).toContain('Allowed: ls');

      process.env.AGS_POLICY_BYPASS = '1';
      try {
        logs = [];
        await cmd.check({ command: 'rm' });
        expect(exitCode).toBeUndefined();
        expect(logs.join('\n')).toContain('Allowed: rm');
        expect(logs.join('\n')).toContain('(Bypassed: waived block-rm)');
      } finally {
        delete process.env.AGS_POLICY_BYPASS;
      }

      logs = [];
      await cmd.check({ command: 'curl', json: true });
      expect(exitCode).toBeUndefined();
      const parsed = JSON.parse(logs[0]);
      expect(parsed.data.type).toBe('command');
      expect(parsed.data.outcome).toBe('warn');
    });

    // Test intent: tests default exit handler and default git diff implementation
    it('uses default exit handler and git diff retrieval', async () => {
      const savedExitCode = process.exitCode;
      try {
        process.exitCode = undefined;
        const cmdWithDefaultExit = new PolicyCommand(
          tempDir,
          () => [],
          undefined,
          mockLog,
          mockError,
        );
        await cmdWithDefaultExit.check({});
        expect(process.exitCode).toBe(1);

        const cmdWithDefaultDiff = new PolicyCommand(
          tempDir,
          undefined,
          mockExit,
          mockLog,
          mockError,
        );
        await cmdWithDefaultDiff.check({ diff: true });
        expect(exitCode).toBe(1);
        expect(errors.join('\n')).toContain('Failed to get git diff');
      } finally {
        process.exitCode = savedExitCode;
      }
    });
  });

  describe('validate', () => {
    it('exits 0 for valid policy', async () => {
      const policyPath = path.join(tempDir, '.ags/policy.json');
      await fs.ensureDir(path.dirname(policyPath));
      await fs.writeJson(policyPath, {
        schema_version: 1,
        rules: [
          {
            id: 'rule-1',
            kind: 'protected_path',
            paths: ['src/**'],
            action: 'warn',
            reason: 'Warn',
            source: { origin: 'declared' },
          },
        ],
      });

      const cmd = createCommand();
      await cmd.validate({});
      expect(exitCode).toBeUndefined();
      expect(logs.join('\n')).toContain('Policy valid');
    });

    it('exits 1 for conflicting policy', async () => {
      const policyPath = path.join(tempDir, '.ags/policy.json');
      await fs.ensureDir(path.dirname(policyPath));
      await fs.writeJson(policyPath, {
        schema_version: 1,
        rules: [
          {
            id: 'rule-block',
            kind: 'protected_path',
            paths: ['src/**'],
            action: 'block',
            reason: 'Block',
            source: { origin: 'declared' },
          },
          {
            id: 'rule-warn',
            kind: 'protected_path',
            paths: ['src/**'],
            action: 'warn',
            reason: 'Warn',
            source: { origin: 'declared' },
          },
        ],
      });

      const cmd = createCommand();
      await cmd.validate({});
      expect(exitCode).toBe(1);
      expect(errors.join('\n')).toContain('Conflicting');
    });

    it('does not exit 1 on stale compiled rules unless --fail-on-stale is passed', async () => {
      const policyPath = path.join(tempDir, '.ags/policy.json');
      await fs.ensureDir(path.dirname(policyPath));
      await fs.writeJson(policyPath, {
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
              file: 'MISSING.md',
              line: 1,
            },
          },
        ],
      });

      const cmd = createCommand();
      await cmd.validate({});
      expect(exitCode).toBeUndefined();
      expect(logs.join('\n').toLowerCase()).toContain('stale');

      await cmd.validate({ failOnStale: true });
      expect(exitCode).toBe(1);
    });

    it('outputs JSON envelope for validate', async () => {
      const policyPath = path.join(tempDir, '.ags/policy.json');
      await fs.ensureDir(path.dirname(policyPath));
      await fs.writeJson(policyPath, {
        schema_version: 1,
        rules: [],
      });

      const cmd = createCommand();
      await cmd.validate({ json: true });
      expect(exitCode).toBeUndefined();
      expect(logs).toHaveLength(1);
      const parsed = JSON.parse(logs[0]);
      expect(parsed.schema_version).toBe(1);
      expect(parsed.kind).toBe('policy.validate');
      expect(parsed.data.ok).toBe(true);
    });

    // Test intent: outputs JSON error envelope and exits 1 when policy file fails to load in validate command
    it('outputs JSON error envelope when policy fails to load in validate', async () => {
      const policyPath = path.join(tempDir, '.ags/policy.json');
      await fs.ensureDir(path.dirname(policyPath));
      await fs.writeFile(policyPath, '{ bad json');

      const cmd = createCommand();
      await cmd.validate({ json: true });

      expect(exitCode).toBe(1);
      expect(logs).toHaveLength(1);
      const parsed = JSON.parse(logs[0]);
      expect(parsed.schema_version).toBe(1);
      expect(parsed.kind).toBe('policy.validate');
      expect(parsed.data.ok).toBe(false);
      expect(parsed.data.problems.length).toBeGreaterThan(0);
    });

    // Test intent: reports success when no policy file exists in text and JSON modes
    it('reports no policy file present in text and JSON modes', async () => {
      const emptyDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-policy-empty-'));
      try {
        const cmd = new PolicyCommand(emptyDir, () => [], mockExit, mockLog, mockError);
        await cmd.validate({});
        expect(exitCode).toBeUndefined();
        expect(logs.join('\n')).toContain('No policy file present');

        logs = [];
        await cmd.validate({ json: true });
        expect(exitCode).toBeUndefined();
        const parsed = JSON.parse(logs[0]);
        expect(parsed.data.ok).toBe(true);
        expect(parsed.data.message).toBe('No policy file present.');
      } finally {
        await fs.remove(emptyDir);
      }
    });

    // Test intent: outputs JSON envelope with error when policy has conflicts
    it('outputs JSON envelope with error when policy contains conflicts', async () => {
      const policyPath = path.join(tempDir, '.ags/policy.json');
      await fs.ensureDir(path.dirname(policyPath));
      await fs.writeJson(policyPath, {
        schema_version: 1,
        rules: [
          {
            id: 'rule-block',
            kind: 'protected_path',
            paths: ['src/**'],
            action: 'block',
            reason: 'Block',
            source: { origin: 'declared' },
          },
          {
            id: 'rule-warn',
            kind: 'protected_path',
            paths: ['src/**'],
            action: 'warn',
            reason: 'Warn',
            source: { origin: 'declared' },
          },
        ],
      });

      const cmd = createCommand();
      await cmd.validate({ json: true });
      expect(exitCode).toBe(1);
      const parsed = JSON.parse(logs[0]);
      expect(parsed.data.ok).toBe(false);
      expect(parsed.data.conflicts.length).toBeGreaterThan(0);
    });
  });
  describe('compile', () => {
    it('creates candidates file and outputs status', async () => {
      await fs.writeFile(
        path.join(tempDir, 'AGENTS.md'),
        'Never edit `internal/gen/**`.\nUse `pnpm` instead of `npm`.\n',
        'utf8',
      );

      const cmd = createCommand();
      await cmd.compile({});

      expect(exitCode).toBeUndefined();
      expect(logs.join('\n')).toContain('Found 2 candidate rule(s)');
      expect(
        await fs.pathExists(path.join(tempDir, '.ags/policy-candidates.json')),
      ).toBe(true);
      expect(await fs.pathExists(path.join(tempDir, '.ags/policy.json'))).toBe(
        false,
      );
    });

    it('outputs JSON envelope for compile', async () => {
      await fs.writeFile(
        path.join(tempDir, 'AGENTS.md'),
        'Never edit `internal/gen/**`.\n',
        'utf8',
      );

      const cmd = createCommand();
      await cmd.compile({ json: true });

      expect(exitCode).toBeUndefined();
      expect(logs).toHaveLength(1);
      const parsed = JSON.parse(logs[0]);
      expect(parsed.schema_version).toBe(1);
      expect(parsed.kind).toBe('policy.compile');
      expect(parsed.data.count).toBe(1);
    });
  });

  describe('adopt', () => {
    beforeEach(async () => {
      const candidatesPath = path.join(tempDir, '.ags/policy-candidates.json');
      await fs.ensureDir(path.dirname(candidatesPath));
      await fs.writeJson(candidatesPath, {
        schema_version: 1,
        rules: [
          {
            id: 'protect-gen',
            kind: 'protected_path',
            paths: ['gen/**'],
            action: 'warn',
            reason: 'Generated',
            source: { origin: 'compiled', file: 'AGENTS.md', line: 1 },
          },
          {
            id: 'use-pnpm',
            kind: 'command',
            executables: ['npm'],
            action: 'rewrite',
            rewrite_to: 'pnpm',
            reason: 'Use pnpm',
            source: { origin: 'compiled', file: 'AGENTS.md', line: 2 },
          },
        ],
      });
    });

    it('happy path: adopts specified rule and removes it from candidates', async () => {
      const cmd = createCommand();
      await cmd.adopt(['protect-gen'], {});

      expect(exitCode).toBeUndefined();
      expect(logs.join('\n')).toContain('Adopted 1 rule(s)');

      const policyJson = await fs.readJson(
        path.join(tempDir, '.ags/policy.json'),
      );
      expect(policyJson.rules).toHaveLength(1);
      expect(policyJson.rules[0].id).toBe('protect-gen');

      const candidatesJson = await fs.readJson(
        path.join(tempDir, '.ags/policy-candidates.json'),
      );
      expect(candidatesJson.rules).toHaveLength(1);
      expect(candidatesJson.rules[0].id).toBe('use-pnpm');
    });

    it('refuses unknown id without writing', async () => {
      const cmd = createCommand();
      await cmd.adopt(['unknown-id'], {});

      expect(exitCode).toBe(1);
      expect(errors.join('\n')).toContain('unknown-id');
      expect(await fs.pathExists(path.join(tempDir, '.ags/policy.json'))).toBe(
        false,
      );
    });

    it('refuses rule already in policy.json without writing', async () => {
      const policyPath = path.join(tempDir, '.ags/policy.json');
      await fs.writeJson(policyPath, {
        schema_version: 1,
        rules: [
          {
            id: 'protect-gen',
            kind: 'protected_path',
            paths: ['gen/**'],
            action: 'warn',
            reason: 'Already adopted',
            source: { origin: 'declared' },
          },
        ],
      });

      const cmd = createCommand();
      await cmd.adopt(['protect-gen'], {});

      expect(exitCode).toBe(1);
      expect(errors.join('\n')).toContain('already exists');
    });

    it('refuses adoption if resulting policy has conflicts', async () => {
      // Add existing conflicting rule to policy.json: same pattern but action 'block'
      const policyPath = path.join(tempDir, '.ags/policy.json');
      await fs.writeJson(policyPath, {
        schema_version: 1,
        rules: [
          {
            id: 'block-gen',
            kind: 'protected_path',
            paths: ['gen/**'],
            action: 'block',
            reason: 'Existing block rule',
            source: { origin: 'declared' },
          },
        ],
      });

      const cmd = createCommand();
      await cmd.adopt(['protect-gen'], {});

      expect(exitCode).toBe(1);
      expect(errors.join('\n')).toContain('conflict');

      // Ensure policy.json was NOT modified
      const currentPolicy = await fs.readJson(policyPath);
      expect(currentPolicy.rules).toHaveLength(1);
      expect(currentPolicy.rules[0].id).toBe('block-gen');
    });

    it('outputs JSON envelope for adopt', async () => {
      const cmd = createCommand();
      await cmd.adopt(['protect-gen'], { json: true });

      expect(exitCode).toBeUndefined();
      expect(logs).toHaveLength(1);
      const parsed = JSON.parse(logs[0]);
      expect(parsed.schema_version).toBe(1);
      expect(parsed.kind).toBe('policy.adopt');
      expect(parsed.data.ok).toBe(true);
      expect(parsed.data.adopted).toEqual(['protect-gen']);
    });

    // Test intent: rejects adoption when no rule ids are provided in text and JSON modes
    it('rejects adoption when no rule ids are provided in text and JSON modes', async () => {
      const cmd = createCommand();
      await cmd.adopt([], {});
      expect(exitCode).toBe(1);
      expect(errors.join('\n')).toContain('At least one rule id is required');

      errors = [];
      logs = [];
      exitCode = undefined;
      await cmd.adopt([], { json: true });
      expect(exitCode).toBe(1);
      const parsed = JSON.parse(logs[0]);
      expect(parsed.schema_version).toBe(1);
      expect(parsed.kind).toBe('policy.adopt');
      expect(parsed.data.ok).toBe(false);
      expect(parsed.data.error).toContain('At least one rule id is required');
    });

    // Test intent: rejects adoption when candidates file does not exist in text and JSON modes
    it('rejects adoption when candidates file does not exist in text and JSON modes', async () => {
      const candidatesPath = path.join(tempDir, '.ags/policy-candidates.json');
      await fs.remove(candidatesPath);

      const cmd = createCommand();
      await cmd.adopt(['any-rule'], {});
      expect(exitCode).toBe(1);
      expect(errors.join('\n')).toContain('No candidates file found');

      errors = [];
      logs = [];
      exitCode = undefined;
      await cmd.adopt(['any-rule'], { json: true });
      expect(exitCode).toBe(1);
      const parsed = JSON.parse(logs[0]);
      expect(parsed.data.ok).toBe(false);
      expect(parsed.data.error).toContain('No candidates file found');
    });

    // Test intent: rejects adoption when candidates file contains invalid syntax
    it('rejects adoption when candidates file contains invalid syntax', async () => {
      const candidatesPath = path.join(tempDir, '.ags/policy-candidates.json');
      await fs.writeFile(candidatesPath, '{ invalid json');

      const cmd = createCommand();
      await cmd.adopt(['any-rule'], {});
      expect(exitCode).toBe(1);
      expect(errors.join('\n')).toContain('Failed to parse');

      errors = [];
      logs = [];
      exitCode = undefined;
      await cmd.adopt(['any-rule'], { json: true });
      expect(exitCode).toBe(1);
      const parsed = JSON.parse(logs[0]);
      expect(parsed.data.ok).toBe(false);
      expect(parsed.data.error).toContain('Failed to parse');
    });

    // Test intent: rejects adoption when existing policy file contains invalid syntax
    it('rejects adoption when existing policy file contains invalid syntax', async () => {
      const policyPath = path.join(tempDir, '.ags/policy.json');
      await fs.writeFile(policyPath, '{ invalid policy json');

      const cmd = createCommand();
      await cmd.adopt(['protect-gen'], {});
      expect(exitCode).toBe(1);
      expect(errors.join('\n')).toContain('Cannot adopt: existing');

      errors = [];
      logs = [];
      exitCode = undefined;
      await cmd.adopt(['protect-gen'], { json: true });
      expect(exitCode).toBe(1);
      const parsed = JSON.parse(logs[0]);
      expect(parsed.data.ok).toBe(false);
      expect(parsed.data.error).toContain('Cannot adopt: existing');
    });

    // Test intent: outputs JSON error envelope when candidate rule ID is not found
    it('outputs JSON error envelope when candidate rule ID is not found', async () => {
      const cmd = createCommand();
      await cmd.adopt(['nonexistent-id'], { json: true });

      expect(exitCode).toBe(1);
      const parsed = JSON.parse(logs[0]);
      expect(parsed.data.ok).toBe(false);
      expect(parsed.data.error).toContain('nonexistent-id');
    });

    // Test intent: outputs JSON error envelope when rule ID already exists in policy
    it('outputs JSON error envelope when rule ID already exists in policy', async () => {
      const policyPath = path.join(tempDir, '.ags/policy.json');
      await fs.writeJson(policyPath, {
        schema_version: 1,
        rules: [
          {
            id: 'protect-gen',
            kind: 'protected_path',
            paths: ['gen/**'],
            action: 'warn',
            reason: 'Already adopted',
            source: { origin: 'declared' },
          },
        ],
      });

      const cmd = createCommand();
      await cmd.adopt(['protect-gen'], { json: true });

      expect(exitCode).toBe(1);
      const parsed = JSON.parse(logs[0]);
      expect(parsed.data.ok).toBe(false);
      expect(parsed.data.error).toContain('already exists');
    });

    // Test intent: outputs JSON error envelope when adoption produces policy conflicts
    it('outputs JSON error envelope when adoption produces policy conflicts', async () => {
      const policyPath = path.join(tempDir, '.ags/policy.json');
      await fs.writeJson(policyPath, {
        schema_version: 1,
        rules: [
          {
            id: 'block-gen',
            kind: 'protected_path',
            paths: ['gen/**'],
            action: 'block',
            reason: 'Existing block rule',
            source: { origin: 'declared' },
          },
        ],
      });

      const cmd = createCommand();
      await cmd.adopt(['protect-gen'], { json: true });

      expect(exitCode).toBe(1);
      const parsed = JSON.parse(logs[0]);
      expect(parsed.data.ok).toBe(false);
      expect(parsed.data.error).toContain('conflicts');
      expect(parsed.data.conflicts.length).toBeGreaterThan(0);
    });
  });
});
