#!/usr/bin/env node
// artifacts/diagnostic-prevention/implementation/attempt-01/installed-brief-smoke.mjs
// Bounded throwaway scenario helper for Task 8:
// Runs the ACTUAL built CLI (`cli/dist/index.js sync --yes`) inside a fresh
// temporary consumer against the loopback candidate registry fixture (isolated
// HOME/XDG, network preload, no credentials), then executes the INSTALLED
// scripts/task_brief.py via python3 from an empty foreign CWD to verify the
// Task 2/3 brief contract invariants against installed bytes only.
//
// Verification tooling only: no source import forwarding, no fabricated PASS,
// no model/host claims. Network consumers run asynchronously because the
// loopback fixture server lives in this same process and must answer requests.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_CANDIDATE_ROOT = path.resolve(__dirname, '../../../..');
const OUTPUT_LIMIT = 64 * 1024;

const INSTALLED_SCRIPT_REL =
  '.claude/skills/common/common-subagent-driven-development/scripts/task_brief.py';
const CANONICAL_SCRIPT_REL =
  'skills/common/common-subagent-driven-development/scripts/task_brief.py';

function parseArgs(argv) {
  const args = {};
  for (let i = 2; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--help' || flag === '-h') {
      args.help = true;
      continue;
    }
    if (flag === '--candidate-root') {
      const val = argv[++i];
      if (!val || val.startsWith('--')) throw new Error('--candidate-root requires a value');
      args.candidateRoot = path.resolve(val);
      continue;
    }
    if (flag === '--cli') {
      const val = argv[++i];
      if (!val || val.startsWith('--')) throw new Error('--cli requires a value');
      args.cli = path.resolve(val);
      continue;
    }
    if (flag === '--out') {
      const val = argv[++i];
      if (!val || val.startsWith('--')) throw new Error('--out requires a value');
      args.out = path.resolve(val);
      continue;
    }
    if (flag === '--keep-temp') {
      args.keepTemp = true;
      continue;
    }
    throw new Error(`Unknown argument: ${flag}`);
  }
  return args;
}

function printUsage() {
  console.log(`
Usage:
  node artifacts/diagnostic-prevention/implementation/attempt-01/installed-brief-smoke.mjs [options]

Options:
  --candidate-root <path>  Absolute path to repository candidate root (default: repo root)
  --cli <path>             Absolute path to built CLI entrypoint (default: <root>/cli/dist/index.js)
  --out <path>             Path to write the smoke verification outcome JSON (required exclusive)
  --keep-temp              Retain temporary consumer workspace for post-run inspection
  --help, -h               Show this help message
`);
}

function sha256(content) {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return crypto.createHash('sha256').update(buf).digest('hex');
}

function getCandidateCommitSha(candidateRoot) {
  const res = spawnSync('git', ['rev-parse', 'HEAD'], {
    cwd: candidateRoot,
    encoding: 'utf8',
    timeout: 5000,
  });
  if (res.status !== 0 || !res.stdout || !/^[a-f0-9]{40}$/i.test(res.stdout.trim())) {
    throw new Error(`Failed to resolve git HEAD SHA from ${candidateRoot}: ${res.stderr || res.stdout}`);
  }
  return res.stdout.trim().toLowerCase();
}

/**
 * Public failure receipt that never overwrites prior evidence.
 * Returns the written path, or null when publication was refused/impossible.
 */
function publishBlockedReceipt(outPath, record) {
  if (fs.existsSync(outPath)) {
    console.error(`Refusing to overwrite existing evidence at ${outPath}; blocked receipt not published.`);
    return null;
  }
  try {
    fs.mkdirSync(path.dirname(outPath), { recursive: true });
    fs.writeFileSync(outPath, JSON.stringify(record, null, 2), { encoding: 'utf8', flag: 'wx' });
    console.error(`Blocked failure receipt written exclusively to: ${outPath}`);
    return outPath;
  } catch (err) {
    console.error(`Failed to publish blocked receipt at ${outPath}: ${err.message}`);
    return null;
  }
}

/**
 * Spawn a bounded child asynchronously. Async is mandatory for the CLI sync:
 * the loopback registry fixture is served by THIS process, so a synchronous
 * spawn would deadlock until the child timeout.
 */
