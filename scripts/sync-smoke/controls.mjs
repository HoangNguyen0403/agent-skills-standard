// Disjoint child-lifecycle and network-control probes for the S7 fixture.
//
// Two jobs:
//   1. Export the owned-process lifecycle used by `run.mjs`: spawn in its own
//      process group, bounded capture, async spawn-error capture, timeout
//      termination of the whole group, and verified termination.
//   2. Run synthetic control probes in bounded children so the fixture proves
//      the preload boundary it claims: allowlisted transport works, unknown
//      destinations/DNS/resolvers/net/tls/platform fetch are denied, and the
//      verdict composer cannot pass an empty-behavior scenario.
//
// Controls never touch a live external network. Node standard library only.

import fs from 'node:fs';
import path from 'node:path';
import net from 'node:net';
import tls from 'node:tls';
import dns from 'node:dns';
import http from 'node:http';
import https from 'node:https';
import { spawn } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath } from 'node:url';

const HERE = path.dirname(fileURLToPath(import.meta.url));
const IS_POSIX = process.platform !== 'win32';
const DENIED = 'ESYNCSMOKEDENIED';

export function delay(ms) {
  return new Promise((resolve) => setTimeout(resolve, ms));
}

function groupAlive(pid) {
  if (!pid) return false;
  if (IS_POSIX) {
    try {
      process.kill(-pid, 0);
      return true;
    } catch (error) {
      return error.code === 'EPERM';
    }
  }
  try {
    process.kill(pid, 0);
    return true;
  } catch (error) {
    return error.code === 'EPERM';
  }
}

/**
 * Terminates the owned process group (POSIX) or process (Windows) with a
 * bounded escalate-and-verify sequence. `verified` is only true when no member
 * of the owned group remains alive and at least one owned pid existed.
 */
export async function terminateTree(child) {
  const pid = child?.pid ?? null;
  const result = {
    pid,
    signals: [],
    aliveAfter: false,
    errors: [],
    verified: false,
    groupIsolation: IS_POSIX ? 'process-group' : 'single-process-only',
  };
  if (!pid) {
    result.errors.push('missing child pid');
    return result;
  }
  const signal = (name) => {
    try {
      if (IS_POSIX) process.kill(-pid, name);
      else process.kill(pid, name);
      result.signals.push(name);
    } catch (error) {
      if (error.code !== 'ESRCH') result.errors.push(`${name}:${error.code}`);
    }
  };
  if (groupAlive(pid)) signal('SIGTERM');
  for (let index = 0; index < 5 && groupAlive(pid); index += 1) {
    await delay(100);
  }
  if (groupAlive(pid)) signal('SIGKILL');
  for (let index = 0; index < 20 && groupAlive(pid); index += 1) {
    await delay(100);
  }
  result.aliveAfter = groupAlive(pid);
  result.verified =
    !result.aliveAfter && result.errors.length === 0 && IS_POSIX;
  return result;
}

function spawnFailure(startedAt, error) {
  return {
    code: null,
    signal: null,
    timedOut: false,
    spawnError: error instanceof Error ? error.message : String(error),
    unsettledPipes: false,
    truncated: false,
    stdout: '',
    stderr: '',
    teardown: {
      pid: null,
      signals: [],
      aliveAfter: false,
      errors: ['spawn failed'],
      verified: false,
      groupIsolation: IS_POSIX ? 'process-group' : 'single-process-only',
    },
    durationMs: Date.now() - startedAt,
  };
}

/**
 * Spawns an owned child, captures bounded output, records asynchronous spawn
 * errors, enforces a timeout by terminating the whole group, and always
 * returns health flags plus verified teardown evidence. Losing guard timers are
 * cancelled so a fast close cannot keep the process alive.
 */
