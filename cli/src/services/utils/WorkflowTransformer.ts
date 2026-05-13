import { WorkflowFormat } from '../../constants';

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
    workflowSourcePath: string = '.agents/workflows',
  ): TransformedWorkflow | null {
    const parsed = this.parse(source);
    return this.transformParsed(parsed, format, workflowSourcePath);
  }

  static transformParsed(
    parsed: ParsedWorkflow,
    format: WorkflowFormat,
    workflowSourcePath: string = '.agents/workflows',
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
          content: this.toGeminiCommand(
            baseName,
            description,
            workflowSourcePath,
          ),
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
    return {
      description: descMatch ? descMatch[1].trim() : '',
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

## Instructions

Execute the following steps for **$ARGUMENTS**.

${body}`;
  }

  /**
   * Gemini CLI TOML command format.
   * Lives at .gemini/commands/<name>.toml
   * References the workflow source file via prompt.
   * User invokes via /<name> [arguments]
   */
  private static toGeminiCommand(
    name: string,
    description: string,
    workflowSourcePath: string,
  ): string {
    const escapedDescription = description
      .replace(/\\/g, '\\\\')
      .replace(/"/g, '\\"');
    return `description = "${escapedDescription}"
prompt = """
Please execute the workflow defined in \`${workflowSourcePath}/${name}.md\` for: {{args}}

Follow the exact steps in the workflow file.
"""
`;
  }

  /**
   * GitHub Copilot reusable prompt format.
   * Lives at .github/prompts/<name>.prompt.md
   * User invokes via /prompt-name in Copilot chat.
   */
  private static toCopilotPrompt(description: string, body: string): string {
    return `---\ndescription: "${description}"\n---\n${body}`;
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
    const title = name
      .split('-')
      .map((w) => w.charAt(0).toUpperCase() + w.slice(1))
      .join(' ');

    return `# ${title} Skill

> [!IMPORTANT]
> ${description}

## Instructions

When the user asks to perform this workflow, execute the following steps:

${body}
`;
  }
}
