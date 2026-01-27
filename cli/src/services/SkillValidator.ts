import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';
import pc from 'picocolors';

interface SkillValidationResult {
  file: string;
  errors: string[];
  warnings: string[];
  passed: boolean;
}

interface ValidationSummary {
  total: number;
  passed: number;
  failed: number;
  warnings: number;
}

export class SkillValidator {
  private results: SkillValidationResult[] = [];

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

  async validateAllSkills(
    validateAll: boolean = false,
  ): Promise<ValidationSummary> {
    const rootDir = this.findProjectRoot();
    const skillsDir = path.join(rootDir, 'skills');

    if (!(await fs.pathExists(skillsDir))) {
      throw new Error(`skills/ directory not found (searched at ${skillsDir})`);
    }

    // Find SKILL.md files
    let skillFiles: string[];
    if (validateAll) {
      skillFiles = await this.findSkillFiles(skillsDir);
      console.log(
        pc.blue(`🔍 Found ${skillFiles.length} skills to validate\n`),
      );
    } else {
      skillFiles = await this.findChangedSkillFiles();
      console.log(
        pc.blue(`🔍 Found ${skillFiles.length} changed skills to validate\n`),
      );
    }

    for (const skillFile of skillFiles) {
      const result = await this.validateSkill(skillFile);
      this.results.push(result);

      if (result.passed) {
        console.log(pc.green(`✅ ${result.file}`));
        if (result.warnings.length > 0) {
          result.warnings.forEach((warning) =>
            console.log(pc.yellow(`  ⚠️  ${warning}`)),
          );
        }
      } else {
        console.log(pc.red(`❌ ${result.file}`));
        result.errors.forEach((error) => console.log(pc.red(`  ❌ ${error}`)));
      }
    }

    // Validate metadata.json
    await this.validateMetadata();

    return this.generateSummary();
  }

  private async findSkillFiles(skillsDir: string): Promise<string[]> {
    const skillFiles: string[] = [];

    const findRecursive = async (dir: string) => {
      const items = await fs.readdir(dir);

      for (const item of items) {
        const fullPath = path.join(dir, item);
        const stat = await fs.stat(fullPath);

        if (stat.isDirectory()) {
          await findRecursive(fullPath);
        } else if (item === 'SKILL.md') {
          skillFiles.push(fullPath);
        }
      }
    };

    try {
      await findRecursive(skillsDir);
    } catch (error) {
      if (process.env.DEBUG) {
        console.warn(
          `Failed to scan skills directory: ${error instanceof Error ? error.message : String(error)}`,
        );
      }
    }
    return skillFiles;
  }

  private async findChangedSkillFiles(): Promise<string[]> {
    const rootDir = this.findProjectRoot();
    try {
      let gitCommand: string;

      // In CI (GitHub Actions), compare against the base branch
      if (process.env.GITHUB_BASE_REF) {
        // Ensure the base branch is fetched
        try {
          execSync(`git fetch origin ${process.env.GITHUB_BASE_REF} --depth=1`);
        } catch {
          // Fallback if fetch fails
        }
        gitCommand = `git diff --name-only origin/${process.env.GITHUB_BASE_REF}...HEAD`;
      } else {
        // Local development: compare against HEAD
        gitCommand = 'git diff --name-only HEAD';
      }

      const gitOutput = execSync(gitCommand, {
        cwd: rootDir,
        encoding: 'utf8',
      });
      const changedFiles = gitOutput
        .split('\n')
        .filter((line) => line.trim() !== '')
        .filter((file) => fs.existsSync(path.join(rootDir, file)));

      // Filter for SKILL.md files in skills directory
      const changedSkillFiles = changedFiles
        .filter(
          (file: string) =>
            file.startsWith('skills/') && file.endsWith('SKILL.md'),
        )
        .map((file: string) => path.join(rootDir, file));

      // Also include untracked SKILL.md files
      const untrackedOutput = execSync(
        'git ls-files --others --exclude-standard',
        { cwd: rootDir, encoding: 'utf8' },
      );
      const untrackedFiles = untrackedOutput
        .split('\n')
        .filter((line) => line.trim() !== '');
      const untrackedSkillFiles = untrackedFiles
        .filter(
          (file: string) =>
            file.startsWith('skills/') && file.endsWith('SKILL.md'),
        )
        .map((file: string) => path.join(rootDir, file));

      return [...changedSkillFiles, ...untrackedSkillFiles];
    } catch (error) {
      console.warn(
        pc.yellow(`⚠️  Could not determine changed files, ${error}`),
      );
      return [];
    }
  }

