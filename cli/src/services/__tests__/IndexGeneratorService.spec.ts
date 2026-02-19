import fs from 'fs-extra';
import yaml from 'js-yaml';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Agent } from '../../constants';
import { IndexGeneratorService } from '../IndexGeneratorService';

vi.mock('fs-extra');
vi.mock('js-yaml');

describe('IndexGeneratorService', () => {
  let service: IndexGeneratorService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new IndexGeneratorService();
  });

  describe('generate', () => {
    it('should generate an index from skill files', async () => {
      const baseDir = '/skills';
      const frameworks = ['flutter'];

      (fs.pathExists as any).mockImplementation(async (p: string) => {
        if (p.includes('common') || p.includes('flutter')) return true;
        if (p.includes('SKILL.md')) return true;
        return false;
      });

      (fs.readdir as any).mockImplementation(async (p: string) => {
        if (p.endsWith('common')) return ['base'];
        if (p.endsWith('flutter')) return ['bloc'];
        return [];
      });

      (fs.readFile as any).mockResolvedValue(
        '---\nname: Test\ndescription: Desc\nmetadata:\n  triggers:\n    keywords: [k1]\n---\n## **Priority: P0**',
      );
      (yaml.load as any).mockReturnValue({
        name: 'Test',
        description: 'Desc',
        metadata: { triggers: { keywords: ['k1'] } },
      });

      const result = await service.generate(baseDir, frameworks);

      expect(result).toContain('- **[common/base]**: 🚨 Desc');
      expect(result).toContain('- **[flutter/bloc]**: 🚨 Desc');
    });

    it('should handle missing categories or skills', async () => {
      (fs.pathExists as any).mockResolvedValue(false);
      const result = await service.generate('/skills', ['missing']);
      expect(result).toContain('# Agent Skills Index');
      // Check for absence of data rows (rows that look like category/skill|)
      const lines = result.split('\n');
      const dataRows = lines.filter((l) => l.includes('/') && l.includes('|'));
      expect(dataRows.length).toBe(0);
    });

    it('should return null if parsing fails', async () => {
      // Branch coverage for parseSkill catch block (line 148)
      (fs.readFile as any).mockRejectedValue(new Error('Parse error'));
      (fs.pathExists as any).mockResolvedValue(true);
      (fs.readdir as any).mockResolvedValue(['skill']);

      const result = await service.generate('/skills', ['common']);
      expect(result).toContain('# Agent Skills Index');
    });

    it('should skip skills with invalid frontmatter', async () => {
      (fs.pathExists as any).mockResolvedValue(true);
      (fs.readdir as any).mockResolvedValue(['invalid-skill']);
      (fs.readFile as any).mockResolvedValue('No frontmatter here');

      const result = await service.generate('/skills', ['common']);
      expect(result).not.toContain('common/invalid-skill');
    });

    it('should skip skills where SKILL.md is missing in directory', async () => {
      (fs.pathExists as any).mockImplementation(async (p: string) => {
        if (p.endsWith('SKILL.md')) return false;
        return true;
      });
      (fs.readdir as any).mockResolvedValue(['skill']);

      const result = await service.generate('/skills', ['common']);
      expect(result).not.toContain('common/skill');
    });
  });

  describe('inject', () => {
    it('should create AGENTS.md if it does not exist', async () => {
      (fs.pathExists as any).mockResolvedValue(false);
      await service.inject('/root', 'index content');
      expect(fs.outputFile).toHaveBeenCalledWith(
        expect.stringContaining('AGENTS.md'),
        expect.stringContaining('index content'),
      );
    });

    it('should replace content between markers if they exist', async () => {
      (fs.pathExists as any).mockResolvedValue(true);
      (fs.readFile as any).mockResolvedValue(
        'pre\n<!-- SKILLS_INDEX_START -->\nold\n<!-- SKILLS_INDEX_END -->\npost',
      );
      await service.inject('/root', 'new content');
      const call = vi.mocked(fs.outputFile).mock.calls[0];
      expect(call[1]).toContain('new content');
      expect(call[1]).not.toContain('old');
      expect(call[1]).toContain('pre');
      expect(call[1]).toContain('post');
    });

    it('should append if markers do not exist', async () => {
      (fs.pathExists as any).mockResolvedValue(true);
      (fs.readFile as any).mockResolvedValue('existing text');
      await service.inject('/root', 'index content');
      const call = vi.mocked(fs.outputFile).mock.calls[0];
      expect(call[1]).toContain('existing text');
      expect(call[1]).toContain('<!-- SKILLS_INDEX_START -->');
      expect(call[1]).toContain('index content');
    });

    it('should handle missing markers by cleaning up and appending', async () => {
      (fs.pathExists as any).mockResolvedValue(true);
      (fs.readFile as any).mockResolvedValue(
        'pre <!-- SKILLS_INDEX_START --> mid',
      );
      await service.inject('/root', 'new content');
      const call = vi.mocked(fs.outputFile).mock.calls[0];
      // It should remove the lone marker and append a new block
      expect(call[1]).not.toContain('pre <!-- SKILLS_INDEX_START --> mid');
      expect(call[1]).toContain('pre  mid');
      expect(call[1]).toContain(
        '<!-- SKILLS_INDEX_START -->\nnew content\n<!-- SKILLS_INDEX_END -->',
      );
    });
  });

  describe('assembleIndex', () => {
    it('should format entries into a list', () => {
      const entries = ['- **[cat/skill]**: desc'];
      const result = service.assembleIndex(entries);
      expect(result).toContain('- **[cat/skill]**: desc');
      expect(result).toContain('# Agent Skills Index');
      expect(result).toContain(
        '> **Prefer retrieval-led reasoning over pre-training-led reasoning.**',
      );
    });
  });

  describe('bridge', () => {
    it('should create correct rule files for all supported agents', async () => {
      const rootDir = '/root';
      const agents = [
        Agent.Cursor,
        Agent.Windsurf,
        Agent.Trae,
        Agent.Roo,
        Agent.Kiro,
        Agent.Antigravity,
        Agent.Claude,
        Agent.Copilot,
      ];

      (fs.ensureDir as any).mockResolvedValue(undefined);
      // Mock pathExists to return TRUE to simulate detected agents
      (fs.pathExists as any).mockResolvedValue(true);

      await service.bridge(rootDir, agents);

      // Helper to find call for a specific path
      const findCall = (pathPart: string) =>
        vi
          .mocked(fs.outputFile)
          .mock.calls.find((call) => (call[0] as string).includes(pathPart));

      // Cursor
      const cursorCall = findCall(
        '.cursor/rules/agent-skill-standard-rule.mdc',
      );
      expect(cursorCall).toBeDefined();
      expect(cursorCall![1]).toContain('globs: ["**/*"]');

      const copilotCall = findCall(
        '.github/instructions/agent-skill-standard-rule.instructions.md',
      );
      expect(copilotCall).toBeDefined();

      // ... match others implicitly via the fact that we passed all agents and forced them
      // We can check a few representative ones
      expect(findCall('.windsurf/rules')).toBeDefined();
      expect(findCall('.trae/rules')).toBeDefined();
      expect(findCall('.roo/rules')).toBeDefined();
      expect(findCall('CLAUDE.md')).toBeDefined();
    });

    it('should SKIP agents if their detection files do not exist', async () => {
      const rootDir = '/root';
      const agents = [Agent.Cursor, Agent.Roo];

      // Mock pathExists to return FALSE
      (fs.pathExists as any).mockResolvedValue(false);

      await service.bridge(rootDir, agents);

      expect(fs.outputFile).not.toHaveBeenCalled();
    });

    it('should WRITE agents if their detection files exist', async () => {
      const rootDir = '/root';
      const agents = [Agent.Cursor];

      // Mock pathExists to return TRUE for .cursor detection
      (fs.pathExists as any).mockImplementation(async (p: string) => {
        if (p.endsWith('.cursor') || p.endsWith('.cursorrules')) return true;
        return false;
      });

      await service.bridge(rootDir, agents);

      expect(fs.outputFile).toHaveBeenCalledWith(
        expect.stringContaining('.cursor/rules/agent-skill-standard-rule.mdc'),
        expect.any(String),
      );
    });

    it('should ignore unknown agents', async () => {
      const rootDir = '/root';
      await service.bridge(rootDir, ['unknown-agent' as Agent]);
      expect(fs.outputFile).not.toHaveBeenCalled();
    });
  });

  describe('parseSkill edge cases', () => {
    it('should handle skill without frontmatter (line 120 coverage)', async () => {
      (fs.readFile as any).mockResolvedValue('no frontmatter');
      // @ts-expect-error - protected
      const res = await service.parseSkill('/cat/skill/SKILL.md');
      expect(res).toBeNull();
    });

    it('should handle skill without priority (line 135 fallback)', async () => {
      const fmContent =
        '---\nname: n\ndescription: d\n---\nBody without priority';
      (fs.readFile as any).mockResolvedValue(fmContent);
      (yaml.load as any).mockReturnValue({ name: 'n', description: 'd' });
      // @ts-expect-error - protected
      const res = await service.parseSkill('/cat/skill/SKILL.md');
      expect(res!.priority).toBe('P1');
    });

    it('should handle priority and missing triggers (lines 142)', async () => {
      const metadata = {
        name: 'n',
        description: 'd',
        priority: 'P0 - URRGENT',
        triggers: {},
      };
      const entry = (service as any).formatEntry('cat', 'skill', metadata);
      expect(entry).toContain('🚨 d');
      // Check strict format - **[id]**: 🚨 Description
      expect(entry).toBe('- **[cat/skill]**: 🚨 d');
    });
    it('should NOT truncate long descriptions in list format', async () => {
      const metadata = {
        name: 'n',
        description: 'This is a very long description that should be truncated',
        priority: 'P1',
        triggers: {},
      };
      const entry = (service as any).formatEntry('cat', 'skill', metadata);
      // Description is not truncated in new format
      expect(entry).toContain(
        'This is a very long description that should be truncated',
      );
      expect(entry).toBe(
        '- **[cat/skill]**: This is a very long description that should be truncated',
      );
    });
  });
});
