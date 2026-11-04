import fs from 'fs-extra';
import path from 'path';
import pc from 'picocolors';
import { Agent, SUPPORTED_AGENTS } from '../constants';
import { SkillConfig } from '../models/config';
import { CollectedSkill } from '../models/types';
import { GithubService, IntegrityError } from './GithubService';
import { SpecialistTransformer } from './utils/SpecialistTransformer';
import { InstallWriter, PassthroughWriter } from './install/OwnershipWriter';
import { ManifestVerifier } from './install/ManifestVerifier';

/**
 * Service responsible for syncing specialist skills from the internal registry
 * to native agent configuration directories.
 */
export type SpecialistAcquisitionStatus = 'complete' | 'incomplete';

export interface SpecialistAcquisitionFailure {
  path: string;
  reason: string;
}

/**
 * Explicit outcome of specialist acquisition. `incomplete` must never be
 * treated as "no specialists are desired": publication and pruning are only
 * authorized by a complete acquisition.
 */
export interface SpecialistAcquisition {
  status: SpecialistAcquisitionStatus;
  specialists: CollectedSkill[];
  failures: SpecialistAcquisitionFailure[];
}

export class SpecialistSyncService {
  constructor(
    private githubService = new GithubService(process.env.GITHUB_TOKEN),
  ) {}

  /**
   * Acquires every remote specialist, reporting whether the selected set is
   * complete. Fetches are bound to `commit` when the caller resolved one, so a
   * tag that moved after resolution cannot supply different bytes.
   */
  async acquireSpecialists(
    config: SkillConfig,
    ref: string = 'main',
    verifier?: ManifestVerifier,
    commit?: string,
  ): Promise<SpecialistAcquisition> {
    const githubMatch = GithubService.parseGitHubUrl(config.registry);
    if (!githubMatch) {
      return {
        status: 'incomplete',
        specialists: [],
        failures: [
          {
            path: 'registry',
            reason: `Unsupported registry URL '${config.registry}'.`,
          },
        ],
      };
    }

    const { owner, repo } = githubMatch;
    const treeOptions = commit ? { commit } : undefined;
    if (verifier && commit) {
      // A manifest for another commit cannot verify this source, even when the
      // bytes happen to be identical: refuse before any acquisition.
      const rejection = verifier.checkSourceCommit(commit);
      if (rejection)
        throw new IntegrityError(`specialists@${ref}: ${rejection}`);
    }
    const treeData = await this.githubService.getRepoTree(
      owner,
      repo,
      ref,
      treeOptions,
    );
    if (!treeData) {
      return {
        status: 'incomplete',
        specialists: [],
        failures: [
          {
            path: 'specialists',
            reason: `Failed to fetch specialists@${ref}.`,
          },
        ],
      };
    }

    const skillFiles = treeData.tree.filter(
      (item) =>
        item.type === 'blob' &&
        item.path.startsWith('skills/specialists/') &&
        item.path.endsWith('/SKILL.md'),
    );

    const specialists: CollectedSkill[] = [];
    const failures: SpecialistAcquisitionFailure[] = [];
    for (const file of skillFiles) {
      const parts = file.path.split('/');
      const specialistName = parts[2];
      if (!specialistName) {
        failures.push({
          path: file.path,
          reason: 'specialist directory name is missing',
        });
        continue;
      }

      const content = await this.githubService.getRawFile(
        owner,
        repo,
        ref,
        file.path,
        {
          expectedSha: file.sha,
          ...(commit ? { commit } : {}),
        },
      );
      if (!content) {
        failures.push({ path: file.path, reason: 'download failed' });
        continue;
      }

      const rejection = verifier?.check(file.path, content);
      if (rejection) {
        // Explicit manifest verification failure is an integrity failure, not
        // an incomplete selection: never publish a partial package.
        throw new IntegrityError(`${file.path}: ${rejection}`);
      }
      specialists.push({
        category: 'specialists',
        skill: specialistName,
        files: [{ name: 'SKILL.md', content }],
      });
    }

    return {
      status: failures.length > 0 ? 'incomplete' : 'complete',
      specialists,
      failures,
    };
  }

  async writeSpecialists(
    rootDir: string,
    agents: Agent[],
    specialists: CollectedSkill[],
    writer: InstallWriter = new PassthroughWriter(rootDir),
  ): Promise<number> {
    if (specialists.length === 0) return 0;

    for (const agentId of agents) {
      const agentDef = SUPPORTED_AGENTS.find((a) => a.id === agentId);
      if (!agentDef || !agentDef.agentPath) continue;

      const targetDir = path.join(rootDir, agentDef.agentPath);
      let syncedCount = 0;
      for (const specialist of specialists) {
        const skillFile = specialist.files.find(
          (file) => file.name === 'SKILL.md',
        );
        if (!skillFile) continue;

        const transformed = SpecialistTransformer.transform(
          { name: specialist.skill, content: skillFile.content },
          agentId,
        );
        if (!transformed) continue;

        await writer.write(
          path.join(targetDir, transformed.name),
          transformed.content,
          {
            owner: 'specialist',
            source: `specialist:${specialist.skill}`,
            agent: agentId,
          },
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
    return specialists.length;
  }

  /**
   * Reads every specialist from a project-local source directory. This is a
   * local acquisition with no network I/O; the caller publishes the result
   * through `writeSpecialists` after the shared preflight gates.
   */
  async readLocalSpecialists(sourceDir: string): Promise<CollectedSkill[]> {
    if (!(await fs.pathExists(sourceDir))) return [];

    const specialistFolders = (await fs.readdir(sourceDir)).filter((f) => {
      return fs.statSync(path.join(sourceDir, f)).isDirectory();
    });

    const collected: CollectedSkill[] = [];
    for (const folder of specialistFolders) {
      const skillPath = path.join(sourceDir, folder, 'SKILL.md');
      if (!(await fs.pathExists(skillPath))) continue;

      const content = await fs.readFile(skillPath, 'utf8');
      collected.push({
        category: 'specialists',
        skill: folder,
        files: [{ name: 'SKILL.md', content }],
      });
    }

    return collected;
  }
}
