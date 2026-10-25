import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  assertAdmittedIdentity,
  assertSafeAccountEnvironmentKey,
  OmpSdkExecutor,
} from '../OmpSdkExecutor';
import { validateModelEndpoint } from '../OmpWorkerScript';
import {
  computeRuntimeManifestDigest,
  createRuntimeManifest,
} from '../RuntimeManifest';
import {
  Attempt,
  canonicalDigest,
  ExecutionContext,
  FleetAccount,
  FleetRuntimeConfig,
  FleetTask,
  HarnessBundle,
} from '../RuntimeTypes';

const workerAssetFixture = vi.hoisted(() => ({ path: '' }));

vi.mock('../RunnerAssets', async (importOriginal) => {
  const actual = (await importOriginal()) as {
    WORKER_ASSET_ID: string;
  } & Record<string, unknown>;
  return {
    ...actual,
    resolveWorkerAssetPath: async () => workerAssetFixture.path,
    readWorkerAsset: async () => {
      const [nodeFs, crypto] = await Promise.all([
        import('fs-extra'),
        import('crypto'),
      ]);
      const stat = await nodeFs.lstat(workerAssetFixture.path);
      return {
        id: actual.WORKER_ASSET_ID,
        path: workerAssetFixture.path,
        sha256: crypto
          .createHash('sha256')
          .update(await nodeFs.readFile(workerAssetFixture.path))
          .digest('hex'),
        bytes: stat.size,
      };
    },
  };
});

const IMAGE = `ags-runtime-worker@sha256:${'a'.repeat(64)}`;
const NODE_SHEBANG = `#!${process.execPath}`;

const VERSION_SCRIPT = `${NODE_SHEBANG}
process.stdout.write('tool 22.0.0\\n');
`;

interface ExecutorFixture {
  root: string;
  runtime: FleetRuntimeConfig;
  executor: OmpSdkExecutor;
  stateDir: string;
  context: ExecutionContext;
  task: FleetTask;
  bundle: HarnessBundle;
  account: FleetAccount;
  spawnLog: string;
  writeBunState: (name: string, content: string) => Promise<void>;
  readSpawnLog: () => Promise<string[]>;
}

function buildTask(): FleetTask {
  const bundle: HarnessBundle = {
    schemaVersion: 1,
    id: 'bundle-base',
    scope: { kind: 'project', key: 'project-1' },
    guidance: 'Keep changes minimal.',
    platforms: ['darwin'],
    ompVersions: ['18.12.6'],
  };
  return {
    schemaVersion: 1,
    id: 'task-1',
    project: {
      hostId: 'host-1',
      projectId: 'project-1',
      rootPath: '/tmp/project-1',
      logicalProjectId: 'host-1:project-1',
    },
    sourceRef: 'HEAD',
    prompt: 'Implement the requested change.',
    replaySafe: true,
    phase: 'train',
    deadlineMs: 600000,
    k: 1,
    baseline: bundle,
    verification: { argv: ['/bin/true'], files: {} },
    toolCallAllowance: 5,
  };
}

