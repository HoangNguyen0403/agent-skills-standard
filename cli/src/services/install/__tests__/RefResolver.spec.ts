import { describe, expect, it, vi } from 'vitest';
import { SkillConfig } from '../../../models/config';
import { RegistryMetadata } from '../../../models/types';
import { GithubService } from '../../GithubService';
import { RefResolver } from '../RefResolver';

describe('RefResolver', () => {
  const baseConfig: SkillConfig = {
    registry: 'https://github.com/owner/repo',
    agents: [],
    skills: {
      typescript: { ref: 'typescript-v1.0.0' },
      common: {},
    },
  };

  const sampleMeta: RegistryMetadata = {
    global: { author: 'test', repository: 'https://github.com/owner/repo' },
    categories: {
      typescript: { version: '1.0.0', tag_prefix: 'typescript-v' },
      specialists: { version: '2.3.0', tag_prefix: 'specialists-v' },
    },
    releases: {
      workflows: { version: '1.2.0', tag_prefix: 'workflows-v' },
    },
  };

  it('honors existing config pins without generating newPins', async () => {
    const config: SkillConfig = {
      ...baseConfig,
      workflows_ref: 'workflows-v0.9.0',
      specialists_ref: 'specialists-v2.0.0',
    };

    const github: Pick<GithubService, 'resolveCommit' | 'getRepoInfo'> = {
      resolveCommit: vi.fn().mockImplementation((_o, _r, ref) => Promise.resolve(`commit-${ref}`)),
      getRepoInfo: vi.fn(),
    };

    const resolver = new RefResolver(github);
    const resolved = await resolver.resolve(config, 'owner', 'repo', sampleMeta);

    expect(resolved.workflows).toEqual({
      ref: 'workflows-v0.9.0',
      commit: 'commit-workflows-v0.9.0',
      pinned: true,
    });
    expect(resolved.specialists).toEqual({
      ref: 'specialists-v2.0.0',
      commit: 'commit-specialists-v2.0.0',
      pinned: true,
    });
    expect(resolved.newPins).toEqual({});
    expect(resolved.warnings).toHaveLength(0);
    expect(github.getRepoInfo).not.toHaveBeenCalled();
  });

  it('resolves latest tags from registry metadata and generates newPins when pins are absent', async () => {
    const github: Pick<GithubService, 'resolveCommit' | 'getRepoInfo'> = {
      resolveCommit: vi.fn().mockImplementation((_o, _r, ref) => Promise.resolve(`commit-${ref}`)),
      getRepoInfo: vi.fn(),
    };

    const resolver = new RefResolver(github);
    const resolved = await resolver.resolve(baseConfig, 'owner', 'repo', sampleMeta);

    expect(resolved.workflows).toEqual({
      ref: 'workflows-v1.2.0',
      commit: 'commit-workflows-v1.2.0',
      pinned: true,
    });
    expect(resolved.specialists).toEqual({
      ref: 'specialists-v2.3.0',
      commit: 'commit-specialists-v2.3.0',
      pinned: true,
    });
    expect(resolved.newPins).toEqual({
      workflows_ref: 'workflows-v1.2.0',
      specialists_ref: 'specialists-v2.3.0',
    });
    expect(resolved.warnings).toHaveLength(0);
  });

  it('falls back to default branch with warnings when releases are missing', async () => {
    const emptyMeta: RegistryMetadata = {
      global: { author: 'test', repository: 'https://github.com/owner/repo' },
      categories: {},
    };

    const github: Pick<GithubService, 'resolveCommit' | 'getRepoInfo'> = {
      resolveCommit: vi.fn().mockResolvedValue('main-commit'),
      getRepoInfo: vi.fn().mockResolvedValue({ default_branch: 'develop' }),
    };

    const resolver = new RefResolver(github);
    const resolved = await resolver.resolve(baseConfig, 'owner', 'repo', emptyMeta);

    expect(resolved.workflows).toEqual({
      ref: 'develop',
      commit: 'main-commit',
      pinned: false,
    });
    expect(resolved.specialists).toEqual({
      ref: 'develop',
      commit: 'main-commit',
      pinned: false,
    });
    expect(resolved.newPins).toEqual({});
    expect(resolved.warnings).toEqual([
      '⚠️  Registry publishes no workflows release; using develop (unpinned)',
      '⚠️  Registry publishes no specialists release; using develop (unpinned)',
    ]);
  });

  it('handles null resolveCommit without throwing and sets commit to null', async () => {
    const github: Pick<GithubService, 'resolveCommit' | 'getRepoInfo'> = {
      resolveCommit: vi.fn().mockResolvedValue(null),
      getRepoInfo: vi.fn().mockResolvedValue(null),
    };

    const resolver = new RefResolver(github);
    const resolved = await resolver.resolve(baseConfig, 'owner', 'repo', null);

    expect(resolved.workflows.commit).toBeNull();
    expect(resolved.specialists.commit).toBeNull();
    expect(resolved.skills.typescript.commit).toBeNull();
    expect(resolved.workflows.ref).toBe('main'); // fallback when getRepoInfo returns null
    expect(resolved.workflows.pinned).toBe(false);
  });

  it('builds skills map from config respecting ref presence', async () => {
    const github: Pick<GithubService, 'resolveCommit' | 'getRepoInfo'> = {
      resolveCommit: vi.fn().mockResolvedValue('commit-sha'),
      getRepoInfo: vi.fn().mockResolvedValue(null),
    };

    const resolver = new RefResolver(github);
    const resolved = await resolver.resolve(baseConfig, 'owner', 'repo', sampleMeta);

    expect(resolved.skills).toEqual({
      typescript: {
        ref: 'typescript-v1.0.0',
        commit: 'commit-sha',
        pinned: true,
      },
      common: {
        ref: 'main',
        commit: 'commit-sha',
        pinned: false,
      },
    });
  });
});