function runBounded(command, args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 30000;
  return new Promise((resolve) => {
    const child = spawn(command, args, {
      cwd: options.cwd,
      env: options.env,
      stdio: ['ignore', 'pipe', 'pipe'],
    });
    let stdout = '';
    let stderr = '';
    let timedOut = false;
    let settled = false;
    const timer = setTimeout(() => {
      timedOut = true;
      try {
        child.kill('SIGKILL');
      } catch {
        // The close handler still reports the bounded outcome.
      }
    }, timeoutMs);
    const finish = (status, error) => {
      if (settled) return;
      settled = true;
      clearTimeout(timer);
      resolve({
        status,
        stdout,
        stderr,
        timedOut,
        spawnError: error ? error.message : null,
      });
    };
    child.stdout.on('data', (chunk) => {
      if (stdout.length < OUTPUT_LIMIT) stdout += chunk.toString('utf8');
    });
    child.stderr.on('data', (chunk) => {
      if (stderr.length < OUTPUT_LIMIT) stderr += chunk.toString('utf8');
    });
    child.on('error', (err) => finish(null, err));
    child.on('close', (code) => finish(code, null));
  });
}

// Canonical complete contract: every mandatory field outside fences, with both
// invariant directions and an explicit terminal handoff status.
const CANONICAL_POSITIVE_PLAN = `# Implementation Plan

## Task 1: Complete Positive Contract Implementation

**Files:** \`src/engine.ts\`, \`src/types.ts\`
**Scope / owned write set:** \`src/engine.ts\`, \`src/types.ts\` only. No changes to unrelated packages.
**Inputs:** validated schema, baseline design doc.
**Outputs:** feature engine implementation, exported types.
**Real Ingress:** CLI entrypoint \`src/index.ts\`.
**Invariants:**
- Positive: returns success 200 on valid input.
- Negative: rejects malformed input with 400 without state change.
**Verification Owner:** parent orchestrator via \`pnpm test\`
**Handoff / freeze:** report \`task-1-report.md\` marked FINAL
**Correction Route:** host ladder: 1 follow-up then escalate

- [ ] Implementation step 1
- [ ] Implementation step 2

## Task 2: Next Sibling Task

**Files:** \`src/next.ts\`
`;

const CANONICAL_INCOMPLETE_PLAN = `# Implementation Plan

## Task 1: Incomplete Contract Task

This task is missing all required bold contract headings outside fences.
- [ ] Implement something
- [ ] No contract labels present

## Task 2: Next Task
`;

// Frozen contract: labels match case-insensitively; values stay on the label line.
const MIXED_CASE_LABELS_PLAN = `# Implementation Plan

## Task 1: Mixed Case Labels Contract

**FILES:** \`src/engine.ts\`
**INPUTS:** validated schema
**OUTPUTS:** engine implementation
**REAL INGRESS:** CLI entrypoint
**INVARIANTS:**
- POSITIVE: returns success on valid input.
- NEGATIVE: rejects malformed input without state change.
**VERIFICATION OWNER:** parent orchestrator
**HANDOFF / FREEZE:** report \`task-1-report.md\` marked FINAL
**CORRECTION ROUTE:** host ladder
`;

// Frozen contract: fenced examples never satisfy validation, for both marker types.
const FENCED_LABELS_PLAN = `# Implementation Plan

## Task 1: Fenced Labels Only

The following tilde-fenced example must not count as a contract:

~~~markdown
**Files:** src/engine.ts
**Inputs:** validated schema
**Outputs:** engine implementation
**Real Ingress:** CLI entrypoint
**Invariants:**
- Positive: returns success.
- Negative: rejects malformed input.
**Verification Owner:** parent orchestrator
**Handoff / freeze:** report marked FINAL
**Correction route:** host ladder
~~~

The following backtick-fenced example must not count either:

\`\`\`markdown
**Files:** src/engine.ts
**Inputs:** validated schema
**Outputs:** engine implementation
**Real Ingress:** CLI entrypoint
**Invariants:**
- Positive: returns success.
- Negative: rejects malformed input.
**Verification Owner:** parent orchestrator
**Handoff / freeze:** report marked FINAL
**Correction route:** host ladder
\`\`\`

This task only has prose outside the fences.
`;

