import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import {
  EVALUATION_RECEIPT_FILENAME,
  EVALUATION_VERIFIER_MOUNT,
  getEvaluationVerifierPath,
  getEvaluationWorkspacePath,
  SandboxRunner,
} from '../SandboxRunner';
import { createRuntimeManifest } from '../RuntimeManifest';
import {
  ExecutionContext,
  FleetRuntimeConfig,
  HarnessError,
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
const CONTAINER_ID = 'd'.repeat(64);
const NODE_SHEBANG = `#!${process.execPath}`;

const DOCKER_SCRIPT = `${NODE_SHEBANG}
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'state');
const read = (name, fallback) => {
  try { return fs.readFileSync(path.join(dir, name), 'utf8'); } catch (error) { return fallback; }
};
const args = process.argv.slice(2);
fs.appendFileSync(path.join(dir, 'log.txt'), args.join(' ') + '\\n');
const out = (value) => process.stdout.write(value);
const fail = (message) => { process.stderr.write(message + '\\n'); process.exit(1); };
const cmd = args[0];
if (cmd === '--version') { out('Docker version 27.0.0, build fake\\n'); process.exit(0); }
if (cmd === 'info') { if (read('fail-info.txt', '') === '1') fail('daemon down'); process.exit(0); }
if (cmd === 'create') {
  let name = '';
  const labels = {};
  for (let index = 1; index < args.length; index += 1) {
    if (args[index] === '--name') { name = args[index + 1]; index += 1; }
    else if (args[index] === '--label') {
      const pair = args[index + 1];
      const separator = pair.indexOf('=');
      labels[pair.slice(0, separator)] = pair.slice(separator + 1);
      index += 1;
    }
  }
  const id = read('create-id.txt', '').trim() || '${'f'.repeat(64)}';
  fs.writeFileSync(
    path.join(dir, 'owned.json'),
    JSON.stringify({ id, name, labels, image: read('image.txt', '').trim() }),
  );
  out(id + '\\n');
  process.exit(0);
}
if (cmd === 'inspect') {
  let format = null;
  let id = null;
  for (let index = 1; index < args.length; index += 1) {
    if (args[index] === '--format') { format = args[index + 1]; index += 1; }
    else if (!id && !args[index].startsWith('{{')) { id = args[index]; }
  }
  let owned = {};
  try { owned = JSON.parse(read('owned.json', '{}')); } catch (error) { owned = {}; }
  if (!owned.id || owned.id !== id) { fail('Error: No such object: ' + id); }
  const running = read('running.txt', 'false').trim() === 'true';
  const exitCode = Number(read('exitcode.txt', '0').trim());
  const state = { Running: running, Status: running ? 'running' : 'exited', ExitCode: exitCode };
  if (format) { out(JSON.stringify(state)); process.exit(0); }
  out(JSON.stringify([{ Id: id, Name: '/' + owned.name, Config: { Image: owned.image, Labels: owned.labels }, State: state }]));
  process.exit(0);
}
if (cmd === 'ps') { out(read('ps.txt', '')); process.exit(0); }
if (cmd === 'kill' || cmd === 'rm') {
  if (read('fail-' + cmd + '.txt', '') === '1') fail(cmd + ' failed');
  process.exit(0);
}
if (cmd === 'start') {
  const sleepMs = Number(read('attach-sleep-ms.txt', '0').trim());
  const stdout = read('attach-stdout.txt', '');
  const stderr = read('attach-stderr.txt', '');
  const exitCode = Number(read('attach-exit.txt', '0').trim());
  setTimeout(() => {
    if (stdout) out(stdout);
    if (stderr) process.stderr.write(stderr);
    process.exit(exitCode);
  }, sleepMs);
  return;
}
process.exit(0);
`;

const GIT_SCRIPT = `${NODE_SHEBANG}
const fs = require('fs');
const path = require('path');
const dir = path.join(__dirname, 'git-state');
const args = process.argv.slice(2);
fs.appendFileSync(path.join(dir, 'log.txt'), args.join(' ') + '\\n');
fs.writeFileSync(path.join(dir, 'env.json'), JSON.stringify(process.env));
if (args[0] === '--version') { process.stdout.write('git version 2.43.0\\n'); process.exit(0); }
const subcommands = ['rev-parse', 'ls-tree', 'cat-file'];
const index = args.findIndex((value) => subcommands.includes(value));
if (index === -1) { process.exit(0); }
const subcommand = args[index];
if (subcommand === 'rev-parse') {
  try { process.stdout.write(fs.readFileSync(path.join(dir, 'rev.txt'), 'utf8').trim() + '\\n'); process.exit(0); }
  catch (error) { process.stderr.write('unknown revision\\n'); process.exit(1); }
}
if (subcommand === 'ls-tree') {
  let entries = [];
  try { entries = JSON.parse(fs.readFileSync(path.join(dir, 'ls-tree.json'), 'utf8')); } catch (error) { entries = []; }
  const parts = entries.map((entry) => entry.mode + ' ' + entry.type + ' ' + entry.sha + '\\t' + entry.path);
  process.stdout.write(parts.join('\\0') + '\\0');
  process.exit(0);
}
if (subcommand === 'cat-file') {
  const sha = args[index + 2];
  try { process.stdout.write(fs.readFileSync(path.join(dir, 'blob-' + sha))); process.exit(0); }
  catch (error) { process.stderr.write('missing blob\\n'); process.exit(1); }
}
process.exit(0);
`;

const VERSION_SCRIPT = `${NODE_SHEBANG}
process.stdout.write((process.env.AGS_FAKE_NAME || 'fake') + ' 22.0.0\\n');
`;

interface RunnerFixture {
  root: string;
  runtime: FleetRuntimeConfig;
  runner: SandboxRunner;
  workspaceDir: string;
  context: ExecutionContext;
  dockerState: string;
  gitState: string;
  writeDockerState: (name: string, content: string) => Promise<void>;
  writeGitState: (name: string, content: string) => Promise<void>;
  readDockerLog: () => Promise<string[]>;
  readGitLog: () => Promise<string[]>;
}

async function writeExecutable(
  filePath: string,
  content: string,
): Promise<void> {
  await fs.writeFile(filePath, content, { mode: 0o755 });
  await fs.chmod(filePath, 0o755);
}

async function forceRemove(target: string): Promise<void> {
  await fs.chmod(target, 0o700).catch(() => undefined);
  const entries = await fs
    .readdir(target, { withFileTypes: true })
    .catch(() => []);
  for (const entry of entries) {
    const entryPath = path.join(target, entry.name);
    if (entry.isDirectory()) {
      await forceRemove(entryPath);
    } else {
      await fs.chmod(entryPath, 0o600).catch(() => undefined);
    }
  }
  await fs.remove(target).catch(() => undefined);
}

async function createRunnerFixture(
  deadlineOffsetMs = 60000,
): Promise<RunnerFixture> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-sandbox-runner-'));
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
  const workspaceDir = path.join(root, 'ws');
  const dockerState = path.join(binDir, 'state');
  const gitState = path.join(binDir, 'git-state');
  await fs.ensureDir(sdkDir);
  await fs.ensureDir(stateDir, 0o700);
  await fs.ensureDir(workspaceDir);
  await fs.ensureDir(dockerState);
  await fs.ensureDir(gitState);

  const entryPath = path.join(sdkDir, 'index.js');
  await fs.writeFile(entryPath, 'export const sdk = true;\n');

  const dockerCommand = path.join(binDir, 'docker');
  const gitCommand = path.join(binDir, 'git');
  const nodeCommand = process.execPath;
  const bunCommand = path.join(binDir, 'bun');
  await writeExecutable(dockerCommand, DOCKER_SCRIPT);
  await writeExecutable(gitCommand, GIT_SCRIPT);
  await writeExecutable(bunCommand, VERSION_SCRIPT);

  await fs.writeFile(
    path.join(dockerState, 'create-id.txt'),
    `${CONTAINER_ID}\n`,
  );
  await fs.writeFile(path.join(dockerState, 'image.txt'), `${IMAGE}\n`);
  await fs.writeFile(path.join(dockerState, 'running.txt'), 'true\n');
  await fs.writeFile(path.join(dockerState, 'exitcode.txt'), '0\n');
  await fs.writeFile(path.join(dockerState, 'ps.txt'), '');
  await fs.writeFile(
    path.join(dockerState, 'attach-stdout.txt'),
    'sandbox-output\n',
  );
  await fs.writeFile(path.join(dockerState, 'log.txt'), '');
  await fs.writeFile(path.join(gitState, 'log.txt'), '');

  const manifestFile = path.join(root, 'manifest.json');
  const result = await createRuntimeManifest({
    nodeCommand,
    bunCommand,
    gitCommand,
    dockerCommand,
    sdkModule: entryPath,
    image: IMAGE,
    ompVersion: '18.12.6',
    manifestFile,
  });
  const manifest = result.manifest;
  const runtime = result.runtime;
  await fs.writeFile(manifestFile, JSON.stringify(manifest, null, 2), {
    mode: 0o600,
  });
  await fs.writeFile(path.join(dockerState, 'log.txt'), '');
  await fs.writeFile(path.join(gitState, 'log.txt'), '');
  const context: ExecutionContext = {
    attemptId: '11111111-1111-4111-8111-111111111111',
    generation: 1,
    role: 'task',
    deadline: Date.now() + deadlineOffsetMs,
    runtimeDigest: manifest.runtimeDigest,
    stateDir,
  };

  return {
    root,
    runtime,
    runner: new SandboxRunner(runtime),
    workspaceDir,
    context,
    dockerState,
    gitState,
    writeDockerState: async (name, content) => {
      await fs.writeFile(path.join(dockerState, name), content);
    },
    writeGitState: async (name, content) => {
      await fs.writeFile(path.join(gitState, name), content);
    },
    readDockerLog: async () =>
      (await fs.readFile(path.join(dockerState, 'log.txt'), 'utf8'))
        .split('\n')
        .filter(Boolean),
    readGitLog: async () =>
      (await fs.readFile(path.join(gitState, 'log.txt'), 'utf8'))
        .split('\n')
        .filter(Boolean),
  };
}

