import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';
import {
  optionalSkillFieldsSchema,
  validateRiskTierNeedsPermissions,
} from '../../schemas/skill-frontmatter';
import { RuleResult, ValidationRule } from './types';

/**
 * Enforces a maximum line count for skill files to ensure token efficiency.
 */
export class SizeRule implements ValidationRule {
  name = 'Size Limit';
  constructor(private maxLines: number = 100) {}

  async validate(content: string): Promise<RuleResult> {
    const lines = content.split('\n');
    if (lines.length > this.maxLines) {
      return {
        passed: false,
        errors: [
          `SKILL.md too large (${lines.length} lines > ${this.maxLines} limit)`,
        ],
        warnings: [],
      };
    }
    return { passed: true, errors: [], warnings: [] };
  }
}

/**
 * Validates frontmatter presence, required fields, and — for any of the
 * optional Universal-Skill-Format fields a skill chooses to declare
 * (version, risk_tier, allowed-tools, permissions, content_hash, signature)
 * — their shape, via cli/src/schemas/skill-frontmatter.ts.
 *
 * Uses a real YAML parse (`yaml.load`) rather than substring `includes()`
 * checks, so e.g. a body line that happens to contain the text `name:`
 * cannot be mistaken for the frontmatter field, and a malformed YAML block
 * is reported instead of silently passing.
 */
export class FrontmatterRule implements ValidationRule {
  name = 'Frontmatter';

  async validate(content: string): Promise<RuleResult> {
    const result: RuleResult = { passed: true, errors: [], warnings: [] };
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) {
      return {
        passed: false,
        errors: ['Missing or invalid frontmatter'],
        warnings: [],
      };
    }

    let parsed: unknown;
    try {
      parsed = yaml.load(frontmatterMatch[1]);
    } catch {
      return {
        passed: false,
        errors: ['Invalid YAML frontmatter'],
        warnings: [],
      };
    }

    const fm = (parsed && typeof parsed === 'object' ? parsed : {}) as Record<
      string,
      unknown
    >;

    if (typeof fm.name !== 'string' || fm.name.length === 0) {
      result.errors.push('Missing "name" field in frontmatter');
      result.passed = false;
    }

    if (typeof fm.description !== 'string' || fm.description.length === 0) {
      result.errors.push('Missing "description" field in frontmatter');
      result.passed = false;
    } else if (fm.description.length > 1024) {
      result.errors.push(
        `Description too long (${fm.description.length} chars > 1024 limit)`,
      );
      result.passed = false;
    } else if (fm.description.length > 300) {
      result.warnings.push(
        `Description is ${fm.description.length} chars (> 300); trim for _INDEX.md readability`,
      );
    }

    const optionalParse = optionalSkillFieldsSchema.safeParse(fm);
    if (!optionalParse.success) {
      for (const issue of optionalParse.error.issues) {
        result.errors.push(`${issue.path.join('.')}: ${issue.message}`);
      }
      result.passed = false;
    } else {
      const tierWarning = validateRiskTierNeedsPermissions(optionalParse.data);
      if (tierWarning) result.warnings.push(tierWarning);
    }

    return result;
  }
}

/**
 * Recommends imperative mood over conversational style.
 */
export class InstructionsStyleRule implements ValidationRule {
  name = 'Instruction Style';

  async validate(content: string): Promise<RuleResult> {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
    const body = frontmatterMatch ? frontmatterMatch[2] : content;
    const bodyLines = body.split('\n');
    let isInCodeBlock = false;
    let hasConversationalStyle = false;

    const conversationalPatterns =
      /^(?:\s*[-*+]\s*|\s*\d+\.\s*)(?:you should|please|let's|we can|I recommend)/i;

    for (const line of bodyLines) {
      if (line.trim().startsWith('```')) {
        isInCodeBlock = !isInCodeBlock;
        continue;
      }
      if (isInCodeBlock) continue;

      if (conversationalPatterns.test(line)) {
        hasConversationalStyle = true;
        break;
      }
    }

    if (hasConversationalStyle) {
      return {
        passed: true,
        errors: [],
        warnings: [
          'Consider using imperative mood instead of conversational style in instructions',
        ],
      };
    }

    return { passed: true, errors: [], warnings: [] };
  }
}

/**
 * Canonical priority label per tier, enforced by PriorityRule.
 */
const CANONICAL_PRIORITY_LABELS: Record<string, string> = {
  P0: 'CRITICAL',
  P1: 'HIGH',
  P2: 'MEDIUM',
  P3: 'LOW',
};

/**
 * Ensures the mandatory priority section is present and, once `labelSeverity`
 * is 'error', that its label matches the canonical vocabulary.
 */
export class PriorityRule implements ValidationRule {
  name = 'Priority Section';

