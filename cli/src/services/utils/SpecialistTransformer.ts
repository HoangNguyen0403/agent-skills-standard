import yaml from 'js-yaml';
import { Agent, getAgentDefinition } from '../../constants';

interface SpecialistSource {
  name: string;
  content: string;
}

interface TransformedSpecialist {
  name: string;
  content: string;
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

    const parts = source.content.split('---');
    if (parts.length < 3) return null;

    const metadata = yaml.load(parts[1]) as Record<string, unknown>;
    const body = parts.slice(2).join('---').trim();
    const baseName = source.name.replace(/^specialist-/, '');
    const fullName = source.name;

    const description =
      metadata.description || `Specialist persona for ${baseName}`;

    switch (agentId) {
      case Agent.Claude:
        return {
          name: `${baseName}.md`,
          content: `---\nname: ${baseName}\ndescription: "${description}"\n---\n\n${body}`,
        };

      case Agent.Cursor:
        return {
          name: `${fullName}.mdc`,
          content: `---\ndescription: ${description}\nglobs: ["**/*"]\n---\n# Specialist: ${baseName}\n\n${body}`,
        };

      case Agent.Copilot:
        return {
          name: `${fullName}.instructions.md`,
          content: `---\ndescription: "${description}"\napplyTo: "**/*"\n---\n\n${body}`,
        };

      case Agent.OpenCode:
        return {
          name: `${baseName}.md`,
          content: `---\ndescription: "${description}"\nmode: subagent\n---\n\n${body}`,
        };

      case Agent.Gemini:
        return {
          name: `${baseName}.md`,
          content: `---\nname: ${baseName}\ndescription: "${description}"\nkind: local\n---\n\n${body}`,
        };

      case Agent.Kiro:
        return {
          name: `${baseName}.md`,
          content: `---\nname: ${baseName}\ndescription: "${description}"\n---\n\n${body}`,
        };

      case Agent.Codex: // Codex
        return {
          name: `${baseName}.toml`,
          content: `name = "${baseName}"\ndescription = "${description}"\nsandbox_mode = "read-only"\ndeveloper_instructions = """\n${body}\n"""`,
        };

      default:
        return {
          name: `${baseName}${agentDef.ruleExtension || '.md'}`,
          content: body,
        };
    }
  }
}
