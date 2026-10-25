import crypto from 'crypto';
import fs from 'fs-extra';
import path from 'path';
import { HarnessError } from './RuntimeTypes';

/**
 * Trusted runner asset identifiers and emission helpers.
 *
 * The detached supervisor is emitted from the trusted string below so its exact bytes are
 * deterministic and digest-bound in the runtime closure manifest. The Bun worker is a real
 * module asset; the resolved file, plus its emitted dependency/graph modules, are hashed and
 * verified before any spawn. Missing/changed bytes deny execution.
 */
export const SUPERVISOR_ASSET_ID = 'ags-fleet-detached-supervisor-v2';
export const WORKER_ASSET_ID = 'ags-fleet-omp-worker-v1';
export const SUPERVISOR_READY_TIMEOUT_MS = 5000;
export const SUPERVISOR_POLL_INTERVAL_MS = 200;
export const SUPERVISOR_CREATE_GRACE_MS = 60000;
export const SUPERVISOR_HARD_GRACE_MS = 120000;
export const SUPERVISOR_DONE_WAIT_MS = 5000;
export const LIFECYCLE_LOCK_TIMEOUT_MS = 5000;

/**
 * Independent detached supervisor source. For one attempt/generation/role it owns:
 * - every recorded sandbox container instance (verified identity before kill/remove)
 * - the OMP worker process group (verified leader start-time/command and full group absence)
 *
 * Arm semantics: the supervisor never exits merely because nothing is registered yet. It exits
 * only when its owner writes a durable stop request AND no owned work is unresolved, or at the
 * admitted deadline + hard grace, where remaining work is recorded as unconfirmed.
 */
