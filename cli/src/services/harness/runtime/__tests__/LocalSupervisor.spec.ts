import { spawn } from 'child_process';
import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  getContainerLabels,
  getInstanceEvidencePath,
  getRuntimeStateReceiptPath,
  getSupervisorDonePath,
  getTerminationReceiptPath,
  getWorkerBootId,
  getWorkerTerminationReceiptPath,
  LocalSupervisor,
} from '../LocalSupervisor';
import { ExecutionContext, TerminationEvidenceSchema } from '../RuntimeTypes';

const IMAGE = `ags-runtime-worker@sha256:${'a'.repeat(64)}`;

const FAKE_DOCKER = `#!/bin/sh
DIR="$(cd "$(dirname "$0")" && pwd)/state"
LOG="$DIR/log.txt"
printf '%s\\n' "$*" >> "$LOG"
cmd="$1"
shift
case "$cmd" in
  inspect)
    if [ "$1" = "--format" ]; then
      shift 2
      id="$1"
      if [ -f "$DIR/state-$id.json" ]; then cat "$DIR/state-$id.json"; else echo "Error: No such object: $id" >&2; exit 1; fi
    else
      id="$1"
      if [ -f "$DIR/inspect-$id.json" ]; then cat "$DIR/inspect-$id.json"; else echo "Error: No such object: $id" >&2; exit 1; fi
    fi
    ;;
  ps)
    if [ -f "$DIR/ps.txt" ]; then cat "$DIR/ps.txt"; fi
    ;;
  kill|rm)
    if [ -f "$DIR/fail-$cmd" ]; then exit 1; fi
    exit 0
    ;;
  create)
    cat "$DIR/create-id.txt"
    ;;
  start)
    if [ -f "$DIR/attach-sleep.txt" ]; then sleep "$(cat "$DIR/attach-sleep.txt")"; fi
    if [ -f "$DIR/attach-stdout.txt" ]; then cat "$DIR/attach-stdout.txt"; fi
    if [ -f "$DIR/attach-stderr.txt" ]; then cat "$DIR/attach-stderr.txt" >&2; fi
    exit "$(cat "$DIR/attach-exit.txt" 2>/dev/null || echo 0)"
    ;;
  --version)
    echo "Docker version 27.0.0, build fake"
    ;;
  info)
    exit 0
    ;;
  *)
    exit 0
    ;;
esac
`;

interface SupervisorFixture {
  root: string;
  stateDir: string;
  dockerCommand: string;
  context: ExecutionContext;
  supervisor: LocalSupervisor;
  readLog: () => Promise<string[]>;
  writeState: (name: string, content: string) => Promise<void>;
}

async function createFixture(
  deadlineOffsetMs = 60000,
): Promise<SupervisorFixture> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-supervisor-'));
  const stateDir = path.join(root, 'state');
  const dockerCommand = path.join(root, 'docker');
  await fs.ensureDir(stateDir, 0o700);
  await fs.ensureDir(path.join(root, 'state'), 0o700);
  await fs.writeFile(dockerCommand, FAKE_DOCKER, { mode: 0o755 });
  await fs.chmod(dockerCommand, 0o755);
  await fs.writeFile(path.join(root, 'state', 'log.txt'), '');
  await fs.writeFile(
    path.join(root, 'state', 'create-id.txt'),
    `${'d'.repeat(64)}\n`,
  );
  await fs.writeFile(path.join(root, 'state', 'ps.txt'), '');

  const context: ExecutionContext = {
    attemptId: '44444444-4444-4444-8444-444444444444',
    generation: 2,
    role: 'task',
    deadline: Date.now() + deadlineOffsetMs,
    runtimeDigest: 'a'.repeat(64),
    stateDir,
  };

  return {
    root,
    stateDir,
    dockerCommand,
    context,
    supervisor: new LocalSupervisor(dockerCommand, IMAGE),
    readLog: async () =>
      (await fs.readFile(path.join(root, 'state', 'log.txt'), 'utf8'))
        .split('\n')
        .filter(Boolean),
    writeState: async (name, content) => {
      await fs.writeFile(path.join(root, 'state', name), content);
    },
  };
}

