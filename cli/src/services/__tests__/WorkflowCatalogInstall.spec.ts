import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import { Agent } from '../../constants';
import { SkillConfig } from '../../models/config';
import { CollectedSkill } from '../../models/types';
import {
  LOCKFILE_NAME,
  sha256,
  type ManifestEntry,
  type WorkflowCatalog,
} from '../LockfileService';
import { SyncService } from '../SyncService';
import type { WorkflowAcquisition } from '../WorkflowSyncService';

interface CatalogLock {
  entries: Record<string, ManifestEntry>;
  workflowCatalog: WorkflowCatalog;
}

const DEV_FIX_RAW =
  '---\ndescription: Unified bug fixing procedure\n---\n# Dev Fix\nStep 1: Reproduce.\n';

const PLAN_FEATURE_RAW =
  '---\ndescription: Feature planning workflow\n---\n# Plan Feature\nStep 1: PRD.\n';

const CANONICAL_DEV_FIX = '.agents/workflows/dev-fix.md';
const CANONICAL_PLAN_FEATURE = '.agents/workflows/plan-feature.md';
const CLAUDE_DEV_FIX = '.claude/commands/dev-fix.md';
const CODEX_DEV_FIX = '.codex/skills/dev-fix/SKILL.md';

function workflowFixture(name: string, content: string): CollectedSkill {
  return {
    category: '.agents',
    skill: 'workflows',
    files: [{ name: `${name}.md`, content }],
  };
}

const devFix = workflowFixture('dev-fix', DEV_FIX_RAW);
const planFeature = workflowFixture('plan-feature', PLAN_FEATURE_RAW);

function complete(workflows: CollectedSkill[]): WorkflowAcquisition {
  return { status: 'complete', workflows, failures: [] };
}