export const SUPERVISOR_SOURCE = String.raw`'use strict';
const fs = require('fs');
const path = require('path');
const { execFile } = require('child_process');

const configPath = process.argv[2];
const readyPath = process.argv[3];
const donePath = process.argv[4];
if (!configPath || !readyPath || !donePath) {
  process.stderr.write('usage: supervisor <config.json> <ready.json> <done.json>\n');
  process.exit(64);
}

const cfg = JSON.parse(fs.readFileSync(configPath, 'utf8'));
const MANAGED_BY = 'ags-fleet-sandbox-runner';
const CREATE_GRACE_MS = 60000;
const DAEMON_TIMEOUT_MS = 10000;
const PS_TIMEOUT_MS = 5000;
const POLL_MS = 200;
const HARD_GRACE_MS = 120000;
const SAFE_ENV = { PATH: '/usr/bin:/bin:/usr/sbin:/sbin', LC_ALL: 'C', LANG: 'C' };

function readBootId() {
  try {
    const id = fs.readFileSync('/proc/sys/kernel/random/boot_id', 'utf8').trim();
    if (id) { return id; }
  } catch (error) {}
  try {
    const id = fs.readFileSync(path.join(cfg.stateDir, '.worker-boot-id'), 'utf8').trim();
    if (id) { return id; }
  } catch (error) {}
  return 'unknown-boot-id';
}

const workerBootId = readBootId();

function run(command, args, timeoutMs) {
  return new Promise(function (resolve) {
    execFile(
      command,
      args,
      { encoding: 'utf8', timeout: timeoutMs, maxBuffer: 8 * 1024 * 1024, env: SAFE_ENV },
      function (error, stdout, stderr) {
        resolve({
          ok: !error,
          exitCode: error && typeof error.code === 'number' ? error.code : null,
          killed: Boolean(error && error.killed),
          signal: error && error.signal ? String(error.signal) : '',
          stdout: String(stdout || ''),
          stderr: String(stderr || ''),
        });
      },
    );
  });
}

function fsyncDirectory(directory) {
  try {
    const fd = fs.openSync(directory, 'r');
    try { fs.fsyncSync(fd); } finally { fs.closeSync(fd); }
  } catch (error) {
    throw new Error('STORE_DIRECTORY_FSYNC_FAILED');
  }
}

function atomicWriteJson(file, value) {
  const tmp = file + '.tmp.' + process.pid + '.' + Date.now();
  const body = JSON.stringify(value, null, 2);
  const fd = fs.openSync(tmp, 'wx', 0o600);
  try {
    fs.writeFileSync(fd, body, 'utf8');
    fs.fsyncSync(fd);
  } finally {
    fs.closeSync(fd);
  }
  fs.renameSync(tmp, file);
  fsyncDirectory(path.dirname(file));
}

function writeFirstJson(file, value) {
  try {
    const fd = fs.openSync(file, 'wx', 0o600);
    try {
      fs.writeFileSync(fd, JSON.stringify(value, null, 2), 'utf8');
      fs.fsyncSync(fd);
    } finally {
      fs.closeSync(fd);
    }
    fsyncDirectory(path.dirname(file));
    return true;
  } catch (error) {
    return false;
  }
}

function readJsonIfExists(file) {
  try {
    return JSON.parse(fs.readFileSync(file, 'utf8'));
  } catch (error) {
    return null;
  }
}

function listInstanceFiles() {
  let names;
  try { names = fs.readdirSync(cfg.stateDir); } catch (error) { return []; }
  const prefix = 'instance-' + cfg.attemptId + '-' + cfg.generation + '-' + cfg.role + '-';
  return names
    .filter(function (name) { return name.indexOf(prefix) === 0 && name.slice(-5) === '.json'; })
    .sort()
    .map(function (name) {
      const instanceIdFromName = name.slice(prefix.length, name.length - 5);
      return { name, instanceIdFromName };
    });
}

function instanceEvidencePath(instanceId) {
  return path.join(
    cfg.stateDir,
    'instance-termination-' + cfg.attemptId + '-' + cfg.generation + '-' + cfg.role + '-' + instanceId + '.json',
  );
}

function workerRecordPath() {
  return path.join(cfg.stateDir, 'worker-' + cfg.attemptId + '-' + cfg.generation + '-' + cfg.role + '.json');
}

function workerEvidencePath() {
  return path.join(cfg.stateDir, 'worker-termination-' + cfg.attemptId + '-' + cfg.generation + '-' + cfg.role + '.json');
}

function workerLaunchIntentPath() {
  return path.join(cfg.stateDir, 'worker-launch-' + cfg.attemptId + '-' + cfg.generation + '-' + cfg.role + '.json');
}

function validInstanceEvidence(value, record) {
  return value && value.attemptId === cfg.attemptId &&
    value.generation === cfg.generation && value.role === cfg.role &&
    value.instanceId === record.instanceId && value.workerBootId === workerBootId &&
    Array.isArray(value.containerIds) &&
    (!record.containerId || value.containerIds.indexOf(record.containerId) !== -1) &&
    typeof value.confirmed === 'boolean';
}

function validWorkerEvidence(value, record) {
  return value && value.schemaVersion === 1 && value.attemptId === cfg.attemptId &&
    value.generation === cfg.generation && value.role === cfg.role &&
    value.runtimeDigest === cfg.runtimeDigest && value.workerBootId === workerBootId &&
    Number.isInteger(value.pid) && value.pid > 0 &&
    Number.isInteger(value.pgid) && value.pgid > 0 &&
    (!record || (value.pid === Number(record.pid) && value.pgid === Number(record.pgid || 0))) &&
    typeof value.confirmed === 'boolean';
}

function persistMonotonicEvidence(file, value, valid) {
  if (fs.existsSync(file)) {
    const existing = readJsonIfExists(file);
    if (!valid(existing)) { return false; }
    if (existing.confirmed === true) { return true; }
  }
  atomicWriteJson(file, value);
  return true;
}

function expectedLabels(instanceId) {
  const labels = {};
  labels['ags.fleet.attemptId'] = cfg.attemptId;
  labels['ags.fleet.generation'] = String(cfg.generation);
  labels['ags.fleet.role'] = cfg.role;
  labels['ags.fleet.runtimeDigest'] = cfg.runtimeDigest;
  labels['ags.fleet.instance'] = instanceId;
  labels['ags.fleet.managedBy'] = MANAGED_BY;
  return labels;
}

async function inspectOwned(record) {
  const result = await run(cfg.dockerCommand, ['inspect', record.containerId], DAEMON_TIMEOUT_MS);
  if (!result.ok) { return { state: 'unknown', detail: 'inspect-failed' }; }
  let parsed;
  try { parsed = JSON.parse(result.stdout); } catch (error) { return { state: 'unknown', detail: 'inspect-invalid-json' }; }
  if (!Array.isArray(parsed) || parsed.length !== 1 || !parsed[0] || typeof parsed[0] !== 'object') {
    return { state: 'unknown', detail: 'inspect-shape' };
  }
  const info = parsed[0];
  if (String(info.Id || '') !== record.containerId) { return { state: 'foreign', detail: 'id-mismatch' }; }
  const config = info.Config && typeof info.Config === 'object' ? info.Config : {};
  const labels = config.Labels && typeof config.Labels === 'object' ? config.Labels : {};
  const expected = expectedLabels(record.instanceId);
  const keys = Object.keys(expected);
  for (let index = 0; index < keys.length; index += 1) {
    if (labels[keys[index]] !== expected[keys[index]]) { return { state: 'foreign', detail: 'label-mismatch' }; }
  }
  if (config.Image !== cfg.image) { return { state: 'foreign', detail: 'image-mismatch' }; }
  if (String(info.Name || '') !== '/' + record.containerName) { return { state: 'foreign', detail: 'name-mismatch' }; }
  const state = info.State;
  if (!state || typeof state !== 'object' || typeof state.Running !== 'boolean' || typeof state.Status !== 'string') {
    return { state: 'unknown', detail: 'state-shape' };
  }
  return { state: state.Running ? 'running' : 'stopped', detail: state.Status };
}

async function proveAbsence(record) {
  const result = await run(
    cfg.dockerCommand,
    ['ps', '-a', '--filter', 'label=ags.fleet.instance=' + record.instanceId, '--format', '{{.ID}}'],
    DAEMON_TIMEOUT_MS,
  );
  if (!result.ok) { return { confirmed: false, errorCode: 'DOCKER_ABSENCE_QUERY_FAILED' }; }
  if (result.stdout.trim() !== '') { return { confirmed: false, errorCode: 'CONTAINER_ABSENCE_UNPROVEN' }; }
  return { confirmed: true, errorCode: 'SUPERVISOR_DEADLINE_EXCEEDED' };
}

async function terminateInstance(record, hardStopReached) {
  const evidencePath = instanceEvidencePath(record.instanceId);
  if (fs.existsSync(evidencePath)) {
    const existing = readJsonIfExists(evidencePath);
    if (!validInstanceEvidence(existing, record)) { return 'pending'; }
    if (existing.confirmed === true) { return 'settled'; }
  }
  let evidence;
  if (!record.containerId) {
    if (Date.now() < Number(record.createdAt || 0) + CREATE_GRACE_MS && !hardStopReached) { return 'pending'; }
    evidence = {
      attemptId: cfg.attemptId, generation: cfg.generation, role: cfg.role, instanceId: record.instanceId,
      confirmed: false, observedAt: Date.now(), containerIds: [], errorCode: 'CREATE_WINDOW_UNCONFIRMED',
      workerBootId: workerBootId,
    };
  } else {
    const observed = await inspectOwned(record);
    if (observed.state === 'unknown') { return 'pending'; }
    if (observed.state === 'foreign') {
      evidence = {
        attemptId: cfg.attemptId, generation: cfg.generation, role: cfg.role, instanceId: record.instanceId,
        confirmed: false, observedAt: Date.now(), containerIds: [record.containerId],
        errorCode: 'CONTAINER_OWNERSHIP_MISMATCH', workerBootId: workerBootId,
      };
    } else {
      if (observed.state === 'running') { await run(cfg.dockerCommand, ['kill', record.containerId], DAEMON_TIMEOUT_MS); }
      await run(cfg.dockerCommand, ['rm', '-f', record.containerId], DAEMON_TIMEOUT_MS);
      const absence = await proveAbsence(record);
      evidence = {
        attemptId: cfg.attemptId, generation: cfg.generation, role: cfg.role, instanceId: record.instanceId,
        confirmed: absence.confirmed, observedAt: Date.now(), containerIds: [record.containerId],
        errorCode: absence.errorCode, workerBootId: workerBootId,
      };
    }
  }
  const persisted = persistMonotonicEvidence(
    evidencePath,
    evidence,
    function (value) { return validInstanceEvidence(value, record); },
  );
  return persisted && evidence.confirmed === true ? 'settled' : 'pending';
}

async function observeProcess(pid) {
  const result = await run('ps', ['-p', String(pid), '-o', 'lstart=,command='], PS_TIMEOUT_MS);
  if (result.ok) {
    const line = result.stdout.trim();
    if (line === '') { return { state: 'absent', startTime: '', command: '' }; }
    return { state: 'running', startTime: line.slice(0, 24).trim(), command: line.slice(24) };
  }
  if (result.exitCode === 1 && !result.killed && !result.signal) {
    return { state: 'absent', startTime: '', command: '' };
  }
  return { state: 'unknown', startTime: '', command: '' };
}

async function groupMembers(pgid) {
  const result = await run('ps', ['-eo', 'pid=,pgid='], PS_TIMEOUT_MS);
  if (!result.ok) { return { state: 'unknown', pids: [] }; }
  const pids = [];
  const lines = result.stdout.split('\n');
  for (let index = 0; index < lines.length; index += 1) {
    const parts = lines[index].trim().split(/\s+/);
    if (parts.length >= 2 && parts[1] === String(pgid)) { pids.push(parts[0]); }
  }
  return { state: 'observed', pids };
}

async function terminateWorker(record, hardStopReached) {
  const evidencePath = workerEvidencePath();
  if (fs.existsSync(evidencePath)) {
    const existing = readJsonIfExists(evidencePath);
    if (!validWorkerEvidence(existing, record)) { return 'pending'; }
    if (existing.confirmed === true) { return 'settled'; }
  }
  const finish = function (confirmed, errorCode) {
    const receipt = {
      schemaVersion: 1, attemptId: cfg.attemptId, generation: cfg.generation, role: cfg.role,
      runtimeDigest: cfg.runtimeDigest, confirmed: confirmed, observedAt: Date.now(),
      workerBootId: workerBootId, pid: record.pid, pgid: Number(record.pgid || 0), errorCode: errorCode,
    };
    const persisted = persistMonotonicEvidence(
      evidencePath,
      receipt,
      function (value) { return validWorkerEvidence(value, record); },
    );
    return persisted && confirmed ? 'settled' : 'pending';
  };
  const observed = await observeProcess(record.pid);
  if (observed.state === 'unknown') {
    if (hardStopReached) { finish(false, 'WORKER_STATE_UNKNOWN'); }
    return 'pending';
  }
  if (observed.state === 'absent') {
    const group = await groupMembers(Number(record.pgid || 0));
    if (group.state === 'unknown') {
      if (hardStopReached) { finish(false, 'WORKER_GROUP_STATE_UNKNOWN'); }
      return 'pending';
    }
    if (group.pids.length > 0) {
      if (hardStopReached) { finish(false, 'WORKER_GROUP_SURVIVED'); }
      return 'pending';
    }
    return finish(true, 'WORKER_ALREADY_GONE');
  }
  const identityValid =
    observed.startTime === String(record.workerStartTime || '') &&
    observed.command.indexOf(String(record.workerScriptPath || '')) !== -1 &&
    observed.command.indexOf(String(record.jobFilePath || '')) !== -1;
  if (!identityValid) {
    if (hardStopReached) { finish(false, 'WORKER_IDENTITY_UNVERIFIED'); }
    return 'pending';
  }
  try {
    const pgid = Number(record.pgid || 0);
    if (pgid > 0 && pgid === Number(record.pid)) { process.kill(-pgid, 'SIGKILL'); }
    else { process.kill(Number(record.pid), 'SIGKILL'); }
  } catch (error) {}
  const after = await observeProcess(record.pid);
  if (after.state === 'unknown') {
    if (hardStopReached) { finish(false, 'WORKER_STATE_UNKNOWN'); }
    return 'pending';
  }
  const group = await groupMembers(Number(record.pgid || 0));
  if (group.state === 'unknown') {
    if (hardStopReached) { finish(false, 'WORKER_GROUP_STATE_UNKNOWN'); }
    return 'pending';
  }
  if (after.state === 'running' || group.pids.length > 0) {
    if (hardStopReached) { finish(false, 'WORKER_TERMINATION_UNVERIFIED'); }
    return 'pending';
  }
  return finish(true, 'SUPERVISOR_DEADLINE_EXCEEDED');
}

function releaseStaleLock() {
  // Intentionally a no-op: only the lifecycle-lock owner may release its lock. A crashed
  // owner leaves the lock in place, which fails closed rather than allowing silent theft.
}

async function main() {
  writeFirstJson(readyPath, {
    schemaVersion: 1, pid: process.pid, attemptId: cfg.attemptId, generation: cfg.generation,
    role: cfg.role, startedAt: Date.now(), workerBootId: workerBootId, armed: true,
    runtimeDigest: cfg.runtimeDigest, assetPath: process.argv[1], configPath: configPath,
  });
  const hardStop = Number(cfg.deadline) + HARD_GRACE_MS;
  for (;;) {
    const now = Date.now();
    const hardStopReached = now >= hardStop;
    let unresolved = 0;
    const files = listInstanceFiles();
    for (let index = 0; index < files.length; index += 1) {
      const entry = files[index];
      const evidencePath = instanceEvidencePath(entry.instanceIdFromName);
      const record = readJsonIfExists(path.join(cfg.stateDir, entry.name));
      if (
        !record ||
        typeof record !== 'object' ||
        record.attemptId !== cfg.attemptId ||
        record.generation !== cfg.generation ||
        record.role !== cfg.role ||
        record.runtimeDigest !== cfg.runtimeDigest ||
        record.instanceId !== entry.instanceIdFromName
      ) {
        unresolved += 1;
        continue;
      }
      if (fs.existsSync(evidencePath)) {
        const existing = readJsonIfExists(evidencePath);
        if (!validInstanceEvidence(existing, record)) {
          unresolved += 1;
          continue;
        }
        if (existing.confirmed === true) { continue; }
      }
      const dueAt = Math.min(Number(record.deadline || cfg.deadline), Number(cfg.deadline));
      if (now < dueAt && !hardStopReached) { unresolved += 1; continue; }
      const outcome = await terminateInstance(record, hardStopReached);
      if (outcome !== 'settled') { unresolved += 1; }
    }

    let workerPending = false;
    const workerEvidence = workerEvidencePath();
    const workerRecord = readJsonIfExists(workerRecordPath());
    const intentPath = workerLaunchIntentPath();
    const launchIntent = readJsonIfExists(intentPath);
    let worker = workerRecord;
    if (
      !worker &&
      launchIntent &&
      launchIntent.attemptId === cfg.attemptId &&
      launchIntent.generation === cfg.generation &&
      launchIntent.role === cfg.role &&
      launchIntent.runtimeDigest === cfg.runtimeDigest &&
      launchIntent.record &&
      typeof launchIntent.record === 'object'
    ) {
      worker = launchIntent.record;
    }
    if (fs.existsSync(workerEvidence)) {
      const existing = readJsonIfExists(workerEvidence);
      if (!validWorkerEvidence(existing, worker)) {
        workerPending = true;
      } else if (existing.confirmed === true) {
        workerPending = false;
      } else if (!worker) {
        workerPending = true;
      }
    }
    if (!worker && (fs.existsSync(workerRecordPath()) || fs.existsSync(intentPath))) { workerPending = true; }
    if (
      worker &&
      typeof worker === 'object' &&
      worker.attemptId === cfg.attemptId &&
      worker.generation === cfg.generation &&
      worker.role === cfg.role &&
      worker.runtimeDigest === cfg.runtimeDigest
    ) {
      const existingEvidence = fs.existsSync(workerEvidence)
        ? readJsonIfExists(workerEvidence)
        : null;
      if (!(existingEvidence && validWorkerEvidence(existingEvidence, worker) && existingEvidence.confirmed === true)) {
        const dueAt = Math.min(Number(worker.deadline || cfg.deadline), Number(cfg.deadline));
        if (now < dueAt && !hardStopReached) { workerPending = true; }
        else {
          const outcome = await terminateWorker(worker, hardStopReached);
          if (outcome !== 'settled') { workerPending = true; }
        }
      }
    } else if (worker) {
      workerPending = true;
    }

    const stopRequested = fs.existsSync(cfg.stopPath);
    if (unresolved === 0 && !workerPending) {
      if (stopRequested || hardStopReached) { break; }
    }
    if (hardStopReached) {
      // Final pass already attempted; anything still unresolved is written as unknown below.
      break;
    }
    await new Promise(function (resolve) { setTimeout(resolve, POLL_MS); });
  }

  atomicWriteJson(donePath, { schemaVersion: 1, pid: process.pid, finishedAt: Date.now() });
  process.exit(0);
}

main().catch(function (error) {
  try {
    atomicWriteJson(donePath, {
      schemaVersion: 1, pid: process.pid, finishedAt: Date.now(),
      error: String(error && error.message ? error.message : error),
    });
  } catch (writeError) {}
  process.exit(1);
});
`;