  private async validateSkill(
    skillFile: string,
  ): Promise<SkillValidationResult> {
    const rootDir = this.findProjectRoot();
    const result: SkillValidationResult = {
      file: path.relative(rootDir, skillFile),
      errors: [],
      warnings: [],
      passed: true,
    };

    try {
      const content = await fs.readFile(skillFile, 'utf8');

      // Check file size (500 lines max)
      const lines = content.split('\n');
      if (lines.length > 500) {
        result.errors.push(
          `SKILL.md too large (${lines.length} lines > 500 limit)`,
        );
        result.passed = false;
      }

      // Check frontmatter
      const frontmatterMatch = content.match(
        /^---\n([\s\S]*?)\n---\n([\s\S]*)$/,
      );
      if (!frontmatterMatch) {
        result.errors.push('Missing or invalid frontmatter');
        result.passed = false;
        return result;
      }

      const frontmatter = frontmatterMatch[1];
      const body = frontmatterMatch[2];

      // Validate required frontmatter fields
      if (!frontmatter.includes('name:')) {
        result.errors.push('Missing "name" field in frontmatter');
        result.passed = false;
      }

      if (!frontmatter.includes('description:')) {
        result.errors.push('Missing "description" field in frontmatter');
        result.passed = false;
      } else {
        // Check description length
        const descMatch = frontmatter.match(/description:\s*(.+)/);
        if (descMatch && descMatch[1].length > 200) {
          result.errors.push(
            `Description too long (${descMatch[1].length} chars > 200 limit)`,
          );
          result.passed = false;
        }
      }

      // Check for conversational style in instructions (ignoring code blocks)
      const bodyLines = body.split('\n');
      let isInCodeBlock = false;
      let hasConversationalStyle = false;

      for (const line of bodyLines) {
        if (line.trim().startsWith('```')) {
          isInCodeBlock = !isInCodeBlock;
          continue;
        }
        if (isInCodeBlock) continue;

        // Target bullet points and numbered lists that start with conversational phrases
        const conversationalPatterns =
          /^(?:\s*[-*+]\s*|\s*\d+\.\s*)(?:you should|please|let's|we can|I recommend)/i;
        if (conversationalPatterns.test(line)) {
          hasConversationalStyle = true;
          break;
        }
      }

      if (hasConversationalStyle) {
        result.warnings.push(
          'Consider using imperative mood instead of conversational style in instructions',
        );
      }

      // Check for proper priority format
      if (!body.includes('## **Priority:')) {
        result.errors.push('Missing priority section');
        result.passed = false;
      }

      // Check directory structure
      const skillDir = path.dirname(skillFile);
      await this.validateSkillDirectory(skillDir, result);
    } catch (error) {
      result.errors.push(
        `Failed to read or validate file: ${error instanceof Error ? error.message : error}`,
      );
      result.passed = false;
    }

    return result;
  }

  private async validateSkillDirectory(
    skillDir: string,
    result: SkillValidationResult,
  ): Promise<void> {
    // Check scripts directory
    const scriptsDir = path.join(skillDir, 'scripts');
    if (await fs.pathExists(scriptsDir)) {
      const scriptFiles = await fs.readdir(scriptsDir);
      for (const file of scriptFiles) {
        const ext = path.extname(file);
        if (!['.py', '.js', '.ts', '.sh'].includes(ext)) {
          result.warnings.push(`Script without standard extension: ${file}`);
        }
      }
    }

    // Check references directory
    const refsDir = path.join(skillDir, 'references');
    if (await fs.pathExists(refsDir)) {
      const refFiles = await fs.readdir(refsDir);
      const mdFiles = refFiles.filter((f) => f.endsWith('.md'));
      if (mdFiles.length === 0) {
        result.warnings.push(
          'References directory exists but contains no .md files',
        );
      }
    }
  }

  private async validateMetadata(): Promise<void> {
    const rootDir = this.findProjectRoot();
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
        type CategoryConfig = {
          version?: string;
          tag_prefix?: string;
          [key: string]: unknown;
        };
        const catConfig = config as CategoryConfig;

        if (!catConfig.version) {
          throw new Error(
            `Category "${category}" missing version in metadata.json`,
          );
        }

        if (!catConfig.tag_prefix) {
          throw new Error(
            `Category "${category}" missing tag_prefix in metadata.json`,
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

  private normalizePath(p: string): string {
    return path.relative(this.findProjectRoot(), p).replace(/\\/g, '/');
  }

  private findProjectRoot(): string {
    let currentDir = process.cwd();
    while (currentDir !== path.parse(currentDir).root) {
      if (
        fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml')) ||
        fs.existsSync(path.join(currentDir, '.git'))
      ) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
    return process.cwd();
  }
}