// Frozen contract: a label whose value is on the following line is empty and refused.
const NEXT_LINE_VALUE_PLAN = `# Implementation Plan

## Task 1: Next Line Value

**Files:** \`src/engine.ts\`
**Inputs:**
validated schema
**Outputs:** engine implementation
**Real Ingress:** CLI entrypoint
**Invariants:**
- Positive: returns success.
- Negative: rejects malformed input.
**Verification Owner:** parent orchestrator
**Handoff / freeze:** report marked FINAL
**Correction route:** host ladder
`;

export async function runInstalledBriefSmoke(options = {}) {
  const candidateRoot = options.candidateRoot || DEFAULT_CANDIDATE_ROOT;
  const cliPath = options.cli || path.join(candidateRoot, 'cli/dist/index.js');
  const outPath = options.out || path.join(
    candidateRoot,
    'artifacts/diagnostic-prevention/implementation/attempt-01/installed-brief-smoke-run.json'
  );

  // Invariant: output reservation is exclusive; never overwrite prior evidence.
  if (fs.existsSync(outPath)) {
    throw new Error(`Output file already exists, refusing to overwrite: ${outPath}`);
  }
  if (!fs.existsSync(candidateRoot) || !fs.statSync(candidateRoot).isDirectory()) {
    throw new Error(`Candidate root directory not found: ${candidateRoot}`);
  }
  if (!fs.existsSync(cliPath) || !fs.statSync(cliPath).isFile()) {
    throw new Error(`Built CLI entrypoint not found at ${cliPath}. Run 'pnpm --filter ./agent-skills-standard build' or 'pnpm build' in cli first.`);
  }

  const preloadScript = path.join(
    candidateRoot,
    'scripts/skill-tests/product-evidence-integration/network-preload.cjs'
  );
  if (!fs.existsSync(preloadScript)) {
    throw new Error(`Network preload script not found at ${preloadScript}`);
  }
  const fixtureModulePath = path.join(
    candidateRoot,
    'scripts/skill-tests/product-evidence-integration/registry-fixture.mjs'
  );
  if (!fs.existsSync(fixtureModulePath)) {
    throw new Error(`Registry fixture module not found at ${fixtureModulePath}`);
  }
  const sourceTaskBriefPath = path.join(candidateRoot, CANONICAL_SCRIPT_REL);
  if (!fs.existsSync(sourceTaskBriefPath)) {
    throw new Error(`Source task_brief.py not found at ${sourceTaskBriefPath}`);
  }

  const sourceTaskBriefSha = sha256(fs.readFileSync(sourceTaskBriefPath));
  const commitSha = getCandidateCommitSha(candidateRoot);
  const cliBuildSha = sha256(fs.readFileSync(cliPath));

  console.log('=== Installed Brief Smoke Runner ===');
  console.log(`Candidate Root: ${candidateRoot}`);
  console.log(`Commit SHA:     ${commitSha}`);
  console.log(`CLI Entrypoint: ${cliPath} (sha256: ${cliBuildSha.slice(0, 12)})`);
  console.log(`Source Script:  ${sourceTaskBriefPath} (sha256: ${sourceTaskBriefSha.slice(0, 12)})`);

  const { startRegistryFixture } = await import(pathToFileURL(fixtureModulePath).href);

  const runId = crypto.randomBytes(6).toString('hex');
  const tempBase = path.join(os.tmpdir(), `installed-brief-smoke-${runId}`);
  const tempHome = path.join(tempBase, 'home');
  const tempXdg = path.join(tempBase, 'xdg');
  const consumerDir = path.join(tempBase, 'consumer');
  const foreignCwd = path.join(tempBase, 'foreign_cwd');
  const noWorkspaceDir = path.join(tempBase, 'no_workspace_test');

  fs.mkdirSync(tempHome, { recursive: true });
  fs.mkdirSync(tempXdg, { recursive: true });
  fs.mkdirSync(consumerDir, { recursive: true });
  fs.mkdirSync(foreignCwd, { recursive: true });
  fs.mkdirSync(noWorkspaceDir, { recursive: true });

  const pythonBin = process.env.PYTHON || 'python3';
  const basePath = process.env.PATH || '/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin';

  let fixture = null;
  let servedTaskBriefSha = null;
  let pythonVersion = null;
  const assertions = [];
  let allPassed = true;
  let teardownSuccess = false;
  let teardownError = null;

  const observe = (record) => {
    assertions.push(record);
    if (!record.passed) allPassed = false;
    return record.passed;
  };

  try {
    console.log('Starting registry fixture on loopback...');
    fixture = await startRegistryFixture(candidateRoot, {
      timeoutMs: 10000,
      commitSha,
    });
    const servedBytes = fixture.fileMap.get(CANONICAL_SCRIPT_REL);
    servedTaskBriefSha = servedBytes ? sha256(servedBytes) : null;
    console.log(`Registry fixture listening on port ${fixture.port} (treeSha: ${fixture.treeSha.slice(0, 12)}, files: ${fixture.tree.length})`);

    fs.writeFileSync(
      path.join(consumerDir, '.skillsrc'),
      `registry: "https://github.com/${fixture.owner}/${fixture.repo}"
agents:
  - claude
skills:
  common:
    ref: "${commitSha}"
workflows: false
mcp:
  enabled: false
  scope: disabled
  prompted: true
telemetry: false
`,
      'utf8'
    );

    // Isolated child environment: loopback preload, isolated HOME/XDG, no credentials.
    const cleanEnv = {
      PATH: basePath,
      HOME: tempHome,
      XDG_CONFIG_HOME: tempXdg,
      TMPDIR: os.tmpdir(),
      LANG: 'C.UTF-8',
      LC_ALL: 'C.UTF-8',
      NODE_OPTIONS: `--require ${preloadScript}`,
      FIXTURE_HOST: '127.0.0.1',
      FIXTURE_PORT: String(fixture.port),
      FIXTURE_OWNER: fixture.owner,
      FIXTURE_REPO: fixture.repo,
    };

    console.log('Running built CLI sync in fresh consumer (async: fixture is served by this process)...');
    const syncStarted = Date.now();
    const syncRes = await runBounded(process.execPath, [cliPath, 'sync', '--yes'], {
      cwd: consumerDir,
      env: cleanEnv,
      timeoutMs: 60000,
    });
    const syncDurationMs = Date.now() - syncStarted;
    observe({
      id: 'A01_cli_sync_success',
      description: 'Built CLI sync exits 0 from a clean consumer against the loopback candidate registry',
      expected_exit: 0,
      actual_exit: syncRes.status,
      timed_out: syncRes.timedOut,
      spawn_error: syncRes.spawnError,
      duration_ms: syncDurationMs,
      passed: syncRes.status === 0 && !syncRes.timedOut && !syncRes.spawnError,
      stderr: syncRes.stderr.slice(-2000),
    });
    if (syncRes.status !== 0) {
      console.error(`CLI sync failed (status ${syncRes.status}, timedOut=${syncRes.timedOut}):\n${syncRes.stderr || syncRes.stdout}`);
    }

    const installedTaskBriefPath = path.join(consumerDir, INSTALLED_SCRIPT_REL);
    const installedExists = fs.existsSync(installedTaskBriefPath);
    const installedSha = installedExists ? sha256(fs.readFileSync(installedTaskBriefPath)) : null;
    observe({
      id: 'A02_installed_script_presence',
      description: 'task_brief.py is installed at the canonical agent skill path',
      path: INSTALLED_SCRIPT_REL,
      passed: installedExists,
    });
    observe({
      id: 'A03_installed_script_byte_identity',
      description: 'Installed task_brief.py bytes equal the canonical bytes served by the registry fixture (and current source)',
      expected_served_sha256: servedTaskBriefSha,
      expected_source_sha256: sourceTaskBriefSha,
      actual_sha256: installedSha,
      matches_served: servedTaskBriefSha !== null && installedSha === servedTaskBriefSha,
      matches_source: installedSha === sourceTaskBriefSha,
      passed: installedExists && servedTaskBriefSha !== null && installedSha === servedTaskBriefSha,
    });

    const pyEnv = {
      PATH: basePath,
      HOME: tempHome,
      TMPDIR: os.tmpdir(),
      LANG: 'C.UTF-8',
      LC_ALL: 'C.UTF-8',
    };
    const pyVersion = await runBounded(pythonBin, ['--version'], { env: pyEnv, timeoutMs: 5000 });
    pythonVersion = (pyVersion.stdout || pyVersion.stderr).trim() || null;

    const positivePlanPath = path.join(foreignCwd, 'complete-plan.md');
    const positiveBriefOut = path.join(foreignCwd, 'task-1-brief.md');
    fs.writeFileSync(positivePlanPath, CANONICAL_POSITIVE_PLAN, 'utf8');
    const posRes = await runBounded(pythonBin, [installedTaskBriefPath, positivePlanPath, '1', positiveBriefOut], {
      cwd: foreignCwd,
      env: pyEnv,
      timeoutMs: 15000,
    });
    const posContent = fs.existsSync(positiveBriefOut) ? fs.readFileSync(positiveBriefOut, 'utf8') : '';
    observe({
      id: 'A04_positive_contract_extraction',
      description: 'Installed task_brief extracts the complete task contract from a foreign CWD and stops at the next task boundary',
      expected_exit: 0,
      actual_exit: posRes.status,
      timed_out: posRes.timedOut,
      has_heading: posContent.includes('Complete Positive Contract Implementation'),
      has_contract_fields: posContent.includes('**Real Ingress:**') &&
        posContent.includes('**Verification Owner:**') &&
        posContent.includes('**Correction Route:**'),
      stops_at_boundary: !posContent.includes('Next Sibling Task'),
      passed: posRes.status === 0 &&
        posContent.includes('Complete Positive Contract Implementation') &&
        posContent.includes('**Real Ingress:**') &&
        posContent.includes('**Verification Owner:**') &&
        posContent.includes('**Correction Route:**') &&
        !posContent.includes('Next Sibling Task'),
      stdout: posRes.stdout.trim().slice(0, 500),
      stderr: posRes.stderr.trim().slice(0, 500),
    });

    const incompletePlanPath = path.join(foreignCwd, 'incomplete-plan.md');
    const rejectedBriefOut = path.join(foreignCwd, 'rejected-brief.md');
    fs.writeFileSync(incompletePlanPath, CANONICAL_INCOMPLETE_PLAN, 'utf8');
    const negRes = await runBounded(pythonBin, [installedTaskBriefPath, incompletePlanPath, '1', rejectedBriefOut], {
      cwd: foreignCwd,
      env: pyEnv,
      timeoutMs: 15000,
    });
    observe({
      id: 'A05_incomplete_contract_rejected_exit_5',
      description: 'Prose-only contract labels exit 5 and create no output file (stable exit-code contract)',
      expected_exit: 5,
      actual_exit: negRes.status,
      output_not_created: !fs.existsSync(rejectedBriefOut),
      passed: negRes.status === 5 && !fs.existsSync(rejectedBriefOut),
      stderr: negRes.stderr.trim().slice(0, 800),
    });

    const planInNoWorkspace = path.join(noWorkspaceDir, 'incomplete-plan.md');
    fs.writeFileSync(planInNoWorkspace, CANONICAL_INCOMPLETE_PLAN, 'utf8');
    const negWorkspaceRes = await runBounded(pythonBin, [installedTaskBriefPath, planInNoWorkspace, '1'], {
      cwd: noWorkspaceDir,
      env: pyEnv,
      timeoutMs: 15000,
    });
    const agentDirCreated = fs.existsSync(path.join(noWorkspaceDir, '.agent'));
    observe({
      id: 'A06_incomplete_contract_no_workspace_created',
      description: 'Validation runs before workspace resolution: exit 5 with no .agent directory and no brief created',
      expected_exit: 5,
      actual_exit: negWorkspaceRes.status,
      workspace_not_created: !agentDirCreated,
      unexpected_briefs: fs.readdirSync(noWorkspaceDir).filter((name) => name.endsWith('-brief.md')),
      passed: negWorkspaceRes.status === 5 &&
        !agentDirCreated &&
        fs.readdirSync(noWorkspaceDir).filter((name) => name.endsWith('-brief.md')).length === 0,
    });

    const existingBriefPath = path.join(foreignCwd, 'existing-brief.md');
    const sentinelContent = 'IMMUTABLE_SENTINEL_EVIDENCE_BYTES_DO_NOT_OVERWRITE_20261028\n';
    fs.writeFileSync(existingBriefPath, sentinelContent, 'utf8');
    const overwriteRes = await runBounded(pythonBin, [installedTaskBriefPath, positivePlanPath, '1', existingBriefPath], {
      cwd: foreignCwd,
      env: pyEnv,
      timeoutMs: 15000,
    });
    const sentinelPreserved = fs.readFileSync(existingBriefPath, 'utf8') === sentinelContent;
    observe({
      id: 'A07_preserve_existing_output_refused_exit_4',
      description: 'Existing explicit output is refused with exit 4 and its bytes remain unchanged',
      expected_exit: 4,
      actual_exit: overwriteRes.status,
      sentinel_preserved: sentinelPreserved,
      passed: overwriteRes.status === 4 && sentinelPreserved,
      stderr: overwriteRes.stderr.trim().slice(0, 500),
    });

    // Frozen contract 1: labels match case-insensitively (`Verification Owner`,
    // `CORRECTION ROUTE`, `real ingress`, and uppercase invariant entries).
    const mixedCasePlanPath = path.join(foreignCwd, 'mixed-case-plan.md');
    const mixedCaseBriefOut = path.join(foreignCwd, 'mixed-case-brief.md');
    fs.writeFileSync(mixedCasePlanPath, MIXED_CASE_LABELS_PLAN, 'utf8');
    const mixedCaseRes = await runBounded(pythonBin, [installedTaskBriefPath, mixedCasePlanPath, '1', mixedCaseBriefOut], {
      cwd: foreignCwd,
      env: pyEnv,
      timeoutMs: 15000,
    });
    const mixedCaseContent = fs.existsSync(mixedCaseBriefOut) ? fs.readFileSync(mixedCaseBriefOut, 'utf8') : '';
    observe({
      id: 'A08_case_insensitive_contract_labels',
      description: 'Mixed-case contract labels extract with exit 0 and produce the full brief',
      expected_exit: 0,
      actual_exit: mixedCaseRes.status,
      has_heading: mixedCaseContent.includes('Mixed Case Labels Contract'),
      passed: mixedCaseRes.status === 0 &&
        mixedCaseContent.includes('Mixed Case Labels Contract') &&
        mixedCaseContent.includes('**CORRECTION ROUTE:**'),
      stderr: mixedCaseRes.stderr.trim().slice(0, 500),
    });

    // Frozen contract 3: fenced examples (tilde and backtick) never satisfy validation.
    const fencedPlanPath = path.join(foreignCwd, 'fenced-plan.md');
    const fencedBriefOut = path.join(foreignCwd, 'fenced-brief.md');
    fs.writeFileSync(fencedPlanPath, FENCED_LABELS_PLAN, 'utf8');
    const fencedRes = await runBounded(pythonBin, [installedTaskBriefPath, fencedPlanPath, '1', fencedBriefOut], {
      cwd: foreignCwd,
      env: pyEnv,
      timeoutMs: 15000,
    });
    observe({
      id: 'A09_fenced_labels_rejected_exit_5',
      description: 'Tilde- and backtick-fenced contract labels are excluded from validation: exit 5 and no output file',
      expected_exit: 5,
      actual_exit: fencedRes.status,
      output_not_created: !fs.existsSync(fencedBriefOut),
      passed: fencedRes.status === 5 && !fs.existsSync(fencedBriefOut),
      stderr: fencedRes.stderr.trim().slice(0, 800),
    });

    // Frozen contract 2: an empty label value never borrows the following line.
    const nextLinePlanPath = path.join(foreignCwd, 'next-line-plan.md');
    const nextLineBriefOut = path.join(foreignCwd, 'next-line-brief.md');
    fs.writeFileSync(nextLinePlanPath, NEXT_LINE_VALUE_PLAN, 'utf8');
    const nextLineRes = await runBounded(pythonBin, [installedTaskBriefPath, nextLinePlanPath, '1', nextLineBriefOut], {
      cwd: foreignCwd,
      env: pyEnv,
      timeoutMs: 15000,
    });
    observe({
      id: 'A10_next_line_value_rejected_exit_5',
      description: 'A contract label whose value sits on the following line is refused with exit 5',
      expected_exit: 5,
      actual_exit: nextLineRes.status,
      output_not_created: !fs.existsSync(nextLineBriefOut),
      passed: nextLineRes.status === 5 && !fs.existsSync(nextLineBriefOut),
      stderr: nextLineRes.stderr.trim().slice(0, 800),
    });

    // Frozen contract 5: task-not-found is exit 3 and publishes nothing.
    const notFoundBriefOut = path.join(foreignCwd, 'not-found-brief.md');
    const notFoundRes = await runBounded(pythonBin, [installedTaskBriefPath, positivePlanPath, '9', notFoundBriefOut], {
      cwd: foreignCwd,
      env: pyEnv,
      timeoutMs: 15000,
    });
    observe({
      id: 'A11_task_not_found_exit_3',
      description: 'A missing task number exits 3 and publishes no output',
      expected_exit: 3,
      actual_exit: notFoundRes.status,
      output_not_created: !fs.existsSync(notFoundBriefOut),
      passed: notFoundRes.status === 3 && !fs.existsSync(notFoundBriefOut),
      stderr: notFoundRes.stderr.trim().slice(0, 500),
    });
  } catch (error) {
    allPassed = false;
    assertions.push({
      id: 'UNEXPECTED_ERROR',
      description: 'Execution threw an unexpected exception',
      error: error.message,
      passed: false,
    });
    console.error('Unexpected error during smoke execution:', error);
  } finally {
    // Owned teardown only: a fixture that never started owns nothing to close.
    let fixtureCloseErr = null;
    if (fixture) {
      console.log('Tearing down loopback registry fixture...');
      try {
        await fixture.close();
      } catch (err) {
        fixtureCloseErr = `fixture close error: ${err.message}`;
        console.error('Error closing fixture server:', err);
      }
    }

    let cleanupErr = null;
    if (!options.keepTemp && fs.existsSync(tempBase)) {
      try {
        fs.rmSync(tempBase, { recursive: true, force: true });
      } catch (err) {
        cleanupErr = `cleanup error: ${err.message}`;
        console.error('Error cleaning up tempBase:', err);
      }
    }

    if (fixtureCloseErr || cleanupErr) {
      teardownSuccess = false;
      teardownError = [fixtureCloseErr, cleanupErr].filter(Boolean).join('; ');
      allPassed = false;
      console.error('Teardown failure:', teardownError);
    } else {
      teardownSuccess = true;
    }
  }

  const finalCompleted = allPassed && teardownSuccess;
  const outcomeRecord = {
    schema_version: '1.0.0',
    name: 'installed-brief-smoke',
    timestamp: new Date().toISOString(),
    candidate_root: candidateRoot,
    candidate_commit_sha: commitSha,
    cli_path: cliPath,
    cli_build_sha256: cliBuildSha,
    source_task_brief_sha256: sourceTaskBriefSha,
    served_task_brief_sha256: servedTaskBriefSha,
    python_binary: pythonBin,
    python_version: pythonVersion,
    tree_sha: fixture ? fixture.treeSha : null,
    registry_snapshot_file_count: fixture ? fixture.tree.length : null,
    fixture_port: fixture ? fixture.port : null,
    assertions,
    teardown_success: teardownSuccess,
    teardown_error: teardownError,
    all_passed: allPassed,
    completed: finalCompleted,
  };

  fs.mkdirSync(path.dirname(outPath), { recursive: true });
  fs.writeFileSync(outPath, JSON.stringify(outcomeRecord, null, 2), { encoding: 'utf8', flag: 'wx' });
  console.log(`Outcome record written exclusively to: ${outPath}`);
  console.log(`Final smoke status: ${finalCompleted ? 'COMPLETED (ALL ASSERTIONS PASSED)' : 'FAILED'}`);

  return outcomeRecord;
}

async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printUsage();
    process.exit(0);
  }

  const fallbackOut = args.out || path.join(
    args.candidateRoot || DEFAULT_CANDIDATE_ROOT,
    'artifacts/diagnostic-prevention/implementation/attempt-01/installed-brief-smoke-run.json'
  );

  try {
    const outcome = await runInstalledBriefSmoke(args);
    if (!outcome.completed) process.exit(1);
  } catch (err) {
    console.error('Fatal smoke runner error:', err.message);
    publishBlockedReceipt(fallbackOut, {
      schema_version: '1.0.0',
      name: 'installed-brief-smoke',
      timestamp: new Date().toISOString(),
      stage: 'precondition',
      candidate_root: args.candidateRoot || DEFAULT_CANDIDATE_ROOT,
      cli_path: args.cli || null,
      blocked_reason: err.message,
      assertions: [],
      teardown_success: false,
      all_passed: false,
      completed: false,
    });
    process.exit(1);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === __filename) {
  main().catch((err) => {
    console.error('Unhandled smoke error:', err);
    process.exit(1);
  });
}
