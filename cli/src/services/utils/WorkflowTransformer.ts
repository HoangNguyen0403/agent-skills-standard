import { WorkflowFormat } from '../../constants';
import { escapeTomlString } from './tomlEscape';

interface WorkflowSource {
  /** Original filename (e.g., 'code-review.md') */
  name: string;
  /** Raw markdown content from .agents/workflows/ */
  content: string;
}

export interface ParsedWorkflow {
  /** Workflow key without extension (e.g., 'code-review') */
  key: string;
  /** Original filename with extension (e.g., 'code-review.md') */
  fileName: string;
  /** Description parsed from frontmatter if present */
  description: string;
  /** Workflow markdown body (frontmatter removed) */
  body: string;
  /** Original raw workflow markdown content */
  rawContent: string;
}

interface TransformedWorkflow {
  /** Target filename for the agent */
  name: string;
  /** Transformed content in the agent's native format */
  content: string;
}

const WORKFLOW_ARGUMENTS =
  'Optional args: slug=<feature>, ticket=<id/url>, mode=interactive|autonomous|channel, channel=<id>, auto_continue=true|false, profile=business|hybrid|technical.';

/**
 * Transforms workflow markdown into each agent's native user-invoked command format.
 *
 * Workflows are NOT rules or agents — they are multi-step procedures the user
 * explicitly invokes (e.g., "run code-review"). Each agent has a different mechanism:
 *
 * - native:  Keep as-is in .agents/workflows/ (Antigravity, Kiro)
 * - command: Claude Code custom slash command (.claude/commands/*.md)
 *            User invokes via /command-name. Supports $ARGUMENTS for parameters.
 * - toml:    Gemini CLI command file (.gemini/commands/*.toml)
 *            Points to the .agents/workflows/ source via a prompt field.
 * - prompt:  Copilot reusable prompt file (.github/prompts/*.prompt.md)
 *            User invokes via /prompt-name in Copilot chat.
 * - none:    Agent has no verified user-invoked command system — skip.
 */
export class WorkflowTransformer {
  static parse(source: WorkflowSource): ParsedWorkflow {
    const { description, body } = this.parseSource(source.content);
    const key = source.name.replace(/\.md$/, '');
    return {
      key,
      fileName: source.name,
      description,
      body,
      rawContent: source.content,
    };
  }

  static transform(
    source: WorkflowSource,
    format: WorkflowFormat,
  ): TransformedWorkflow | null {
    const parsed = this.parse(source);
    return this.transformParsed(parsed, format);
  }

  static transformParsed(
    parsed: ParsedWorkflow,
    format: WorkflowFormat,
  ): TransformedWorkflow | null {
    if (format === 'none') return null;

    const { description, body } = parsed;
    const baseName = parsed.key;

    switch (format) {
      case 'native':
        return { name: parsed.fileName, content: parsed.rawContent };

      case 'command':
        return {
          name: `${baseName}.md`,
          content: this.toMarkdownCommand(baseName, description, body),
        };

      case 'toml':
        return {
          name: `${baseName}.toml`,
          content: this.toGeminiCommand(description, body),
        };

      case 'prompt':
        return {
          name: `${baseName}.prompt.md`,
          content: this.toCopilotPrompt(description, body),
        };

      case 'skill':
        return {
          name: 'SKILL.md',
          content: this.toSkillMarkdown(baseName, description, body),
        };
    }
  }

  private static parseSource(content: string): {
    description: string;
    body: string;
  } {
    const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    if (!match) return { description: '', body: content };

    const descMatch = match[1].match(/description:\s*(.+)/);
    const rawDescription = descMatch ? descMatch[1].trim() : '';
    const quotedMatch = rawDescription.match(/^"(.*)"$|^'(.*)'$/);
    const description = quotedMatch
      ? (quotedMatch[1] ?? quotedMatch[2])
      : rawDescription;

    return {
      description,
      body: match[2],
    };
  }

  /**
   * Markdown-based custom slash command format.
   * Used by Claude Code (.claude/commands/), Roo Code (.roo/commands/), and OpenCode (.opencode/commands/).
   * User invokes via /<name> [arguments]
   * Use $ARGUMENTS as a universal placeholder for user input instructions.
   */
  private static toMarkdownCommand(
    name: string,
    description: string,
    body: string,
  ): string {
    const title = name
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    return `# ${title}

${description}

**Input:** $ARGUMENTS

${WORKFLOW_ARGUMENTS}

## Instructions

Execute the following steps for **$ARGUMENTS**.

${body}`;
  }

  /**
   * Gemini CLI TOML command format.
   * Lives at .gemini/commands/<name>.toml
   * Inlines the workflow body so the command is self-contained even when
   * .agents/workflows/ is not also synced to this runtime.
   * User invokes via /<name> [arguments]
   */
  private static toGeminiCommand(description: string, body: string): string {
    const escapedDescription = escapeTomlString(description);
    // Escaping every quote (not just runs of 3+) avoids the ambiguity a
    // partial escape leaves for 4+ consecutive quote characters in body.
    const escapedBody = escapeTomlString(body);
    return `description = "${escapedDescription}"
prompt = """
Execute this workflow for: {{args}}

${WORKFLOW_ARGUMENTS}

${escapedBody}
"""
`;
  }

  /**
   * GitHub Copilot reusable prompt format.
   * Lives at .github/prompts/<name>.prompt.md
   * User invokes via /prompt-name in Copilot chat.
   */
  private static toCopilotPrompt(description: string, body: string): string {
    const escapedDescription = description
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"');
    return `---\ndescription: "${escapedDescription}"\n---\n${body}`;
  }

  /**
   * Agent Skill (SKILL.md) format.
   * Used by Cursor, Trae, and Codex.
   * Lives at <workflowPath>/<name>/SKILL.md
   * Invoked through each platform's skill mechanism.
   */
  private static toSkillMarkdown(
    name: string,
    description: string,
    body: string,
  ): string {
    const normalizedDescription =
      description || `Workflow skill for ${name.replace(/-/g, ' ')}.`;
    const escapedDescription = normalizedDescription
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"');
    const title = name
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    return `---
name: ${name}
description: "${escapedDescription}"
metadata:
  triggers:
    keywords:
    - ${name.replace(/-/g, ' ')}
    - workflow
---
# ${title} Skill

> [!IMPORTANT]
> ${normalizedDescription}

${WORKFLOW_ARGUMENTS}

## Instructions

When the user asks to perform this workflow, execute the following steps:

${body}
`;
  }
}
