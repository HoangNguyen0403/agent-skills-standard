import { beforeEach, describe, expect, it, vi, type Mock } from 'vitest';
import { SkillConfig } from '../../models/config';
import { WorkflowSyncService } from '../WorkflowSyncService';
import type { GithubService } from '../GithubService';
import type { ManifestVerifier } from '../install/ManifestVerifier';

describe('WorkflowSyncService.acquireWorkflows', () => {
  let service: WorkflowSyncService;
  let github: {
    getRepoTree: Mock;
    downloadFilesConcurrent: Mock;
  };

  const devFixPath = '.agents/workflows/dev-fix.md';
  const planFeaturePath = '.agents/workflows/plan-feature.md';

  function makeConfig(workflows: SkillConfig['workflows']): SkillConfig {
    return {
      registry: 'https://github.com/owner/repo',
      agents: [],
      skills: {},
      workflows,
    };
  }

  beforeEach(() => {
    github = {
      getRepoTree: vi.fn(),
      downloadFilesConcurrent: vi.fn(),
    };
    // Only the two acquisition calls are exercised; the rest of the network
    // surface is deliberately absent.
    service = new WorkflowSyncService(github as unknown as GithubService);
    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  it('reports a deliberate disabled selection when workflows are disabled', async () => {
    const result = await service.acquireWorkflows(makeConfig(false));

    expect(result.status).toBe('disabled');
    expect(result.workflows).toEqual([]);
    expect(github.getRepoTree).not.toHaveBeenCalled();
  });

  it('reports a deliberate empty selection when the workflow list is empty', async () => {
    const result = await service.acquireWorkflows(makeConfig([]));

    expect(result.status).toBe('disabled');
    expect(result.workflows).toEqual([]);
    expect(github.downloadFilesConcurrent).not.toHaveBeenCalled();
  });

  it('reports an incomplete result when discovery fails', async () => {
    github.getRepoTree.mockResolvedValue(null);

    const result = await service.acquireWorkflows(makeConfig(['dev-fix']));

    expect(result.status).toBe('incomplete');
    expect(result.workflows).toEqual([]);
  });

  it('retains successful downloads and reports failures as incomplete, never complete', async () => {
    github.getRepoTree.mockResolvedValue({
      tree: [
        { path: devFixPath, sha: 'a' },
        { path: planFeaturePath, sha: 'b' },
      ],
    });
    github.downloadFilesConcurrent.mockResolvedValue({
      ok: [{ path: devFixPath, content: '# Dev Fix\nbody' }],
      failed: [{ path: planFeaturePath, reason: 'download failed' }],
    });

    const result = await service.acquireWorkflows(
      makeConfig(['dev-fix', 'plan-feature']),
    );

    expect(result.status).toBe('incomplete');
    expect(result.failures).toEqual([
      { path: planFeaturePath, reason: 'download failed' },
    ]);
    const files = result.workflows.flatMap((w) => w.files.map((f) => f.name));
    expect(files).toEqual(['dev-fix.md']);
  });

  it('reports integrity rejection as incomplete instead of a partial success', async () => {
    github.getRepoTree.mockResolvedValue({
      tree: [{ path: devFixPath, sha: 'a' }],
    });
    github.downloadFilesConcurrent.mockResolvedValue({
      ok: [{ path: devFixPath, content: '# Dev Fix\nbody' }],
      failed: [],
    });
    const verifier = {
      check: () => 'digest mismatch',
    } as unknown as ManifestVerifier;

    const result = await service.acquireWorkflows(
      makeConfig(['dev-fix']),
      'main',
      verifier,
    );

    expect(result.status).toBe('incomplete');
    expect(result.workflows).toEqual([]);
    expect(result.failures).toEqual([
      { path: devFixPath, reason: 'digest mismatch' },
    ]);
  });

  it('treats a successfully discovered empty registry as a complete empty set', async () => {
    github.getRepoTree.mockResolvedValue({ tree: [] });

    const result = await service.acquireWorkflows(makeConfig(true));

    expect(result.status).toBe('complete');
    expect(result.workflows).toEqual([]);
    expect(result.failures).toEqual([]);
  });

  it('treats a selected workflow absent from a complete tree as a complete removal', async () => {
    github.getRepoTree.mockResolvedValue({
      tree: [{ path: devFixPath, sha: 'a' }],
    });
    github.downloadFilesConcurrent.mockResolvedValue({ ok: [], failed: [] });

    const result = await service.acquireWorkflows(makeConfig(['removed-flow']));

    expect(result.status).toBe('complete');
    expect(result.workflows).toEqual([]);
    expect(result.failures).toEqual([]);
  });
});
