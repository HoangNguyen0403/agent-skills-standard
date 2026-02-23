import fs from 'fs-extra';
import path from 'path';
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
 * Validates frontmatter presence and required fields.
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

    const frontmatter = frontmatterMatch[1];

    if (!frontmatter.includes('name:')) {
      result.errors.push('Missing "name" field in frontmatter');
      result.passed = false;
    }

    if (!frontmatter.includes('description:')) {
      result.errors.push('Missing "description" field in frontmatter');
      result.passed = false;
    } else {
      const descMatch = frontmatter.match(/description:\s*(.+)/);
      if (descMatch && descMatch[1].length > 200) {
        result.errors.push(
          `Description too long (${descMatch[1].length} chars > 200 limit)`,
        );
        result.passed = false;
      }
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
 * Ensures the mandatory priority section is present.
 */
export class PriorityRule implements ValidationRule {
  name = 'Priority Section';

  async validate(content: string): Promise<RuleResult> {
    if (!content.includes('## **Priority:')) {
      return {
        passed: false,
        errors: ['Missing priority section'],
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