export async function runOwnedProcess({
  args,
  cwd,
  env,
  timeoutMs,
  limit = 512 * 1024,
}) {
  const startedAt = Date.now();
  let child;
  try {
    child = spawn(process.execPath, args, {
      cwd,
      env,
      stdio: ['ignore', 'pipe', 'pipe'],
      detached: IS_POSIX,
    });
  } catch (error) {
    return spawnFailure(startedAt, error);
  }

  let stdout = '';
  let stderr = '';
  let truncated = false;
  const capture = (current, chunk) => {
    if (current.length >= limit) {
      truncated = true;
      return current;
    }
    const text = chunk.toString('utf8');
    const next = current + text;
    if (next.length > limit) {
      truncated = true;
      return next.slice(0, limit);
    }
    return next;
  };
  child.stdout?.on('data', (chunk) => {
    stdout = capture(stdout, chunk);
  });
  child.stderr?.on('data', (chunk) => {
    stderr = capture(stderr, chunk);
  });

  let spawnError = null;
  const closePromise = new Promise((resolve) => {
    child.once('close', (code, signal) =>
      resolve({ kind: 'close', code, signal }),
    );
  });
  // Attach immediately: invalid cwd/exec failures surface asynchronously.
  const errorPromise = new Promise((resolve) => {
    child.on('error', (error) => {
      spawnError = error instanceof Error ? error.message : String(error);
      resolve({ kind: 'error' });
    });
  });

  let teardownPromise = null;
  const ensureTerminated = () => (teardownPromise ??= terminateTree(child));

  let timedOut = false;
  let guardTimer = null;
  const guard = () =>
    new Promise((resolve) => {
      guardTimer = setTimeout(
        () => resolve({ kind: 'guard' }),
        timeoutMs + 3000,
      );
    });
  const timer = setTimeout(() => {
    timedOut = true;
    void ensureTerminated();
  }, timeoutMs);

  let first = await Promise.race([closePromise, errorPromise, guard()]);
  clearTimeout(guardTimer);
  let unsettledPipes = false;
  if (first.kind === 'guard') {
    unsettledPipes = true;
    await ensureTerminated();
    first = await Promise.race([closePromise, errorPromise, guard()]);
    clearTimeout(guardTimer);
  }
  clearTimeout(timer);

  const teardown = await ensureTerminated();
  const close = first.kind === 'close' ? first : null;

  return {
    code: close?.code ?? null,
    signal: close?.signal ?? null,
    timedOut,
    spawnError,
    unsettledPipes,
    truncated,
    stdout,
    stderr,
    teardown,
    durationMs: Date.now() - startedAt,
  };
}

export function healthProblems(result) {
  const problems = [];
  if (result.spawnError) problems.push(`spawn-error: ${result.spawnError}`);
  if (result.timedOut) problems.push('timeout');
  if (result.signal) problems.push(`signal:${result.signal}`);
  if (result.code === null) problems.push('missing-exit-code');
  if (result.truncated) problems.push('output-truncated');
  if (result.unsettledPipes) problems.push('stdio-unsettled');
  if (!result.teardown?.verified) {
    problems.push(`teardown-unverified:${JSON.stringify(result.teardown)}`);
  }
  return problems;
}

/**
 * Verdict composition shared with `run.mjs`: scenario-owned behavior
 * assertions are checked first, an empty behavior list is itself a failure,
 * and common health/teardown assertions are appended afterwards.
 */
export function composeVerdict(behaviorAssertions, commonAssertions) {
  const assertions = Array.isArray(behaviorAssertions)
    ? [...behaviorAssertions]
    : [];
  if (assertions.length === 0) {
    assertions.push({
      id: 'zero-assertions',
      ac: null,
      ok: false,
      expected: 'scenario asserts observable behavior',
      actual: 'zero assertions recorded',
    });
  }
  assertions.push(...(Array.isArray(commonAssertions) ? commonAssertions : []));
  const failed = assertions.filter((assertion) => !assertion.ok);
  return {
    assertions,
    failed,
    status: failed.length === 0 ? 'passed' : 'failed',
  };
}

// ---------------------------------------------------------------------------
// Credential-material oracle
// ---------------------------------------------------------------------------

