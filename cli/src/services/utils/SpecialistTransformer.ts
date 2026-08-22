import yaml from 'js-yaml';
import { Agent, getAgentDefinition } from '../../constants';
import { escapeTomlString } from './tomlEscape';

interface SpecialistSource {
  name: string;
  content: string;
}

interface TransformedSpecialist {
  name: string;
  content: string;
}

// Anchored: a `---` line inside the body can no longer shift where the
// frontmatter block is believed to end.
const FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;

/**
 * Serializes frontmatter fields via js-yaml so every value — including a
 * `description` sourced from skill content — is safely quoted/escaped.
 * Interpolating raw strings into a hand-built YAML template let a crafted
 * description inject its own top-level keys (e.g. a second `tools:`) into
 * the emitted agent file; js-yaml can't be tricked that way.
 */
function dumpFrontmatter(fields: Record<string, unknown>): string {
  return yaml.dump(fields, { lineWidth: -1 }).trimEnd();
}

/**
 * Transforms specialist skill markdown into platform-specific agent personas.
 */
export class SpecialistTransformer {
  static transform(
    source: SpecialistSource,
    agentId: Agent,
  ): TransformedSpecialist | null {
    const agentDef = getAgentDefinition(agentId);
    if (!agentDef) return null;

    const match = source.content.match(FRONTMATTER_RE);
    if (!match) return null;

    const metadata = yaml.load(match[1]) as Record<string, unknown>;
    const body = match[2].trim();
    const baseName = source.name.replace(/^specialist-/, '');
    const fullName = source.name;

    const description =
      (metadata.description as string | undefined) ||
      `Specialist persona for ${baseName}`;

    switch (agentId) {
      case Agent.Claude: {
        const fm: Record<string, unknown> = { name: baseName, description };
        if (metadata.tools) {
          fm.tools = Array.isArray(metadata.tools)
            ? metadata.tools.join(', ')
            : metadata.tools;
        }
        if (metadata.model) fm.model = metadata.model;
        if (metadata.color) fm.color = metadata.color;
        return {
          name: `${baseName}.md`,
          content: `---\n${dumpFrontmatter(fm)}\n---\n\n${body}`,
        };
      }

      case Agent.Cursor:
        return {
          name: `${fullName}.mdc`,
          content: `---\n${dumpFrontmatter({ description, globs: ['**/*'] })}\n---\n# Specialist: ${baseName}\n\n${body}`,
        };

      case Agent.Copilot:
        return {
          name: `${fullName}.instructions.md`,
          content: `---\n${dumpFrontmatter({ description, applyTo: '**/*' })}\n---\n\n${body}`,
        };

      case Agent.OpenCode:
        return {
          name: `${baseName}.md`,
          content: `---\n${dumpFrontmatter({ description, mode: 'subagent' })}\n---\n\n${body}`,
        };

      case Agent.Gemini:
        return {
          name: `${baseName}.md`,
          content: `---\n${dumpFrontmatter({ name: baseName, description, kind: 'local' })}\n---\n\n${body}`,
        };

      case Agent.Kiro:
        return {
          name: `${baseName}.md`,
          content: `---\n${dumpFrontmatter({ name: baseName, description })}\n---\n\n${body}`,
        };

      case Agent.Codex: // Codex uses TOML, not YAML — escape separately.
        return {
          name: `${baseName}.toml`,
          content: `name = "${escapeTomlString(baseName)}"\ndescription = "${escapeTomlString(description)}"\nsandbox_mode = "read-only"\ndeveloper_instructions = """\n${escapeTomlString(body)}\n"""`,
        };

      default:
        return {
          name: `${baseName}${agentDef.ruleExtension || '.md'}`,
          content: body,
        };
    }
  }
}