function taskStopProof(context: ExecutionContext) {
  const termination = {
    attemptId: context.attemptId,
    generation: context.generation,
    confirmed: true,
    observedAt: Date.now(),
    containerIds: [],
    workerBootId: 'test-worker-boot',
  };
  return {
    context: {
      attemptId: context.attemptId,
      generation: context.generation,
      role: 'task' as const,
      runtimeDigest: context.runtimeDigest,
    },
    termination,
    runtimeState: {
      schemaVersion: 1 as const,
      attemptId: context.attemptId,
      generation: context.generation,
      role: 'task' as const,
      runtimeDigest: context.runtimeDigest,
      image: IMAGE,
      observedAt: Date.now(),
      instances: [],
      termination,
    },
    modelWorker: {
      kind: 'termination' as const,
      digest: 'a'.repeat(64),
      attemptId: context.attemptId,
      generation: context.generation,
      role: 'task' as const,
      runtimeDigest: context.runtimeDigest,
      workerBootId: 'test-worker-boot',
      exitCode: null,
      confirmed: true,
    },
    wholeGroupStopped: true,
  };
}
const VALID_VERIFICATION = {
  argv: ['sh', 'check.sh'],
  files: { 'check.sh': 'exit 0\n' },
};
describe('SandboxRunner sandbox, snapshot and evaluator boundaries', () => {
  let roots: string[] = [];

  beforeEach(() => {
    roots = [];
  });

  afterEach(async () => {
    for (const root of roots) {
      await forceRemove(root);
    }
    roots = [];
    workerAssetFixture.path = '';
  });

  it('rejects unused executable tokens and empty-files npm verifier oracles', async () => {
    const fixture = await createRunnerFixture();
    roots.push(fixture.root);

    const unusedExecutable = fixture.runner.validateVerification({
      argv: ['/bin/true'],
      files: { 'verify.sh': 'exit 0\n' },
    });
    expect(unusedExecutable.ok).toBe(false);
    expect(unusedExecutable.reasonCodes).toContain(
      'VERIFIER_ENTRYPOINT_INVALID',
    );

    const npmOracle = fixture.runner.validateVerification({
      argv: ['npm', 'test'],
      files: {},
    });
    expect(npmOracle.ok).toBe(false);
    expect(npmOracle.reasonCodes).toContain('VERIFIER_SCRIPT_REQUIRED');
  });
  it('denies doctor when the daemon is unavailable', async () => {
    const fixture = await createRunnerFixture();
    roots.push(fixture.root);
    await fixture.writeDockerState('fail-info.txt', '1');
    const doctor = await fixture.runner.doctor();
    expect(doctor.supported).toBe(false);
    expect(doctor.reasonCodes).toContain('DOCKER_DAEMON_NOT_RUNNING');
  });

  it('denies doctor when the installed closure has drifted', async () => {
    const fixture = await createRunnerFixture();
    roots.push(fixture.root);
    await fs.writeFile(
      path.join(fixture.root, 'sdk', 'index.js'),
      'export const sdk = "drifted";\n',
    );
    const doctor = await fixture.runner.doctor();
    expect(doctor.supported).toBe(false);
    expect(doctor.reasonCodes).toContain('RUNTIME_CLOSURE_UNVERIFIED');
    const log = await fixture.readDockerLog();
    expect(log.some((line) => line.startsWith('info'))).toBe(false);
    expect(log.some((line) => line.startsWith('--version'))).toBe(false);
  });

  it('executes inside a hardened sandbox with a durable create/inspect/start lifecycle', async () => {
    const fixture = await createRunnerFixture();
    roots.push(fixture.root);

    const result = await fixture.runner.execute(
      fixture.workspaceDir,
      ['/bin/echo', 'hi'],
      {
        context: fixture.context,
        deadline: fixture.context.deadline,
      },
    );
    expect(result.exitCode).toBe(0);
    expect(result.stdout).toContain('sandbox-output');

    const log = await fixture.readDockerLog();
    const createLine = log.find((line) => line.startsWith('create '));
    expect(createLine).toBeDefined();
    expect(createLine).toContain('--network none');
    expect(createLine).toContain('--read-only');
    expect(createLine).toContain('--cap-drop ALL');
    expect(createLine).toContain('--security-opt no-new-privileges');
    expect(createLine).toContain(`--entrypoint  ${IMAGE}`);
    expect(createLine).toContain(IMAGE);
    expect(createLine).toContain('/bin/echo hi');

    const createIndex = log.findIndex((line) => line.startsWith('create '));
    const startIndex = log.findIndex((line) => line.startsWith('start '));
    const killIndex = log.findIndex((line) => line.startsWith('kill '));
    expect(createIndex).toBeGreaterThanOrEqual(0);
    expect(startIndex).toBeGreaterThan(createIndex);
    expect(killIndex).toBeGreaterThan(startIndex);
    expect(log).toContain(`rm -f ${CONTAINER_ID}`);

    const records = await fixture.runner.supervisorHandle.readInstanceRecords(
      fixture.context,
    );
    expect(records).toHaveLength(1);
    expect(records[0].containerId).toBe(CONTAINER_ID);
    expect(records[0].status).toBe('terminated');
  }, 15_000);

  it('enforces the admitted deadline and terminates the owned container', async () => {
    const fixture = await createRunnerFixture(2500);
    roots.push(fixture.root);
    await fixture.writeDockerState('attach-sleep-ms.txt', '4000');

    const result = await fixture.runner.execute(
      fixture.workspaceDir,
      ['/bin/sleep', '5'],
      {
        context: fixture.context,
        deadline: fixture.context.deadline,
      },
    );
    expect(result.exitCode).toBe(124);
    const log = await fixture.readDockerLog();
    expect(log).toContain(`kill ${CONTAINER_ID}`);
  }, 15_000);

  it('refuses to start a container after a fence is written', async () => {
    const fixture = await createRunnerFixture();
    roots.push(fixture.root);
    const record = await fixture.runner.supervisorHandle.createInstanceRecord(
      fixture.context,
    );
    const created = await fixture.runner.supervisorHandle.createContainer(
      fixture.context,
      record,
      ['/bin/true'],
      fixture.workspaceDir,
      [],
      {},
    );
    await fixture.runner.writeFence(fixture.context, 'TEST_FENCE');
    await expect(
      fixture.runner.supervisorHandle.startContainer(fixture.context, created, {
        maxStdoutBytes: 1024,
        maxStderrBytes: 1024,
      }),
    ).rejects.toThrow(/ATTEMPT_FENCED/);
    const log = await fixture.readDockerLog();
    expect(log.some((line) => line.startsWith('start '))).toBe(false);
  });

  it('rejects symlinked, overlapping and missing evaluator read-only mounts', async () => {
    const fixture = await createRunnerFixture();
    roots.push(fixture.root);
    const realReadonly = path.join(fixture.root, 'readonly');
    await fs.ensureDir(realReadonly);
    const linkPath = path.join(fixture.root, 'readonly-link');
    await fs.symlink(realReadonly, linkPath);

    await expect(
      fixture.runner.execute(fixture.workspaceDir, ['/bin/true'], {
        context: fixture.context,
        deadline: fixture.context.deadline,
        readonlyPaths: [linkPath],
      }),
    ).rejects.toThrow(/INVALID_READONLY_PATH/);

    await expect(
      fixture.runner.execute(fixture.workspaceDir, ['/bin/true'], {
        context: fixture.context,
        deadline: fixture.context.deadline,
        readonlyPaths: [fixture.workspaceDir],
      }),
    ).rejects.toThrow(/INVALID_READONLY_PATH/);

    const evaluatorContext: ExecutionContext = {
      ...fixture.context,
      role: 'evaluator',
    };
    const snapshotDir = path.join(fixture.root, 'verifier-snapshot');
    const deliverableDir = path.join(fixture.root, 'verifier-deliverable');
    const destination = path.join(fixture.root, 'verifier-destination');
    await fs.ensureDir(snapshotDir);
    await fs.ensureDir(deliverableDir);
    await fixture.runner.prepareEvaluation(
      snapshotDir,
      deliverableDir,
      VALID_VERIFICATION,
      destination,
      taskStopProof(fixture.context),
    );
    const workspace = getEvaluationWorkspacePath(destination);
    await forceRemove(getEvaluationVerifierPath(destination));
    const logBefore = (await fixture.readDockerLog()).length;
    await expect(
      fixture.runner.execute(
        workspace,
        ['sh', `${EVALUATION_VERIFIER_MOUNT}/check.sh`],
        {
          context: evaluatorContext,
          deadline: evaluatorContext.deadline,
        },
      ),
    ).rejects.toThrow(/EVALUATOR_VERIFIER_TREE_MISSING/);
    const logAfter = await fixture.readDockerLog();
    expect(
      logAfter.slice(logBefore).some((line) => line.startsWith('create ')),
    ).toBe(false);
  });

  it('derives the evaluator verifier mount automatically when prepared', async () => {
    const fixture = await createRunnerFixture();
    roots.push(fixture.root);
    const snapshotDir = path.join(fixture.root, 'snapshot');
    const deliverableDir = path.join(fixture.root, 'deliverable');
    const destination = path.join(fixture.root, 'prepared');
    await fs.ensureDir(snapshotDir);
    await fs.ensureDir(deliverableDir);
    await fs.writeFile(path.join(snapshotDir, 'a.txt'), 'baseline\n');
    await fs.writeFile(path.join(deliverableDir, 'a.txt'), 'candidate\n');

    const functionalRunner = fixture.runner;
    await functionalRunner.prepareEvaluation(
      snapshotDir,
      deliverableDir,
      {
        argv: ['sh', 'verify.sh'],
        files: { 'verify.sh': '#!/bin/sh\nexit 0\n' },
      },
      destination,
      taskStopProof(fixture.context),
    );
    const workspace = getEvaluationWorkspacePath(destination);
    const verifier = getEvaluationVerifierPath(destination);
    expect(await fs.readFile(path.join(workspace, 'a.txt'), 'utf8')).toBe(
      'candidate\n',
    );
    expect(await fs.pathExists(path.join(workspace, 'verify.sh'))).toBe(false);
    expect(
      await fs.readFile(path.join(verifier, 'verify.sh'), 'utf8'),
    ).toContain('exit 0');

    const evaluatorContext: ExecutionContext = {
      ...fixture.context,
      role: 'evaluator',
      deadline: Date.now() + 60000,
    };
    const result = await functionalRunner.execute(
      workspace,
      ['sh', 'verify.sh'],
      {
        context: evaluatorContext,
        deadline: evaluatorContext.deadline,
      },
    );
    expect(result.exitCode).toBe(0);
    const log = await fixture.readDockerLog();
    const verifierReal = await fs.realpath(verifier);
    const createLine = log.find(
      (line) => line.startsWith('create ') && line.includes(verifierReal),
    );
    expect(createLine).toContain(
      `${verifierReal}:${EVALUATION_VERIFIER_MOUNT}:ro`,
    );
    expect(createLine).toContain(`${EVALUATION_VERIFIER_MOUNT}/verify.sh`);
    expect(createLine).not.toContain('/workspace/verify.sh');
  });

  it('rejects evaluator argv that bypasses the protected verifier tree', async () => {
    const fixture = await createRunnerFixture();
    roots.push(fixture.root);
    const snapshotDir = path.join(fixture.root, 'snap-argv');
    const deliverableDir = path.join(fixture.root, 'deliv-argv');
    const destination = path.join(fixture.root, 'dest-argv');
    await fs.ensureDir(snapshotDir);
    await fs.ensureDir(deliverableDir);
    await fs.writeFile(path.join(snapshotDir, 'a.txt'), 'a\n');
    await fs.writeFile(path.join(deliverableDir, 'a.txt'), 'a\n');
    await fixture.runner.prepareEvaluation(
      snapshotDir,
      deliverableDir,
      { argv: ['node', 'test.js'], files: { 'test.js': 'process.exit(0)\n' } },
      destination,
      taskStopProof(fixture.context),
    );
    const workspace = getEvaluationWorkspacePath(destination);
    const evaluatorContext: ExecutionContext = {
      ...fixture.context,
      role: 'evaluator',
      deadline: Date.now() + 60000,
    };
    const expectRejectedBeforeContainer = async (
      argv: string[],
    ): Promise<void> => {
      const logBefore = await fixture.readDockerLog();
      let error: unknown;
      try {
        await fixture.runner.execute(workspace, argv, {
          context: evaluatorContext,
          deadline: evaluatorContext.deadline,
        });
      } catch (caught) {
        error = caught;
      }
      expect(error).toBeInstanceOf(HarnessError);
      const executionLines = (await fixture.readDockerLog()).slice(
        logBefore.length,
      );
      expect(executionLines.some((line) => line.startsWith('create '))).toBe(
        false,
      );
      expect(executionLines.some((line) => line.startsWith('start '))).toBe(
        false,
      );
    };

    await expectRejectedBeforeContainer(['node', 'unfrozen.js']);
    await expectRejectedBeforeContainer([
      `${EVALUATION_VERIFIER_MOUNT}/test.js`,
      '/workspace/test.js',
    ]);
    await expectRejectedBeforeContainer([
      `${EVALUATION_VERIFIER_MOUNT}/missing.js`,
    ]);
  });
  it('rejects a different frozen verifier entry or arguments after preparation', async () => {
    const fixture = await createRunnerFixture();
    roots.push(fixture.root);
    const snapshotDir = path.join(fixture.root, 'exact-argv-snapshot');
    const deliverableDir = path.join(fixture.root, 'exact-argv-deliverable');
    const destination = path.join(fixture.root, 'exact-argv-destination');
    await fs.ensureDir(snapshotDir);
    await fs.ensureDir(deliverableDir);
    const verification = {
      argv: ['node', 'a.js', 'expected-mode'],
      files: {
        'a.js': 'process.exit(0)\n',
        'b.js': 'process.exit(0)\n',
      },
    };
    await fixture.runner.prepareEvaluation(
      snapshotDir,
      deliverableDir,
      verification,
      destination,
      taskStopProof(fixture.context),
    );
    const evaluatorContext: ExecutionContext = {
      ...fixture.context,
      role: 'evaluator',
      deadline: Date.now() + 60000,
    };

    const logBefore = await fixture.readDockerLog();
    await expect(
      fixture.runner.execute(
        getEvaluationWorkspacePath(destination),
        ['node', 'b.js', 'other-mode'],
        { context: evaluatorContext, deadline: evaluatorContext.deadline },
      ),
    ).rejects.toThrow(/EVALUATOR_ARGV_PREPARATION_MISMATCH/);
    const executionLines = (await fixture.readDockerLog()).slice(
      logBefore.length,
    );
    expect(executionLines.some((line) => line.startsWith('create '))).toBe(
      false,
    );
    expect(executionLines.some((line) => line.startsWith('start '))).toBe(
      false,
    );
  });

  it('prepares a separate immutable verifier tree and records a receipt', async () => {
    const fixture = await createRunnerFixture();
    roots.push(fixture.root);
    const snapshotDir = path.join(fixture.root, 'snap');
    const deliverableDir = path.join(fixture.root, 'deliv');
    const destination = path.join(fixture.root, 'dest');
    await fs.ensureDir(snapshotDir);
    await fs.ensureDir(deliverableDir);
    await fs.writeFile(path.join(snapshotDir, 'keep.txt'), 'old\n');
    await fs.writeFile(path.join(snapshotDir, 'remove.txt'), 'to-be-removed\n');
    await fs.writeFile(path.join(deliverableDir, 'keep.txt'), 'new\n');

    await fixture.runner.prepareEvaluation(
      snapshotDir,
      deliverableDir,
      {
        argv: ['sh', 'verifier/run.sh'],
        files: { 'verifier/run.sh': '#!/bin/sh\nexit 0\n' },
      },
      destination,
      taskStopProof(fixture.context),
    );

    const workspace = getEvaluationWorkspacePath(destination);
    const verifier = getEvaluationVerifierPath(destination);
    expect(await fs.readFile(path.join(workspace, 'keep.txt'), 'utf8')).toBe(
      'new\n',
    );
    expect(await fs.pathExists(path.join(workspace, 'remove.txt'))).toBe(false);
    const verifierStat = await fs.stat(
      path.join(verifier, 'verifier', 'run.sh'),
    );
    expect(verifierStat.mode & 0o222).toBe(0);
    const verifierDirStat = await fs.stat(verifier);
    expect(verifierDirStat.mode & 0o222).toBe(0);
    const receipt = JSON.parse(
      await fs.readFile(
        path.join(destination, EVALUATION_RECEIPT_FILENAME),
        'utf8',
      ),
    );
    expect(receipt.deletionMarkers).toEqual(['remove.txt']);
    expect(receipt.verifierFiles).toHaveLength(1);
    expect(receipt.verifierMount).toBe(EVALUATION_VERIFIER_MOUNT);
  });

  it('rejects destructive or aliased evaluation destinations before deleting input', async () => {
    const fixture = await createRunnerFixture();
    roots.push(fixture.root);
    const snapshotDir = path.join(fixture.root, 'snap2');
    const deliverableDir = path.join(fixture.root, 'deliv2');
    await fs.ensureDir(snapshotDir);
    await fs.ensureDir(deliverableDir);
    await fs.writeFile(path.join(snapshotDir, 'file.txt'), 'x\n');

    await expect(
      fixture.runner.prepareEvaluation(
        snapshotDir,
        deliverableDir,
        VALID_VERIFICATION,
        fixture.root,
        taskStopProof(fixture.context),
      ),
    ).rejects.toThrow(/DESTINATION_OVERLAP_FORBIDDEN/);
    expect(await fs.pathExists(path.join(snapshotDir, 'file.txt'))).toBe(true);

    const linkedSnapshot = path.join(fixture.root, 'snap-link');
    await fs.symlink(snapshotDir, linkedSnapshot);
    await expect(
      fixture.runner.prepareEvaluation(
        linkedSnapshot,
        deliverableDir,
        VALID_VERIFICATION,
        path.join(fixture.root, 'dest2'),
        taskStopProof(fixture.context),
      ),
    ).rejects.toThrow(/SNAPSHOT_NOT_FOUND/);

    const deliverableLink = path.join(fixture.root, 'deliv-link');
    await fs.symlink(deliverableDir, deliverableLink);
    await expect(
      fixture.runner.prepareEvaluation(
        snapshotDir,
        deliverableLink,
        VALID_VERIFICATION,
        path.join(fixture.root, 'dest3'),
        taskStopProof(fixture.context),
      ),
    ).rejects.toThrow(/DELIVERABLE_NOT_FOUND/);
  });

  it('rejects hardlinked deliverables', async () => {
    const fixture = await createRunnerFixture();
    roots.push(fixture.root);
    const snapshotDir = path.join(fixture.root, 'snap3');
    const deliverableDir = path.join(fixture.root, 'deliv3');
    await fs.ensureDir(snapshotDir);
    await fs.ensureDir(deliverableDir);
    await fs.writeFile(path.join(snapshotDir, 'a.txt'), 'a\n');
    await fs.writeFile(path.join(deliverableDir, 'b.txt'), 'b\n');
    await fs.link(
      path.join(deliverableDir, 'b.txt'),
      path.join(deliverableDir, 'c.txt'),
    );

    await expect(
      fixture.runner.prepareEvaluation(
        snapshotDir,
        deliverableDir,
        VALID_VERIFICATION,
        path.join(fixture.root, 'dest4'),
        taskStopProof(fixture.context),
      ),
    ).rejects.toThrow(/COPY_HARDLINK_FORBIDDEN/);
  });

  it('snapshots regular blobs with a network-free Git environment and rejects destructive destinations', async () => {
    const fixture = await createRunnerFixture();
    roots.push(fixture.root);
    const projectRoot = path.join(fixture.root, 'project');
    await fs.ensureDir(projectRoot);
    await fixture.writeGitState('rev.txt', `${'a'.repeat(40)}\n`);
    await fixture.writeGitState(
      'ls-tree.json',
      JSON.stringify([
        { mode: '100644', type: 'blob', sha: 'sha-a', path: 'src/a.txt' },
        { mode: '100755', type: 'blob', sha: 'sha-run', path: 'run.sh' },
      ]),
    );
    await fixture.writeGitState('blob-sha-a', 'alpha\n');
    await fixture.writeGitState('blob-sha-run', '#!/bin/sh\n');

    const destination = path.join(fixture.root, 'snapshot-out');
    const commit = await fixture.runner.snapshot(
      projectRoot,
      'HEAD',
      destination,
    );
    expect(commit).toBe('a'.repeat(40));
    expect(
      await fs.readFile(path.join(destination, 'src', 'a.txt'), 'utf8'),
    ).toBe('alpha\n');
    expect(
      (await fs.stat(path.join(destination, 'run.sh'))).mode & 0o111,
    ).not.toBe(0);

    const gitEnv = JSON.parse(
      await fs.readFile(
        path.join(fixture.root, 'bin', 'git-state', 'env.json'),
        'utf8',
      ),
    );
    expect(gitEnv.GIT_CONFIG_NOSYSTEM).toBe('1');
    expect(gitEnv.GIT_CONFIG_GLOBAL).toBe('/dev/null');
    expect(gitEnv.GIT_NO_LAZY_FETCH).toBe('1');
    expect(gitEnv.GIT_ALLOW_PROTOCOL).toBe('');
    expect(gitEnv.GIT_DIR).toBeUndefined();

    await expect(
      fixture.runner.snapshot(projectRoot, 'HEAD', projectRoot),
    ).rejects.toThrow(/DESTINATION_OVERLAP_FORBIDDEN/);
    await expect(
      fixture.runner.snapshot(projectRoot, 'HEAD', fixture.root),
    ).rejects.toThrow(/DESTINATION_OVERLAP_FORBIDDEN/);
  });

  it('rejects unsupported tree modes and unavailable local blobs', async () => {
    const fixture = await createRunnerFixture();
    roots.push(fixture.root);
    const projectRoot = path.join(fixture.root, 'project2');
    await fs.ensureDir(projectRoot);
    await fixture.writeGitState('rev.txt', `${'b'.repeat(40)}\n`);

    await fixture.writeGitState(
      'ls-tree.json',
      JSON.stringify([
        { mode: '120000', type: 'blob', sha: 'sha-link', path: 'link.txt' },
      ]),
    );
    await expect(
      fixture.runner.snapshot(
        projectRoot,
        'HEAD',
        path.join(fixture.root, 'snap-a'),
      ),
    ).rejects.toThrow(/GIT_SNAPSHOT_MODE_FORBIDDEN/);

    await fixture.writeGitState(
      'ls-tree.json',
      JSON.stringify([
        {
          mode: '100644',
          type: 'blob',
          sha: 'missing-blob',
          path: 'missing.txt',
        },
      ]),
    );
    await expect(
      fixture.runner.snapshot(
        projectRoot,
        'HEAD',
        path.join(fixture.root, 'snap-b'),
      ),
    ).rejects.toThrow(/GIT_BLOB_EXTRACTION_FAILED/);
    expect(await fs.pathExists(path.join(projectRoot, 'missing.txt'))).toBe(
      false,
    );
  });
});