const TOKEN_SHAPES = [
  /\b(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}\b/gu,
  /\btoken\s+(?:gh[pousr]_|github_pat_)[A-Za-z0-9_]{20,}/giu,
  /\btoken\s+[A-Fa-f0-9]{40}\b/gu,
  /\bAuthorization\s*:\s*(?:token|bearer)\s+\S{8,}/giu,
  /\bBearer\s+[A-Za-z0-9._~+/=-]{20,}\b/giu,
];

/**
 * Detects actual credential material in diagnostics output. Safe guidance such
 * as "no GitHub token was sent; set GITHUB_TOKEN" must not match: every pattern
 * requires a credential-shaped value, not the word `token`.
 */
export function credentialLeakProblems(text, sentinel) {
  const problems = [];
  if (!text) return problems;
  if (sentinel && text.includes(sentinel)) {
    problems.push('synthetic token sentinel present');
  }
  for (const pattern of TOKEN_SHAPES) {
    pattern.lastIndex = 0;
    if (pattern.test(text)) {
      problems.push(`credential-shaped value matched ${pattern.source}`);
    }
  }
  return problems;
}

// ---------------------------------------------------------------------------
// Control probes
// ---------------------------------------------------------------------------

const CONTROL_ENV_KEYS = [
  'PATH',
  'HOME',
  'TMPDIR',
  'LANG',
  'TZ',
  'NO_COLOR',
  'FORCE_COLOR',
  'CI',
];

const CONTROL_EVENTS = new Set([
  'preload-ready',
  'denied',
  'credential-forward',
]);

function controlEnv(baseEnv, origin, denyLog, probePath, crossFetchBase) {
  const env = {};
  for (const key of CONTROL_ENV_KEYS) {
    if (baseEnv[key] !== undefined) env[key] = baseEnv[key];
  }
  env.SYNC_SMOKE_ORIGIN = origin;
  env.SYNC_SMOKE_DENY_LOG = denyLog;
  env.SYNC_SMOKE_CONTROL_PATH = probePath;
  if (crossFetchBase) env.SYNC_SMOKE_CROSS_FETCH = crossFetchBase;
  return env;
}

function parseSingleResult(stdout) {
  const lines = stdout.split('\n').filter((line) => line.trim().length > 0);
  if (lines.length !== 1) {
    return {
      error: `expected exactly one result line, got ${lines.length}`,
      payload: null,
    };
  }
  try {
    return { error: null, payload: JSON.parse(lines[0]) };
  } catch {
    return {
      error: `malformed result: ${lines[0].slice(0, 120)}`,
      payload: null,
    };
  }
}

/**
 * Reads one probe's event log strictly: exactly one readiness record, only
 * known events, no credential forwarding, and exactly the injected denial when
 * the probe intentionally attempted a denied destination.
 */
function validateControlLog(text, expectation) {
  if (text === null) return ['missing control event log'];
  const problems = [];
  const events = [];
  for (const line of text.split('\n')) {
    if (!line.trim()) continue;
    let event;
    try {
      event = JSON.parse(line);
    } catch {
      problems.push(`malformed control event: ${line.slice(0, 120)}`);
      continue;
    }
    if (!event || typeof event.event !== 'string' || !CONTROL_EVENTS.has(event.event)) {
      problems.push(`unknown control event: ${line.slice(0, 120)}`);
      continue;
    }
    events.push(event);
  }
  const ready = events.filter((event) => event.event === 'preload-ready');
  if (ready.length !== 1) {
    problems.push(`preload-ready count ${ready.length}`);
  }
  const credential = events.filter(
    (event) => event.event === 'credential-forward',
  );
  if (credential.length > 0) problems.push('credential-forward event');
  const denials = events.filter((event) => event.event === 'denied');
  if (expectation.denial) {
    const match = denials.filter(
      (event) =>
        event.host === expectation.denial.host &&
        event.kind === expectation.denial.kind,
    );
    if (denials.length !== 1 || match.length !== 1) {
      problems.push(
        `denial evidence mismatch: ${JSON.stringify(
          denials.map((event) => ({ host: event.host, kind: event.kind })),
        )}`,
      );
    }
  } else if (denials.length > 0) {
    problems.push(
      `unexpected denial: ${denials
        .slice(0, 3)
        .map((event) => `${event.kind}:${event.host}`)
        .join(', ')}`,
    );
  }
  return problems;
}