  constructor(private labelSeverity: 'warning' | 'error' = 'warning') {}

  async validate(content: string): Promise<RuleResult> {
    const result: RuleResult = { passed: true, errors: [], warnings: [] };
    const match = content.match(
      /^## \*\*Priority:\s*(P\d)(?:\s*\(([^)]*)\))?([^\n]*)\*\*/m,
    );

    if (!match) {
      return {
        passed: false,
        errors: ['Missing priority section'],
        warnings: [],
      };
    }

    const [, tier, label, trailing] = match;
    const canonicalLabel = CANONICAL_PRIORITY_LABELS[tier];

    if (!canonicalLabel) {
      result.errors.push(`Unknown priority tier "${tier}"`);
      result.passed = false;
      return result;
    }

    const isCanonical = label === canonicalLabel && !trailing?.trim();
    if (!isCanonical) {
      const message = `Priority label must be "${tier} (${canonicalLabel})"`;
      if (this.labelSeverity === 'error') {
        result.errors.push(message);
        result.passed = false;
      } else {
        result.warnings.push(message);
      }
    }

    return result;
  }
}

/**
 * Ensures every skill is routable: at least one file glob or keyword trigger.
 */
export class TriggersRule implements ValidationRule {
  name = 'Triggers';

  async validate(content: string): Promise<RuleResult> {
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
    if (!frontmatterMatch) {
      // FrontmatterRule already reports missing frontmatter.
      return { passed: true, errors: [], warnings: [] };
    }

    let parsed: unknown;
    try {
      parsed = yaml.load(frontmatterMatch[1]);
    } catch {
      return {
        passed: false,
        errors: ['Invalid YAML frontmatter'],
        warnings: [],
      };
    }

    const triggers = (
      parsed as {
        metadata?: { triggers?: { files?: unknown; keywords?: unknown } };
      }
    )?.metadata?.triggers;
    const files = Array.isArray(triggers?.files) ? triggers.files : [];
    const keywords = Array.isArray(triggers?.keywords) ? triggers.keywords : [];

    if (files.length === 0 && keywords.length === 0) {
      return {
        passed: false,
        errors: [
          'Skill is unroutable: metadata.triggers must define at least one files glob or keywords entry',
        ],
        warnings: [],
      };
    }

    return { passed: true, errors: [], warnings: [] };
  }
}

/**
 * Validates the directory structure surrounding the skill file.
 */
export class DirectoryStructureRule implements ValidationRule {
  name = 'Directory Structure';

  async validate(_content: string, filePath: string): Promise<RuleResult> {
    const result: RuleResult = { passed: true, errors: [], warnings: [] };
    const skillDir = path.dirname(filePath);

    // Check scripts
    const scriptsDir = path.join(skillDir, 'scripts');
    if (await fs.pathExists(scriptsDir)) {
      const scriptFiles = await fs.readdir(scriptsDir);
      for (const file of scriptFiles) {
        if (!['.py', '.js', '.ts', '.sh'].includes(path.extname(file))) {
          result.warnings.push(`Script without standard extension: ${file}`);
        }
      }
    }

    // Check references
    const refsDir = path.join(skillDir, 'references');
    if (await fs.pathExists(refsDir)) {
      const refFiles = await fs.readdir(refsDir);
      if (refFiles.filter((f) => f.endsWith('.md')).length === 0) {
        result.warnings.push(
          'References directory exists but contains no .md files',
        );
      }
    }

    return result;
  }
}
