import fs from 'fs-extra';
import yaml from 'js-yaml';
import { beforeEach, describe, expect, it, vi } from 'vitest';
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

      expect(result).toContain('common/base|🚨Desc');
      expect(result).toContain('flutter/bloc|🚨Desc');
    });

    it('should handle missing categories or skills', async () => {
      (fs.pathExists as any).mockResolvedValue(false);
      const result = await service.generate('/skills', ['missing']);
      expect(result).toContain('# Index');
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
      expect(result).toContain('# Index');
    });
  });

  describe('inject', () => {
    it('should create AGENTS.md if it does not exist', async () => {
      (fs.pathExists as any).mockResolvedValue(false);
      await service.inject('/root', 'index content');
      expect(fs.writeFile).toHaveBeenCalledWith(
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
      const call = vi.mocked(fs.writeFile).mock.calls[0];
      expect(call[1]).toContain('new content');
      expect(call[1]).not.toContain('old');
      expect(call[1]).toContain('pre');
      expect(call[1]).toContain('post');
    });

    it('should append if markers do not exist', async () => {
      (fs.pathExists as any).mockResolvedValue(true);
      (fs.readFile as any).mockResolvedValue('existing text');
      await service.inject('/root', 'index content');
      const call = vi.mocked(fs.writeFile).mock.calls[0];
      expect(call[1]).toContain('existing text');
      expect(call[1]).toContain('<!-- SKILLS_INDEX_START -->');
      expect(call[1]).toContain('index content');
    });
  });

  describe('assembleIndex', () => {
    it('should format entries into a table', () => {
      const entries = ['cat/skill|desc'];
      const result = service.assembleIndex(entries);
      expect(result).toContain('cat/skill|desc');
      expect(result).toContain('# Index');
    });
  });

  describe('bridge', () => {
    it('should create native rule files if they do not exist', async () => {
      const rootDir = '/root';
      const agents = ['cursor' as any];

      (fs.pathExists as any).mockResolvedValue(false);
      (fs.ensureDir as any).mockResolvedValue(undefined);

      await service.bridge(rootDir, agents);

      expect(fs.writeFile).toHaveBeenCalledWith(
        expect.stringContaining('.cursorrules'),
        expect.stringContaining('### 🛠 Agent Skills Standard'),
      );
    });

    it('should replace existing bridge if markers found', async () => {
      const rootDir = '/root';
      const agents = ['cursor' as any];

      (fs.pathExists as any).mockResolvedValue(true);
      (fs.readFile as any).mockResolvedValue(
        '<!-- SKILLS_BRIDGE_START -->old<!-- SKILLS_BRIDGE_END -->\nuser content',
      );

      await service.bridge(rootDir, agents);

      const call = vi.mocked(fs.writeFile).mock.calls[0];
      expect(call[1]).toContain('### 🛠 Agent Skills Standard');
      expect(call[1]).not.toContain('old');
      expect(call[1]).toContain('user content');
    });

    it('should prepend bridge if markers not found', async () => {
      const rootDir = '/root';
      const agents = ['cursor' as any];

      (fs.pathExists as any).mockResolvedValue(true);
      (fs.readFile as any).mockResolvedValue('user content');

      await service.bridge(rootDir, agents);

      const call = vi.mocked(fs.writeFile).mock.calls[0];
      expect(call[1]).toContain('### 🛠 Agent Skills Standard');
      expect(call[1]).toContain('user content');
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
      expect(entry).toContain('🚨d');
      // Check strict format ID|Desc
      expect(entry).toBe('cat/skill|🚨d');
    });
  });
});