async function runProbe(spec, context) {
  const result = await runOwnedProcess({
    args: spec.args,
    cwd: context.cwd,
    env: spec.env,
    timeoutMs: spec.timeoutMs ?? 5000,
    limit: spec.limit ?? 64 * 1024,
  });
  const problems = [];
  if (spec.expectTimeout) {
    if (!result.timedOut) problems.push('expected timeout');
  } else {
    if (result.spawnError) problems.push(`spawn-error: ${result.spawnError}`);
    if (result.timedOut) problems.push('timeout');
    if (result.signal) problems.push(`signal:${result.signal}`);
    if (result.code !== 0) problems.push(`exit:${result.code}`);
    if (result.truncated) problems.push('output-truncated');
    if (result.unsettledPipes) problems.push('stdio-unsettled');
  }
  if (!result.teardown?.verified) {
    problems.push(`teardown-unverified:${JSON.stringify(result.teardown)}`);
  }

  let payload = null;
  if (spec.mode !== 'raw') {
    const parsed = parseSingleResult(result.stdout);
    payload = parsed.payload;
    if (parsed.error) problems.push(parsed.error);
    else if (spec.mode === 'probe') {
      if (payload?.ok !== true) {
        problems.push(`probe-not-ok: ${JSON.stringify(payload)}`);
      }
      if (payload?.detail !== spec.expect.detail) {
        problems.push(`detail-mismatch: ${JSON.stringify(payload?.detail)}`);
      }
      if (
        spec.expect.bodyIncludes &&
        !String(payload?.bodySample ?? '').includes(spec.expect.bodyIncludes)
      ) {
        problems.push('fixture-response-mismatch');
      }
    }
  }

  return {
    name: spec.name,
    ok: problems.length === 0,
    problems,
    payload,
    exit: result.code,
    signal: result.signal,
    timedOut: result.timedOut,
    spawnError: result.spawnError,
    truncated: result.truncated,
    unsettledPipes: result.unsettledPipes,
    stdoutTail: result.stdout.slice(-400),
    stderrTail: result.stderr.slice(-800),
    teardown: result.teardown,
    durationMs: result.durationMs,
    kind: spec.kind ?? 'network',
  };
}

const NETWORK_PROBES = [
  {
    name: 'http-allow',
    expect: {
      detail: '200',
      bodyIncludes: 'fixture-owner/demo-registry',
    },
  },
  {
    name: 'http-deny',
    expect: { detail: DENIED },
    denial: { host: 'example.invalid', kind: 'http host allowlist' },
  },
  {
    name: 'lookup-allow',
    expect: { detail: '127.0.0.1' },
  },
  {
    name: 'lookup-deny',
    expect: { detail: DENIED },
    denial: { host: 'example.invalid', kind: 'dns.promises.lookup' },
  },
  {
    name: 'resolve-deny',
    expect: { detail: DENIED },
    denial: { host: 'api.github.com', kind: 'dns.resolve4' },
  },
  {
    name: 'promise-resolve-deny',
    expect: { detail: DENIED },
    denial: { host: 'api.github.com', kind: 'dns.promises.resolve4' },
  },
  {
    name: 'promise-reverse-deny',
    expect: { detail: DENIED },
    denial: { host: '8.8.8.8', kind: 'dns.promises.reverse' },
  },
  {
    name: 'resolver-instance-deny',
    expect: { detail: DENIED },
    denial: { host: 'api.github.com', kind: 'dns.Resolver.resolve4' },
  },
  {
    name: 'promises-resolver-instance-deny',
    expect: { detail: DENIED },
    denial: {
      host: 'api.github.com',
      kind: 'dns.promises.Resolver.resolve4',
    },
  },
  {
    name: 'net-loopback',
    expect: { detail: 'connected' },
  },
  {
    name: 'net-deny',
    expect: { detail: DENIED },
    denial: { host: 'example.invalid', kind: 'net.host' },
  },
  {
    name: 'tls-deny',
    expect: { detail: DENIED },
    denial: { host: 'example.invalid', kind: 'tls.connect' },
  },
  {
    name: 'fetch-allow',
    expect: { detail: '200' },
  },
  {
    name: 'fetch-deny',
    expect: { detail: DENIED },
    denial: { host: 'example.invalid', kind: 'global fetch' },
  },
  {
    name: 'cross-fetch-allow',
    expect: {
      detail: '200',
      bodyIncludes: 'fixture-owner/demo-registry',
    },
  },
];