async function createExecutorFixture(options?: {
  deadlineOffsetMs?: number;
}): Promise<ExecutorFixture> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-omp-executor-'));
  const packagedWorker = path.join(root, 'packaged', 'OmpWorkerScript.mjs');
  await fs.ensureDir(path.dirname(packagedWorker));
  await fs.copyFile(
    path.resolve(__dirname, '../../../../../dist/OmpWorkerScript.mjs'),
    packagedWorker,
  );
  workerAssetFixture.path = await fs.realpath(packagedWorker);
  const sdkDir = path.join(root, 'sdk');
  const binDir = path.join(root, 'bin');
  const stateDir = path.join(root, 'state');
  const bunState = path.join(binDir, 'bun-state');
  const spawnLog = path.join(root, 'bun-spawn.log');
  const envDump = path.join(root, 'worker-env.json');
  await fs.ensureDir(sdkDir);
  await fs.ensureDir(stateDir, 0o700);
  await fs.ensureDir(bunState);
  await fs.writeFile(spawnLog, '');

  const entryPath = path.join(sdkDir, 'index.js');
  await fs.writeFile(entryPath, 'export const sdk = true;\n');

  const bunScript = `${NODE_SHEBANG}
const fs = require('fs');
const path = require('path');
const stateDir = ${JSON.stringify(bunState)};
const spawnLog = ${JSON.stringify(spawnLog)};
const envDump = ${JSON.stringify(envDump)};
const args = process.argv.slice(2);
const modeIndex = args.findIndex(value => value === '--health' || value === '--job');
const invocation = args[0] === '--version' ? '--version' : args[modeIndex];
fs.appendFileSync(spawnLog, invocation + '\\n');
if (modeIndex >= 0 && (!args.includes('--no-install') || !args.includes('--no-env-file'))) {
  process.stderr.write('missing isolated Bun flags\\n');
  process.exit(9);
}
const read = (name, fallback) => {
  try { return fs.readFileSync(path.join(stateDir, name), 'utf8'); } catch (error) { return fallback; }
};
if (args[0] === '--version') { process.stdout.write('1.3.14\\n'); process.exit(0); }
if (invocation === '--health') {
  const job = JSON.parse(fs.readFileSync(args[modeIndex + 1], 'utf8'));
  const mode = read('health-mode.txt', 'ok');
  if (mode === 'fail') { process.stderr.write('health failed\\n'); process.exit(2); }
  if (mode === 'invalid') { process.stdout.write('{"bogus":true}'); process.exit(0); }
  process.stdout.write(JSON.stringify({
    schemaVersion: 1,
    mode: 'health',
    restrictedSessionInitialized: true,
    activeTools: ['sandbox_exec'],
    allTools: ['sandbox_exec'],
    modelTokens: 0,
    modelPromptSubmitted: false,
    runtimeDigest: job.expectedRuntimeDigest,
  }));
  process.exit(0);
}
if (invocation === '--job') {
  const job = JSON.parse(fs.readFileSync(args[modeIndex + 1], 'utf8'));
  fs.writeFileSync(envDump, JSON.stringify(process.env));
  const mode = read('run-mode.txt', 'ok');
  const checkpoint = (complete, toolCalls, costUsd) => fs.writeFileSync(
    job.usageFilePath,
    JSON.stringify({
      schemaVersion: 1,
      attemptId: job.context.attemptId,
      generation: job.context.generation,
      role: job.context.role,
      runtimeDigest: job.context.runtimeDigest,
      workerPid: process.pid,
      usageNonce: job.usageNonce,
      observedAt: Date.now(),
      toolCalls,
      costUsd,
      complete,
    }),
    { mode: 0o600 },
  );
  const emit = () => {
    if (mode === 'fail') {
      checkpoint(false, 0, null);
      process.stderr.write('worker failed\\n');
      process.exit(3);
    }
    if (mode === 'invalid') {
      checkpoint(false, 0, null);
      process.stdout.write('{');
      process.exit(0);
    }
    let result = {
      schemaVersion: 1,
      mode: 'run',
      attemptId: job.context.attemptId,
      generation: job.context.generation,
      role: job.context.role,
      runtimeDigest: job.expectedRuntimeDigest,
      text: 'done',
      toolCalls: 0,
      costUsd: null,
      transcript: '',
    };
    const override = read('run-result.json', '');
    if (override) { result = JSON.parse(override); }
    checkpoint(mode !== 'incomplete', result.toolCalls, result.costUsd);
    process.stdout.write(JSON.stringify(result));
    process.exit(Number(read('run-exit.txt', '0')));
  };
  const releasePath = job.releaseFilePath;
  const awaitRelease = () => {
    if (fs.existsSync(releasePath)) { emit(); return; }
    setTimeout(awaitRelease, 25);
  };
  awaitRelease();
  return;
}
process.exit(0);
`;
  const bunCommand = path.join(binDir, 'bun');
  await fs.writeFile(bunCommand, bunScript, { mode: 0o755 });
  await fs.chmod(bunCommand, 0o755);
  const nodeCommand = process.execPath;
  const gitCommand = path.join(binDir, 'git');
  const dockerCommand = path.join(binDir, 'docker');
  for (const binary of [gitCommand, dockerCommand]) {
    await fs.writeFile(binary, VERSION_SCRIPT, { mode: 0o755 });
    await fs.chmod(binary, 0o755);
  }

  const result = await createRuntimeManifest({
    nodeCommand,
    bunCommand,
    gitCommand,
    dockerCommand,
    sdkModule: entryPath,
    image: IMAGE,
    ompVersion: '18.12.6',
    manifestFile: path.join(root, 'manifest.json'),
  });
  const manifest = result.manifest;
  const runtime = result.runtime;
  await fs.writeFile(runtime.manifestFile, JSON.stringify(manifest, null, 2));
  await fs.writeFile(spawnLog, '');

  const task = buildTask();
  const deadline = Date.now() + (options?.deadlineOffsetMs ?? 60000);
  const context: ExecutionContext = {
    attemptId: '11111111-1111-4111-8111-111111111111',
    generation: 3,
    role: 'task',
    deadline,
    runtimeDigest: manifest.runtimeDigest,
    stateDir,
  };
  const account: FleetAccount = {
    id: 'acc-1',
    provider: 'anthropic',
    model: 'claude-sonnet-4-5',
    thinking: 'medium',
    environmentKeys: ['ANTHROPIC_API_KEY'],
    allowedDomains: ['personal'],
    allowedProviderEndpoints: ['https://api.anthropic.com/v1'],
  };
  const bundle: HarnessBundle = {
    schemaVersion: 1,
    id: 'bundle-candidate',
    scope: { kind: 'project', key: 'project-1' },
    guidance: 'Add tests.',
    platforms: ['darwin'],
    ompVersions: ['18.12.6'],
  };

  return {
    root,
    runtime,
    executor: new OmpSdkExecutor(runtime),
    stateDir,
    context,
    task,
    bundle,
    account,
    spawnLog,
    writeBunState: async (name, content) => {
      await fs.writeFile(path.join(bunState, name), content);
    },
    readSpawnLog: async () =>
      (await fs.readFile(spawnLog, 'utf8')).split('\n').filter(Boolean),
  };
}

