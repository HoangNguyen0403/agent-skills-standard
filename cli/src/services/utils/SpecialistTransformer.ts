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
 * Codex is the only target with a native least-privilege primitive
 * (sandbox_mode). L2/L3 map to workspace-write; danger-full-access is never
 * auto-granted regardless of declared risk_tier — that always requires
 * explicit user configuration outside the sync pipeline.
 */
function sandboxModeFor(riskTier: unknown): 'read-only' | 'workspace-write' {
  return riskTier === 'L2' || riskTier === 'L3'
    ? 'workspace-write'
    : 'read-only';
}

/** Summarizes whichever of risk_tier/allowed-tools/permissions a specialist declared, for a warning comment. */
function summarizeDeclaredPermissions(
  metadata: Record<string, unknown>,
): string | null {
  const parts: string[] = [];
  if (metadata.risk_tier) parts.push(`risk_tier: ${metadata.risk_tier}`);
  if (metadata['allowed-tools']) {
    parts.push(`allowed-tools: ${JSON.stringify(metadata['allowed-tools'])}`);
  }
  if (metadata.permissions) {
    parts.push(`permissions: ${JSON.stringify(metadata.permissions)}`);
  }
  return parts.length > 0 ? parts.join('; ') : null;
}

/**
 * For platforms with no way to express a declared risk_tier/permissions/
 * allowed-tools, prepend a visible warning rather than silently dropping
 * the declaration — a persona authored as restricted for one platform
 * should not read as unconstrained everywhere else without at least a
 * trace of what was intended.
 */
function unenforceableWarningComment(
  metadata: Record<string, unknown>,
  agentName: string,
): string {
  const declared = summarizeDeclaredPermissions(metadata);
  if (!declared) return '';
  return `<!-- ags: permissions not enforceable on ${agentName}; declared: ${declared} -->\n`;
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
        const allowedTools = metadata['allowed-tools'];
        if (metadata.tools) {
          fm.tools = Array.isArray(metadata.tools)
            ? metadata.tools.join(', ')
            : metadata.tools;
        } else if (Array.isArray(allowedTools) && allowedTools.length > 0) {
          // Project the Universal-Skill-Format field onto Claude's native shape.
          fm.tools = allowedTools.join(', ');
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
          content: `${unenforceableWarningComment(metadata, 'Cursor')}---\n${dumpFrontmatter({ description, globs: ['**/*'] })}\n---\n# Specialist: ${baseName}\n\n${body}`,
        };

      case Agent.Copilot:
        return {
          name: `${fullName}.instructions.md`,
          content: `${unenforceableWarningComment(metadata, 'Copilot')}---\n${dumpFrontmatter({ description, applyTo: '**/*' })}\n---\n\n${body}`,
        };

      case Agent.OpenCode:
        return {
          name: `${baseName}.md`,
          content: `${unenforceableWarningComment(metadata, 'OpenCode')}---\n${dumpFrontmatter({ description, mode: 'subagent' })}\n---\n\n${body}`,
        };

      case Agent.Gemini:
        return {
          name: `${baseName}.md`,
          content: `${unenforceableWarningComment(metadata, 'Gemini')}---\n${dumpFrontmatter({ name: baseName, description, kind: 'local' })}\n---\n\n${body}`,
        };

      case Agent.Kiro:
        return {
          name: `${baseName}.md`,
          content: `${unenforceableWarningComment(metadata, 'Kiro')}---\n${dumpFrontmatter({ name: baseName, description })}\n---\n\n${body}`,
        };

      case Agent.Codex: {
        // Codex uses TOML, not YAML — escape separately. sandbox_mode is a
        // real least-privilege primitive; allowed-tools/permissions.network/
        // permissions.filesystem have no TOML equivalent here, so those are
        // called out in a plain '#' comment instead of silently dropped.
        const sandboxMode = sandboxModeFor(metadata.risk_tier);
        const unenforceable: string[] = [];
        if (metadata['allowed-tools']) unenforceable.push('allowed-tools');
        const permissions = metadata.permissions as
          | { network?: unknown; filesystem?: unknown }
          | undefined;
        if (permissions?.network) unenforceable.push('permissions.network');
        if (permissions?.filesystem) {
          unenforceable.push('permissions.filesystem');
        }
        const comment =
          unenforceable.length > 0
            ? `# ags: ${unenforceable.join(', ')} declared but not enforceable via Codex TOML (only sandbox_mode is projected)\n`
            : '';
        return {
          name: `${baseName}.toml`,
          content: `${comment}name = "${escapeTomlString(baseName)}"\ndescription = "${escapeTomlString(description)}"\nsandbox_mode = "${sandboxMode}"\ndeveloper_instructions = """\n${escapeTomlString(body)}\n"""`,
        };
      }

      default:
        return {
          name: `${baseName}${agentDef.ruleExtension || '.md'}`,
          content: `${unenforceableWarningComment(metadata, agentDef.name)}${body}`,
        };
    }
  }
}