/**
 * Runs the preload boundary controls plus harness lifecycle/verdict controls in
 * bounded children. Any failed control means the fixture's own evidence path is
 * not trustworthy, so the caller must abort qualification and keep the evidence.
 */
export async function runControlSuite({
  origin,
  preloadPath,
  baseEnv,
  tmpRoot,
  probePath = '/repos/fixture-owner/demo-registry',
  crossFetchBase = null,
}) {
  const cwd = await fs.promises.mkdtemp(path.join(tmpRoot, 'controls-'));
  const controlsScript = path.join(HERE, 'controls.mjs');
  const results = [];
  let counter = 0;

  for (const probe of NETWORK_PROBES) {
    counter += 1;
    const denyLog = path.join(cwd, `control-${counter}.events.log`);
    const env = controlEnv(
      baseEnv,
      origin,
      denyLog,
      probePath,
      crossFetchBase,
    );
    const result = await runProbe(
      {
        name: probe.name,
        args: [
          '--require',
          preloadPath,
          controlsScript,
          'child',
          'net',
          probe.name,
        ],
        env,
        mode: 'probe',
        expect: probe.expect,
      },
      { cwd },
    );
    const logText = await fs.promises
      .readFile(denyLog, 'utf8')
      .catch(() => null);
    const logProblems = validateControlLog(logText, {
      denial: probe.denial ?? null,
    });
    results.push({
      ...result,
      problems: [...result.problems, ...logProblems],
      ok: result.ok && logProblems.length === 0,
      kind: 'network',
    });
  }

  // Harness control: a real exit code is captured without timeout.
  const exitProbe = await runProbe(
    {
      name: 'harness-exit-code',
      args: [controlsScript, 'child', 'exit', '3'],
      env: controlEnv(baseEnv, origin, path.join(cwd, 'unused.log'), probePath),
      mode: 'raw',
    },
    { cwd },
  );
  {
    const problems = [];
    if (exitProbe.exit !== 3) problems.push(`unexpected exit ${exitProbe.exit}`);
    if (exitProbe.timedOut !== false) problems.push('unexpected timeout');
    if (exitProbe.signal !== null) problems.push(`signal ${exitProbe.signal}`);
    if (exitProbe.spawnError) problems.push(`spawn ${exitProbe.spawnError}`);
    if (exitProbe.teardown?.verified !== true) problems.push('teardown unverified');
    results.push({
      ...exitProbe,
      kind: 'lifecycle',
      problems,
      ok: problems.length === 0,
    });
  }

  // Harness control: bounded output truncation is detected.
  const floodProbe = await runProbe(
    {
      name: 'harness-truncation',
      args: [controlsScript, 'child', 'flood'],
      env: controlEnv(
        baseEnv,
        origin,
        path.join(cwd, 'unused-flood.log'),
        probePath,
      ),
      limit: 4096,
      mode: 'raw',
    },
    { cwd },
  );
  {
    const problems = [];
    if (floodProbe.truncated !== true) problems.push('truncation not detected');
    if (floodProbe.timedOut !== false) problems.push('unexpected timeout');
    if (floodProbe.teardown?.verified !== true) problems.push('teardown unverified');
    results.push({
      ...floodProbe,
      kind: 'lifecycle',
      problems,
      ok: problems.length === 0,
    });
  }

  // Harness control: async spawn errors (invalid cwd) are captured, not
  // swallowed, and an unverifiable teardown is reported.
  {
    const invalid = await runOwnedProcess({
      args: [controlsScript, 'child', 'exit', '0'],
      cwd: path.join(cwd, 'missing-cwd'),
      env: controlEnv(baseEnv, origin, path.join(cwd, 'unused-cwd.log'), probePath),
      timeoutMs: 3000,
      limit: 4096,
    });
    const problems = [];
    if (!invalid.spawnError) problems.push('spawn error not captured');
    if (invalid.code !== null) problems.push(`unexpected exit ${invalid.code}`);
    if (invalid.teardown?.verified !== false) {
      problems.push('teardown unexpectedly verified');
    }
    if (!healthProblems(invalid).some((problem) => problem.startsWith('spawn-error'))) {
      problems.push('health did not report spawn error');
    }
    results.push({
      name: 'harness-invalid-cwd',
      kind: 'lifecycle',
      ok: problems.length === 0,
      problems,
      spawnError: invalid.spawnError,
      exit: invalid.code,
      teardown: invalid.teardown,
      durationMs: invalid.durationMs,
    });
  }

  // Harness control: verdict composition checks behavior assertions first and
  // fails a healthy invocation that recorded zero behavior assertions.
  {
    const zero = composeVerdict([], [{ id: 'common', ok: true }]);
    const mixed = composeVerdict([{ id: 'behavior', ok: true }], [
      { id: 'common', ok: false },
    ]);
    const pass = composeVerdict([{ id: 'behavior', ok: true }], [
      { id: 'common', ok: true },
    ]);
    const problems = [];
    if (
      zero.status !== 'failed' ||
      !zero.failed.some((assertion) => assertion.id === 'zero-assertions')
    ) {
      problems.push('zero behavior assertions did not fail');
    }
    if (mixed.status !== 'failed') problems.push('common health did not fail');
    if (pass.status !== 'passed') problems.push('healthy case did not pass');
    results.push({
      name: 'harness-verdict-order',
      kind: 'lifecycle',
      ok: problems.length === 0,
      problems,
    });
  }

  // Harness control: the credential oracle accepts safe auth guidance and
  // catches real token/header material (fixed fake samples, no source scan).
  {
    const safe = JSON.stringify({
      hint: 'no GitHub token was sent; set GITHUB_TOKEN for a higher limit.',
      github: { authenticated: false },
    });
    const problems = [];
    if (credentialLeakProblems(safe, 'ghp_SYNCSMOKE0000000000000000000000000000').length) {
      problems.push('safe auth guidance flagged');
    }
    for (const sample of [
      'token ghp_FAKE000000000000000000000000000000',
      'Authorization: token abcdefabcdefabcdefabcdefabcdefabcdefabcd',
      `Bearer ${'A'.repeat(30)}`,
      'ghp_SYNCSMOKE0000000000000000000000000000',
    ]) {
      if (credentialLeakProblems(sample, 'ghp_SYNCSMOKE0000000000000000000000000000').length === 0) {
        problems.push(`fake credential not detected: ${sample.slice(0, 20)}`);
      }
    }
    results.push({
      name: 'harness-auth-oracle',
      kind: 'lifecycle',
      ok: problems.length === 0,
      problems,
    });
  }

  // Harness control: timeout terminates the whole owned group, including a
  // grandchild, and termination is verified before returning.
  const treeProbe = await runProbe(
    {
      name: 'process-tree-teardown',
      args: [controlsScript, 'child', 'tree'],
      env: controlEnv(
        baseEnv,
        origin,
        path.join(cwd, 'unused-tree.log'),
        probePath,
      ),
      timeoutMs: 800,
      expectTimeout: true,
      mode: 'payload',
    },
    { cwd },
  );
  let grandchildAlive = null;
  const grandchildPid = Number(treeProbe.payload?.grandchild ?? 0);
  if (grandchildPid > 0) {
    try {
      process.kill(grandchildPid, 0);
      grandchildAlive = true;
    } catch (error) {
      grandchildAlive = error.code === 'EPERM';
    }
  }
  results.push({
    ...treeProbe,
    kind: 'lifecycle',
    grandchildPid: grandchildPid || null,
    grandchildAlive,
    ok:
      treeProbe.ok &&
      treeProbe.timedOut === true &&
      treeProbe.teardown?.verified === true &&
      treeProbe.teardown?.aliveAfter === false &&
      grandchildAlive === false,
    problems: [
      ...treeProbe.problems,
      ...(grandchildAlive === false ? [] : ['grandchild survived teardown']),
    ],
  });

  const failed = results.filter((result) => !result.ok);
  const teardownUnverified = results.some(
    (result) =>
      result.teardown !== undefined &&
      result.teardown?.verified !== true &&
      result.name !== 'harness-invalid-cwd',
  );
  if (!teardownUnverified && failed.length === 0) {
    await fs.promises.rm(cwd, { recursive: true, force: true });
  }
  return {
    ok: failed.length === 0 && !teardownUnverified,
    failed: failed.map((result) => result.name),
    teardownUnverified,
    preservedDir: teardownUnverified || failed.length > 0 ? cwd : null,
    probes: results,
  };
}

