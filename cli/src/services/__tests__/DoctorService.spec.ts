import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import pkg from '../../../package.json';
import { Agent } from '../../constants';
import { SkillConfig } from '../../models/config';
import { DoctorDeps, DoctorService } from '../DoctorService';

describe('DoctorService', () => {
  let root: string;
  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'doctor-'));
  });
  afterEach(async () => {
    await fs.remove(root);
  });

  const CONFIG = {
    registry: 'https://github.com/o/r',
    agents: [Agent.Claude],
    skills: {},
    mcp: { enabled: true, scope: 'project', prompted: true },
  } as unknown as SkillConfig;

  function deps(over: Partial<DoctorDeps> = {}): DoctorDeps {
    return {
      loadConfig: vi.fn().mockResolvedValue(CONFIG),
      detectAgents: vi.fn().mockResolvedValue({ [Agent.Claude]: true }),
      mcpStatus: vi
        .fn()
        .mockResolvedValue([{ agent: Agent.Claude, project: true }]),
      hookStatus: vi.fn().mockResolvedValue([]),
      verifyLock: vi.fn().mockResolvedValue({
        found: true,
        checked: 1,
        result: { ok: true, mismatches: [], missing: [] },
      }),
      fetchLatestVersion: vi.fn().mockResolvedValue(pkg.version),
      installMcp: vi.fn().mockResolvedValue(undefined),
      installHooks: vi.fn().mockResolvedValue(undefined),
      ...over,
    };
  }
  const byName = <T extends { name: string }>(checks: T[], n: string): T =>
    checks.find((c) => c.name === n)!;

  it('1. Healthy project: reports ok for all checks, healthy=true, summary.total=7', async () => {
    await fs.outputFile(path.join(root, '.skills-lock.json'), '{}');
    await fs.outputFile(
      path.join(root, '.claude/hooks/preedit-skill-loader.js'),
      `// ags-hook-version: ${pkg.version}\nconsole.log('hook');`,
    );
    const d = deps({
      hookStatus: vi.fn().mockResolvedValue([
        {
          agent: Agent.Claude,
          installed: true,
          files: [
            '.claude/hooks/preedit-skill-loader.js',
            '.claude/settings.json',
          ],
        },
      ]),
    });
    const svc = new DoctorService(d);
    const checks = await svc.runChecks({ rootDir: root, offline: false });
    const report = DoctorService.toReport(checks);

    expect(report.healthy).toBe(true);
    expect(report.summary.total).toBe(7);
    expect(report.summary.ok).toBe(7);
    for (const c of checks) {
      expect(c.status).toBe('ok');
    }
  });

  it('2. No config: config=fail with evidence containing ags init, dependents skipped', async () => {
    const d = deps({ loadConfig: vi.fn().mockResolvedValue(null) });
    const svc = new DoctorService(d);
    const checks = await svc.runChecks({ rootDir: root, offline: false });
    const report = DoctorService.toReport(checks);

    expect(report.healthy).toBe(false);
    expect(byName(checks, 'config').status).toBe('fail');
    expect(byName(checks, 'config').evidence).toContain('ags init');
    expect(byName(checks, 'agents').status).toBe('skip');
    expect(byName(checks, 'lockfile').status).toBe('skip');
    expect(byName(checks, 'mcp').status).toBe('skip');
    expect(byName(checks, 'hooks').status).toBe('skip');
    expect(byName(checks, 'cli_version').status).toBe('ok');
    expect(d.detectAgents).not.toHaveBeenCalled();
    expect(d.mcpStatus).not.toHaveBeenCalled();
    expect(d.hookStatus).not.toHaveBeenCalled();
    expect(d.verifyLock).not.toHaveBeenCalled();
  });

  it('3. MCP missing: mcp=fail with fix that calls installMcp', async () => {
    const d = deps({
      mcpStatus: vi
        .fn()
        .mockResolvedValue([{ agent: Agent.Claude, project: false }]),
    });
    const svc = new DoctorService(d);
    const checks = await svc.runChecks({ rootDir: root, offline: false });
    const mcp = byName(checks, 'mcp');

    expect(mcp.status).toBe('fail');
    expect(mcp.fix).toBeDefined();
    await mcp.fix!.apply();
    expect(d.installMcp).toHaveBeenCalledWith(root, Agent.Claude, CONFIG);
  });

  it('4. MCP disabled: mcp=skip, mcpStatus not called', async () => {
    const disabledConfig = {
      ...CONFIG,
      mcp: { enabled: false, scope: 'disabled', prompted: true },
    } as unknown as SkillConfig;
    const d = deps({
      loadConfig: vi.fn().mockResolvedValue(disabledConfig),
    });
    const svc = new DoctorService(d);
    const checks = await svc.runChecks({ rootDir: root, offline: false });

    expect(byName(checks, 'mcp').status).toBe('skip');
    expect(d.mcpStatus).not.toHaveBeenCalled();
  });

  it('5. Stale hook: hooks=warn, evidence contains 0.0.1, has fix that calls installHooks', async () => {
    await fs.outputFile(
      path.join(root, '.claude/hooks/preedit-skill-loader.js'),
      `// ags-hook-version: 0.0.1\n`,
    );
    const d = deps({
      hookStatus: vi.fn().mockResolvedValue([
        {
          agent: Agent.Claude,
          installed: true,
          files: ['.claude/hooks/preedit-skill-loader.js'],
        },
      ]),
    });
    const svc = new DoctorService(d);
    const checks = await svc.runChecks({ rootDir: root, offline: false });
    const hooks = byName(checks, 'hooks');

    expect(hooks.status).toBe('warn');
    expect(hooks.evidence).toContain('0.0.1');
    expect(hooks.fix).toBeDefined();
    await hooks.fix!.apply();
    expect(d.installHooks).toHaveBeenCalledWith(root, Agent.Claude);
  });

  it('6. Custom hook (no marker): script without marker, installed row -> hooks=ok', async () => {
    await fs.outputFile(
      path.join(root, '.claude/hooks/preedit-skill-loader.js'),
      `// custom user hook\nconsole.log('custom');\n`,
    );
    const d = deps({
      hookStatus: vi.fn().mockResolvedValue([
        {
          agent: Agent.Claude,
          installed: true,
          files: ['.claude/hooks/preedit-skill-loader.js'],
        },
      ]),
    });
    const svc = new DoctorService(d);
    const checks = await svc.runChecks({ rootDir: root, offline: false });

    expect(byName(checks, 'hooks').status).toBe('ok');
  });

  it('7. Hook not installed: row installed: false -> hooks=warn with fix', async () => {
    const d = deps({
      hookStatus: vi.fn().mockResolvedValue([
        {
          agent: Agent.Claude,
          installed: false,
          files: ['.claude/hooks/preedit-skill-loader.js'],
        },
      ]),
    });
    const svc = new DoctorService(d);
    const checks = await svc.runChecks({ rootDir: root, offline: false });
    const hooks = byName(checks, 'hooks');

    expect(hooks.status).toBe('warn');
    expect(hooks.fix).toBeDefined();
  });

  it('8. Lock file absent: lockfile=warn, evidence contains ags sync', async () => {
    const d = deps({
      verifyLock: vi.fn().mockResolvedValue({
        found: false,
        checked: 0,
        result: { ok: false, mismatches: [], missing: [] },
      }),
    });
    const svc = new DoctorService(d);
    const checks = await svc.runChecks({ rootDir: root, offline: false });
    const lock = byName(checks, 'lockfile');

    expect(lock.status).toBe('warn');
    expect(lock.evidence).toContain('ags sync');
  });

  it('9. Lock mismatch: lockfile=warn, evidence contains 1 file(s) differ', async () => {
    const d = deps({
      verifyLock: vi.fn().mockResolvedValue({
        found: true,
        checked: 2,
        result: {
          ok: false,
          mismatches: ['a/b/SKILL.md'],
          missing: [],
        },
      }),
    });
    const svc = new DoctorService(d);
    const checks = await svc.runChecks({ rootDir: root, offline: false });
    const lock = byName(checks, 'lockfile');

    expect(lock.status).toBe('warn');
    expect(lock.evidence).toContain('1 file(s) differ');
  });

  it('10. Kiro verified: config agents [Agent.Kiro] -> verifyLock called with Kiro agent and passes', async () => {
    const kiroConfig = {
      ...CONFIG,
      agents: [Agent.Kiro],
    } as unknown as SkillConfig;
    const d = deps({
      loadConfig: vi.fn().mockResolvedValue(kiroConfig),
      verifyLock: vi.fn().mockResolvedValue({
        found: true,
        checked: 3,
        result: { ok: true, mismatches: [], missing: [] },
      }),
    });
    const svc = new DoctorService(d);
    const checks = await svc.runChecks({ rootDir: root, offline: false });
    const lock = byName(checks, 'lockfile');

    expect(d.verifyLock).toHaveBeenCalledWith(root, [Agent.Kiro]);
    expect(lock.status).toBe('ok');
    expect(lock.evidence).toBe('3 tracked file(s) match');
  });

  it('11. Legacy folder: create root/.agent/ -> legacy_folders=warn', async () => {
    await fs.ensureDir(path.join(root, '.agent'));
    const d = deps();
    const svc = new DoctorService(d);
    const checks = await svc.runChecks({ rootDir: root, offline: false });

    expect(byName(checks, 'legacy_folders').status).toBe('warn');
  });

  it('12. Offline: runChecks({ rootDir: root, offline: true }) -> cli_version=skip, fetchLatestVersion not called', async () => {
    const d = deps();
    const svc = new DoctorService(d);
    const checks = await svc.runChecks({ rootDir: root, offline: true });

    expect(byName(checks, 'cli_version').status).toBe('skip');
    expect(d.fetchLatestVersion).not.toHaveBeenCalled();
  });

  it('13. Registry unreachable: fetchLatestVersion -> null -> cli_version=skip', async () => {
    const d = deps({
      fetchLatestVersion: vi.fn().mockResolvedValue(null),
    });
    const svc = new DoctorService(d);
    const checks = await svc.runChecks({ rootDir: root, offline: false });

    expect(byName(checks, 'cli_version').status).toBe('skip');
  });

  it('14. Update available: fetchLatestVersion -> 999.0.0 -> cli_version=warn, evidence contains ags upgrade', async () => {
    const d = deps({
      fetchLatestVersion: vi.fn().mockResolvedValue('999.0.0'),
    });
    const svc = new DoctorService(d);
    const checks = await svc.runChecks({ rootDir: root, offline: false });
    const ver = byName(checks, 'cli_version');

    expect(ver.status).toBe('warn');
    expect(ver.evidence).toContain('ags upgrade');
  });

  // Test intent: warns when no agents are configured in .skillsrc and none detected
  it('15. warns when no agents are configured and none are detected', async () => {
    const d = deps({
      loadConfig: vi.fn().mockResolvedValue({
        registry: 'https://github.com/o/r',
        skills: {},
      } as SkillConfig),
      detectAgents: vi.fn().mockResolvedValue({}),
    });
    const svc = new DoctorService(d);
    const checks = await svc.runChecks({ rootDir: root, offline: true });
    const agentsCheck = byName(checks, 'agents');
    expect(agentsCheck.status).toBe('warn');
    expect(agentsCheck.evidence).toContain('no agents configured or detected');
  });

  // Test intent: warns and reports missing tracked files count when lockfile verification finds missing files
  it('16. warns when tracked files in lockfile are missing on disk', async () => {
    const d = deps({
      verifyLock: vi.fn().mockResolvedValue({
        found: true,
        checked: 2,
        result: { ok: false, mismatches: [], missing: ['missing-file.md'] },
      }),
    });
    const svc = new DoctorService(d);
    const checks = await svc.runChecks({ rootDir: root, offline: true });
    const lockCheck = byName(checks, 'lockfile');
    expect(lockCheck.status).toBe('warn');
    expect(lockCheck.evidence).toContain('1 file(s) missing — run `ags sync`');
  });

  // Test intent: reports ok when MCP is enabled with user scope and agents are registered
  it('17. handles MCP check with user scope and empty registered agents', async () => {
    const d = deps({
      loadConfig: vi.fn().mockResolvedValue({
        ...CONFIG,
        mcp: { enabled: true, scope: 'user', prompted: true },
      }),
      mcpStatus: vi.fn().mockResolvedValue([{ agent: Agent.Claude, user: true }]),
    });
    const svc = new DoctorService(d);
    const checks = await svc.runChecks({ rootDir: root, offline: true });
    const mcpCheck = byName(checks, 'mcp');
    expect(mcpCheck.status).toBe('ok');
    expect(mcpCheck.evidence).toContain('registered for claude');

    const dEmpty = deps({
      loadConfig: vi.fn().mockResolvedValue({
        ...CONFIG,
        mcp: { enabled: true, scope: 'user', prompted: true },
      }),
      mcpStatus: vi.fn().mockResolvedValue([]),
    });
    const svcEmpty = new DoctorService(dEmpty);
    const checksEmpty = await svcEmpty.runChecks({ rootDir: root, offline: true });
    expect(byName(checksEmpty, 'mcp').evidence).toContain('no MCP-capable agents');
  });

  // Test intent: skips hooks check gracefully when hook files contain no script or script does not exist on disk
  it('18. skips hook files when script file does not exist on disk', async () => {
    const d = deps({
      hookStatus: vi.fn().mockResolvedValue([
        {
          agent: Agent.Claude,
          installed: true,
          files: ['.claude/settings.json', '.claude/hooks/nonexistent.js'],
        },
      ]),
    });
    const svc = new DoctorService(d);
    const checks = await svc.runChecks({ rootDir: root, offline: true });
    const hookCheck = byName(checks, 'hooks');
    expect(hookCheck.status).toBe('ok');
  });

  // Test intent: includes fix description in report data when check has a fix
  it('19. includes fix description in report data when check provides a fix', () => {
    const checkWithFix = {
      name: 'test-check',
      status: 'warn' as const,
      evidence: 'evidence',
      fix: {
        description: 'run ags sync to fix',
        apply: async () => {},
      },
    };
    const report = DoctorService.toReport([checkWithFix]);
    expect(report.checks[0].fix).toBe('run ags sync to fix');
  });
});
