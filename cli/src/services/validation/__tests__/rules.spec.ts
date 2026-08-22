import fs from 'fs-extra';
import { describe, expect, it, vi } from 'vitest';
import {
  DirectoryStructureRule,
  FrontmatterRule,
  InstructionsStyleRule,
  PriorityRule,
  SizeRule,
  TriggersRule,
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
      const longDesc = 'a'.repeat(1025);
      const content = `---\nname: Test\ndescription: ${longDesc}\n---\nbody`;
      const result = await rule.validate(content);
      expect(result.passed).toBe(false);
      expect(result.errors[0]).toContain('Description too long');
    });

    it('should warn if description exceeds 300 chars but stays under the 1024 limit', async () => {
      const rule = new FrontmatterRule();
      const longDesc = 'a'.repeat(301);
      const content = `---\nname: Test\ndescription: ${longDesc}\n---\nbody`;
      const result = await rule.validate(content);
      expect(result.passed).toBe(true);
      expect(result.warnings[0]).toContain('301 chars');
    });

    it('should not warn if description is within 300 chars', async () => {
      const rule = new FrontmatterRule();
      const content =
        '---\nname: Test\ndescription: A short description\n---\nbody';
      const result = await rule.validate(content);
      expect(result.warnings).toHaveLength(0);
    });

    it('should fail on malformed YAML instead of silently passing', async () => {
      const rule = new FrontmatterRule();
      const content = '---\nname: [unterminated\n---\nbody';
      const result = await rule.validate(content);
      expect(result.passed).toBe(false);
      expect(result.errors).toContain('Invalid YAML frontmatter');
    });

    it('should not mistake a body line containing "name:" for the frontmatter field', async () => {
      const rule = new FrontmatterRule();
      const content =
        '---\ndescription: A test\n---\nSee name: this is prose, not frontmatter.';
      const result = await rule.validate(content);
      expect(result.passed).toBe(false);
      expect(result.errors).toContain('Missing "name" field in frontmatter');
    });

    it('should pass when optional Universal-Skill-Format fields are absent (existing corpus)', async () => {
      const rule = new FrontmatterRule();
      const content = '---\nname: Test\ndescription: A test\n---\nbody';
      const result = await rule.validate(content);
      expect(result.passed).toBe(true);
      expect(result.errors).toHaveLength(0);
    });

    it('should accept a valid risk_tier + permissions declaration', async () => {
      const rule = new FrontmatterRule();
      const content = [
        '---',
        'name: Test',
        'description: A test',
        'version: 1.0.0',
        'risk_tier: L2',
        'allowed-tools: ["Bash", "Read"]',
        'permissions:',
        '  exec: true',
        '  network:',
        '    allow: ["api.example.com"]',
        '---',
        'body',
      ].join('\n');
      const result = await rule.validate(content);
      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should reject an invalid risk_tier value', async () => {
      const rule = new FrontmatterRule();
      const content =
        '---\nname: Test\ndescription: A test\nrisk_tier: L9\n---\nbody';
      const result = await rule.validate(content);
      expect(result.passed).toBe(false);
      expect(result.errors.some((e) => e.includes('risk_tier'))).toBe(true);
    });

    it('should reject a malformed content_hash', async () => {
      const rule = new FrontmatterRule();
      const content =
        '---\nname: Test\ndescription: A test\ncontent_hash: not-a-hash\n---\nbody';
      const result = await rule.validate(content);
      expect(result.passed).toBe(false);
      expect(result.errors.some((e) => e.includes('content_hash'))).toBe(true);
    });

    it('should warn (not fail) when risk_tier L2/L3 is declared without a permissions block', async () => {
      const rule = new FrontmatterRule();
      const content =
        '---\nname: Test\ndescription: A test\nrisk_tier: L2\n---\nbody';
      const result = await rule.validate(content);
      expect(result.passed).toBe(true);
      expect(result.warnings.some((w) => w.includes('permissions block'))).toBe(
        true,
      );
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

    it('should work without frontmatter (line 77 branch)', async () => {
      const rule = new InstructionsStyleRule();
      const content = '- please use this';
      const result = await rule.validate(content);
      expect(result.warnings).toContain(
        'Consider using imperative mood instead of conversational style in instructions',
      );
    });
  });

  describe('PriorityRule', () => {
    it('should pass with no warnings on a canonical label', async () => {
      const rule = new PriorityRule();
      const content = '## **Priority: P0 (CRITICAL)**';
      const result = await rule.validate(content);
      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(0);
    });

    it('should pass (with warning) on bare tier in warning mode', async () => {
      const rule = new PriorityRule();
      const content = '## **Priority: P1**';
      const result = await rule.validate(content);
      expect(result.passed).toBe(true);
      expect(result.warnings[0]).toContain('P1 (HIGH)');
    });

    it('should warn on a non-canonical label in warning mode', async () => {
      const rule = new PriorityRule('warning');
      const content = '## **Priority: P1 (OPERATIONAL)**';
      const result = await rule.validate(content);
      expect(result.passed).toBe(true);
      expect(result.warnings[0]).toContain('P1 (HIGH)');
    });

    it('should warn on mixed-case label in warning mode', async () => {
      const rule = new PriorityRule('warning');
      const content = '## **Priority: P0 (Critical)**';
      const result = await rule.validate(content);
      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(1);
    });

    it('should warn on freeform trailing text in warning mode', async () => {
      const rule = new PriorityRule('warning');
      const content = '## **Priority: P0 — Iron Law**';
      const result = await rule.validate(content);
      expect(result.passed).toBe(true);
      expect(result.warnings).toHaveLength(1);
    });

    it('should error on a non-canonical label in error mode', async () => {
      const rule = new PriorityRule('error');
      const content = '## **Priority: P1 (OPERATIONAL)**';
      const result = await rule.validate(content);
      expect(result.passed).toBe(false);
      expect(result.errors[0]).toContain('P1 (HIGH)');
    });

    it('should error on unknown tier regardless of severity mode', async () => {
      const rule = new PriorityRule();
      const content = '## **Priority: P9 (CRITICAL)**';
      const result = await rule.validate(content);
      expect(result.passed).toBe(false);
      expect(result.errors[0]).toContain('Unknown priority tier');
    });

    it('should fail if priority section is missing', async () => {
      const rule = new PriorityRule();
      const content = 'Some content';
      const result = await rule.validate(content);
      expect(result.passed).toBe(false);
      expect(result.errors).toContain('Missing priority section');
    });
  });

  describe('TriggersRule', () => {
    it('should pass with keywords only', async () => {
      const rule = new TriggersRule();
      const content =
        '---\nname: Test\nmetadata:\n  triggers:\n    keywords:\n      - foo\n---\nbody';
      const result = await rule.validate(content);
      expect(result.passed).toBe(true);
    });

    it('should pass with files only', async () => {
      const rule = new TriggersRule();
      const content =
        '---\nname: Test\nmetadata:\n  triggers:\n    files:\n      - "**/*.ts"\n---\nbody';
      const result = await rule.validate(content);
      expect(result.passed).toBe(true);
    });

    it('should fail when both files and keywords are empty', async () => {
      const rule = new TriggersRule();
      const content =
        '---\nname: Test\nmetadata:\n  triggers:\n    files: []\n    keywords: []\n---\nbody';
      const result = await rule.validate(content);
      expect(result.passed).toBe(false);
      expect(result.errors[0]).toContain('unroutable');
    });

    it('should fail when metadata.triggers is missing entirely', async () => {
      const rule = new TriggersRule();
      const content = '---\nname: Test\n---\nbody';
      const result = await rule.validate(content);
      expect(result.passed).toBe(false);
    });

    it('should pass (defer to FrontmatterRule) when frontmatter is absent', async () => {
      const rule = new TriggersRule();
      const result = await rule.validate('just body');
      expect(result.passed).toBe(true);
    });

    it('should fail on invalid YAML frontmatter', async () => {
      const rule = new TriggersRule();
      const content = '---\nname: [Test\n---\nbody';
      const result = await rule.validate(content);
      expect(result.passed).toBe(false);
      expect(result.errors[0]).toContain('Invalid YAML');
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
