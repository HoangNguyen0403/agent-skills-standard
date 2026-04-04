import { WorkflowFormat } from '../../constants';

interface WorkflowSource {
  /** Original filename (e.g., 'code-review.md') */
  name: string;
  /** Raw markdown content from .agent/workflows/ */
  content: string;
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
 * - native:  Keep as-is in .agent/workflows/ (Antigravity, Kiro)
 * - command: Claude Code custom slash command (.claude/commands/*.md)
 *            User invokes via /command-name. Supports $ARGUMENTS for parameters.
 * - toml:    Gemini CLI command file (.gemini/commands/*.toml)
 *            Points to the .agent/workflows/ source via a prompt field.
 * - prompt:  Copilot reusable prompt file (.github/prompts/*.prompt.md)
 *            User invokes via /prompt-name in Copilot chat.
 * - none:    Agent has no verified user-invoked command system — skip.
 */
export class WorkflowTransformer {
  static transform(
    source: WorkflowSource,
    format: WorkflowFormat,
    workflowSourcePath: string = '.agent/workflows',
  ): TransformedWorkflow | null {
    if (format === 'none') return null;

    const { description, body } = this.parseSource(source.content);
    const baseName = source.name.replace(/\.md$/, '');

    switch (format) {
      case 'native':
        return { name: source.name, content: source.content };

      case 'command':
        return {
          name: `${baseName}.md`,
          content: this.toClaudeCommand(baseName, description, body),
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
   * Claude Code custom slash command format.
   * Lives at .claude/commands/<name>.md
   * User invokes via /<name> [arguments]
   * $ARGUMENTS placeholder for user input.
   */
  private static toClaudeCommand(
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
}
