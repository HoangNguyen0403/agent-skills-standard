import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { Agent } from '../../constants';
import { HookService, UNIVERSAL_SKILL_LOADER_JS } from '../HookService';

describe('HookService', () => {
  let service: HookService;
  let root: string;

  beforeEach(async () => {
    service = new HookService();
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'hook-svc-'));
  });

  afterEach(async () => {
    await fs.remove(root);
  });

  // ── Claude Code ──────────────────────────────────────────────────────────────

  describe('install — Claude', () => {
    it('writes the JS hook script', async () => {
      await service.install({ rootDir: root, agents: [Agent.Claude] });

      const scriptJsPath = path.join(
        root,
        '.claude/hooks/preedit-skill-loader.js',
      );
      expect(await fs.pathExists(scriptJsPath)).toBe(true);
      expect(await fs.readFile(scriptJsPath, 'utf8')).toBe(
        UNIVERSAL_SKILL_LOADER_JS,
      );
    });

    it('does not overwrite an existing JS hook script', async () => {
      const scriptPath = path.join(
        root,
        '.claude/hooks/preedit-skill-loader.js',
      );
      await fs.ensureDir(path.dirname(scriptPath));
      await fs.writeFile(scriptPath, '# user custom hook\n');

      const report = await service.install({
        rootDir: root,
        agents: [Agent.Claude],
      });

      expect(await fs.readFile(scriptPath, 'utf8')).toBe(
        '# user custom hook\n',
      );
      expect(
        report.writes.find((w) => w.file.endsWith('preedit-skill-loader.js'))
          ?.action,
      ).toBe('skipped-existing');
    });

    it('reports settings.json as added when only the script already exists', async () => {
      const scriptPath = path.join(
        root,
        '.claude/hooks/preedit-skill-loader.js',
      );
      await fs.ensureDir(path.dirname(scriptPath));
      await fs.writeFile(scriptPath, '# user custom hook\n');

      const report = await service.install({
        rootDir: root,
        agents: [Agent.Claude],
      });

      const settingsWrite = report.writes.find(
        (w) => w.file === '.claude/settings.json',
      );
      expect(settingsWrite?.action).toBe('added');
    });

    it('registers the PreToolUse hook entry in settings.json', async () => {
      await service.install({ rootDir: root, agents: [Agent.Claude] });

      const settings = await fs.readJson(
        path.join(root, '.claude/settings.json'),
      );
      expect(settings.hooks?.PreToolUse).toBeDefined();
      const entry = (
        settings.hooks.PreToolUse as Array<Record<string, unknown>>
      )[0];
      expect(entry.matcher).toBe('Edit|Write|MultiEdit|NotebookEdit');
      const cmd = (entry.hooks as Array<Record<string, unknown>>)[0]
        .command as string;
      expect(cmd).toContain('preedit-skill-loader');
    });

    it('adds mcp__agent-skills-standard__* to permissions.allow', async () => {
      await service.install({ rootDir: root, agents: [Agent.Claude] });

      const settings = await fs.readJson(
        path.join(root, '.claude/settings.json'),
      );
      expect(settings.permissions?.allow).toContain(
        'mcp__agent-skills-standard__*',
      );
    });

    it('is idempotent — second install does not duplicate entries', async () => {
      await service.install({ rootDir: root, agents: [Agent.Claude] });
      await service.install({ rootDir: root, agents: [Agent.Claude] });

      const settings = await fs.readJson(
        path.join(root, '.claude/settings.json'),
      );
      const allow = settings.permissions?.allow as string[];
      expect(
        allow.filter((p: string) => p === 'mcp__agent-skills-standard__*'),
      ).toHaveLength(1);

      const preToolUse = settings.hooks?.PreToolUse as unknown[];
      const matching = preToolUse.filter((e: unknown) => {
        const entry = e as Record<string, unknown>;
        return (entry.hooks as Array<Record<string, unknown>>).some((h) =>
          (h.command as string).includes('preedit-skill-loader'),
        );
      });
      expect(matching).toHaveLength(1);
    });

    it('preserves existing settings.json content', async () => {
      const settingsPath = path.join(root, '.claude/settings.json');
      await fs.ensureDir(path.dirname(settingsPath));
      await fs.writeJson(settingsPath, {
        permissions: { allow: ['some-existing-permission'] },
        hooks: { PostToolUse: [{ matcher: '*', hooks: [] }] },
      });

      await service.install({ rootDir: root, agents: [Agent.Claude] });

      const settings = await fs.readJson(settingsPath);
      expect(settings.permissions.allow).toContain('some-existing-permission');
      expect(settings.hooks.PostToolUse).toBeDefined();
    });

    it('reports action=added on first install', async () => {
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Claude],
      });

      const claudeWrite = report.writes.find((w) => w.agent === Agent.Claude);
      expect(claudeWrite?.action).toBe('added');
    });

    it('reports action=skipped-existing when nothing changed', async () => {
      await service.install({ rootDir: root, agents: [Agent.Claude] });
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Claude],
      });

      const claudeWrite = report.writes.find((w) => w.agent === Agent.Claude);
      expect(claudeWrite?.action).toBe('skipped-existing');
    });
  });

  describe('uninstall — Claude', () => {
    it('preserves the hook script file — only removes the settings.json registration', async () => {
      await service.install({ rootDir: root, agents: [Agent.Claude] });
      await service.uninstall({ rootDir: root, agents: [Agent.Claude] });

      const scriptJsPath = path.join(
        root,
        '.claude/hooks/preedit-skill-loader.js',
      );
      expect(await fs.pathExists(scriptJsPath)).toBe(true);
      expect(
        await fs.pathExists(
          path.join(root, '.claude/hooks/preedit-skill-loader.py'),
        ),
      ).toBe(false);
    });

    it('removes the PreToolUse entry from settings.json', async () => {
      await service.install({ rootDir: root, agents: [Agent.Claude] });
      await service.uninstall({ rootDir: root, agents: [Agent.Claude] });

      const settings = await fs.readJson(
        path.join(root, '.claude/settings.json'),
      );
      const preToolUse = (settings.hooks?.PreToolUse ?? []) as Array<
        Record<string, unknown>
      >;
      const hasEntry = preToolUse.some((e) =>
        (e.hooks as Array<Record<string, unknown>>).some((h) =>
          (h.command as string).includes('preedit-skill-loader'),
        ),
      );
      expect(hasEntry).toBe(false);
    });

    it('removes mcp__agent-skills-standard__* from permissions.allow', async () => {
      await service.install({ rootDir: root, agents: [Agent.Claude] });
      await service.uninstall({ rootDir: root, agents: [Agent.Claude] });

      const settings = await fs.readJson(
        path.join(root, '.claude/settings.json'),
      );
      const allow = (settings.permissions?.allow ?? []) as string[];
      expect(allow).not.toContain('mcp__agent-skills-standard__*');
    });

    it('preserves other settings.json entries during uninstall', async () => {
      const settingsPath = path.join(root, '.claude/settings.json');
      await fs.ensureDir(path.dirname(settingsPath));
      await fs.writeJson(settingsPath, {
        permissions: { allow: ['keep-me'] },
        hooks: { PostToolUse: [{ matcher: '*', hooks: [] }] },
      });

      await service.install({ rootDir: root, agents: [Agent.Claude] });
      await service.uninstall({ rootDir: root, agents: [Agent.Claude] });

      const settings = await fs.readJson(settingsPath);
      expect(settings.permissions.allow).toContain('keep-me');
      expect(settings.hooks.PostToolUse).toBeDefined();
    });

    it('is safe to call when nothing is installed', async () => {
      const result = await service.uninstall({
        rootDir: root,
        agents: [Agent.Claude],
      });
      expect(result.removed).toHaveLength(0);
    });
  });

  describe('status — Claude', () => {
    it('reports not installed when files are absent', async () => {
      const rows = await service.status({
        rootDir: root,
        agents: [Agent.Claude],
      });

      expect(rows).toHaveLength(1);
      expect(rows[0].agent).toBe(Agent.Claude);
      expect(rows[0].installed).toBe(false);
    });

    it('reports installed after successful install', async () => {
      await service.install({ rootDir: root, agents: [Agent.Claude] });
      const rows = await service.status({
        rootDir: root,
        agents: [Agent.Claude],
      });

      expect(rows[0].installed).toBe(true);
    });

    it('reports not installed if script exists but settings entry is missing', async () => {
      const scriptPath = path.join(
        root,
        '.claude/hooks/preedit-skill-loader.js',
      );
      await fs.ensureDir(path.dirname(scriptPath));
      await fs.writeFile(scriptPath, '# stub');

      const rows = await service.status({
        rootDir: root,
        agents: [Agent.Claude],
      });
      expect(rows[0].installed).toBe(false);
    });
  });

  // ── Kiro ─────────────────────────────────────────────────────────────────────

  describe('install — Kiro', () => {
    it('writes the Kiro hook markdown file', async () => {
      await service.install({ rootDir: root, agents: [Agent.Kiro] });

      const hookPath = path.join(root, '.kiro/hooks/ags-skill-loader.md');
      expect(await fs.pathExists(hookPath)).toBe(true);
      const content = await fs.readFile(hookPath, 'utf8');
      expect(content).toContain('ags-skill-loader');
      expect(content).toContain('load_skills_for_files');
    });

    it('reports action=added on first install', async () => {
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Kiro],
      });

      const kiroWrite = report.writes.find((w) => w.agent === Agent.Kiro);
      expect(kiroWrite?.action).toBe('added');
    });

    it('reports action=skipped-existing on subsequent install', async () => {
      await service.install({ rootDir: root, agents: [Agent.Kiro] });
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Kiro],
      });

      const kiroWrite = report.writes.find((w) => w.agent === Agent.Kiro);
      expect(kiroWrite?.action).toBe('skipped-existing');
    });
  });

  describe('uninstall — Kiro', () => {
    it('removes the Kiro hook file', async () => {
      await service.install({ rootDir: root, agents: [Agent.Kiro] });
      await service.uninstall({ rootDir: root, agents: [Agent.Kiro] });

      expect(
        await fs.pathExists(path.join(root, '.kiro/hooks/ags-skill-loader.md')),
      ).toBe(false);
    });

    it('is safe to call when file is absent', async () => {
      const result = await service.uninstall({
        rootDir: root,
        agents: [Agent.Kiro],
      });
      expect(result.removed).toHaveLength(0);
    });
  });

  describe('status — Kiro', () => {
    it('reports not installed before install', async () => {
      const rows = await service.status({
        rootDir: root,
        agents: [Agent.Kiro],
      });
      expect(rows[0].installed).toBe(false);
    });

    it('reports installed after install', async () => {
      await service.install({ rootDir: root, agents: [Agent.Kiro] });
      const rows = await service.status({
        rootDir: root,
        agents: [Agent.Kiro],
      });
      expect(rows[0].installed).toBe(true);
    });
  });

  // ── Unsupported agents ───────────────────────────────────────────────────────

  describe('unsupported agents', () => {
    it('lists unsupported agents in install report', async () => {
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Trae, Agent.Roo],
      });

      expect(report.writes).toHaveLength(0);
      expect(report.unsupported).toContain(Agent.Trae);
      expect(report.unsupported).toContain(Agent.Roo);
    });
  });

  describe('install/uninstall — Codex, Copilot, Cursor, Windsurf, Gemini', () => {
    it('installs Codex hook correctly', async () => {
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Codex],
      });
      expect(report.writes).toHaveLength(2);
      expect(
        await fs.pathExists(
          path.join(root, '.codex/hooks/preedit-skill-loader.js'),
        ),
      ).toBe(true);
      expect(
        await fs.pathExists(
          path.join(root, '.codex/hooks/preedit-skill-loader.py'),
        ),
      ).toBe(false);
      const data = await fs.readJson(path.join(root, '.codex/hooks.json'));
      expect(data.hooks.PreToolUse).toBeDefined();
    });

    it('installs Copilot hook correctly', async () => {
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Copilot],
      });
      expect(report.writes).toHaveLength(2);
      expect(
        await fs.pathExists(
          path.join(root, '.github/hooks/preedit-skill-loader.js'),
        ),
      ).toBe(true);
      expect(
        await fs.pathExists(
          path.join(root, '.github/hooks/preedit-skill-loader.py'),
        ),
      ).toBe(false);
      const data = await fs.readJson(path.join(root, '.github/hooks.json'));
      expect(data.hooks.PreToolUse).toBeDefined();
    });

    it('uninstalls Copilot hook correctly', async () => {
      await service.install({ rootDir: root, agents: [Agent.Copilot] });
      const res = await service.uninstall({
        rootDir: root,
        agents: [Agent.Copilot],
      });
      expect(res.removed).toHaveLength(1);
      const data = await fs.readJson(path.join(root, '.github/hooks.json'));
      expect((data.hooks.PreToolUse ?? []).length).toBe(0);
    });

    it('installs Cursor hook correctly', async () => {
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Cursor],
      });
      expect(report.writes).toHaveLength(2);
      expect(
        await fs.pathExists(
          path.join(root, '.cursor/hooks/preedit-skill-loader.js'),
        ),
      ).toBe(true);
      const data = await fs.readJson(path.join(root, '.cursor/hooks.json'));
      expect(data.hooks.PreToolUse).toBeDefined();
    });

    it('installs Windsurf hook correctly', async () => {
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Windsurf],
      });
      expect(report.writes).toHaveLength(2);
      expect(
        await fs.pathExists(
          path.join(root, '.windsurf/hooks/preedit-skill-loader.js'),
        ),
      ).toBe(true);
      const data = await fs.readJson(path.join(root, '.windsurf/hooks.json'));
      expect(data.hooks.PreToolUse).toBeDefined();
    });

    it('installs Gemini hook correctly', async () => {
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Gemini],
      });
      expect(report.writes).toHaveLength(2);
      expect(
        await fs.pathExists(
          path.join(root, '.gemini/hooks/preedit-skill-loader.js'),
        ),
      ).toBe(true);
      const data = await fs.readJson(path.join(root, '.gemini/hooks.json'));
      expect(data.hooks.PreToolUse).toBeDefined();
    });
  });

  // ── Mixed agents ─────────────────────────────────────────────────────────────

  describe('mixed agents', () => {
    it('installs Claude and Kiro in one call', async () => {
      const report = await service.install({
        rootDir: root,
        agents: [Agent.Claude, Agent.Kiro],
      });

      expect(report.writes).toHaveLength(3);
      expect(report.writes.map((w) => w.agent)).toContain(Agent.Claude);
      expect(report.writes.map((w) => w.agent)).toContain(Agent.Kiro);
    });
  });

  describe('edge cases', () => {
    it('uninstall handles non-supported agents', async () => {
      const result = await service.uninstall({
        rootDir: root,
        agents: [Agent.Trae],
      });
      expect(result.removed).toHaveLength(0);
    });

    it('status handles non-supported agents by skipping them', async () => {
      const rows = await service.status({
        rootDir: root,
        agents: [Agent.Trae],
      });
      expect(rows).toHaveLength(0);
    });

    it('install updates Kiro hook if content is different', async () => {
      const hookPath = path.join(root, '.kiro/hooks/ags-skill-loader.md');
      await fs.ensureDir(path.dirname(hookPath));
      await fs.writeFile(hookPath, 'old content');

      const report = await service.install({
        rootDir: root,
        agents: [Agent.Kiro],
      });

      expect(report.writes.find((w) => w.agent === Agent.Kiro)?.action).toBe(
        'updated',
      );
      const { KIRO_HOOK_MD } = await import('../HookService');
      expect(await fs.readFile(hookPath, 'utf8')).toBe(KIRO_HOOK_MD);
    });

    it('cleans up legacy Python script and handles removal error gracefully', async () => {
      const scriptPath = path.join(
        root,
        '.claude/hooks/preedit-skill-loader.js',
      );
      const legacyPyPath = path.join(
        root,
        '.claude/hooks/preedit-skill-loader.py',
      );
      await fs.ensureDir(path.dirname(scriptPath));
      await fs.writeFile(legacyPyPath, '# legacy python');

      // First check that it cleans it up successfully
      await service.install({ rootDir: root, agents: [Agent.Claude] });
      expect(await fs.pathExists(legacyPyPath)).toBe(false);

      // Now create it again, mock fs.remove to reject, and check that it doesn't throw
      await fs.writeFile(legacyPyPath, '# legacy python');
      const spy = vi.spyOn(fs, 'remove').mockRejectedValueOnce(new Error('simulated delete error') as never);

      await service.install({ rootDir: root, agents: [Agent.Claude] });
      expect(spy).toHaveBeenCalled();
      // even if deletion failed, the installation should still succeed/not throw:
      expect(await fs.pathExists(scriptPath)).toBe(true);
      
      spy.mockRestore();
    });
  });
});
