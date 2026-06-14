import { describe, expect, it } from 'vitest';
import { WorkflowTransformer } from '../WorkflowTransformer';

const SOURCE = {
  name: 'code-review.md',
  content: `---
description: Run an AI-assisted PR code review.
---

# Code Review

## Step 1 — Scope

Check scope with \`git diff\`.
`,
};
const WORKFLOW_ARGS =
  'mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false';

describe('WorkflowTransformer', () => {
  it('should parse workflow metadata into a stable internal model', () => {
    const parsed = WorkflowTransformer.parse(SOURCE);
    expect(parsed.key).toBe('code-review');
    expect(parsed.fileName).toBe('code-review.md');
    expect(parsed.description).toBe('Run an AI-assisted PR code review.');
    expect(parsed.body).toContain('## Step 1');
  });

  it('should transform from parsed model for skill targets', () => {
    const parsed = WorkflowTransformer.parse(SOURCE);
    const result = WorkflowTransformer.transformParsed(parsed, 'skill');
    expect(result!.name).toBe('SKILL.md');
    expect(result!.content).toContain('Run an AI-assisted PR code review.');
  });

  it('should return null for format "none"', () => {
    expect(WorkflowTransformer.transform(SOURCE, 'none')).toBeNull();
  });

  it('should keep content as-is for "native" format', () => {
    const result = WorkflowTransformer.transform(SOURCE, 'native');
    expect(result!.name).toBe('code-review.md');
    expect(result!.content).toBe(SOURCE.content);
  });

  describe('command format (Claude Code)', () => {
    it('should produce a .md slash command file', () => {
      const result = WorkflowTransformer.transform(SOURCE, 'command');
      expect(result!.name).toBe('code-review.md');
    });

    it('should include $ARGUMENTS placeholder', () => {
      const result = WorkflowTransformer.transform(SOURCE, 'command');
      expect(result!.content).toContain('$ARGUMENTS');
    });

    it('should include the portable workflow arguments contract', () => {
      const result = WorkflowTransformer.transform(SOURCE, 'command');
      expect(result!.content).toContain(WORKFLOW_ARGS);
    });

    it('should include the workflow body steps', () => {
      const result = WorkflowTransformer.transform(SOURCE, 'command');
      expect(result!.content).toContain('## Step 1');
      expect(result!.content).toContain('git diff');
    });

    it('should have a formatted title', () => {
      const result = WorkflowTransformer.transform(SOURCE, 'command');
      expect(result!.content).toContain('# Code Review');
    });

    it('should include the description', () => {
      const result = WorkflowTransformer.transform(SOURCE, 'command');
      expect(result!.content).toContain('Run an AI-assisted PR code review.');
    });
  });

  describe('toml format (Gemini CLI)', () => {
    it('should produce a .toml command file', () => {
      const result = WorkflowTransformer.transform(SOURCE, 'toml');
      expect(result!.name).toBe('code-review.toml');
    });

    it('should contain description field', () => {
      const result = WorkflowTransformer.transform(SOURCE, 'toml');
      expect(result!.content).toContain(
        'description = "Run an AI-assisted PR code review."',
      );
    });

    it('should reference the workflow source file', () => {
      const result = WorkflowTransformer.transform(
        SOURCE,
        'toml',
        '.agents/workflows',
      );
      expect(result!.content).toContain('.agents/workflows/code-review.md');
    });

    it('should include {{args}} placeholder', () => {
      const result = WorkflowTransformer.transform(SOURCE, 'toml');
      expect(result!.content).toContain('{{args}}');
    });

    it('should include the portable workflow arguments contract', () => {
      const result = WorkflowTransformer.transform(SOURCE, 'toml');
      expect(result!.content).toContain(WORKFLOW_ARGS);
    });

    it('should escape quotes in description', () => {
      const quoted = {
        name: 'test.md',
        content: '---\ndescription: Use "strict" mode.\n---\n# Test',
      };
      const result = WorkflowTransformer.transform(quoted, 'toml');
      expect(result!.content).toContain('Use \\"strict\\" mode.');
    });
  });

  describe('prompt format (Copilot)', () => {
    it('should produce a .prompt.md file', () => {
      const result = WorkflowTransformer.transform(SOURCE, 'prompt');
      expect(result!.name).toBe('code-review.prompt.md');
    });

    it('should include description in frontmatter', () => {
      const result = WorkflowTransformer.transform(SOURCE, 'prompt');
      expect(result!.content).toContain(
        'description: "Run an AI-assisted PR code review."',
      );
    });

    it('should include the workflow body', () => {
      const result = WorkflowTransformer.transform(SOURCE, 'prompt');
      expect(result!.content).toContain('## Step 1');
      expect(result!.content).toContain('git diff');
    });
  });

  it('should handle content without frontmatter', () => {
    const noFm = { name: 'simple.md', content: '# Just a title\n\nContent.' };
    const parsed = WorkflowTransformer.parse(noFm);
    expect(parsed.description).toBe('');
    expect(parsed.body).toContain('# Just a title');
    const result = WorkflowTransformer.transform(noFm, 'command');
    expect(result!.content).toContain('$ARGUMENTS');
    expect(result!.content).toContain('# Just a title');
  });

  describe('skill format (Cursor/Trae)', () => {
    it('should produce a SKILL.md file', () => {
      const result = WorkflowTransformer.transform(SOURCE, 'skill');
      expect(result!.name).toBe('SKILL.md');
    });

    it('should include yaml frontmatter required by skill loaders', () => {
      const result = WorkflowTransformer.transform(SOURCE, 'skill');
      expect(result!.content.startsWith('---\n')).toBe(true);
      expect(result!.content).toContain('name: code-review');
      expect(result!.content).toContain(
        'description: "Run an AI-assisted PR code review."',
      );
    });

    it('should include the workflow description in a callout', () => {
      const result = WorkflowTransformer.transform(SOURCE, 'skill');
      expect(result!.content).toContain('> [!IMPORTANT]');
      expect(result!.content).toContain('Run an AI-assisted PR code review.');
    });

    it('should include the instructions title', () => {
      const result = WorkflowTransformer.transform(SOURCE, 'skill');
      expect(result!.content).toContain('## Instructions');
    });

    it('should include the portable workflow arguments contract', () => {
      const result = WorkflowTransformer.transform(SOURCE, 'skill');
      expect(result!.content).toContain(WORKFLOW_ARGS);
    });

    it('should include the workflow body steps', () => {
      const result = WorkflowTransformer.transform(SOURCE, 'skill');
      expect(result!.content).toContain('## Step 1');
      expect(result!.content).toContain('git diff');
    });

    it('should safely escape quoted descriptions in skill frontmatter', () => {
      const quoted = {
        name: 'test.md',
        content: '---\ndescription: Use "strict" mode.\n---\n# Test',
      };
      const result = WorkflowTransformer.transform(quoted, 'skill');
      expect(result!.content).toContain(
        'description: "Use \\"strict\\" mode."',
      );
    });
  });

  describe('WorkflowTransformer - Additional Branch Coverage', () => {
    it('handles frontmatter without description', () => {
      const source = {
        name: 'test.md',
        content: '---\nother_field: val\n---\n# Test',
      };
      const parsed = WorkflowTransformer.parse(source);
      expect(parsed.description).toBe('');
    });

    it('escapes backslashes and double quotes in toml format description', () => {
      const source = {
        name: 'test.md',
        content: '---\ndescription: Escape \\ and " characters.\n---\n# Test',
      };
      const result = WorkflowTransformer.transform(source, 'toml');
      expect(result!.content).toContain('Escape \\\\ and \\" characters.');
    });

    it('uses fallback description and escapes backslashes in skill format', () => {
      const source = {
        name: 'test-wf.md',
        content: '# Test',
      };
      const result = WorkflowTransformer.transform(source, 'skill');
      expect(result!.content).toContain(
        'description: "Workflow skill for test wf."',
      );
    });

    it('escapes backslashes in skill format description', () => {
      const source = {
        name: 'test.md',
        content: '---\ndescription: Escape \\ character.\n---\n# Test',
      };
      const result = WorkflowTransformer.transform(source, 'skill');
      expect(result!.content).toContain(
        'description: "Escape \\\\ character."',
      );
    });
  });
});