interface InspectDocumentOptions {
  instanceId: string;
  containerId: string;
  containerName: string;
  running?: boolean;
  labelOverrides?: Record<string, string>;
  image?: string;
  stateOverride?: unknown;
}

function inspectDocument(
  context: ExecutionContext,
  options: InspectDocumentOptions,
): string {
  const labels = {
    ...getContainerLabels(context, options.instanceId),
    ...(options.labelOverrides ?? {}),
  };
  return JSON.stringify([
    {
      Id: options.containerId,
      Name: `/${options.containerName}`,
      Config: { Image: options.image ?? IMAGE, Labels: labels },
      State:
        options.stateOverride !== undefined
          ? options.stateOverride
          : {
              Running: options.running ?? false,
              Status: 'exited',
              ExitCode: 0,
            },
    },
  ]);
}

describe('LocalSupervisor container lifecycle', () => {
  let fixture: SupervisorFixture;
  let roots: string[] = [];

  beforeEach(async () => {
    fixture = await createFixture();
    roots.push(fixture.root);
  });

  afterEach(async () => {
    for (const root of roots) {
      await fs.remove(root);
    }
    roots = [];
  });

  async function createOwnedContainer(): Promise<{
    instanceId: string;
    containerId: string;
    containerName: string;
  }> {
    const record = await fixture.supervisor.createInstanceRecord(
      fixture.context,
    );
    const created = await fixture.supervisor.createContainer(
      fixture.context,
      record,
      ['/bin/true'],
      fixture.root,
      [],
      {},
    );
    const containerId = created.containerId as string;
    await fixture.writeState(
      `inspect-${containerId}.json`,
      inspectDocument(fixture.context, {
        instanceId: created.instanceId,
        containerId,
        containerName: created.containerName,
      }),
    );
    await fixture.writeState(
      `state-${containerId}.json`,
      JSON.stringify({ Running: false, ExitCode: 0 }),
    );
    return {
      instanceId: created.instanceId,
      containerId,
      containerName: created.containerName,
    };
  }

  it('creates a uniquely identified instance and records its container identity', async () => {
    const owned = await createOwnedContainer();
    const records = await fixture.supervisor.readInstanceRecords(
      fixture.context,
    );
    expect(records).toHaveLength(1);
    expect(records[0].instanceId).toBe(owned.instanceId);
    expect(records[0].containerId).toBe(owned.containerId);
    expect(records[0].status).toBe('created');
    const log = await fixture.readLog();
    expect(log.some((line) => line.startsWith('create '))).toBe(true);
    expect(
      log.some((line) =>
        line.includes(`--label ags.fleet.instance=${owned.instanceId}`),
      ),
    ).toBe(true);
  });

  it('refuses to start or create after a fence is written', async () => {
    const record = await fixture.supervisor.createInstanceRecord(
      fixture.context,
    );
    await fixture.supervisor.writeFence(fixture.context, 'TEST_FENCE');
    await expect(
      fixture.supervisor.createInstanceRecord(fixture.context),
    ).rejects.toThrow(/ATTEMPT_FENCED/);
    await expect(
      fixture.supervisor.createContainer(
        fixture.context,
        record,
        ['/bin/true'],
        fixture.root,
        [],
        {},
      ),
    ).rejects.toThrow(/ATTEMPT_FENCED/);
    const log = await fixture.readLog();
    expect(log.some((line) => line.startsWith('create '))).toBe(false);
  });

  it('stays armed after readiness so late registration remains supervised', async () => {
    const shortFixture = await createFixture(1500);
    roots.push(shortFixture.root);
    await shortFixture.supervisor.ensureSupervisor(shortFixture.context, {
      nodeCommand: process.execPath,
      deadline: shortFixture.context.deadline,
    });
    await new Promise<void>((resolve) => setTimeout(resolve, 400));
    expect(
      await fs.pathExists(getSupervisorDonePath(shortFixture.context)),
    ).toBe(false);

    const record = await shortFixture.supervisor.createInstanceRecord(
      shortFixture.context,
    );
    const created = await shortFixture.supervisor.createContainer(
      shortFixture.context,
      record,
      ['/bin/true'],
      shortFixture.root,
      [],
      {},
    );
    const containerId = created.containerId as string;
    await shortFixture.writeState(
      `inspect-${containerId}.json`,
      inspectDocument(shortFixture.context, {
        instanceId: created.instanceId,
        containerId,
        containerName: created.containerName,
        running: true,
      }),
    );

    const evidencePath = getInstanceEvidencePath(
      shortFixture.context,
      created.instanceId,
    );
    const deadline = Date.now() + 3000;
    let evidence: { confirmed?: boolean } | null = null;
    while (Date.now() < deadline) {
      evidence = await fs
        .readFile(evidencePath, 'utf8')
        .then((raw) => JSON.parse(raw))
        .catch(() => null);
      if (evidence) {
        break;
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
    }
    expect(evidence?.confirmed).toBe(true);
    await shortFixture.supervisor.requestSupervisorStop(shortFixture.context);
    expect(
      await shortFixture.supervisor.waitSupervisorDone(
        shortFixture.context,
        3000,
      ),
    ).toBe(true);
  });

  it('never kills a foreign container and never confirms unverified termination', async () => {
    const record = await fixture.supervisor.createInstanceRecord(
      fixture.context,
    );
    const created = await fixture.supervisor.createContainer(
      fixture.context,
      record,
      ['/bin/true'],
      fixture.root,
      [],
      {},
    );
    const containerId = created.containerId as string;
    await fixture.writeState(
      `inspect-${containerId}.json`,
      inspectDocument(fixture.context, {
        instanceId: created.instanceId,
        containerId,
        containerName: created.containerName,
        labelOverrides: { 'ags.fleet.instance': 'foreign-instance' },
        running: true,
      }),
    );

    const evidence = await fixture.supervisor.terminateInstance(
      fixture.context,
      created,
    );
    expect(evidence.confirmed).toBe(false);
    expect(evidence.errorCode).toBe('CONTAINER_OWNERSHIP_MISMATCH');
    const log = await fixture.readLog();
    expect(log.some((line) => line.startsWith('kill '))).toBe(false);
    expect(log.some((line) => line.startsWith('rm '))).toBe(false);
  });

  it('treats malformed or absent daemon state as unknown, never stopped', async () => {
    const record = await fixture.supervisor.createInstanceRecord(
      fixture.context,
    );
    const created = await fixture.supervisor.createContainer(
      fixture.context,
      record,
      ['/bin/true'],
      fixture.root,
      [],
      {},
    );
    const containerId = created.containerId as string;

    await fixture.writeState(
      `inspect-${containerId}.json`,
      inspectDocument(fixture.context, {
        instanceId: created.instanceId,
        containerId,
        containerName: created.containerName,
        stateOverride: {},
      }),
    );
    const malformed = await fixture.supervisor.inspectInstance(created);
    expect(malformed.state).toBe('unknown');

    await fs.remove(
      path.join(fixture.root, 'state', `inspect-${containerId}.json`),
    );
    const evidence = await fixture.supervisor.terminateInstance(
      fixture.context,
      created,
    );
    expect(evidence.confirmed).toBe(false);
    expect(evidence.errorCode).toBe('DOCKER_INSPECT_UNKNOWN');
    const log = await fixture.readLog();
    expect(log.some((line) => line.startsWith('kill '))).toBe(false);
  });

  it('kills by verified container id and requires scoped absence proof', async () => {
    const owned = await createOwnedContainer();
    const records = await fixture.supervisor.readInstanceRecords(
      fixture.context,
    );
    const record = records[0];
    await fixture.writeState(
      `inspect-${owned.containerId}.json`,
      inspectDocument(fixture.context, {
        instanceId: owned.instanceId,
        containerId: owned.containerId,
        containerName: owned.containerName,
        running: true,
      }),
    );
    await fixture.writeState('ps.txt', `${'e'.repeat(64)}\n`);

    const unproven = await fixture.supervisor.terminateInstance(
      fixture.context,
      record,
    );
    expect(unproven.confirmed).toBe(false);
    expect(unproven.errorCode).toBe('CONTAINER_ABSENCE_UNPROVEN');
    const log = await fixture.readLog();
    expect(log).toContain(`kill ${owned.containerId}`);
    expect(log).toContain(`rm -f ${owned.containerId}`);

    await fixture.writeState('ps.txt', '');
    const confirmed = await fixture.supervisor.terminateInstance(
      fixture.context,
      record,
    );
    expect(confirmed.confirmed).toBe(true);
  });

  it('records authoritative strict termination and runtime-state receipts', async () => {
    await fixture.writeState('ps.txt', '');
    const evidence = await fixture.supervisor.terminate(fixture.context);
    expect(evidence.confirmed).toBe(true);
    expect(evidence.workerBootId.length).toBeGreaterThan(0);

    const receiptPath = getTerminationReceiptPath(fixture.context);
    const receipt = TerminationEvidenceSchema.parse(
      JSON.parse(await fs.readFile(receiptPath, 'utf8')),
    );
    expect(receipt.attemptId).toBe(fixture.context.attemptId);
    expect(receipt.generation).toBe(fixture.context.generation);

    const stateReceipt = JSON.parse(
      await fs.readFile(getRuntimeStateReceiptPath(fixture.context), 'utf8'),
    );
    expect(stateReceipt.image).toBe(IMAGE);
    expect(stateReceipt.role).toBe('task');

    const again = await fixture.supervisor.terminate(fixture.context);
    expect(again.confirmed).toBe(true);
  });

  it('requires a detached supervisor readiness handshake and denies unstartable supervisors', async () => {
    const unavailable = new LocalSupervisor(fixture.dockerCommand, IMAGE);
    await expect(
      unavailable.ensureSupervisor(fixture.context, {
        nodeCommand: path.join(fixture.root, 'missing-node'),
        deadline: fixture.context.deadline,
      }),
    ).rejects.toThrow(/SUPERVISOR_UNAVAILABLE/);
  });

  it('rejects a supervisor that acknowledges a different identity', async () => {
    const fakeNode = path.join(fixture.root, 'fake-node.sh');
    await fs.writeFile(
      fakeNode,
      `#!/bin/sh
printf '%s' '{"pid": 1, "attemptId": "other-attempt", "generation": 2, "role": "task", "startedAt": 1}' > "$3"
`,
      { mode: 0o755 },
    );
    await fs.chmod(fakeNode, 0o755);
    await expect(
      fixture.supervisor.ensureSupervisor(fixture.context, {
        nodeCommand: fakeNode,
        deadline: fixture.context.deadline,
      }),
    ).rejects.toThrow(/SUPERVISOR_IDENTITY_MISMATCH/);
  });

  it('supervisor enforces instance deadlines with verified identity', async () => {
    const shortFixture = await createFixture(400);
    roots.push(shortFixture.root);
    const record = await shortFixture.supervisor.createInstanceRecord(
      shortFixture.context,
    );
    const created = await shortFixture.supervisor.createContainer(
      shortFixture.context,
      record,
      ['/bin/true'],
      shortFixture.root,
      [],
      {},
    );
    const containerId = created.containerId as string;
    await shortFixture.writeState(
      `inspect-${containerId}.json`,
      inspectDocument(shortFixture.context, {
        instanceId: created.instanceId,
        containerId,
        containerName: created.containerName,
        running: true,
      }),
    );

    await shortFixture.supervisor.ensureSupervisor(shortFixture.context, {
      nodeCommand: process.execPath,
      deadline: shortFixture.context.deadline,
    });

    const evidencePath = getInstanceEvidencePath(
      shortFixture.context,
      created.instanceId,
    );
    const deadline = Date.now() + 6000;
    let evidence: { confirmed?: boolean; errorCode?: string } | null = null;
    while (Date.now() < deadline) {
      evidence = await fs
        .readFile(evidencePath, 'utf8')
        .then((raw) => JSON.parse(raw))
        .catch(() => null);
      if (evidence) {
        break;
      }
      await new Promise<void>((resolve) => setTimeout(resolve, 100));
    }
    expect(evidence?.confirmed).toBe(true);
    const log = await shortFixture.readLog();
    expect(log).toContain(`kill ${containerId}`);
    await shortFixture.supervisor.requestSupervisorStop(shortFixture.context);
    expect(
      await shortFixture.supervisor.waitSupervisorDone(
        shortFixture.context,
        3000,
      ),
    ).toBe(true);
  });

  it('supervisor owns and terminates a verified worker process group', async () => {
    const shortFixture = await createFixture(900);
    roots.push(shortFixture.root);
    const jobFilePath = path.join(shortFixture.root, 'worker-job.json');
    const releaseFilePath = path.join(shortFixture.root, 'worker-release.json');
    const launchNonce = 'e'.repeat(64);
    await fs.writeFile(jobFilePath, '{}');
    await shortFixture.supervisor.beginWorkerLaunch(shortFixture.context, {
      launchNonce,
      workerBootId: await getWorkerBootId(shortFixture.stateDir),
      workerScriptPath: process.execPath,
      workerAssetSha256: 'b'.repeat(64),
      jobFilePath,
      releaseFilePath,
      deadline: shortFixture.context.deadline,
    });
    const child = spawn(
      process.execPath,
      ['-e', 'setTimeout(() => {}, 30000)', jobFilePath],
      {
        detached: true,
        stdio: 'ignore',
      },
    );
    child.unref();
    try {
      const identity = await shortFixture.supervisor.readProcessIdentity(
        child.pid as number,
      );
      expect(identity.state).toBe('running');
      const record = await shortFixture.supervisor.recordWorkerLaunchIdentity(
        shortFixture.context,
        launchNonce,
        {
          pid: child.pid as number,
          pgid: child.pid as number,
          workerStartTime: identity.startTime,
        },
      );
      await shortFixture.supervisor.ensureSupervisor(shortFixture.context, {
        nodeCommand: process.execPath,
        deadline: shortFixture.context.deadline,
      });
      await shortFixture.supervisor.registerWorker(
        shortFixture.context,
        record,
      );
      await shortFixture.supervisor.releaseWorker(shortFixture.context, record);

      const receiptPath = getWorkerTerminationReceiptPath(shortFixture.context);
      const deadline = Date.now() + 6000;
      let receipt: { confirmed?: boolean } | null = null;
      while (Date.now() < deadline) {
        receipt = await fs
          .readFile(receiptPath, 'utf8')
          .then((raw) => JSON.parse(raw))
          .catch(() => null);
        if (receipt) {
          break;
        }
        await new Promise<void>((resolve) => setTimeout(resolve, 100));
      }
      expect(receipt?.confirmed).toBe(true);
      expect(
        (await shortFixture.supervisor.readProcessIdentity(child.pid as number))
          .state,
      ).toBe('absent');
      await shortFixture.supervisor.requestSupervisorStop(shortFixture.context);
      expect(
        await shortFixture.supervisor.waitSupervisorDone(
          shortFixture.context,
          3000,
        ),
      ).toBe(true);
    } finally {
      try {
        process.kill(-(child.pid as number), 'SIGKILL');
      } catch {
        // Already terminated by the supervisor.
      }
    }
  });

  it('reuses a live detached supervisor instead of replacing its ready state', async () => {
    const first = await fixture.supervisor.ensureSupervisor(fixture.context, {
      nodeCommand: process.execPath,
      deadline: fixture.context.deadline,
    });
    const second = await fixture.supervisor.ensureSupervisor(fixture.context, {
      nodeCommand: process.execPath,
      deadline: fixture.context.deadline,
    });
    expect(second.pid).toBe(first.pid);
    expect(second.reused).toBe(true);
    await fixture.supervisor.requestSupervisorStop(fixture.context);
    expect(
      await fixture.supervisor.waitSupervisorDone(fixture.context, 3000),
    ).toBe(true);
  });

  it('persists a durable worker boot identity', async () => {
    const bootId = await getWorkerBootId(fixture.stateDir);
    expect(bootId.length).toBeGreaterThan(0);
    expect(await getWorkerBootId(fixture.stateDir)).toBe(bootId);
  });
});