describe('WorkflowCatalogInstall', () => {
  let syncService: SyncService;
  let tempDir: string;
  let originalCwd: string;

  function makeConfig(overrides: Partial<SkillConfig> = {}): SkillConfig {
    return {
      registry: 'https://github.com/example/repo',
      agents: [Agent.Claude],
      skills: {},
      workflows: ['dev-fix'],
      workflows_ref: 'workflows-v1.0.0',
      custom_overrides: [],
      ...overrides,
    };
  }

  async function runSync(
    config: SkillConfig,
    workflows: CollectedSkill[],
    acquisition: WorkflowAcquisition,
  ) {
    await syncService.beginInstall(config, { dryRun: false, force: [] });
    await syncService.writeWorkflows(workflows, config);
    return syncService.completeInstall(config, {
      skills: [],
      workflows,
      specialistsOk: true,
      workflowAcquisition: acquisition,
    });
  }

  async function readLock(): Promise<CatalogLock> {
    // The lock is written by the production writer under test; its schema is
    // the contract asserted here.
    const raw: unknown = await fs.readJson(path.join(tempDir, LOCKFILE_NAME));
    return raw as CatalogLock;
  }

  beforeEach(async () => {
    originalCwd = process.cwd();
    tempDir = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-catalog-test-'));
    process.chdir(tempDir);
    syncService = new SyncService();
  });

  afterEach(async () => {
    process.chdir(originalCwd);
    await fs.remove(tempDir);
  });

  it('provider-only install writes the canonical body once and records agreeing canonical/native digests', async () => {
    const config = makeConfig({ agents: [Agent.Claude] });
    await runSync(config, [devFix], complete([devFix]));

    const canonicalPath = path.join(tempDir, CANONICAL_DEV_FIX);
    const nativePath = path.join(tempDir, CLAUDE_DEV_FIX);

    expect(await fs.readFile(canonicalPath, 'utf8')).toBe(DEV_FIX_RAW);

    const lock = await readLock();
    expect(lock.workflowCatalog.version).toBe(1);

    const entry = lock.workflowCatalog.workflows['dev-fix'];
    expect(entry.path).toBe(CANONICAL_DEV_FIX);
    expect(entry.digest).toBe(sha256(DEV_FIX_RAW));
    expect(entry.registry).toBe(config.registry);
    expect(entry.requestedRef).toBe('workflows-v1.0.0');
    expect(entry.resolvedCommit).toBeNull();

    const nativeBytes = await fs.readFile(nativePath);
    expect(entry.nativeBindings).toHaveLength(1);
    expect(entry.nativeBindings[0]).toMatchObject({
      agent: Agent.Claude,
      path: CLAUDE_DEV_FIX,
      outputDigest: sha256(nativeBytes),
      canonicalDigest: entry.digest,
    });

    // Ownership entries stay authoritative and reference the canonical body.
    expect(lock.entries[CANONICAL_DEV_FIX]).toMatchObject({
      owner: 'workflow',
      source: 'workflow:dev-fix',
      sha256: sha256(DEV_FIX_RAW),
    });
  });

  it('writes a shared canonical/native path once while recording every provider binding', async () => {
    const config = makeConfig({ agents: [Agent.Antigravity, Agent.Kiro] });
    const plan = await runSync(config, [devFix], complete([devFix]));

    expect(plan.added).toEqual([CANONICAL_DEV_FIX]);

    const lock = await readLock();
    const bindings = lock.workflowCatalog.workflows['dev-fix'].nativeBindings;
    expect(bindings.map((b: { agent: string }) => b.agent)).toEqual([
      Agent.Antigravity,
      Agent.Kiro,
    ]);
    expect(bindings.map((b: { path: string }) => b.path)).toEqual([
      CANONICAL_DEV_FIX,
      CANONICAL_DEV_FIX,
    ]);
    expect(bindings[0].outputDigest).toBe(bindings[1].outputDigest);
  });

  it('removed selected workflows prune owned canonical and native outputs', async () => {
    const firstConfig = makeConfig({
      agents: [Agent.Claude],
      workflows: ['dev-fix', 'plan-feature'],
    });
    await runSync(
      firstConfig,
      [devFix, planFeature],
      complete([devFix, planFeature]),
    );

    const secondConfig = makeConfig({
      agents: [Agent.Claude],
      workflows: ['dev-fix'],
    });
    const plan = await runSync(secondConfig, [devFix], complete([devFix]));

    expect(
      await fs.pathExists(path.join(tempDir, CANONICAL_PLAN_FEATURE)),
    ).toBe(false);
    expect(
      await fs.pathExists(
        path.join(tempDir, '.claude/commands/plan-feature.md'),
      ),
    ).toBe(false);
    expect(plan.pruned).toContain(CANONICAL_PLAN_FEATURE);

    const lock = await readLock();
    expect(lock.workflowCatalog.workflows['plan-feature']).toBeUndefined();
    expect(lock.entries[CANONICAL_PLAN_FEATURE]).toBeUndefined();
    expect(await fs.pathExists(path.join(tempDir, CANONICAL_DEV_FIX))).toBe(
      true,
    );
  });

  it('a deliberate empty selection prunes owned workflows', async () => {
    const firstConfig = makeConfig({ workflows: ['dev-fix'] });
    await runSync(firstConfig, [devFix], complete([devFix]));

    const disabledConfig = makeConfig({ workflows: [] });
    const plan = await runSync(disabledConfig, [], {
      status: 'disabled',
      workflows: [],
      failures: [],
    });

    expect(plan.pruned).toContain(CANONICAL_DEV_FIX);
    expect(plan.pruned).toContain(CLAUDE_DEV_FIX);
    expect(await fs.pathExists(path.join(tempDir, CANONICAL_DEV_FIX))).toBe(
      false,
    );

    const lock = await readLock();
    expect(lock.workflowCatalog?.workflows?.['dev-fix']).toBeUndefined();
  });

  it('partial acquisition never authorizes absence-based pruning and retains prior provenance', async () => {
    const config = makeConfig({ workflows: ['dev-fix', 'plan-feature'] });
    await runSync(
      config,
      [devFix, planFeature],
      complete([devFix, planFeature]),
    );

    const before = await readLock();
    const plan = await runSync(config, [devFix], {
      status: 'incomplete',
      workflows: [devFix],
      failures: [{ path: CANONICAL_PLAN_FEATURE, reason: 'download failed' }],
    });

    expect(plan.pruned).toEqual([]);
    expect(
      await fs.pathExists(path.join(tempDir, CANONICAL_PLAN_FEATURE)),
    ).toBe(true);
    expect(
      await fs.pathExists(
        path.join(tempDir, '.claude/commands/plan-feature.md'),
      ),
    ).toBe(true);

    const lock = await readLock();
    expect(lock.entries[CANONICAL_PLAN_FEATURE]).toEqual(
      before.entries[CANONICAL_PLAN_FEATURE],
    );
    expect(lock.workflowCatalog.workflows['plan-feature']).toEqual(
      before.workflowCatalog.workflows['plan-feature'],
    );
  });

  it('a user-edited canonical body is kept and is not certified as the newly requested revision', async () => {
    await runSync(makeConfig(), [devFix], complete([devFix]));

    const canonicalPath = path.join(tempDir, CANONICAL_DEV_FIX);
    await fs.writeFile(canonicalPath, 'user-authored edit');

    const bumped = makeConfig({ workflows_ref: 'workflows-v2.0.0' });
    const plan = await runSync(bumped, [devFix], complete([devFix]));

    expect(await fs.readFile(canonicalPath, 'utf8')).toBe('user-authored edit');
    expect(plan.kept).toContain(CANONICAL_DEV_FIX);

    const lock = await readLock();
    // The edited body is a conflict: no managed catalog entry, and the prior
    // ownership digest is retained rather than re-stamped as v2.
    expect(lock.workflowCatalog.workflows['dev-fix']).toBeUndefined();
    expect(lock.entries[CANONICAL_DEV_FIX].sha256).toBe(sha256(DEV_FIX_RAW));
  });

  it('a user-edited native export is not published as an aligned binding', async () => {
    await runSync(makeConfig(), [devFix], complete([devFix]));

    const nativePath = path.join(tempDir, CLAUDE_DEV_FIX);
    const firstNativeBytes = await fs.readFile(nativePath);
    const first = await readLock();
    const generated =
      first.workflowCatalog.workflows['dev-fix'].nativeBindings[0];

    await fs.writeFile(nativePath, 'user-edited native export');

    const plan = await runSync(makeConfig(), [devFix], complete([devFix]));

    expect(plan.kept).toContain(CLAUDE_DEV_FIX);

    const lock = await readLock();
    const entry = lock.workflowCatalog.workflows['dev-fix'];
    // The deterministic output digest is known, but the actual bytes no longer
    // match it, so the binding must not be published as aligned.
    expect(entry.nativeBindings).toEqual([]);
    expect(entry.nativeConflicts).toEqual([
      { agent: Agent.Claude, path: CLAUDE_DEV_FIX },
    ]);
    expect(generated.outputDigest).toBe(sha256(firstNativeBytes));

    const actual = await fs.readFile(nativePath);
    expect(sha256(actual)).not.toBe(generated.outputDigest);
    expect(lock.entries[CLAUDE_DEV_FIX].sha256).toBe(generated.outputDigest);
  });

  it('keeps verified providers from certifying parity when another configured provider conflicts', async () => {
    const config = makeConfig({ agents: [Agent.Claude, Agent.Codex] });
    await runSync(config, [devFix], complete([devFix]));

    const nativePath = path.join(tempDir, CLAUDE_DEV_FIX);
    await fs.writeFile(nativePath, 'user-edited native export');

    await runSync(config, [devFix], complete([devFix]));

    const lock = await readLock();
    const entry = lock.workflowCatalog.workflows['dev-fix'];
    expect(entry.nativeBindings.map((b: { agent: string }) => b.agent)).toEqual(
      [Agent.Codex],
    );
    expect(entry.nativeBindings[0].path).toBe(CODEX_DEV_FIX);
    expect(entry.nativeConflicts).toEqual([
      { agent: Agent.Claude, path: CLAUDE_DEV_FIX },
    ]);
  });

  it('an unowned authored canonical file is preserved and excluded from the managed catalog', async () => {
    const canonicalPath = path.join(tempDir, CANONICAL_DEV_FIX);
    await fs.outputFile(canonicalPath, 'consumer-authored workflow');

    const plan = await runSync(makeConfig(), [devFix], complete([devFix]));

    expect(await fs.readFile(canonicalPath, 'utf8')).toBe(
      'consumer-authored workflow',
    );
    expect(plan.unknown).toContain(CANONICAL_DEV_FIX);
    expect(await fs.pathExists(path.join(tempDir, CLAUDE_DEV_FIX))).toBe(true);

    const lock = await readLock();
    expect(lock.workflowCatalog?.workflows?.['dev-fix']).toBeUndefined();
  });

  it('an explicit custom override at the canonical path is preserved and not certified', async () => {
    const canonicalPath = path.join(tempDir, CANONICAL_DEV_FIX);
    await fs.outputFile(canonicalPath, 'overridden workflow');
    const config = makeConfig({
      custom_overrides: [CANONICAL_DEV_FIX],
    });

    await runSync(config, [devFix], complete([devFix]));

    expect(await fs.readFile(canonicalPath, 'utf8')).toBe(
      'overridden workflow',
    );
    const lock = await readLock();
    expect(lock.workflowCatalog?.workflows?.['dev-fix']).toBeUndefined();
  });

  it('prunes a removed agent native export but keeps the shared canonical body', async () => {
    const dualConfig = makeConfig({
      agents: [Agent.Claude, Agent.Codex],
    });
    await runSync(dualConfig, [devFix], complete([devFix]));

    const claudeOnly = makeConfig({ agents: [Agent.Claude] });
    const plan = await runSync(claudeOnly, [devFix], complete([devFix]));

    expect(plan.pruned).toContain(CODEX_DEV_FIX);
    expect(plan.pruned).not.toContain(CANONICAL_DEV_FIX);
    expect(await fs.pathExists(path.join(tempDir, CODEX_DEV_FIX))).toBe(false);
    expect(await fs.pathExists(path.join(tempDir, CANONICAL_DEV_FIX))).toBe(
      true,
    );

    const lock = await readLock();
    expect(lock.workflowCatalog.workflows['dev-fix']).toBeDefined();
    const bindingPaths: string[] = lock.workflowCatalog.workflows[
      'dev-fix'
    ].nativeBindings.map((b: { path: string }) => b.path);
    expect(bindingPaths).not.toContain(CODEX_DEV_FIX);
    expect(bindingPaths).toContain(CLAUDE_DEV_FIX);
  });
});
