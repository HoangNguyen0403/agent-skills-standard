import fs from 'fs-extra';
import inquirer from 'inquirer';
import yaml from 'js-yaml';
import path from 'path';
import pc from 'picocolors';
import {
  Framework,
  SKILL_DETECTION_REGISTRY,
  SUPPORTED_FRAMEWORKS,
} from '../constants';
import { SkillConfig } from '../models/config';
import { GitHubTreeItem } from '../models/types';
import { DetectionService } from '../services/DetectionService';
import { GithubService } from '../services/GithubService';

export class ListSkillsCommand {
  private detectionService = new DetectionService();
  private githubService = new GithubService(process.env.GITHUB_TOKEN);

  async run() {
    const choices = SUPPORTED_FRAMEWORKS.map((f) => ({
      name: f.name,
      value: f.id,
    }));

    const { framework } = await inquirer.prompt([
      {
        type: 'list',
        name: 'framework',
        message: 'Select framework to list available skills for:',
        choices,
        default: choices.find((c) => c.value === Framework.Flutter)?.value,
      },
    ]);

    const projectDeps = await this.detectionService.getProjectDeps();

    console.log(pc.green(`\nAvailable skills for ${framework}:`));

    // Determine registry URL (from .skillsrc or default)
    const defaultRegistry =
      'https://github.com/HoangNguyen0403/agent-skills-standard';
    let registryUrl = defaultRegistry;
    const configPath = path.join(process.cwd(), '.skillsrc');
    if (await fs.pathExists(configPath)) {
      const raw = await fs.readFile(configPath, 'utf8');
      const conf = yaml.load(raw) as SkillConfig | undefined;
      if (conf && conf.registry) registryUrl = conf.registry;
    }

    // Try to fetch the repo tree to list all skills under skills/<framework>/
    let skillFolders: string[] = [];
    try {
      const parsed = this.parseRegistryUrl(registryUrl);
      if (parsed) {
        // We assume 'main' branch if not specified (legacy behavior of fetchRepoTree handled default,
        // but for listing skills, 'main' is a safe default for now or we could fetch repo info)
        // I'll stick to 'main' to keep it simple as in RegistryService refactor.
        const treeResult = await this.githubService.getRepoTree(
          parsed.owner,
          parsed.repo,
          'main',
        );

        if (treeResult && Array.isArray(treeResult.tree)) {
          const allFiles = treeResult.tree || [];
          skillFolders = Array.from(
            new Set(
              allFiles
                .filter((f: GitHubTreeItem) =>
                  f.path.startsWith(`skills/${framework}/`),
                )
                .map((f: GitHubTreeItem) => {
                  const parts = f.path.split('/');
                  return parts[2];
                })
                .filter(Boolean),
            ),
          );
        }
      }
    } catch {
      // ignore network errors and fall back to detection registry
    }

    // Fallback: use detection registry skill ids if we couldn't fetch tree
    const detectSkills = SKILL_DETECTION_REGISTRY[framework] || [];
    if (!skillFolders || skillFolders.length === 0) {
      skillFolders = detectSkills.map((s) => s.id);
    }

    // For each discovered skill, show whether it would be detected (if we have rules)
    for (const skillName of skillFolders.sort()) {
      const detectRule = detectSkills.find((x) => x.id === skillName);
      let mark = pc.yellow('no-rule');
      if (detectRule) {
        const present = detectRule.packages.some((p) => projectDeps.has(p));
        mark = present ? pc.green('detected') : pc.gray('not-detected');
      }
      console.log(`- ${skillName} (${mark})`);
    }

    console.log(
      '\nTip: Use the .skillsrc exclude array to disable/enable sub-skills before running sync.',
    );
  }

  private parseRegistryUrl(registryUrl: string) {
    const m = registryUrl.match(/github\.com\/([^/]+)\/([^/]+)/i);
    if (!m) return null;
    return { owner: m[1], repo: m[2].replace(/\.git$/, '') };
  }
}
