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

    it('should handle missing name and description in metadata gracefully', async () => {
      const fmContent =
        '---\nmetadata:\n  triggers: {}\n---\n## **Priority: P1**';
      (fs.readFile as any).mockResolvedValue(fmContent);
      (yaml.load as any).mockReturnValue({ metadata: { triggers: {} } });

      const res = await (service as any).parseSkill('/cat/skill/SKILL.md');
      expect(res!.name).toBe('');
      expect(res!.description).toBe('');

      const entry = (service as any).formatEntry('cat', 'skill', res);
      expect(entry).toBe('- **[cat/skill]**: ');
    });
  });
});
