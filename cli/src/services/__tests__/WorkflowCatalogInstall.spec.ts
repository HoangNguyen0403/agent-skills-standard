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

const REPO_ROOT = path.resolve(__dirname, '../../../..');
const PRIOR_WORKFLOW_FIXTURE = path.join(
  __dirname,
  'fixtures',
  'brainstorm-feature.pre-refactor.md',
);
const PRIOR_WORKFLOW_SHA256 =
  '68168c26fa1ab3faeb12626cff819240d78643643c67cbcb63153aa2b25633f6';

/** Real candidate bytes from this checkout, not a placeholder fixture. */
function repoWorkflow(name: string): string {
  return fs.readFileSync(
    path.join(REPO_ROOT, '.agents', 'workflows', `${name}.md`),
    'utf8',
  );
}

function repoDecisionDisciplineSkill(): CollectedSkill {
  const packageRoot = path.join(
    REPO_ROOT,
    'skills',
    'common',
    'common-decision-discipline',
  );
  return {
    category: 'common',
    skill: 'common-decision-discipline',
    files: ['SKILL.md', 'references/explore-facilitation.md'].map((name) => ({
      name,
      content: fs.readFileSync(path.join(packageRoot, name), 'utf8'),
    })),
  };
}

const BRAINSTORM_LAYOUTS = [
  {
    provider: Agent.Claude,
    packagePath: '.claude/skills/common/common-decision-discipline',
  },
  {
    provider: Agent.Codex,
    packagePath: '.codex/skills/common/common-decision-discipline',
  },
  {
    provider: Agent.Kiro,
    packagePath: '.kiro/skills/common-common-decision-discipline',
  },
] as const;