function buildAttempt(
  fixture: ExecutorFixture,
  overrides?: Partial<Attempt>,
): Attempt {
  return {
    id: fixture.context.attemptId,
    taskKey: 'a'.repeat(64),
    projectId: fixture.task.project.projectId,
    hostId: fixture.task.project.hostId,
    accountId: fixture.account.id,
    token: '22222222-2222-4222-8222-222222222222',
    state: 'running',
    deadline: fixture.context.deadline,
    createdAt: Date.now(),
    binding: {
      runId: 'run-1',
      budgetId: 'budget-1',
      taskDigest: canonicalDigest(fixture.task),
      hostId: fixture.task.project.hostId,
      projectId: fixture.task.project.projectId,
      logicalProjectId: fixture.task.project.logicalProjectId,
      domain: 'personal',
      accountId: fixture.account.id,
      provider: fixture.account.provider,
      model: fixture.account.model,
      sourceRevision: 'b'.repeat(40),
      harnessDigest: canonicalDigest(fixture.bundle),
      evaluatorDigest: 'd'.repeat(64),
      runtimeDigest: fixture.context.runtimeDigest,
      policyDigest: 'e'.repeat(64),
      phase: fixture.task.phase,
      stage: 'proposal',
      planDigest: 'f'.repeat(64),
    },
    generation: fixture.context.generation,
    reservedToolCalls: 5,
    ...overrides,
  };
}

