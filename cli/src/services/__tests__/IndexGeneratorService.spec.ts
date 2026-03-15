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

      (fs.pathExists as any).mockImplementation(async (p: string) => {
        if (p === baseDir || p.includes('common') || p.includes('flutter'))
          return true;
        if (p.includes('SKILL.md')) return true;
        return false;
      });

      (fs.readdir as any).mockImplementation(async (p: string) => {
        if (p.endsWith('/skills')) return ['common', 'flutter'];
        if (p.endsWith('common')) return ['base'];
        if (p.endsWith('flutter')) return ['bloc'];
        return [];
      });

      (fs.stat as any).mockResolvedValue({ isDirectory: () => true });

      (fs.readFile as any).mockResolvedValue(
        '---\nname: Test\ndescription: Desc\nmetadata:\n  triggers:\n    keywords: [k1]\n---\n## **Priority: P0**',
      );
      (yaml.load as any).mockReturnValue({
        name: 'Test',
        description: 'Desc',
        metadata: { triggers: { keywords: ['k1'] } },
      });

      const result = await service.generate(baseDir);

      expect(result).toContain('- **[common/base]**: 🚨 Desc');
      expect(result).toContain('- **[flutter/bloc]**: 🚨 Desc');
    });

    it('should include all skill folders in the index regardless of categories', async () => {
      const baseDir = '/skills';

      (fs.pathExists as any).mockImplementation(async (p: string) => {
        if (
          p === baseDir ||
          p.includes('common') ||
          p.includes('flutter') ||
          p.includes('custom-cat')
        )
          return true;
        if (p.includes('SKILL.md')) return true;
        return false;
      });

      (fs.readdir as any).mockImplementation(async (p: string) => {
        if (p.endsWith('/skills')) return ['common', 'flutter', 'custom-cat'];
        if (p.endsWith('common')) return ['base'];
        if (p.endsWith('flutter')) return ['bloc'];
        if (p.endsWith('custom-cat')) return ['my-skill'];
        return [];
      });

      (fs.stat as any).mockResolvedValue({ isDirectory: () => true });

      (fs.readFile as any).mockResolvedValue(
        '---\nname: Test\ndescription: Desc\n---\n## **Priority: P1**',
      );
      (yaml.load as any).mockReturnValue({
        name: 'Test',
        description: 'Desc',
      });

      const result = await service.generate(baseDir);

      expect(result).toContain('- **[common/base]**: Desc');
      expect(result).toContain('- **[flutter/bloc]**: Desc');
      expect(result).toContain('- **[custom-cat/my-skill]**: Desc');
    });

    it('should handle missing categories or skills', async () => {
      (fs.pathExists as any).mockResolvedValue(false);
      const result = await service.generate('/skills');
      expect(result).toContain('# Agent Skills Index');
      // Check for absence of data rows (rows that look like category/skill)
      const lines = result.split('\n');
      const dataRows = lines.filter(
        (l) => l.includes('/') && l.includes('**['),
      );
      expect(dataRows.length).toBe(0);
    });

    it('should include the mandatory Pre-Write Audit Log section', async () => {
      (fs.pathExists as any).mockResolvedValue(false);
      const result = await service.generate('/skills');
      expect(result).toContain('### **The Pre-Write Audit Log (Mandatory)**');
      expect(result).toContain('Before invoking any file-editing tool');
      expect(result).toContain('1. **Skills Identified**');
      expect(result).toContain('2. **Explicit Audit**');
      expect(result).toContain('3. **No-Skill Justification**');
    });

    it('should include the mandatory action table in the header', async () => {
      (fs.pathExists as any).mockResolvedValue(false);
      const result = await service.generate('/skills');
      expect(result).toContain('## ⚡ How to Use This Index (Mandatory)');
      expect(result).toContain('> [!CRITICAL]');
      expect(result).toContain('you MUST call `view_file`');
      expect(result).toContain('| Trigger Type |');
      expect(result).toContain('| Required Action |');
      expect(result).toContain('Call `view_file` on the skill');
      expect(result).toContain('Indirect phrasing still counts');
    });

    it('should skip if parsing fails', async () => {
      (fs.readFile as any).mockRejectedValue(new Error('Parse error'));
      (fs.pathExists as any).mockResolvedValue(true);
      (fs.readdir as any).mockResolvedValue(['skill']);

      const result = await service.generate('/skills');
      expect(result).toContain('# Agent Skills Index');
    });

    it('should skip skills with invalid frontmatter', async () => {
      (fs.pathExists as any).mockResolvedValue(true);
      (fs.readdir as any).mockResolvedValue(['invalid-skill']);
      (fs.readFile as any).mockResolvedValue('No frontmatter here');

      const result = await service.generate('/skills');
      expect(result).not.toContain('common/invalid-skill');
    });

    it('should skip skills where SKILL.md is missing in directory', async () => {
      (fs.pathExists as any).mockImplementation(async (p: string) => {
        if (p.endsWith('SKILL.md')) return false;
        return true;
      });
      (fs.readdir as any).mockResolvedValue(['skill']);

      const result = await service.generate('/skills');
      expect(result).not.toContain('common/skill');
    });
  });

  describe('parseSkill edge cases', () => {
    it('should handle skill without frontmatter', async () => {
      (fs.readFile as any).mockResolvedValue('no frontmatter');
      // @ts-expect-error - protected
      const res = await service.parseSkill('/cat/skill/SKILL.md');
      expect(res).toBeNull();
    });

    it('should handle skill without priority', async () => {
      const fmContent =
        '---\nname: n\ndescription: d\n---\nBody without priority';
      (fs.readFile as any).mockResolvedValue(fmContent);
      (yaml.load as any).mockReturnValue({ name: 'n', description: 'd' });
      // @ts-expect-error - protected
      const res = await service.parseSkill('/cat/skill/SKILL.md');
      expect(res!.priority).toBe('P1');
    });

    it('should handle priority and missing triggers', async () => {
      const metadata = {
        name: 'n',
        description: 'd',
        priority: 'P0 - URRGENT',
        triggers: {},
      };
      const entry = (service as any).formatEntry('cat', 'skill', metadata);
      expect(entry).toContain('🚨 d');
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
      expect(entry).toContain(
        'This is a very long description that should be truncated',
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

  describe('composite auto-injection', () => {
    const rules: Record<string, string[]> = {
      'common/security-standards': ['security', 'auth'],
      'common/best-practices': ['architecture', 'language'],
      'common/performance-engineering': ['performance', 'caching'],
      'common/tdd': ['test'],
    };

    it('should auto-inject foundational composite when skill name matches a pattern', () => {
      const metadata = {
        name: 'n',
        description: 'd',
        priority: 'P0',
        triggers: {},
      };
      const entry = (service as any).formatEntry(
        'nestjs',
        'security',
        metadata,
        rules,
      );
      expect(entry).toContain('+common/security-standards');
    });

    it('should inject multiple foundational composites when skill matches multiple rules', () => {
      const metadata = {
        name: 'n',
        description: 'd',
        priority: 'P1',
        triggers: {},
      };
      const entry = (service as any).formatEntry(
        'nestjs',
        'architecture',
        metadata,
        rules,
      );
      expect(entry).toContain('+common/best-practices');
      expect(entry).not.toContain('+common/security-standards');
    });

    it('should NOT auto-inject composites for common/ category skills', () => {
      const metadata = {
        name: 'n',
        description: 'd',
        priority: 'P0',
        triggers: {},
      };
      const entry = (service as any).formatEntry(
        'common',
        'security-standards',
        metadata,
        rules,
      );
      expect(entry).not.toContain('+common/');
    });

    it('should deduplicate auto composites against explicit composites in frontmatter', () => {
      const metadata = {
        name: 'n',
        description: 'd',
        priority: 'P0',
        triggers: { composite: ['common/security-standards'] },
      };
      const entry = (service as any).formatEntry(
        'nestjs',
        'security',
        metadata,
        rules,
      );
      const count = (entry.match(/\+common\/security-standards/g) || []).length;
      expect(count).toBe(1);
    });

    it('should preserve explicit composite alongside auto-injected ones', () => {
      const metadata = {
        name: 'n',
        description: 'd',
        priority: 'P0',
        triggers: { composite: ['some/other-skill'] },
      };
      const entry = (service as any).formatEntry(
        'nestjs',
        'security',
        metadata,
        rules,
      );
      expect(entry).toContain('+some/other-skill');
      expect(entry).toContain('+common/security-standards');
    });

    it('should apply no composites when foundationalRules is empty', () => {
      const metadata = {
        name: 'n',
        description: 'd',
        priority: 'P0',
        triggers: {},
      };
      const entry = (service as any).formatEntry(
        'nestjs',
        'security',
        metadata,
        {},
      );
      expect(entry).not.toContain('+common/');
    });

    it('should load foundational rules from metadata.json in generate()', async () => {
      (fs.pathExists as any).mockResolvedValue(false);
      (fs.readFile as any).mockImplementation(async (p: string) => {
        if (p.includes('metadata.json')) {
          return JSON.stringify({
            foundational_composite_rules: {
              'common/best-practices': ['architecture'],
            },
          });
        }
        return '{}';
      });
      const result = await service.generate('/skills');
      expect(result).toContain('# Agent Skills Index');
    });

    it('should fall back to empty rules if metadata.json is missing', async () => {
      (fs.pathExists as any).mockResolvedValue(false);
      (fs.readFile as any).mockRejectedValue(new Error('ENOENT'));
      const result = await service.generate('/skills');
      expect(result).toContain('# Agent Skills Index');
    });
  });
});
