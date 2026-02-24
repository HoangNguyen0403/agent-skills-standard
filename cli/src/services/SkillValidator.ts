import fs from 'fs-extra';
import path from 'path';
import pc from 'picocolors';
import { GitService } from './GitService';
import { SkillDiscoveryService } from './SkillDiscoveryService';
import {
  DirectoryStructureRule,
  FrontmatterRule,
  InstructionsStyleRule,
  PriorityRule,
  SizeRule,
} from './validation/rules';
import { ValidationRule } from './validation/types';

/**
 * Result of validating a single skill file.
 */
export interface SkillValidationResult {
  /** Relative path to the skill file. */
  file: string;
  /** List of validation error messages. */
  errors: string[];
  /** List of validation warning messages. */
  warnings: string[];
  /** Whether the file passed all mandatory validation rules. */
  passed: boolean;
}

/**
 * Aggregated summary of all validation results.
 */
export interface ValidationSummary {
  /** Total number of skills validated. */
  total: number;
  /** Number of skills that passed validation. */
  passed: number;
  /** Number of skills that failed validation. */
  failed: number;
  /** Cumulative number of warnings across all skills. */
  warnings: number;
}

/**
 * Service for validating skill files (SKILL.md) and repository metadata.
 * Enforces size limits, frontmatter requirements, and imperative instruction style.
 * Uses a Rule Pattern for modular validation.
 */
export class SkillValidator {
  private results: SkillValidationResult[] = [];
  private skillDiscovery = new SkillDiscoveryService();
  private gitService = new GitService();
  private rules: ValidationRule[] = [
    new SizeRule(),
    new FrontmatterRule(),
    new InstructionsStyleRule(),
    new PriorityRule(),
    new DirectoryStructureRule(),
  ];

  /**
   * Runs the complete validation suite.
   * @param validateAll Whether to validate all skills or just changed ones
   * @returns Exit code (0 for success, 1 for failure)
   */
  async run(validateAll: boolean = false): Promise<number> {
    try {
      const summary = await this.validateAllSkills(validateAll);
      this.printSummary(summary);
      return summary.failed > 0 ? 1 : 0;
    } catch (error) {
      console.error(
        pc.red(
          `❌ Validation error: ${error instanceof Error ? error.stack : error}`,
        ),
      );
      return 1;
    }
  }

  /**
   * Validates all identified skill files in the repository.
   * @param validateAll Whether to validate all skills or just changed ones
   * @returns Summary of validation results
   */
  async validateAllSkills(
    validateAll: boolean = false,
  ): Promise<ValidationSummary> {
    const rootDir = this.gitService.findProjectRoot();
    const skillsDir = path.join(rootDir, 'skills');

    if (!(await fs.pathExists(skillsDir))) {
      throw new Error(`skills/ directory not found (searched at ${skillsDir})`);
    }

    const skillFiles = validateAll
      ? await this.skillDiscovery.findAllSkills(skillsDir)
      : await this.skillDiscovery.findChangedSkills();

    console.log(
      pc.blue(
        `🔍 Found ${skillFiles.length} ${validateAll ? '' : 'changed '}skills to validate\n`,
      ),
    );

    for (const skillFile of skillFiles) {
      const result = await this.validateSkill(skillFile);
      this.results.push(result);

      if (result.passed) {
        console.log(pc.green(`✅ ${result.file}`));
        result.warnings.forEach((warning) =>
          console.log(pc.yellow(`  ⚠️  ${warning}`)),
        );
      } else {
        console.log(pc.red(`❌ ${result.file}`));
        result.errors.forEach((error) => console.log(pc.red(`  ❌ ${error}`)));
      }
    }

    await this.validateMetadata(rootDir);

    return this.generateSummary();
  }

  private async validateSkill(
    skillFile: string,
  ): Promise<SkillValidationResult> {
    const rootDir = this.gitService.findProjectRoot();
    const result: SkillValidationResult = {
      file: path.relative(rootDir, skillFile),
      errors: [],
      warnings: [],
      passed: true,
    };

    try {
      const content = await fs.readFile(skillFile, 'utf8');

      for (const rule of this.rules) {
        const ruleResult = await rule.validate(content, skillFile);
        if (!ruleResult.passed) {
          result.passed = false;
        }
        result.errors.push(...ruleResult.errors);
        result.warnings.push(...ruleResult.warnings);
      }
    } catch (error) {
      result.errors.push(
        `Failed to read or validate file: ${error instanceof Error ? error.message : error}`,
      );
      result.passed = false;
    }

    return result;
  }

  private async validateMetadata(rootDir: string): Promise<void> {
    const metadataPath = path.join(rootDir, 'skills', 'metadata.json');

    try {
      if (!(await fs.pathExists(metadataPath))) {
        throw new Error('skills/metadata.json not found');
      }

      const metadata = await fs.readJson(metadataPath);
      if (!metadata.categories) {
        throw new Error('metadata.json missing "categories" field');
      }

      for (const [category, config] of Object.entries(metadata.categories)) {
        const catConfig = config as { version?: string; tag_prefix?: string };

        if (!catConfig.version || !catConfig.tag_prefix) {
          throw new Error(
            `Category "${category}" missing required fields (version, tag_prefix) in metadata.json`,
          );
        }

        console.log(
          pc.green(
            `✅ Category metadata valid: ${category} (v${catConfig.version}, ${catConfig.tag_prefix})`,
          ),
        );
      }
    } catch (error) {
      throw new Error(
        `Metadata validation failed: ${error instanceof Error ? error.message : error}`,
      );
    }
  }

  private generateSummary(): ValidationSummary {
    const summary: ValidationSummary = {
      total: this.results.length,
      passed: 0,
      failed: 0,
      warnings: 0,
    };

    for (const result of this.results) {
      if (result.passed) {
        summary.passed++;
      } else {
        summary.failed++;
      }
      summary.warnings += result.warnings.length;
    }

    return summary;
  }

  printSummary(summary: ValidationSummary): void {
    console.log('\n' + '='.repeat(50));
    console.log(pc.blue('📊 VALIDATION SUMMARY'));
    console.log('='.repeat(50));

    console.log(pc.green(`Passed: ${summary.passed}`));
    console.log(pc.red(`Failed: ${summary.failed}`));

    if (summary.failed > 0) {
      console.log(
        '\n' + pc.red('❌ Validation failed! Please fix the errors above.'),
      );
    } else {
      console.log('\n' + pc.green('✅ All skills passed validation!'));

      if (summary.warnings > 0) {
        console.log(
          pc.yellow(
            `⚠️  ${summary.warnings} warnings found. Consider addressing them for better token efficiency.`,
          ),
        );
      }
    }
  }
}