// ---------------------------------------------------------------------------
// Probe child entrypoints
// ---------------------------------------------------------------------------

function emit(payload) {
  process.stdout.write(`${JSON.stringify(payload)}\n`);
}

async function childNet(probe) {
  const origin = process.env.SYNC_SMOKE_ORIGIN;
  const originUrl = new URL(origin);
  const controlPath = process.env.SYNC_SMOKE_CONTROL_PATH ?? '/';
  const apiUrl = `https://api.github.com${controlPath}`;

  const expectError = async (action) => {
    try {
      await action();
      emit({ ok: false, detail: 'no error' });
    } catch (error) {
      emit({ ok: true, detail: error?.code ?? error?.message ?? String(error) });
    }
  };

  if (probe === 'http-allow') {
    await new Promise((resolve) => {
      https
        .get(apiUrl, { timeout: 3000 }, (response) => {
          const chunks = [];
          response.on('data', (chunk) => chunks.push(chunk));
          response.on('end', () => {
            const body = Buffer.concat(chunks).toString('utf8');
            emit({
              ok: response.statusCode === 200,
              detail: String(response.statusCode),
              bodySample: body.slice(0, 400),
            });
            resolve();
          });
        })
        .on('error', (error) => {
          emit({ ok: false, detail: error.code ?? error.message });
          resolve();
        });
    });
    return;
  }
  if (probe === 'http-deny') {
    await expectError(
      () =>
        new Promise((resolve, reject) => {
          http
            .get('http://example.invalid/sync-smoke-control', { timeout: 3000 })
            .on('response', (response) => {
              response.resume();
              reject(new Error('unexpected response'));
            })
            .on('error', reject);
        }),
    );
    return;
  }
  if (probe === 'lookup-allow') {
    try {
      const address = await dns.promises.lookup('api.github.com');
      emit({ ok: address.address === '127.0.0.1', detail: address.address });
    } catch (error) {
      emit({ ok: false, detail: error.code ?? error.message });
    }
    return;
  }
  if (probe === 'lookup-deny') {
    await expectError(() => dns.promises.lookup('example.invalid'));
    return;
  }
  if (probe === 'resolve-deny') {
    await new Promise((resolve) => {
      dns.resolve4('api.github.com', (error) => {
        emit({ ok: error?.code === DENIED, detail: error?.code ?? 'no-error' });
        resolve();
      });
    });
    return;
  }
  if (probe === 'promise-resolve-deny') {
    await expectError(() => dns.promises.resolve4('api.github.com'));
    return;
  }
  if (probe === 'promise-reverse-deny') {
    await expectError(() => dns.promises.reverse('8.8.8.8'));
    return;
  }
  if (probe === 'resolver-instance-deny') {
    await new Promise((resolve) => {
      new dns.Resolver().resolve4('api.github.com', (error) => {
        emit({ ok: error?.code === DENIED, detail: error?.code ?? 'no-error' });
        resolve();
      });
    });
    return;
  }
  if (probe === 'promises-resolver-instance-deny') {
    await expectError(() =>
      new dns.promises.Resolver().resolve4('api.github.com'),
    );
    return;
  }
  if (probe === 'net-loopback') {
    await new Promise((resolve) => {
      const socket = net.connect(
        { host: originUrl.hostname, port: Number(originUrl.port) },
        () => {
          socket.destroy();
          emit({ ok: true, detail: 'connected' });
          resolve();
        },
      );
      socket.on('error', (error) => {
        emit({ ok: false, detail: error.code ?? error.message });
        resolve();
      });
      socket.setTimeout(3000, () => {
        socket.destroy();
        emit({ ok: false, detail: 'timeout' });
        resolve();
      });
    });
    return;
  }
  if (probe === 'net-deny') {
    await expectError(
      () =>
        new Promise((resolve, reject) => {
          const socket = net.connect({ host: 'example.invalid', port: 80 });
          socket.once('connect', () => {
            socket.destroy();
            reject(new Error('unexpected connect'));
          });
          socket.once('error', reject);
        }),
    );
    return;
  }
  if (probe === 'tls-deny') {
    await expectError(
      () =>
        new Promise((resolve, reject) => {
          const socket = tls.connect({ host: 'example.invalid', port: 443 });
          socket.once('secureConnect', () => {
            socket.destroy();
            reject(new Error('unexpected secureConnect'));
          });
          socket.once('error', reject);
        }),
    );
    return;
  }
  if (probe === 'fetch-allow') {
    try {
      const response = await fetch(apiUrl);
      const body = await response.text();
      emit({
        ok: response.status === 200,
        detail: String(response.status),
        bodySample: body.slice(0, 400),
      });
    } catch (error) {
      emit({ ok: false, detail: error.code ?? error.message });
    }
    return;
  }
  if (probe === 'fetch-deny') {
    await expectError(() => fetch('http://example.invalid/control'));
    return;
  }
  if (probe === 'cross-fetch-allow') {
    try {
      const base = process.env.SYNC_SMOKE_CROSS_FETCH;
      if (!base) {
        emit({ ok: false, detail: 'missing SYNC_SMOKE_CROSS_FETCH' });
        return;
      }
      const crossFetch = createRequire(base)('cross-fetch');
      const response = await crossFetch(apiUrl);
      const text = await response.text();
      emit({
        ok: response.status === 200,
        detail: String(response.status),
        bodySample: text.slice(0, 400),
      });
    } catch (error) {
      emit({
        ok: false,
        detail: `${error?.name ?? 'Error'}: ${error?.message ?? String(error)}`,
      });
    }
    return;
  }
  emit({ ok: false, detail: `unknown probe ${probe}` });
}

function childTree() {
  const grandchild = spawn(
    process.execPath,
    ['-e', 'setInterval(() => {}, 1000)'],
    { stdio: 'ignore' },
  );
  emit({ probe: 'tree', grandchild: grandchild.pid });
  setInterval(() => {}, 1000);
}

function childFlood() {
  const chunk = 'x'.repeat(1024);
  const timer = setInterval(() => process.stdout.write(chunk), 1);
  setTimeout(() => {
    clearInterval(timer);
    process.exit(0);
  }, 500);
}

if (
  process.argv[1] &&
  path.resolve(process.argv[1]) === path.resolve(fileURLToPath(import.meta.url))
) {
  const mode = process.argv[2];
  if (mode === 'child') {
    const kind = process.argv[3];
    if (kind === 'net') {
      void childNet(process.argv[4]);
    } else if (kind === 'exit') {
      process.exit(Number(process.argv[4] ?? 0));
    } else if (kind === 'flood') {
      childFlood();
    } else if (kind === 'tree') {
      childTree();
    } else {
      process.stderr.write(`unknown child mode ${kind}\n`);
      process.exit(64);
    }
  } else {
    process.stderr.write('controls.mjs is a library; no standalone mode\n');
    process.exit(64);
  }
}