/** Checked-in predecessor bytes; no git history or network dependency. */
function priorWorkflow(): string {
  const content = fs.readFileSync(PRIOR_WORKFLOW_FIXTURE, 'utf8');
  if (sha256(content) !== PRIOR_WORKFLOW_SHA256) {
    throw new Error('predecessor workflow fixture digest mismatch');
  }
  return content;
}

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

  it.each(BRAINSTORM_LAYOUTS)(
    'installs the brainstorm workflow and facilitation resource for $provider',
    async ({ provider, packagePath }) => {
      const config = makeConfig({
        agents: [provider],
        skills: { common: { ref: 'common-v1' } },
        workflows: ['brainstorm'],
      });
      const skill = repoDecisionDisciplineSkill();
      const workflows = [workflowFixture('brainstorm', repoWorkflow('brainstorm'))];

      await syncService.beginInstall(config, { dryRun: false, force: [] });
      await syncService.writeSkills([skill], config);
      await syncService.writeWorkflows(workflows, config);
      await syncService.completeInstall(config, {
        skills: [skill],
        workflows,
        specialistsOk: true,
        workflowAcquisition: complete(workflows),
      });

      const installedWorkflow = await fs.readFile(
        path.join(tempDir, '.agents/workflows/brainstorm.md'),
        'utf8',
      );
      expect(installedWorkflow).toContain('references/explore-facilitation.md');
      expect(installedWorkflow).toContain(
        packagePath.endsWith('/common-common-decision-discipline')
          ? 'common-common-decision-discipline'
          : 'common/common-decision-discipline',
      );
      expect(
        await fs.readFile(
          path.join(tempDir, packagePath, 'references/explore-facilitation.md'),
          'utf8',
        ),
      ).toBe(
        fs.readFileSync(
          path.join(
            REPO_ROOT,
            'skills/common/common-decision-discipline/references/explore-facilitation.md',
          ),
          'utf8',
        ),
      );
      expect(await fs.pathExists(path.join(tempDir, 'skills'))).toBe(false);
    },
  );


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

  it('migrates a real prior default workflow set to sdlc-intake and brainstorm without retaining the retired command', async () => {
    const provenance = await fs.readJson(
      path.join(
        __dirname,
        'fixtures',
        'brainstorm-feature.pre-refactor.provenance.json',
      ),
    );
    expect(provenance).toMatchObject({
      sourcePath: '.agents/workflows/brainstorm-feature.md',
      sourceRevision: 'c679e0032fbebf4eed90db0f2fc4f52541a3f23d',
      sha256: PRIOR_WORKFLOW_SHA256,
    });
    const oldCanonical = '.agents/workflows/brainstorm-feature.md';
    const oldNative = '.claude/commands/brainstorm-feature.md';
    const retired = workflowFixture('brainstorm-feature', priorWorkflow());
    await runSync(
      makeConfig({ workflows: ['brainstorm-feature'] }),
      [retired],
      complete([retired]),
    );
    expect(await fs.pathExists(path.join(tempDir, oldCanonical))).toBe(true);
    expect(await fs.pathExists(path.join(tempDir, oldNative))).toBe(true);

    // A consumer config can still name the retired workflow explicitly; the
    // migrated defaults are added alongside it. Complete acquisition evidence
    // of the retired body is the safe retirement signal, with no alias.
    const sdlcIntake = workflowFixture(
      'sdlc-intake',
      repoWorkflow('sdlc-intake'),
    );
    const brainstorm = workflowFixture(
      'brainstorm',
      repoWorkflow('brainstorm'),
    );
    const migratedConfig = makeConfig({
      workflows: ['brainstorm-feature', 'sdlc-intake', 'brainstorm'],
    });
    const plan = await runSync(
      migratedConfig,
      [sdlcIntake, brainstorm],
      complete([sdlcIntake, brainstorm]),
    );

    expect(plan.pruned).toContain(oldCanonical);
    expect(plan.pruned).toContain(oldNative);
    expect(await fs.pathExists(path.join(tempDir, oldCanonical))).toBe(false);
    expect(await fs.pathExists(path.join(tempDir, oldNative))).toBe(false);
    expect(
      await fs.readFile(
        path.join(tempDir, '.agents/workflows/sdlc-intake.md'),
        'utf8',
      ),
    ).toBe(repoWorkflow('sdlc-intake'));
    expect(
      await fs.readFile(
        path.join(tempDir, '.agents/workflows/brainstorm.md'),
        'utf8',
      ),
    ).toBe(repoWorkflow('brainstorm'));

    const lock = await readLock();
    expect(
      lock.workflowCatalog.workflows['brainstorm-feature'],
    ).toBeUndefined();
    expect(lock.entries[oldCanonical]).toBeUndefined();
    expect(lock.entries[oldNative]).toBeUndefined();
    expect(lock.workflowCatalog.workflows['sdlc-intake'].digest).toBe(
      sha256(repoWorkflow('sdlc-intake')),
    );
    expect(lock.workflowCatalog.workflows['brainstorm'].digest).toBe(
      sha256(repoWorkflow('brainstorm')),
    );
  });

  it('keeps edited retiring canonical and native exports with a visible conflict and no aligned catalog entry', async () => {
    const oldCanonical = '.agents/workflows/brainstorm-feature.md';
    const oldNative = '.claude/commands/brainstorm-feature.md';
    const retired = workflowFixture('brainstorm-feature', priorWorkflow());
    await runSync(
      makeConfig({ workflows: ['brainstorm-feature'] }),
      [retired],
      complete([retired]),
    );

    await fs.writeFile(
      path.join(tempDir, oldCanonical),
      'user-edited retiring canonical',
    );
    await fs.writeFile(
      path.join(tempDir, oldNative),
      'user-edited retiring export',
    );

    const sdlcIntake = workflowFixture(
      'sdlc-intake',
      repoWorkflow('sdlc-intake'),
    );
    const brainstorm = workflowFixture(
      'brainstorm',
      repoWorkflow('brainstorm'),
    );
    const plan = await runSync(
      makeConfig({ workflows: ['sdlc-intake', 'brainstorm'] }),
      [sdlcIntake, brainstorm],
      complete([sdlcIntake, brainstorm]),
    );

    expect(plan.keptOrphans).toContain(oldCanonical);
    expect(plan.keptOrphans).toContain(oldNative);
    expect(plan.pruned).not.toContain(oldCanonical);
    expect(plan.pruned).not.toContain(oldNative);
    expect(await fs.readFile(path.join(tempDir, oldCanonical), 'utf8')).toBe(
      'user-edited retiring canonical',
    );
    expect(await fs.readFile(path.join(tempDir, oldNative), 'utf8')).toBe(
      'user-edited retiring export',
    );

    const lock = await readLock();
    expect(
      lock.workflowCatalog.workflows['brainstorm-feature'],
    ).toBeUndefined();
    expect(lock.entries[oldCanonical]).toBeUndefined();
    expect(lock.entries[oldNative]).toBeUndefined();
    expect(
      lock.workflowCatalog.workflows['sdlc-intake'].nativeBindings,
    ).toHaveLength(1);
    expect(
      lock.workflowCatalog.workflows['brainstorm'].nativeBindings,
    ).toHaveLength(1);
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

  it('a still-selected workflow missing from a successful complete acquisition is pruned with its catalog entry', async () => {
    const config = makeConfig({
      agents: [Agent.Claude],
      workflows: ['dev-fix', 'plan-feature'],
    });
    await runSync(
      config,
      [devFix, planFeature],
      complete([devFix, planFeature]),
    );
    expect(
      (await readLock()).workflowCatalog.workflows['plan-feature'],
    ).toBeDefined();

    // Same selection and same ref: the discovery tree succeeded and no longer
    // advertises plan-feature. A complete empty match is evidence of removal,
    // not an incomplete download.
    const plan = await runSync(config, [devFix], complete([devFix]));

    expect(plan.pruned).toContain(CANONICAL_PLAN_FEATURE);
    expect(plan.pruned).toContain('.claude/commands/plan-feature.md');
    expect(
      await fs.pathExists(path.join(tempDir, CANONICAL_PLAN_FEATURE)),
    ).toBe(false);
    expect(
      await fs.pathExists(
        path.join(tempDir, '.claude/commands/plan-feature.md'),
      ),
    ).toBe(false);
    expect(await fs.pathExists(path.join(tempDir, CANONICAL_DEV_FIX))).toBe(
      true,
    );

    const lock = await readLock();
    expect(lock.entries[CANONICAL_PLAN_FEATURE]).toBeUndefined();
    expect(lock.workflowCatalog.workflows['plan-feature']).toBeUndefined();
    expect(lock.workflowCatalog.workflows['dev-fix']).toBeDefined();
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
