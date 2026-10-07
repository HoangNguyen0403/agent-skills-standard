import fs from 'fs-extra';
import * as yaml from 'js-yaml';
import path from 'path';
import { RuleResult, ValidationRule } from './types';

const FRONTMATTER_RE = /^---\n([\s\S]*?)\n---\n?([\s\S]*)$/;
const SKILL_NAME_RE = /^[a-z0-9]+(-[a-z0-9]+)*$/;
const MAX_NAME_LENGTH = 64;

const pass = (): RuleResult => ({ passed: true, errors: [], warnings: [] });
const fail = (msg: string): RuleResult => ({
  passed: false,
  errors: [msg],
  warnings: [],
});
const warn = (msg: string): RuleResult => ({
  passed: true,
  errors: [],
  warnings: [msg],
});

/** Parses YAML frontmatter; returns null when absent or malformed (FrontmatterRule reports those). */
export function parseFrontmatter(
  content: string,
): Record<string, unknown> | null {
  const match = content.match(FRONTMATTER_RE);
  if (!match) return null;
  try {
    const parsed = yaml.load(match[1]);
    return parsed && typeof parsed === 'object'
      ? (parsed as Record<string, unknown>)
      : null;
  } catch {
    return null;
  }
}

/** agentskills.io: frontmatter `name` must equal the skill directory name. */
export class NameMatchesDirectoryRule implements ValidationRule {
  name = 'Name Matches Directory';
  async validate(content: string, filePath: string): Promise<RuleResult> {
    const fm = parseFrontmatter(content);
    if (!fm || typeof fm.name !== 'string' || fm.name.length === 0)
      return pass();
    const dir = path.basename(path.dirname(filePath));
    return fm.name === dir
      ? pass()
      : fail(
          `Frontmatter name "${fm.name}" must equal directory name "${dir}"`,
        );
  }
}

/** agentskills.io: name pattern and length. */
export class AgentSkillsSpecRule implements ValidationRule {
  name = 'Agent Skills Spec';
  async validate(content: string): Promise<RuleResult> {
    const fm = parseFrontmatter(content);
    if (!fm || typeof fm.name !== 'string' || fm.name.length === 0)
      return pass();
    if (fm.name.length > MAX_NAME_LENGTH) {
      return fail(
        `Skill name is ${fm.name.length} characters (> ${MAX_NAME_LENGTH} limit)`,
      );
    }
    if (!SKILL_NAME_RE.test(fm.name)) {
      return fail(
        `Skill name "${fm.name}" must match ^[a-z0-9]+(-[a-z0-9]+)*$`,
      );
    }
    return pass();
  }
}

const TRIGGER_RE = /\b(use (when|for|this|after|before)|trigger when)\b/i;

/** Descriptions must tell the router when to fire. Warning only (G4). */
export class TriggerPhraseRule implements ValidationRule {
  name = 'Trigger Phrase';
  async validate(content: string): Promise<RuleResult> {
    const fm = parseFrontmatter(content);
    if (!fm || typeof fm.description !== 'string') return pass();
    return TRIGGER_RE.test(fm.description)
      ? pass()
      : warn('Description has no trigger phrase (e.g. "Use when ...")');
  }
}

const LINK_RE = /\[[^\]]*\]\(([^)\s]+)(?:\s+"[^"]*")?\)/g;
const EXTERNAL_RE = /^(https?:|mailto:|#)/;
const FENCE_RE = /```[\s\S]*?```/g;

/** Every relative Markdown link must resolve to an existing file. */
export class ReferenceLinksRule implements ValidationRule {
  name = 'Reference Links';
  async validate(content: string, filePath: string): Promise<RuleResult> {
    const body = content.replace(FENCE_RE, '');
    const dir = path.dirname(filePath);
    const errors: string[] = [];
    for (const match of body.matchAll(LINK_RE)) {
      const target = match[1];
      if (EXTERNAL_RE.test(target)) continue;
      const rel = target.split('#')[0];
      if (!rel) continue;
      if (!(await fs.pathExists(path.resolve(dir, rel))))
        errors.push(`Dead link: ${target}`);
    }
    return { passed: errors.length === 0, errors, warnings: [] };
  }
}

const HARD_CAP_BYTES = 8192; // Codex truncates SKILL.md bodies above 8 KB
const SOFT_CAP_BYTES = 7168;

export class BodySizeRule implements ValidationRule {
  name = 'Body Size';
  async validate(content: string, filePath: string): Promise<RuleResult> {
    const bytes = Buffer.byteLength(content, 'utf8');
    if (bytes <= SOFT_CAP_BYTES) return pass();
    const hasRefs = await fs.pathExists(
      path.join(path.dirname(filePath), 'references'),
    );
    if (bytes > HARD_CAP_BYTES && !hasRefs) {
      return fail(
        `SKILL.md is ${bytes} bytes (> ${HARD_CAP_BYTES} bytes, Codex truncates) with no references/ folder`,
      );
    }
    return warn(
      `SKILL.md is ${bytes} bytes (> ${SOFT_CAP_BYTES} bytes); move detail to references/`,
    );
  }
}