describe('OmpSdkExecutor admission, health and worker IPC', () => {
  let roots: string[] = [];

  beforeEach(() => {
    roots = [];
  });

  afterEach(async () => {
    for (const root of roots) {
      await fs.remove(root);
    }
    roots = [];
    workerAssetFixture.path = '';
  });

  it('reports health from the real shipped worker asset and never spawns on closure drift', async () => {
    const fixture = await createExecutorFixture();
    roots.push(fixture.root);

    const healthy = await fixture.executor.health();
    expect(healthy.supported).toBe(true);
    expect(await fixture.readSpawnLog()).toContain('--health');

    const driftFixture = await createExecutorFixture();
    roots.push(driftFixture.root);
    await fs.writeFile(
      path.join(driftFixture.root, 'sdk', 'index.js'),
      'export const sdk = "drifted";\n',
    );
    const drifted = await driftFixture.executor.health();
    expect(drifted.supported).toBe(false);
    expect(drifted.reasonCodes).toContain('SDK_MODULE_HASH_MISMATCH');
    expect(await driftFixture.readSpawnLog()).not.toContain('--health');
  });

  it('rejects health probes that fail or return an invalid envelope', async () => {
    const failing = await createExecutorFixture();
    roots.push(failing.root);
    await failing.writeBunState('health-mode.txt', 'fail');
    const failed = await failing.executor.health();
    expect(failed.supported).toBe(false);
    expect(failed.reasonCodes).toContain('HEALTH_PROBE_FAILED');

    const invalid = await createExecutorFixture();
    roots.push(invalid.root);
    await invalid.writeBunState('health-mode.txt', 'invalid');
    const invalidResult = await invalid.executor.health();
    expect(invalidResult.supported).toBe(false);
    expect(invalidResult.reasonCodes).toContain('HEALTH_PROBE_INVALID_RESULT');
  });

  it('rejects a manifest that redirects the worker asset before spawning', async () => {
    const fixture = await createExecutorFixture();
    roots.push(fixture.root);
    const manifest = JSON.parse(
      await fs.readFile(fixture.runtime.manifestFile, 'utf8'),
    );
    manifest.assets.worker.path = path.join(
      fixture.root,
      'untrusted-worker.mjs',
    );
    manifest.runtimeDigest = computeRuntimeManifestDigest(manifest);
    fixture.runtime.manifestDigest = manifest.runtimeDigest;
    await fs.writeFile(
      fixture.runtime.manifestFile,
      JSON.stringify(manifest, null, 2),
    );

    const health = await fixture.executor.health();
    expect(health.supported).toBe(false);
    expect(health.reasonCodes).toContain('WORKER_ASSET_PATH_MISMATCH');
    expect(await fixture.readSpawnLog()).not.toContain('--health');
  });

  it('validates admitted attempt, context, deadline and allowance before spawning', async () => {
    const fixture = await createExecutorFixture();
    roots.push(fixture.root);
    const attempt = buildAttempt(fixture);

    expect(() =>
      assertAdmittedIdentity({
        attempt: { ...attempt, id: '33333333-3333-4333-8333-333333333333' },
        context: fixture.context,
        task: fixture.task,
        bundle: fixture.bundle,
        account: fixture.account,
        maxToolCalls: 2,
      }),
    ).toThrow(/ADMISSION_IDENTITY_MISMATCH/);

    expect(() =>
      assertAdmittedIdentity({
        attempt: { ...attempt, generation: 4 },
        context: fixture.context,
        task: fixture.task,
        bundle: fixture.bundle,
        account: fixture.account,
        maxToolCalls: 2,
      }),
    ).toThrow(/ADMISSION_IDENTITY_MISMATCH/);

    expect(() =>
      assertAdmittedIdentity({
        attempt: { ...attempt, deadline: fixture.context.deadline + 1000 },
        context: fixture.context,
        task: fixture.task,
        bundle: fixture.bundle,
        account: fixture.account,
        maxToolCalls: 2,
      }),
    ).toThrow(/ADMISSION_IDENTITY_MISMATCH/);

    expect(() =>
      assertAdmittedIdentity({
        attempt: {
          ...attempt,
          binding: { ...attempt.binding, runtimeDigest: '9'.repeat(64) },
        },
        context: fixture.context,
        task: fixture.task,
        bundle: fixture.bundle,
        account: fixture.account,
        maxToolCalls: 2,
      }),
    ).toThrow(/ADMISSION_RUNTIME_MISMATCH/);

    expect(() =>
      assertAdmittedIdentity({
        attempt: {
          ...attempt,
          binding: { ...attempt.binding, taskDigest: '8'.repeat(64) },
        },
        context: fixture.context,
        task: fixture.task,
        bundle: fixture.bundle,
        account: fixture.account,
        maxToolCalls: 2,
      }),
    ).toThrow(/ADMISSION_TASK_DIGEST_MISMATCH/);

    expect(() =>
      assertAdmittedIdentity({
        attempt: {
          ...attempt,
          binding: { ...attempt.binding, harnessDigest: '7'.repeat(64) },
        },
        context: fixture.context,
        task: fixture.task,
        bundle: fixture.bundle,
        account: fixture.account,
        maxToolCalls: 2,
      }),
    ).toThrow(/ADMISSION_BUNDLE_DIGEST_MISMATCH/);

    expect(() =>
      assertAdmittedIdentity({
        attempt: attempt,
        context: fixture.context,
        task: fixture.task,
        bundle: fixture.bundle,
        account: fixture.account,
        maxToolCalls: 6,
      }),
    ).toThrow(/ADMISSION_ALLOWANCE_EXCEEDED/);

    await expect(
      fixture.executor.run(
        fixture.task,
        fixture.bundle,
        attempt,
        fixture.account,
        fixture.root,
        {
          maxToolCalls: 2,
          context: fixture.context,
        },
      ),
    ).resolves.toBeDefined();
    expect(await fixture.readSpawnLog()).toContain('--job');
  });

  it('rejects expired and pre-aborted executions without spawning', async () => {
    const expired = await createExecutorFixture({ deadlineOffsetMs: -1000 });
    roots.push(expired.root);
    await expect(
      expired.executor.run(
        expired.task,
        expired.bundle,
        buildAttempt(expired),
        expired.account,
        expired.root,
        { maxToolCalls: 2, context: expired.context },
      ),
    ).rejects.toThrow(/DEADLINE_EXCEEDED/);
    expect(await expired.readSpawnLog()).not.toContain('--job');

    const aborted = await createExecutorFixture();
    roots.push(aborted.root);
    const controller = new AbortController();
    controller.abort();
    await expect(
      aborted.executor.run(
        aborted.task,
        aborted.bundle,
        buildAttempt(aborted),
        aborted.account,
        aborted.root,
        {
          maxToolCalls: 2,
          context: aborted.context,
          signal: controller.signal,
        },
      ),
    ).rejects.toThrow(/OMP_WORKER_SIGNAL_ABORTED/);
    expect(await aborted.readSpawnLog()).not.toContain('--job');
  });

  it('returns only the durable lower-bound checkpoint when a final usage receipt is incomplete', async () => {
    const fixture = await createExecutorFixture();
    roots.push(fixture.root);
    await fixture.writeBunState('run-mode.txt', 'incomplete');

    await expect(
      fixture.executor.run(
        fixture.task,
        fixture.bundle,
        buildAttempt(fixture),
        fixture.account,
        fixture.root,
        { maxToolCalls: 2, context: fixture.context },
      ),
    ).rejects.toMatchObject({
      code: 'OMP_WORKER_USAGE_INVALID',
      usage: { complete: false, toolCalls: 0, costUsd: null },
    });
  });

  it('constructs a narrow worker environment and rejects injection keys', async () => {
    const fixture = await createExecutorFixture();
    roots.push(fixture.root);
    process.env.ANTHROPIC_API_KEY = 'test-key';
    process.env.NODE_OPTIONS = '--require evil';
    try {
      const result = await fixture.executor.run(
        fixture.task,
        fixture.bundle,
        buildAttempt(fixture),
        fixture.account,
        fixture.root,
        { maxToolCalls: 2, context: fixture.context },
      );
      expect(result.text).toBe('done');
      const env = JSON.parse(
        await fs.readFile(path.join(fixture.root, 'worker-env.json'), 'utf8'),
      );
      expect(env.AGS_FLEET_WORKER).toBe('1');
      expect(env.ANTHROPIC_API_KEY).toBe('test-key');
      expect(env.NODE_OPTIONS).toBeUndefined();
      expect(env.AWS_EC2_METADATA_DISABLED).toBe('true');
      expect(env.HOME).not.toBe(process.env.HOME);

      expect(() => assertSafeAccountEnvironmentKey('NODE_OPTIONS')).toThrow(
        /UNSAFE_ENVIRONMENT_KEY/,
      );
      expect(() => assertSafeAccountEnvironmentKey('LD_PRELOAD')).toThrow(
        /UNSAFE_ENVIRONMENT_KEY/,
      );
      expect(() => assertSafeAccountEnvironmentKey('HTTPS_PROXY')).toThrow(
        /UNSAFE_ENVIRONMENT_KEY/,
      );
      expect(() => assertSafeAccountEnvironmentKey('OPENAI_BASE_URL')).toThrow(
        /UNSAFE_ENVIRONMENT_KEY/,
      );
      expect(() =>
        assertSafeAccountEnvironmentKey('ANTHROPIC_ENDPOINT'),
      ).toThrow(/UNSAFE_ENVIRONMENT_KEY/);
      expect(() =>
        assertSafeAccountEnvironmentKey('AZURE_OPENAI_ENDPOINT'),
      ).toThrow(/UNSAFE_ENVIRONMENT_KEY/);
      expect(() =>
        assertSafeAccountEnvironmentKey('OPENAI_API_KEY'),
      ).not.toThrow();

      await expect(
        fixture.executor.run(
          fixture.task,
          fixture.bundle,
          buildAttempt(fixture),
          { ...fixture.account, environmentKeys: ['NODE_OPTIONS'] },
          fixture.root,
          { maxToolCalls: 2, context: fixture.context },
        ),
      ).rejects.toThrow(/UNSAFE_ENVIRONMENT_KEY/);
    } finally {
      delete process.env.ANTHROPIC_API_KEY;
      delete process.env.NODE_OPTIONS;
    }
  });

  it('rejects an unparseable worker result envelope', async () => {
    const fixture = await createExecutorFixture();
    roots.push(fixture.root);
    await fixture.writeBunState('run-mode.txt', 'invalid');
    await expect(
      fixture.executor.run(
        fixture.task,
        fixture.bundle,
        buildAttempt(fixture),
        fixture.account,
        fixture.root,
        { maxToolCalls: 2, context: fixture.context },
      ),
    ).rejects.toThrow(/OMP_WORKER_OUTPUT_INVALID/);
  });

  it('rejects a nonzero worker exit with failure classification', async () => {
    const fixture = await createExecutorFixture();
    roots.push(fixture.root);
    await fixture.writeBunState('run-mode.txt', 'fail');
    await expect(
      fixture.executor.run(
        fixture.task,
        fixture.bundle,
        buildAttempt(fixture),
        fixture.account,
        fixture.root,
        { maxToolCalls: 2, context: fixture.context },
      ),
    ).rejects.toThrow(/OMP_WORKER_PROCESS_FAILED/);
  });

  it('rejects a worker result whose identity does not match the attempt', async () => {
    const fixture = await createExecutorFixture();
    roots.push(fixture.root);
    await fixture.writeBunState(
      'run-result.json',
      JSON.stringify({
        schemaVersion: 1,
        mode: 'run',
        attemptId: 'other-attempt',
        generation: fixture.context.generation,
        role: 'task',
        runtimeDigest: fixture.context.runtimeDigest,
        text: 'x',
        toolCalls: 0,
        costUsd: null,
        transcript: '',
      }),
    );
    await expect(
      fixture.executor.run(
        fixture.task,
        fixture.bundle,
        buildAttempt(fixture),
        fixture.account,
        fixture.root,
        { maxToolCalls: 2, context: fixture.context },
      ),
    ).rejects.toThrow(/OMP_WORKER_RESULT_IDENTITY_MISMATCH/);
  });

  it('rejects a worker result that exceeds the admitted tool allowance', async () => {
    const fixture = await createExecutorFixture();
    roots.push(fixture.root);
    await fixture.writeBunState(
      'run-result.json',
      JSON.stringify({
        schemaVersion: 1,
        mode: 'run',
        attemptId: fixture.context.attemptId,
        generation: fixture.context.generation,
        role: 'task',
        runtimeDigest: fixture.context.runtimeDigest,
        text: 'x',
        toolCalls: 3,
        costUsd: null,
        transcript: '',
      }),
    );
    await expect(
      fixture.executor.run(
        fixture.task,
        fixture.bundle,
        buildAttempt(fixture),
        fixture.account,
        fixture.root,
        { maxToolCalls: 2, context: fixture.context },
      ),
    ).rejects.toMatchObject({ code: 'OMP_WORKER_RESULT_ALLOWANCE_EXCEEDED' });
  });

  it('denies ambiguous or unauthorized provider endpoints', () => {
    expect(() =>
      validateModelEndpoint({ baseUrl: 'https://api.anthropic.com/v1' }, [
        'https://api.anthropic.com/v1',
      ]),
    ).not.toThrow();

    expect(() =>
      validateModelEndpoint(
        {
          baseUrl: 'https://api.anthropic.com/v1',
          endpoint: 'https://evil.example/v1',
        },
        ['https://api.anthropic.com/v1'],
      ),
    ).toThrow(/UNAUTHORIZED_PROVIDER_ENDPOINT/);

    expect(() =>
      validateModelEndpoint({}, ['https://api.anthropic.com/v1']),
    ).toThrow(/UNAUTHORIZED_PROVIDER_ENDPOINT/);

    expect(() =>
      validateModelEndpoint({ baseUrl: 'https://evil.example/v1' }, [
        'https://api.anthropic.com/v1',
      ]),
    ).toThrow(/UNAUTHORIZED_PROVIDER_ENDPOINT/);

    expect(() =>
      validateModelEndpoint({ baseUrl: 'http://api.anthropic.com/v1' }, [
        'https://api.anthropic.com/v1',
      ]),
    ).toThrow(/UNAUTHORIZED_PROVIDER_ENDPOINT/);

    expect(() =>
      validateModelEndpoint(
        { baseUrl: 'https://user:secret@api.anthropic.com/v1' },
        ['https://user:secret@api.anthropic.com/v1'],
      ),
    ).toThrow(/UNAUTHORIZED_PROVIDER_ENDPOINT/);

    expect(() =>
      validateModelEndpoint(
        {
          baseUrl: 'https://api.anthropic.com/v1?redirect=https://evil.example',
        },
        ['https://api.anthropic.com/v1'],
      ),
    ).toThrow(/UNAUTHORIZED_PROVIDER_ENDPOINT/);
  });
});
