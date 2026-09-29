import { SkillConfig } from '../../models/config';
import { RegistryMetadata } from '../../models/types';
import { GithubService } from '../GithubService';

export interface ResolvedSource {
  ref: string;
  commit: string | null;
  pinned: boolean;
}

export interface ResolvedRefs {
  workflows: ResolvedSource;
  specialists: ResolvedSource;
  skills: Record<string, ResolvedSource>;
  newPins: { workflows_ref?: string; specialists_ref?: string };
  warnings: string[];
}

export class RefResolver {
  constructor(
    private github: Pick<GithubService, 'resolveCommit' | 'getRepoInfo'>,
  ) {}

  async resolve(
    config: SkillConfig,
    owner: string,
    repo: string,
    registryMeta: RegistryMetadata | null,
  ): Promise<ResolvedRefs> {
    const warnings: string[] = [];
    const newPins: { workflows_ref?: string; specialists_ref?: string } = {};

    let defaultBranch: string | null = null;
    const getDefaultBranch = async (): Promise<string> => {
      if (!defaultBranch) {
        const info = await this.github.getRepoInfo(owner, repo);
        defaultBranch = info?.default_branch || 'main';
      }
      return defaultBranch;
    };

    // Workflows resolution
    let workflowsRef: string;
    let workflowsPinned: boolean;
    if (config.workflows_ref) {
      workflowsRef = config.workflows_ref;
      workflowsPinned = true;
    } else if (
      registryMeta?.releases?.workflows?.version &&
      registryMeta?.releases?.workflows?.tag_prefix !== undefined
    ) {
      workflowsRef = `${registryMeta.releases.workflows.tag_prefix}${registryMeta.releases.workflows.version}`;
      workflowsPinned = true;
      newPins.workflows_ref = workflowsRef;
    } else {
      const branch = await getDefaultBranch();
      workflowsRef = branch;
      workflowsPinned = false;
      warnings.push(
        `⚠️  Registry publishes no workflows release; using ${branch} (unpinned)`,
      );
    }

    // Specialists resolution
    let specialistsRef: string;
    let specialistsPinned: boolean;
    if (config.specialists_ref) {
      specialistsRef = config.specialists_ref;
      specialistsPinned = true;
    } else if (
      registryMeta?.categories?.specialists?.version &&
      registryMeta?.categories?.specialists?.tag_prefix !== undefined
    ) {
      specialistsRef = `${registryMeta.categories.specialists.tag_prefix}${registryMeta.categories.specialists.version}`;
      specialistsPinned = true;
      newPins.specialists_ref = specialistsRef;
    } else {
      const branch = await getDefaultBranch();
      specialistsRef = branch;
      specialistsPinned = false;
      warnings.push(
        `⚠️  Registry publishes no specialists release; using ${branch} (unpinned)`,
      );
    }

    // Skills map resolution
    const skillCategories = Object.keys(config.skills || {});
    const skillSources: Record<string, { ref: string; pinned: boolean }> = {};
    for (const cat of skillCategories) {
      const entry = config.skills[cat];
      const ref = entry?.ref || 'main';
      skillSources[cat] = {
        ref,
        pinned: Boolean(entry?.ref),
      };
    }

    // Resolve commits concurrently
    const [workflowsCommit, specialistsCommit, ...skillCommits] =
      await Promise.all([
        this.github.resolveCommit(owner, repo, workflowsRef),
        this.github.resolveCommit(owner, repo, specialistsRef),
        ...skillCategories.map((cat) =>
          this.github.resolveCommit(owner, repo, skillSources[cat].ref),
        ),
      ]);

    const skills: Record<string, ResolvedSource> = {};
    skillCategories.forEach((cat, idx) => {
      skills[cat] = {
        ref: skillSources[cat].ref,
        commit: skillCommits[idx],
        pinned: skillSources[cat].pinned,
      };
    });

    return {
      workflows: {
        ref: workflowsRef,
        commit: workflowsCommit,
        pinned: workflowsPinned,
      },
      specialists: {
        ref: specialistsRef,
        commit: specialistsCommit,
        pinned: specialistsPinned,
      },
      skills,
      newPins,
      warnings,
    };
  }
}