export function sha256Text(value: string): string {
  return crypto.createHash('sha256').update(value, 'utf8').digest('hex');
}

export interface SupervisorAsset {
  id: typeof SUPERVISOR_ASSET_ID;
  source: string;
  sha256: string;
  bytes: number;
}

/** Returns the exact supervisor bytes that will be emitted, with their digest. */
export function getSupervisorAsset(): SupervisorAsset {
  return {
    id: SUPERVISOR_ASSET_ID,
    source: SUPERVISOR_SOURCE,
    sha256: sha256Text(SUPERVISOR_SOURCE),
    bytes: Buffer.byteLength(SUPERVISOR_SOURCE, 'utf8'),
  };
}

async function hashFileStream(filePath: string): Promise<string> {
  return new Promise<string>((resolve, reject) => {
    const hash = crypto.createHash('sha256');
    const stream = fs.createReadStream(filePath);
    stream.on('data', (chunk: Buffer) => hash.update(chunk));
    stream.on('error', reject);
    stream.on('end', () => resolve(hash.digest('hex')));
  });
}

/**
 * Resolves only the trusted standalone ESM worker shipped next to the built CLI bundle.
 * Missing asset denies execution; source-tree and legacy module fallbacks are forbidden.
 */
export async function resolveWorkerAssetPath(): Promise<string> {
  const candidate = path.join(__dirname, 'OmpWorkerScript.mjs');
  try {
    const stat = await fs.lstat(candidate);
    if (stat.isFile() && !stat.isSymbolicLink())
      return await fs.realpath(candidate);
  } catch {
    // Missing build output is a hard denial below.
  }
  throw new HarnessError(
    'WORKER_ASSET_NOT_FOUND',
    'The trusted OMP worker asset is not shipped next to the runtime bundle; execution denied.',
  );
}

export interface WorkerAsset {
  id: typeof WORKER_ASSET_ID;
  path: string;
  sha256: string;
  bytes: number;
}

/**
 * Reads and hashes the actual worker asset bytes that will be spawned. Path binding is the
 * manifest's, so verification compares the exact configured file rather than a guess.
 */
export async function readWorkerAsset(): Promise<WorkerAsset> {
  const candidate = await resolveWorkerAssetPath();
  const stat = await fs.lstat(candidate).catch(() => null);
  if (!stat || !stat.isFile() || stat.isSymbolicLink()) {
    throw new HarnessError(
      'WORKER_ASSET_NOT_FOUND',
      `Trusted OMP worker asset is missing or not a regular file: ${candidate}`,
    );
  }
  const real = await fs.realpath(candidate);
  const sha256 = await hashFileStream(real);
  return { id: WORKER_ASSET_ID, path: real, sha256, bytes: stat.size };
}
