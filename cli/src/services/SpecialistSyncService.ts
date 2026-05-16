import fs from 'fs-extra';
import path from 'path';
import pc from 'picocolors';
import { Agent, SUPPORTED_AGENTS } from '../constants';
import { SkillConfig } from '../models/config';
import { CollectedSkill } from '../models/types';
import { GithubService } from './GithubService';
import { SpecialistTransformer } from './utils/SpecialistTransformer';

/**
 * Service responsible for syncing specialist skills from the internal registry
 * to native agent configuration directories.
 */
export class SpecialistSyncService {
  constructor(private githubService = new GithubService(process.env.GITHUB_TOKEN)) {}

  async assembleSpecialists(config: SkillConfig): Promise<CollectedSkill[]> {
    const githubMatch = GithubService.parseGitHubUrl(config.registry);
    if (!githubMatch) return [];

    const { owner, repo } = githubMatch;
    const ref =
      (await this.githubService.getRepoInfo(owner, repo))?.default_branch ||
      'main';
    const treeData = await this.githubService.getRepoTree(owner, repo, ref);
    if (!treeData) return [];

    const skillFiles = treeData.tree.filter(
      (item) =>
        item.type === 'blob' &&
        item.path.startsWith('skills/specialists/') &&
        item.path.endsWith('/SKILL.md'),
    );

    const specialists: CollectedSkill[] = [];
    for (const file of skillFiles) {
      const parts = file.path.split('/');
      const specialistName = parts[2];
      if (!specialistName) continue;

      const content = await this.githubService.getRawFile(
        owner,
        repo,
        ref,
        file.path,
      );
      if (!content) continue;

      specialists.push({
        category: 'specialists',
        skill: specialistName,
        files: [{ name: 'SKILL.md', content }],
      });
    }

    return specialists;
  }

  async syncCollectedSpecialists(
    rootDir: string,
    agents: Agent[],
    specialists: CollectedSkill[],
  ): Promise<void> {
    if (specialists.length === 0) return;

    for (const agentId of agents) {
      const agentDef = SUPPORTED_AGENTS.find((a) => a.id === agentId);
      if (!agentDef || !agentDef.agentPath) continue;

      const targetDir = path.join(rootDir, agentDef.agentPath);
      await fs.ensureDir(targetDir);

      let syncedCount = 0;
      for (const specialist of specialists) {
        const skillFile = specialist.files.find((file) => file.name === 'SKILL.md');
        if (!skillFile) continue;

        const transformed = SpecialistTransformer.transform(
          { name: specialist.skill, content: skillFile.content },
          agentId,
        );
        if (!transformed) continue;

        await fs.outputFile(
          path.join(targetDir, transformed.name),
          transformed.content,
        );
        syncedCount++;
      }

      if (syncedCount > 0) {
        console.log(
          pc.green(
            `  ✅ ${syncedCount} specialists synced to ${agentDef.agentPath}/ (${agentDef.name})`,
          ),
        );
      }
    }
  }

  /**
   * Syncs all specialists from a source directory to active agents.
   * @param rootDir Project root directory
   * @param agents List of agents to sync for
   * @param sourceDir Optional custom source directory for specialists
   */
  async syncSpecialists(
    rootDir: string,
    agents: Agent[],
    sourceDir?: string,
  ): Promise<void> {
    const specialistsDir =
      sourceDir || path.join(rootDir, 'skills/specialists');
    if (!(await fs.pathExists(specialistsDir))) return;

    const specialistFolders = (await fs.readdir(specialistsDir)).filter((f) => {
      return fs.statSync(path.join(specialistsDir, f)).isDirectory();
    });

    const collected: CollectedSkill[] = [];
    for (const folder of specialistFolders) {
      const skillPath = path.join(specialistsDir, folder, 'SKILL.md');
      if (!(await fs.pathExists(skillPath))) continue;

      const content = await fs.readFile(skillPath, 'utf8');
      collected.push({
        category: 'specialists',
        skill: folder,
        files: [{ name: 'SKILL.md', content }],
      });
    }

    return this.syncCollectedSpecialists(rootDir, agents, collected);
  }
}
