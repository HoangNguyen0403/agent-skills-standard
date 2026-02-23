import fs from 'fs-extra';
import { describe, expect, it, vi } from 'vitest';
import {
  DirectoryStructureRule,
  FrontmatterRule,
  InstructionsStyleRule,
  PriorityRule,
  SizeRule,
} from '../rules';

vi.mock('fs-extra');

describe('Validation Rules', () => {
  describe('SizeRule', () => {
    it('should pass if lines are within limit', async () => {
      const rule = new SizeRule(5);
      const result = await rule.validate('1\n2\n3');
      expect(result.passed).toBe(true);
    });

    it('should fail if lines exceed limit', async () => {
      const rule = new SizeRule(2);
      const result = await rule.validate('1\n2\n3');
      expect(result.passed).toBe(false);
      expect(result.errors).toContain('SKILL.md too large (3 lines > 2 limit)');
    });
  });

  describe('FrontmatterRule', () => {
    it('should pass with valid frontmatter', async () => {
      const rule = new FrontmatterRule();
      const content = '---\nname: Test\ndescription: A test\n---\nbody';
      const result = await rule.validate(content);
      expect(result.passed).toBe(true);
    });

    it('should fail if missing frontmatter', async () => {
      const rule = new FrontmatterRule();
      const result = await rule.validate('just body');
      expect(result.passed).toBe(false);
      expect(result.errors).toContain('Missing or invalid frontmatter');
    });

    it('should fail if missing name', async () => {
      const rule = new FrontmatterRule();
      const content = '---\ndescription: A test\n---\nbody';
      const result = await rule.validate(content);
      expect(result.passed).toBe(false);
      expect(result.errors).toContain('Missing "name" field in frontmatter');
    });

    it('should fail if missing description', async () => {
      const rule = new FrontmatterRule();
      const content = '---\nname: Test\n---\nbody';
      const result = await rule.validate(content);
      expect(result.passed).toBe(false);
      expect(result.errors).toContain(
        'Missing "description" field in frontmatter',
      );
    });

    it('should fail if description is too long', async () => {
      const rule = new FrontmatterRule();
      const longDesc = 'a'.repeat(201);
      const content = `---\nname: Test\ndescription: ${longDesc}\n---\nbody`;
      const result = await rule.validate(content);
      expect(result.passed).toBe(false);
      expect(result.errors[0]).toContain('Description too long');
    });
  });

  describe('InstructionsStyleRule', () => {
    it('should pass if imperative mood is used', async () => {
      const rule = new InstructionsStyleRule();
      const content = '---\nname: Test\n---\nDo this.\nRun that.';
      const result = await rule.validate(content);
      expect(result.warnings).toHaveLength(0);
    });

    it('should warn if conversational style is used outside code block', async () => {
      const rule = new InstructionsStyleRule();
      const content = '---\nname: Test\n---\n- please do this\n';
      const result = await rule.validate(content);
      expect(result.warnings).toContain(
        'Consider using imperative mood instead of conversational style in instructions',
      );
    });

    it('should safely ignore conversational style inside code block', async () => {
      const rule = new InstructionsStyleRule();
      const content = '---\nname: Test\n---\n```\n- please do this\n```';
      const result = await rule.validate(content);
      expect(result.warnings).toHaveLength(0);
    });
  });

  describe('PriorityRule', () => {
    it('should pass if priority section exists', async () => {
      const rule = new PriorityRule();
      const content = '## **Priority: P1**';
      const result = await rule.validate(content);
      expect(result.passed).toBe(true);
    });

    it('should fail if priority section is missing', async () => {
      const rule = new PriorityRule();
      const content = 'Some content';
      const result = await rule.validate(content);
      expect(result.passed).toBe(false);
      expect(result.errors).toContain('Missing priority section');
    });
  });

  describe('DirectoryStructureRule', () => {
    it('should warn if script has non-standard extension', async () => {
      vi.mocked(fs.pathExists).mockImplementation(async (p: any) =>
        p.includes('scripts'),
      );
      vi.mocked(fs.readdir).mockImplementation(async (p: any) =>
        p.includes('scripts') ? ['test.txt'] : [],
      );

      const rule = new DirectoryStructureRule();
      const result = await rule.validate(
        'content',
        '/app/skills/test/SKILL.md',
      );
      expect(result.warnings).toContain(
        'Script without standard extension: test.txt',
      );
    });

    it('should warn if references directory is empty or lacks .md files', async () => {
      vi.mocked(fs.pathExists).mockImplementation(async (p: any) =>
        p.includes('references'),
      );
      vi.mocked(fs.readdir).mockImplementation(async (p: any) =>
        p.includes('references') ? ['test.pdf'] : [],
      );

      const rule = new DirectoryStructureRule();
      const result = await rule.validate(
        'content',
        '/app/skills/test/SKILL.md',
      );
      expect(result.warnings).toContain(
        'References directory exists but contains no .md files',
      );
    });

    it('should pass with standard script extensions and .md references', async () => {
      (fs.pathExists as any).mockResolvedValue(true);
      (fs.readdir as any).mockImplementation(async (p: any) => {
        if (p.includes('scripts')) return ['script.ts', 'script.py'];
        if (p.includes('references')) return ['doc.md'];
        return [];
      });

      const rule = new DirectoryStructureRule();
      const result = await rule.validate(
        'content',
        '/app/skills/test/SKILL.md',
      );
      expect(result.warnings).toHaveLength(0);
    });
  });
});
