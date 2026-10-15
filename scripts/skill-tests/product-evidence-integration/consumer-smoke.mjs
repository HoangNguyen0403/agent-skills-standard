// scripts/skill-tests/product-evidence-integration/consumer-smoke.mjs
import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { spawn, spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

import { startRegistryFixture } from './registry-fixture.mjs';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const PRELOAD_SCRIPT = path.join(__dirname, 'network-preload.cjs');
const FIXTURES_DIR = path.join(__dirname, 'fixtures');

/**
 * Parse unique options and reject unknown or valueless flags.
 */
function parseArgs(argv) {
  const args = {};
  const options = new Map([
    ['--cli', 'cli'],
    ['--mcp', 'mcp'],
    ['--candidate-root', 'candidateRoot'],
    ['--out', 'out']
  ]);
  for (let i = 2; i < argv.length; i += 1) {
    const flag = argv[i];
    if (flag === '--help' || flag === '-h') {
      if (args.help) throw new Error('Duplicate help flag');
      args.help = true;
      continue;
    }
    const key = options.get(flag);
    if (!key) throw new Error(`Unknown argument: ${flag}`);
    if (args[key] !== undefined) throw new Error(`Duplicate argument: ${flag}`);
    const value = argv[i + 1];
    if (!value || value.startsWith('--')) throw new Error(`${flag} requires a value`);
    args[key] = value;
    i += 1;
  }
  return args;
}

function printUsage() {
  console.log(`
Usage:
  node scripts/skill-tests/product-evidence-integration/consumer-smoke.mjs [options]

Options:
  --cli <path>             Absolute path to built CLI entrypoint (cli/dist/index.js)
  --mcp <path>             Absolute path to built MCP entrypoint (mcp/dist/index.js)
  --candidate-root <path>  Absolute path to repository candidate root
  --out <path>             Path to write the 14-field verification Outcome RunRecord
  --help, -h               Show this help message
`);
}

function sha256(content) {
  const buf = Buffer.isBuffer(content) ? content : Buffer.from(content);
  return crypto.createHash('sha256').update(buf).digest('hex');
}
function getCandidateCommitSha(candidateRoot) {
  let res;
  try {
    res = spawnSync('git', ['rev-parse', 'HEAD'], {
      cwd: candidateRoot,
      encoding: 'utf8',
      timeout: 5000,
    });
  } catch (error) {
    throw new Error(`Failed to resolve candidate commit SHA from git HEAD: ${error.message}`);
  }
  if (res.status !== 0 || !res.stdout || !/^[a-f0-9]{40}$/i.test(res.stdout.trim())) {
    throw new Error(`Candidate root at ${candidateRoot} does not have an available git HEAD commit SHA (exit ${res.status}): ${res.stderr || res.stdout}`);
  }
  return res.stdout.trim().toLowerCase();
}

function getGitDirtyStatus(candidateRoot) {
  try {
    const res = spawnSync('git', ['status', '--porcelain'], {
      cwd: candidateRoot,
      encoding: 'utf8',
      timeout: 5000,
    });
    return res.status === 0 ? res.stdout.trim().length > 0 : null;
  } catch {
    return null;
  }
}

function requireFileHash(filePath, label) {
  if (!fs.existsSync(filePath) || !fs.lstatSync(filePath).isFile()) {
    throw new Error(`Required file missing for verification inputs: ${label} (${filePath})`);
  }
  return sha256(fs.readFileSync(filePath));
}

function hashDirectoryFiles(baseDir, dirRel = '.') {
  const dirAbs = path.resolve(baseDir, dirRel);
  if (!fs.existsSync(dirAbs) || !fs.lstatSync(dirAbs).isDirectory()) {
    throw new Error(`Required directory missing for provenance hashing: ${dirRel}`);
  }
  const hashes = [];
  function walk(current) {
    const entries = fs.readdirSync(current, { withFileTypes: true });
    entries.sort((a, b) => a.name.localeCompare(b.name));
    for (const entry of entries) {
      if (entry.name === '.git' || entry.name === 'node_modules' || entry.name.startsWith('.')) continue;
      const full = path.join(current, entry.name);
      if (entry.isDirectory()) walk(full);
      else if (entry.isFile()) {
        const rel = path.relative(baseDir, full).split(path.sep).join('/');
        hashes.push(`${rel}:${sha256(fs.readFileSync(full))}`);
      }
    }
  }
  walk(dirAbs);
  if (hashes.length === 0) {
    throw new Error(`Required directory has no files for provenance hashing: ${dirRel}`);
  }
  return sha256(hashes.join('\n'));
}


/** Wraps a promise with a hard timeout to prevent any deadlock or hang. */
function withTimeout(promise, ms, label) {
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => {
      reject(new Error(`Timeout: ${label} exceeded ${ms}ms deadline`));
    }, ms);
  });
  return Promise.race([promise, timeoutPromise]).finally(() => clearTimeout(timer));
}
async function closeMcpClient(client, transport, label) {
  let firstError = null;
  if (client) {
    try {
      await withTimeout(client.close(), 3000, `${label} client close`);
      return { closed: true, error: null };
    } catch (error) {
      firstError = error.message;
    }
  }
  if (transport) {
    try {
      await withTimeout(transport.close(), 3000, `${label} transport close`);
      return { closed: true, error: firstError };
    } catch (error) {
      return { closed: false, error: `${firstError ?? ''} ${error.message}`.trim() };
    }
  }
  return { closed: !client, error: firstError };
}

/** Recursively search for a file by name below a root directory. */
function findFileRecursive(rootDir, targetName) {
  if (!fs.existsSync(rootDir)) return null;
  const entries = fs.readdirSync(rootDir, { withFileTypes: true });
  for (const entry of entries) {
    const full = path.join(rootDir, entry.name);
    if (entry.isFile() && entry.name === targetName) {
      return full;
    }
    if (entry.isDirectory() && entry.name !== '.git' && entry.name !== 'node_modules') {
      const found = findFileRecursive(full, targetName);
      if (found) return found;
    }
  }
  return null;
}

const activeChildProcesses = new Set();

/**
 * Spawns an external node command asynchronously with strict finite timeout
 * and process tracking to ensure clean teardown.
 */
function spawnNodeAsync(args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 20000;
  const outputLimit = 4 * 1024 * 1024;
  const started = process.hrtime.bigint();
  return new Promise((resolve) => {
    const proc = spawn(process.execPath, args, {
      cwd: options.cwd || process.cwd(),
      env: options.env || {},
      stdio: ['ignore', 'pipe', 'pipe']
    });
    activeChildProcesses.add(proc);
    let stdout = Buffer.alloc(0);
    let stderr = Buffer.alloc(0);
    let timedOut = false;
    let outputExceeded = false;
    const collect = (target, chunk) => {
      const next = Buffer.concat([target, chunk]);
      if (stdout.byteLength + stderr.byteLength + chunk.byteLength > outputLimit) {
        outputExceeded = true;
        proc.kill('SIGKILL');
        return target;
      }
      return next;
    };
    proc.stdout.on('data', (chunk) => { stdout = collect(stdout, chunk); });
    proc.stderr.on('data', (chunk) => { stderr = collect(stderr, chunk); });
    const timer = setTimeout(() => {
      timedOut = true;
      proc.kill('SIGKILL');
    }, timeoutMs);
    proc.once('error', (error) => {
      clearTimeout(timer);
      activeChildProcesses.delete(proc);
      resolve({ status: -1, args, cwd: options.cwd, stdout: '', stderr: error.message, durationMs: Number(process.hrtime.bigint() - started) / 1e6, timedOut: false, outputExceeded: false });
    });
    proc.once('close', (status, signal) => {
      clearTimeout(timer);
      activeChildProcesses.delete(proc);
      resolve({
        status: timedOut || outputExceeded ? 124 : status,
        args,
        cwd: options.cwd,
        signal,
        stdout: stdout.toString('utf8'),
        stderr: stderr.toString('utf8'),
        durationMs: Number(process.hrtime.bigint() - started) / 1e6,
        timedOut,
        outputExceeded
      });
    });
  });
}
/** Runs bounded filesystem-only resource CLIs synchronously into temporary
 * files for deterministic capture and status inspection.
 * Networked CLI/MCP consumers remain asynchronous. */
function spawnNodeSync(args, options = {}) {
  const timeoutMs = options.timeoutMs ?? 15000;
  const outputLimit = 4 * 1024 * 1024;
  const started = process.hrtime.bigint();
  const captureDir = fs.mkdtempSync(path.join(os.tmpdir(), 't09-cli-capture-'));
  const stdoutPath = path.join(captureDir, 'stdout');
  const stderrPath = path.join(captureDir, 'stderr');
  const stdoutFd = fs.openSync(stdoutPath, 'w');
  const stderrFd = fs.openSync(stderrPath, 'w');
  let result;
  try {
    result = spawnSync(process.execPath, args, {
      cwd: options.cwd || process.cwd(),
      env: options.env || {},
      timeout: timeoutMs,
      stdio: ['ignore', stdoutFd, stderrFd]
    });
  } finally {
    fs.closeSync(stdoutFd);
    fs.closeSync(stderrFd);
  }
  const stdoutBytes = fs.readFileSync(stdoutPath);
  const stderrBytes = fs.readFileSync(stderrPath);
  fs.rmSync(captureDir, { recursive: true, force: true });
  const timedOut = result.error?.code === 'ETIMEDOUT';
  const outputExceeded = stdoutBytes.byteLength + stderrBytes.byteLength > outputLimit;
  return {
    status: timedOut || outputExceeded ? 124 : (result.status ?? -1),
    args,
    cwd: options.cwd,
    signal: result.signal,
    stdout: stdoutBytes.subarray(0, outputLimit).toString('utf8'),
    stderr: stderrBytes.toString('utf8') || result.error?.message || '',
    durationMs: Number(process.hrtime.bigint() - started) / 1e6,
    timedOut,
    outputExceeded
  };
}

function isolatedEnvironment(fixture, home, xdg, overrides = {}) {
  return {
    PATH: process.env.PATH || '/usr/bin:/bin',
    HOME: home,
    XDG_CONFIG_HOME: xdg,
    TMPDIR: os.tmpdir(),
    LANG: 'C.UTF-8',
    NODE_OPTIONS: `--require ${PRELOAD_SCRIPT}`,
    FIXTURE_HOST: '127.0.0.1',
    FIXTURE_PORT: String(fixture.port),
    FIXTURE_OWNER: fixture.owner,
    FIXTURE_REPO: fixture.repo,
    ...overrides
  };
}
function isolatedMcpEnvironment(home, xdg, projectRoot, fixture) {
  return {
    PATH: process.env.PATH || '/usr/bin:/bin',
    HOME: home,
    XDG_CONFIG_HOME: xdg,
    TMPDIR: os.tmpdir(),
    LANG: 'C.UTF-8',
    NODE_OPTIONS: `--require ${PRELOAD_SCRIPT}`,
    FIXTURE_HOST: '127.0.0.1',
    FIXTURE_PORT: String(fixture.port),
    FIXTURE_OWNER: fixture.owner,
    FIXTURE_REPO: fixture.repo,
    SKILLS_PROJECT_ROOT: projectRoot,
    MCP_TRANSPORT: 'stdio',
    AGS_TELEMETRY: 'false',
    AGS_TELEMETRY_PATH: path.join(home, 'telemetry-disabled.jsonl')
  };
}
async function validateWithExistingCollector(candidateRoot, runsDirectory, fixture) {
  const moduleUrl = pathToFileURL(path.join(candidateRoot, 'scripts/outcome/index.ts')).href;
  const script = [
    `const collector = await import(${JSON.stringify(moduleUrl)});`,
    'const validateRunRecords = collector.validateRunRecords ?? collector.default?.validateRunRecords;',
    `const result = await validateRunRecords(${JSON.stringify(runsDirectory)});`,
    'process.stdout.write(JSON.stringify(result));',
    'if (result.issues.some((issue) => issue.severity === "error")) process.exitCode = 1;'
  ].join('\n');
  return spawnNodeAsync(['--import', 'tsx', '--input-type=module', '-e', script], {
    cwd: candidateRoot,
    env: isolatedEnvironment(fixture, os.tmpdir(), os.tmpdir()),
    timeoutMs: 15000
  });
}

export async function main() {
  const args = parseArgs(process.argv);
  if (args.help) {
    printUsage();
    process.exit(0);
  }

  const requiredArgs = ['cli', 'mcp', 'candidateRoot', 'out'];
  const missing = requiredArgs.filter((key) => !args[key]);
  if (missing.length > 0) {
    throw new Error(`Missing required arguments: ${missing.join(', ')}`);
  }
  for (const key of requiredArgs) {
    if (!path.isAbsolute(args[key])) throw new Error(`--${key.replace(/[A-Z]/g, (letter) => `-${letter.toLowerCase()}`)} must be absolute`);
  }
  const cliPath = path.normalize(args.cli);
  const mcpPath = path.normalize(args.mcp);
  const candidateRoot = path.normalize(args.candidateRoot);
  const outPath = path.normalize(args.out);
  if (!fs.statSync(cliPath, { throwIfNoEntry: false })?.isFile()) {
    throw new Error(`Built CLI entry is not a file: ${cliPath}`);
  }
  if (!fs.statSync(mcpPath, { throwIfNoEntry: false })?.isFile()) {
    throw new Error(`Built MCP entry is not a file: ${mcpPath}`);
  }
  if (!fs.statSync(candidateRoot, { throwIfNoEntry: false })?.isDirectory()) {
    throw new Error(`Candidate root is not a directory: ${candidateRoot}`);
  }
  const startedAt = new Date().toISOString();
  console.log(`\n======================================================`);
  console.log(`🚀 T09 Real Installed-Consumer Integration Smoke Test`);
  console.log(`   Host Node: ${process.version}`);
  console.log(`   CLI Entry: ${cliPath}`);
  console.log(`   MCP Entry: ${mcpPath}`);
  console.log(`   Candidate: ${candidateRoot}`);
  console.log(`======================================================\n`);

  let fixtureServer = null;
  const tempDirsToClean = [];
  const completedEvidence = [];
  const missingEvidence = [];
  let allStepsPassed = true;

  completedEvidence.push(JSON.stringify({
    step: 'runtime_coverage',
    host_node: process.version,
    minimum_node: '20.0.0',
    minimum_version_exercised: process.versions.node.startsWith('20.'),
    coverage_note: process.versions.node.startsWith('20.') ? 'Host runtime is within the declared minimum major.' : 'Node 20 minimum was not exercised; this run verifies the host runtime only.'
  }));

  try {
    // -------------------------------------------------------------------------
    // Start Loopback Registry Fixture
    // -------------------------------------------------------------------------
    const commitSha = getCandidateCommitSha(candidateRoot);
    const gitDirty = getGitDirtyStatus(candidateRoot);
    const pnpmLockSha = requireFileHash(path.join(candidateRoot, 'pnpm-lock.yaml'), 'pnpm-lock.yaml');
    const cliSourceSha = hashDirectoryFiles(candidateRoot, 'cli/src');
    const mcpSourceSha = hashDirectoryFiles(candidateRoot, 'mcp/src');
    const harnessAndFixturesSha = hashDirectoryFiles(candidateRoot, 'scripts/skill-tests/product-evidence-integration');

    fixtureServer = await startRegistryFixture(candidateRoot, {
      owner: 'HoangNguyen0403',
      repo: 'agent-skills-standard',
      commitSha
    });
    console.log(`✓ Loopback registry fixture listening on port ${fixtureServer.port} (commit ${commitSha})`);
    console.log(`  Indexed ${fixtureServer.tree.length} candidate files, tree SHA256: ${fixtureServer.treeSha}`);
    console.log(`  Permitted refs (${fixtureServer.allowedRefs.size}): ${Array.from(fixtureServer.allowedRefs).join(', ')}`);
    completedEvidence.push(JSON.stringify({
      step: 'candidate_binding',
      node: process.version,
      candidate_commit_sha: commitSha,
      git_dirty: gitDirty,
      cli_path: cliPath,
      cli_sha256: sha256(fs.readFileSync(cliPath)),
      mcp_path: mcpPath,
      mcp_sha256: sha256(fs.readFileSync(mcpPath)),
      package_version: JSON.parse(fs.readFileSync(path.join(candidateRoot, 'package.json'), 'utf8')).version,
      package_json_sha256: sha256(fs.readFileSync(path.join(candidateRoot, 'package.json'))),
      pnpm_lock_sha256: pnpmLockSha,
      cli_source_sha256: cliSourceSha,
      mcp_source_sha256: mcpSourceSha,
      harness_and_fixtures_sha256: harnessAndFixturesSha,
      registry: `https://github.com/${fixtureServer.owner}/${fixtureServer.repo}`,
      fixture_commit_ref: commitSha,
      served_bytes_registry_hash: fixtureServer.treeSha,
      snapshot_file_count: fixtureServer.tree.length,
      snapshot_files: fixtureServer.tree.map(({ path: filePath, sha, size }) => ({ path: filePath, git_blob_sha1: sha, size })),
      provenance_attribution: 'Candidate identity resolved from git HEAD; verification inputs hashed without private or environment variables. No live GitHub publication or authenticated user authority claimed.'
    }));

    async function runCliAsync(consumerDir, cliArgs, envOverrides = {}) {
      const { HOME: home, XDG_CONFIG_HOME: xdg, ...rest } = envOverrides;
      return spawnNodeAsync([cliPath, ...cliArgs], {
        cwd: consumerDir,
        env: isolatedEnvironment(fixtureServer, home, xdg, rest),
        timeoutMs: 25000
      });
    }
    const allWorkflowNames = fixtureServer.tree
      .map(({ path: filePath }) => filePath)
      .filter((filePath) => filePath.startsWith('.agents/workflows/') && filePath.endsWith('.md'))
      .map((filePath) => filePath.split('/').at(-1).replace(/\.md$/, ''))
      .sort();
    const internalWorkflowNames = new Set(['evals-run']);
    const defaultWorkflowNames = new Set([
      'sdlc', 'brainstorm-feature', 'code-review', 'codebase-review', 'system-design-session',
      'review-system-design', 'design-solution', 'deploy-release', 'plan-feature',
      'implementation-readiness', 'review-ticket', 'traceability-audit', 'session-report',
      'publish-notes', 'retro-learn', 'skill-benchmark', 'pentest', 'dev-fix',
      'implement-feature', 'verify-work', 'verify-bug', 'test-loop', 'security-test',
      'uat-signoff', 'incident-hotfix', 'monitor-respond'
    ]);
    const eligibleWorkflowNames = allWorkflowNames.filter((name) => !internalWorkflowNames.has(name));
    const availableDefaults = eligibleWorkflowNames.filter((name) => defaultWorkflowNames.has(name));
    async function runWorkflowVariant(name, workflowConfig, expectedNames) {
      const consumer = fs.mkdtempSync(path.join(os.tmpdir(), `t09-${name}-consumer-`));
      const home = fs.mkdtempSync(path.join(os.tmpdir(), `t09-${name}-home-`));
      const xdg = fs.mkdtempSync(path.join(os.tmpdir(), `t09-${name}-xdg-`));
      tempDirsToClean.push(consumer, home, xdg);
      const workflowLine = workflowConfig === null ? '' : `workflows: ${workflowConfig}\n`;
      const skillsrc = `registry: "https://github.com/${fixtureServer.owner}/${fixtureServer.repo}"\nagents:\n  - codex\nskills: {}\n${workflowLine}mcp:\n  enabled: false\n  scope: disabled\n  prompted: true\ntelemetry: false\n`;
      fs.writeFileSync(path.join(consumer, '.skillsrc'), skillsrc);
      const result = await runCliAsync(consumer, ['sync', '--yes'], { HOME: home, XDG_CONFIG_HOME: xdg });
      const installed = allWorkflowNames.filter((workflow) =>
        fs.existsSync(path.join(consumer, '.codex/skills', workflow, 'SKILL.md')));
      const expected = [...expectedNames].sort();
      const matches = result.status === 0 && JSON.stringify(installed) === JSON.stringify(expected) &&
        !fs.existsSync(path.join(consumer, '.codex/skills/product-management/product-investment/SKILL.md'));
      if (!matches) allStepsPassed = false;
      return {
        config: workflowConfig ?? 'omitted',
        argv: ['sync', '--yes'],
        exit: result.status,
        duration_ms: result.durationMs,
        stdout: result.stdout,
        stderr: result.stderr,
        expected,
        installed,
        no_implicit_product_skill: !fs.existsSync(path.join(consumer, '.codex/skills/product-management/product-investment/SKILL.md')),
        passed: matches
      };
    }
    const workflowConfigEvidence = [
      await runWorkflowVariant('workflows-true', 'true', eligibleWorkflowNames),
      await runWorkflowVariant('workflows-empty-array', '[]', availableDefaults),
      await runWorkflowVariant('workflows-omitted', null, availableDefaults),
      await runWorkflowVariant('workflows-false', 'false', [])
    ];
    const workflowVariantsPassed = workflowConfigEvidence.every(({ passed }) => passed);
    if (!workflowVariantsPassed) {
      allStepsPassed = false;
      missingEvidence.push(`Workflow configuration variants failed: ${JSON.stringify(workflowConfigEvidence.filter(({ passed }) => !passed).map(({ config, expected, installed, exit, stderr }) => ({ config, expected, installed, exit, stderr })))}`);
    }
    completedEvidence.push(JSON.stringify({ step: 'workflow_configuration_variants', variants: workflowConfigEvidence }));

    // -------------------------------------------------------------------------
    // Step 1: Real Sync and Verification in Fresh Consumer
    // -------------------------------------------------------------------------
    console.log(`\n--- Step 1: Real Sync and Verification in Fresh Consumer ---`);
    const consumer1 = fs.mkdtempSync(path.join(os.tmpdir(), 't09-consumer-main-'));
    const home1 = fs.mkdtempSync(path.join(os.tmpdir(), 't09-home-main-'));
    const xdg1 = fs.mkdtempSync(path.join(os.tmpdir(), 't09-xdg-main-'));
    tempDirsToClean.push(consumer1, home1, xdg1);

    const skillsrc1 = `
registry: "https://github.com/HoangNguyen0403/agent-skills-standard"
agents:
  - codex
  - claude
  - gemini
skills:
  common:
    ref: "${commitSha}"
  product-management:
    ref: "${commitSha}"
workflows:
  - discover-product
  - validate-product
  - review-product-value
mcp:
  enabled: false
  scope: disabled
  prompted: true
telemetry: false
`;
    fs.writeFileSync(path.join(consumer1, '.skillsrc'), skillsrc1.trim());

    // Run actual sync asynchronously
    const syncRes = await runCliAsync(consumer1, ['sync', '--yes'], { HOME: home1, XDG_CONFIG_HOME: xdg1 });
    console.log(`  CLI sync exit code: ${syncRes.status}`);
    if (syncRes.status !== 0) {
      console.error(`  Sync failed:\n${syncRes.stderr || syncRes.stdout}`);
      allStepsPassed = false;
    }

    // Assert lockfile
    const lockPath = path.join(consumer1, '.skills-lock.json');
    const lockExists = fs.existsSync(lockPath);
    console.log(`  Lockfile created: ${lockExists}`);
    if (!lockExists) allStepsPassed = false;

    // Dynamically resolve actual installed native paths
    const valScriptInstalled = findFileRecursive(consumer1, 'validate-product-evidence.mjs');
    const evalScriptInstalled = findFileRecursive(consumer1, 'evaluate-investment.mjs');

    const valCandidateBytes = fs.readFileSync(path.join(candidateRoot, 'skills/product-management/product-evidence/scripts/validate-product-evidence.mjs'));
    const evalCandidateBytes = fs.readFileSync(path.join(candidateRoot, 'skills/product-management/product-investment/scripts/evaluate-investment.mjs'));

    const valInstalledBytes = valScriptInstalled ? fs.readFileSync(valScriptInstalled) : null;
    const evalInstalledBytes = evalScriptInstalled ? fs.readFileSync(evalScriptInstalled) : null;

    const valShaMatches = valInstalledBytes && sha256(valInstalledBytes) === sha256(valCandidateBytes);
    const evalShaMatches = evalInstalledBytes && sha256(evalInstalledBytes) === sha256(evalCandidateBytes);

    console.log(`  validate-product-evidence.mjs found (${valScriptInstalled ? path.relative(consumer1, valScriptInstalled) : 'none'}) & byte-identical: ${valShaMatches}`);
    console.log(`  evaluate-investment.mjs found (${evalScriptInstalled ? path.relative(consumer1, evalScriptInstalled) : 'none'}) & byte-identical: ${evalShaMatches}`);
    if (!valShaMatches || !evalShaMatches) allStepsPassed = false;

    // Check native agent transformations
    const workflowNames = ['discover-product', 'validate-product', 'review-product-value'];
    const nativeWorkflowChecks = {};
    for (const name of workflowNames) {
      const source = fixtureServer.fileMap.get(`.agents/workflows/${name}.md`)?.toString('utf8');
      const body = source?.replace(/^---\n[\s\S]*?\n---\n/, '').trimEnd();
      const codexFile = path.join(consumer1, '.codex/skills', name, 'SKILL.md');
      const claudeFile = path.join(consumer1, '.claude/commands', `${name}.md`);
      const geminiFile = path.join(consumer1, '.gemini/commands', `${name}.toml`);
      const codex = fs.existsSync(codexFile) ? fs.readFileSync(codexFile, 'utf8') : '';
      const claude = fs.existsSync(claudeFile) ? fs.readFileSync(claudeFile, 'utf8') : '';
      const gemini = fs.existsSync(geminiFile) ? fs.readFileSync(geminiFile, 'utf8') : '';
      const escapedBody = body?.replace(/\\/g, '\\\\').replace(/"/g, '\\"') ?? '';
      nativeWorkflowChecks[name] = {
        source_sha256: source ? sha256(source) : null,
        codex: Boolean(body && codex.includes(body)),
        claude: Boolean(body && claude.includes(body)),
        gemini: Boolean(escapedBody && gemini.includes(escapedBody)),
        paths: { codex: path.relative(consumer1, codexFile), claude: path.relative(consumer1, claudeFile), gemini: path.relative(consumer1, geminiFile) },
        installed_sha256: { codex: codex ? sha256(codex) : null, claude: claude ? sha256(claude) : null, gemini: gemini ? sha256(gemini) : null }
      };
    }
    const expectedForSync = [...new Set([...workflowNames, ...availableDefaults])].sort();
    const installedByAgent = {
      codex: allWorkflowNames.filter((name) => fs.existsSync(path.join(consumer1, '.codex/skills', name, 'SKILL.md'))),
      claude: allWorkflowNames.filter((name) => fs.existsSync(path.join(consumer1, '.claude/commands', `${name}.md`))),
      gemini: allWorkflowNames.filter((name) => fs.existsSync(path.join(consumer1, '.gemini/commands', `${name}.toml`)))
    };
    const exactWorkflowSelection = Object.values(installedByAgent).every((installed) =>
      JSON.stringify(installed) === JSON.stringify(expectedForSync));
    const codexExists = workflowNames.every((name) => nativeWorkflowChecks[name].codex);
    const claudeExists = workflowNames.every((name) => nativeWorkflowChecks[name].claude);
    const geminiExists = workflowNames.every((name) => nativeWorkflowChecks[name].gemini);
    const noUnselectedWorkflowBypass = exactWorkflowSelection;
    console.log(`  Explicit workflows plus reviewed defaults only: ${noUnselectedWorkflowBypass}`);

    // Run CLI verify
    const verifyRes = await runCliAsync(consumer1, ['verify', '--agent', 'codex'], { HOME: home1, XDG_CONFIG_HOME: xdg1 });
    console.log(`  CLI verify exit code: ${verifyRes.status}`);
    const verifyPassed = verifyRes.status === 0;
    if (!verifyPassed) allStepsPassed = false;

    // Second sync: edited owned output remains user-owned and unrelated file survives.
    const userFilePath = path.join(consumer1, 'user-notes.txt');
    const managedSkillPath = path.join(consumer1, '.claude/skills/product-management/product-evidence/SKILL.md');
    const managedSkillRel = path.relative(consumer1, managedSkillPath).split(path.sep).join('/');
    const lockBefore = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    const lockEntryBefore = lockBefore.entries?.[managedSkillRel];
    const originalManagedSkill = fs.readFileSync(managedSkillPath, 'utf8');
    const customOverride = `${originalManagedSkill}\n\nT09 synthetic user override; preserve this exact byte sequence.\n`;
    fs.writeFileSync(managedSkillPath, customOverride);
    fs.writeFileSync(userFilePath, 'T09 synthetic unrelated file; preserve this exact byte sequence.\n');
    const syncRes2 = await runCliAsync(consumer1, ['sync', '--yes'], { HOME: home1, XDG_CONFIG_HOME: xdg1 });
    const userFilePreserved = fs.existsSync(userFilePath) && fs.readFileSync(userFilePath, 'utf8') === 'T09 synthetic unrelated file; preserve this exact byte sequence.\n';
    const managedOverridePreserved = fs.existsSync(managedSkillPath) && fs.readFileSync(managedSkillPath, 'utf8') === customOverride;
    const lockAfter = JSON.parse(fs.readFileSync(lockPath, 'utf8'));
    const ownershipPreserved = lockEntryBefore?.sha256 === lockAfter.entries?.[managedSkillRel]?.sha256;
    console.log(`  Second sync exit ${syncRes2.status}; user file ${userFilePreserved}; override ${managedOverridePreserved}; lock ownership ${ownershipPreserved}`);
    if (syncRes2.status !== 0 || !userFilePreserved || !managedOverridePreserved || !ownershipPreserved) allStepsPassed = false;

    completedEvidence.push(JSON.stringify({
      step: '1_real_sync_and_verification',
      commands: [
        { argv: ['sync', '--yes'], exit: syncRes.status, duration_ms: syncRes.durationMs, stdout: syncRes.stdout, stderr: syncRes.stderr },
        { argv: ['verify', '--agent', 'codex'], exit: verifyRes.status, duration_ms: verifyRes.durationMs, stdout: verifyRes.stdout, stderr: verifyRes.stderr },
        { argv: ['sync', '--yes'], exit: syncRes2.status, duration_ms: syncRes2.durationMs, stdout: syncRes2.stdout, stderr: syncRes2.stderr }
      ],
      lock_created: lockExists,
      val_script_installed_rel: valScriptInstalled ? path.relative(consumer1, valScriptInstalled) : null,
      eval_script_installed_rel: evalScriptInstalled ? path.relative(consumer1, evalScriptInstalled) : null,
      val_script_sha_match: valShaMatches,
      eval_script_sha_match: evalShaMatches,
      native_exports: { codex: codexExists, claude: claudeExists, gemini: geminiExists, workflows: nativeWorkflowChecks, no_unselected_workflow: noUnselectedWorkflowBypass },
      user_file_preserved: userFilePreserved,
      managed_override_preserved: managedOverridePreserved,
      lock_ownership_preserved: ownershipPreserved,
      snapshot_sha256: fixtureServer.treeSha
    }));

    // -------------------------------------------------------------------------
    // Step 2: Standalone Installed Resources Execution
    // -------------------------------------------------------------------------
    console.log(`\n--- Step 2: Standalone Installed Resources Execution ---`);
    const emptyCwd = fs.mkdtempSync(path.join(os.tmpdir(), 't09-empty-cwd-'));
    tempDirsToClean.push(emptyCwd);

    const resourceEnv = isolatedEnvironment(fixtureServer, home1, xdg1);
    const valHelp = valScriptInstalled ? spawnNodeSync([valScriptInstalled, '--help'], {
      cwd: emptyCwd, env: resourceEnv
    }) : { status: -1, stdout: '', stderr: 'installed validator missing' };
    if (valHelp.status !== 0 || !valHelp.stdout.includes('Usage:')) {
      allStepsPassed = false;
      missingEvidence.push(`Installed validator --help expected Usage output, received exit=${valHelp.status}, stdout=${JSON.stringify(valHelp.stdout)}, stderr=${JSON.stringify(valHelp.stderr)}.`);
    }

    const ac005Fixture = path.join(FIXTURES_DIR, 'scenario-ac005.json');
    const calcRun = evalScriptInstalled ? spawnNodeSync([evalScriptInstalled, ac005Fixture], {
      cwd: emptyCwd, env: resourceEnv
    }) : { status: -1, stdout: '', stderr: 'installed calculator missing' };
    console.log(`  Installed calculator AC-005 exit: ${calcRun.status}`);
    let calcParsed = null;
    try {
      calcParsed = JSON.parse(calcRun.stdout.trim());
      const baseRes = calcParsed.results.find((result) => result.scenario_id === 'base');
      const roiMatches = baseRes?.roi?.value === '0.600000';
      const paybackMatches = baseRes?.payback?.period === 12;
      if (calcRun.status !== 0 || !roiMatches || !paybackMatches) {
        allStepsPassed = false;
        missingEvidence.push(`Installed calculator AC-005 mismatch: exit=${calcRun.status}, roi=${baseRes?.roi?.value ?? null}, payback=${baseRes?.payback?.period ?? null}.`);
      }
    } catch (error) {
      console.error(`  Failed to parse calculator output: ${error.message}; stderr=${calcRun.stderr}`);
      allStepsPassed = false;
      missingEvidence.push(`Installed calculator AC-005 output was not parseable: ${error.message}; exit=${calcRun.status}, stdout=${JSON.stringify(calcRun.stdout)}, stderr=${JSON.stringify(calcRun.stderr)}.`);
    }

    const financeFixtureDir = fs.realpathSync(fs.mkdtempSync(path.join(os.tmpdir(), 't09-finance-inputs-')));
    tempDirsToClean.push(financeFixtureDir);
    const baseFinanceInput = JSON.parse(fs.readFileSync(ac005Fixture, 'utf8'));
    const costItem = (input) => input.scenarios[0].items.find((item) => item.side === 'cost');
    const benefitItems = (input) => input.scenarios[0].items.filter((item) => item.side === 'benefit');
    const financeCases = [
      {
        name: 'unknown-cost',
        mutate: (input) => { costItem(input).amount = null; },
        check: (output, status) => status === 0 && output.results[0].cost.reason === 'unknown_cost' && output.results[0].roi.reason === 'unknown_cost' && output.results[0].payback.reason === 'unknown_cash_flow'
      },
      {
        name: 'unknown-benefit',
        mutate: (input) => { input.scenarios[0].items = input.scenarios[0].items.filter((item) => item.side !== 'benefit'); },
        check: (output, status) => status === 0 && output.results[0].benefit.reason === 'unknown_benefit' && output.results[0].roi.reason === 'unknown_benefit'
      },
      {
        name: 'zero-cost',
        mutate: (input) => { costItem(input).amount = '0.00'; },
        check: (output, status) => status === 0 && output.results[0].roi.status === 'undefined' && output.results[0].roi.reason === 'zero_cost' && output.results[0].payback.reason === 'no_investment_outflow'
      },
      {
        name: 'double-count-benefit',
        mutate: (input) => { benefitItems(input)[1].period = benefitItems(input)[0].period; },
        issue: 'DOUBLE_COUNTED_BENEFIT'
      },
      {
        name: 'netted-cost-double-count',
        mutate: (input) => {
          benefitItems(input)[0].basis = 'contribution_margin';
          benefitItems(input)[0].netted_cost_categories = ['support'];
          input.scenarios[0].items.push({
            id: 'support-cost',
            side: 'cost',
            category: 'support',
            mechanism_id: 'support-mechanism',
            period: 6,
            amount: '10.00',
            currency: 'USD',
            basis: 'cash_cost',
            netted_cost_categories: [],
            rationale: 'Synthetic explicit cost for netting boundary',
            evidence_ids: ['SRC-001']
          });
        },
        issue: 'DOUBLE_COUNTED_COST'
      },
      {
        name: 'temporary-payback-crossing',
        mutate: (input) => {
          benefitItems(input)[0].amount = '60000.00';
          benefitItems(input)[1].amount = '10000.00';
          input.scenarios[0].items.push({
            id: 'late-cost',
            side: 'cost',
            category: 'operations',
            mechanism_id: 'late-operation',
            period: 12,
            amount: '30000.00',
            currency: 'USD',
            basis: 'cash_cost',
            netted_cost_categories: [],
            rationale: 'Synthetic later outflow invalidates temporary break-even',
            evidence_ids: ['SRC-001']
          });
        },
        check: (output, status) => status === 0 && output.results[0].payback.status === 'not_reached' && output.results[0].payback.reason === 'no_payback_within_horizon'
      },
      {
        name: 'ratio-half-away-rounding',
        mutate: (input) => {
          costItem(input).amount = '20000.00';
          benefitItems(input)[0].amount = '10000.01';
          benefitItems(input)[1].amount = '10000.00';
        },
        check: (output, status) => status === 0 && output.results[0].roi.value === '0.000001' && output.results[0].roi_percent.value === '0.000050'
      },
      {
        name: 'npv-rate-upper-bound',
        mutate: (input) => { input.discount.rate = '1'; },
        check: (output, status) => status === 0 && output.results[0].npv.status === 'available'
      },
      {
        name: 'npv-domain-overflow',
        mutate: (input) => { costItem(input).amount = '10000000000.00'; },
        issue: 'NUMERIC_RANGE'
      },
      {
        name: 'safe-minor-unit-overflow',
        mutate: (input) => { costItem(input).amount = '90071992547409.92'; },
        issue: 'NUMERIC_RANGE'
      },
      {
        name: 'closed-schema-unknown-field',
        mutate: (input) => { input['untrusted/property'] = true; },
        check: (output, status) => status === 1 && output.issues.some((issue) => issue.code === 'INVALID_FIELD' && issue.path === '/untrusted~1property')
      }
    ];
    const financeCaseEvidence = [];
    for (const financeCase of financeCases) {
      const input = structuredClone(baseFinanceInput);
      financeCase.mutate(input);
      const inputPath = path.join(financeFixtureDir, `${financeCase.name}.json`);
      fs.writeFileSync(inputPath, JSON.stringify(input));
      const result = evalScriptInstalled ? spawnNodeSync([evalScriptInstalled, inputPath], {
        cwd: emptyCwd,
        env: resourceEnv,
        timeoutMs: 15000
      }) : { status: -1, stdout: '', stderr: 'installed calculator missing', durationMs: 0 };
      let output = null;
      let parseError = null;
      try {
        output = JSON.parse(result.stdout.trim());
      } catch (error) {
        parseError = error.message;
      }
      const passed = financeCase.issue
        ? result.status === 1 && output?.issues?.some((issue) => issue.code === financeCase.issue)
        : !!output && financeCase.check(output, result.status);
      if (!passed) allStepsPassed = false;
      financeCaseEvidence.push({
        name: financeCase.name,
        input_sha256: sha256(fs.readFileSync(inputPath)),
        argv: [evalScriptInstalled, inputPath],
        exit: result.status,
        duration_ms: result.durationMs,
        expected_issue: financeCase.issue ?? null,
        actual_issues: output?.issues ?? null,
        actual_base: output?.results?.[0] ?? null,
        stdout: result.stdout,
        stderr: result.stderr,
        parse_error: parseError,
        passed
      });
    }
    const financeCasesPassed = financeCaseEvidence.length === financeCases.length && financeCaseEvidence.every(({ passed }) => passed);
    const failedFinanceCases = financeCaseEvidence.filter(({ passed }) => !passed).map(({ name }) => name);
    if (!financeCasesPassed) {
      allStepsPassed = false;
      missingEvidence.push(`Installed calculator financial cases failed: ${failedFinanceCases.join(', ') || 'missing scenario results'}.`);
    }
    console.log(`  Installed calculator financial boundary cases: ${financeCasesPassed}`);

    const filesBeforeImport = fs.readdirSync(emptyCwd).sort();
    const requestCountBeforeImport = fixtureServer.requests.length;
    const valModuleUrl = valScriptInstalled ? pathToFileURL(valScriptInstalled).href : '';
    const evalModuleUrl = evalScriptInstalled ? pathToFileURL(evalScriptInstalled).href : '';
    const importScript = [
      `const validator = await import(${JSON.stringify(valModuleUrl)});`,
      `const calculator = await import(${JSON.stringify(evalModuleUrl)});`,
      'process.stdout.write(JSON.stringify({ validator: typeof validator.validateProductEvidence === "function", calculator: typeof calculator.evaluateInvestment === "function" }));'
    ].join('\n');
    const importRun = valScriptInstalled && evalScriptInstalled ? await spawnNodeAsync(
      ['--input-type=module', '-e', importScript], { cwd: emptyCwd, env: resourceEnv, timeoutMs: 15000 }
    ) : { status: -1, stdout: '', stderr: 'installed library entry missing' };
    let libImportPassed = false;
    try {
      const imports = JSON.parse(importRun.stdout);
      libImportPassed = importRun.status === 0 && imports.validator && imports.calculator &&
        fs.readdirSync(emptyCwd).sort().join('\0') === filesBeforeImport.join('\0') &&
        fixtureServer.requests.length === requestCountBeforeImport;
    } catch (error) {
      console.error(`  Isolated library import failed: ${error.message}; stderr=${importRun.stderr}`);
    }
    if (!libImportPassed) allStepsPassed = false;
    const resourceHashes = {
      validator: valScriptInstalled ? sha256(fs.readFileSync(valScriptInstalled)) : null,
      calculator: evalScriptInstalled ? sha256(fs.readFileSync(evalScriptInstalled)) : null
    };

    completedEvidence.push(JSON.stringify({
      step: '2_standalone_resources',
      validator_help: { argv: [valScriptInstalled, '--help'], exit: valHelp.status, duration_ms: valHelp.durationMs, stdout: valHelp.stdout, stderr: valHelp.stderr },
      calculator_ac005: { argv: [evalScriptInstalled, ac005Fixture], exit: calcRun.status, duration_ms: calcRun.durationMs, stdout: calcRun.stdout, stderr: calcRun.stderr },
      calculator_financial_cases: { passed: financeCasesPassed, cases: financeCaseEvidence },
      library_import: { exit: importRun.status, duration_ms: importRun.durationMs, stdout: importRun.stdout, stderr: importRun.stderr },
      library_imports_ok: libImportPassed,
      empty_consumer_writes: fs.readdirSync(emptyCwd),
      resource_hashes: resourceHashes,
      import_network_requests: fixtureServer.requests.length - requestCountBeforeImport
    }));
    // The override assertion is complete; MCP body checks use the canonical installed bytes.
    fs.writeFileSync(managedSkillPath, originalManagedSkill);

    // -------------------------------------------------------------------------
    // Step 3: MCP Client stdio Connection & Tool Invocations
    // -------------------------------------------------------------------------
    console.log(`\n--- Step 3: MCP Client stdio Connection & Tool Invocations ---`);
    let mcpTested = false;
    let mcpClient = null;
    let transport = null;
    try {
      const req = createRequire(path.join(candidateRoot, 'mcp/package.json'));
      const { Client } = req(req.resolve('@modelcontextprotocol/sdk/client/index.js', { paths: [path.join(candidateRoot, 'mcp')] }));
      const { StdioClientTransport } = req(req.resolve('@modelcontextprotocol/sdk/client/stdio.js', { paths: [path.join(candidateRoot, 'mcp')] }));

      transport = new StdioClientTransport({
        command: process.execPath,
        args: [mcpPath],
        env: isolatedMcpEnvironment(home1, xdg1, consumer1, fixtureServer)
      });

      mcpClient = new Client({ name: 't09-smoke-client', version: '1.0.0' }, { capabilities: {} });
      await withTimeout(mcpClient.connect(transport), 8000, 'MCP client connect');
      console.log(`  Connected MCP Client via StdioClientTransport!`);

      const toolsRes = await withTimeout(mcpClient.listTools(), 5000, 'listTools');
      const toolNames = toolsRes.tools.map(t => t.name);
      console.log(`  MCP tools listed (${toolNames.length}): ${toolNames.join(', ')}`);

      // get_skill product-management/product-evidence
      const evidenceRes = await withTimeout(mcpClient.callTool({
        name: 'get_skill',
        arguments: { category: 'product-management', name: 'product-evidence' }
      }), 5000, 'get_skill(product-evidence)');
      const evidenceContent = evidenceRes.content?.[0]?.text || '';
      const evidenceBody = fixtureServer.fileMap.get('skills/product-management/product-evidence/SKILL.md')?.toString('utf8') || '';
      const evidenceLoaded = Boolean(evidenceBody) && evidenceContent === `<!-- skill: product-management/product-evidence | matched: direct -->\n${evidenceBody}`;

      const invRes = await withTimeout(mcpClient.callTool({
        name: 'get_skill',
        arguments: { category: 'product-management', name: 'product-investment' }
      }), 5000, 'get_skill(INV)');
      const invContent = invRes.content?.[0]?.text || '';
      const invBody = fixtureServer.fileMap.get('skills/product-management/product-investment/SKILL.md')?.toString('utf8') || '';
      const invLoaded = Boolean(invBody) && invContent === `<!-- skill: product-management/product-investment | matched: direct -->\n${invBody}`;

      const kwRes = await withTimeout(mcpClient.callTool({
        name: 'load_skills_for_keywords',
        arguments: { keywords: ['product investment analysis'], force_reload: true }
      }), 5000, 'load_skills_for_keywords');
      const kwText = kwRes.content?.[0]?.text || '';
      const kwMatched = kwText.includes('<!-- skill: product-management/product-investment | matched: keyword:product investment analysis -->') &&
        kwText.includes(invBody);

      const bareRes = await withTimeout(mcpClient.callTool({
        name: 'load_skills_for_keywords',
        arguments: { keywords: ['investment'], force_reload: true }
      }), 5000, 'load_skills_for_keywords(bare)');
      const bareText = bareRes.content?.[0]?.text || '';
      const bareTermUnmatched = bareText.includes('No skill keyword triggers matched: investment') &&
        !bareText.includes('product-management/product-investment');

      const filesRes = await withTimeout(mcpClient.callTool({
        name: 'load_skills_for_files',
        arguments: { files: ['docs/product/test/evidence.json', 'README.md', 'docs/product/test/unrelated.json'], force_reload: true }
      }), 5000, 'load_skills_for_files');
      const filesText = filesRes.content?.[0]?.text || '';
      const ledgerMatched = filesText.includes('<!-- skill: product-management/product-evidence | matched: file:docs/product/*/evidence.json -->') &&
        filesText.includes(evidenceBody);
      const unrelatedFilesUnmatched = !filesText.includes('product-management/product-investment');

      const auditRes = await withTimeout(mcpClient.callTool({
        name: 'audit_session_compliance',
        arguments: {}
      }), 5000, 'audit_session_compliance');
      const auditText = auditRes.content?.[0]?.text || '';
      const auditTracksLoads = auditText.includes('product-management/product-evidence') &&
        auditText.includes('product-management/product-investment');
      const listWorkflowsRes = await withTimeout(mcpClient.callTool({
        name: 'list_workflows',
        arguments: {}
      }), 5000, 'list_workflows(native-only)');
      const listWorkflowsText = listWorkflowsRes.content?.[0]?.text || '';
      const nativeOnlyWorkflowRes = await withTimeout(mcpClient.callTool({
        name: 'get_workflow',
        arguments: { name: 'discover-product' }
      }), 5000, 'get_workflow(native-only)');
      const nativeOnlyWorkflowText = nativeOnlyWorkflowRes.content?.[0]?.text || '';
      const nativeOnlyGap = !listWorkflowsText.includes('discover-product') &&
        nativeOnlyWorkflowRes.isError === true && nativeOnlyWorkflowText.includes("Workflow 'discover-product' not found");
      mcpTested = ['get_skill', 'load_skills_for_keywords', 'load_skills_for_files',
        'audit_session_compliance', 'list_workflows', 'get_workflow'].every((name) => toolNames.includes(name)) &&
        evidenceLoaded && invLoaded && kwMatched && bareTermUnmatched && ledgerMatched &&
        unrelatedFilesUnmatched && auditTracksLoads && nativeOnlyGap;
      if (!mcpTested) {
        allStepsPassed = false;
        missingEvidence.push(`Primary MCP assertions failed: ${JSON.stringify({
          product_evidence_body: evidenceLoaded,
          investment_body: invLoaded,
          qualified_keyword: kwMatched,
          bare_keyword_negative: bareTermUnmatched,
          ledger_file_route: ledgerMatched,
          unrelated_files_negative: unrelatedFilesUnmatched,
          audit: auditTracksLoads,
          native_only_gap: nativeOnlyGap,
          missing_tools: ['get_skill', 'load_skills_for_keywords', 'load_skills_for_files', 'audit_session_compliance', 'list_workflows', 'get_workflow'].filter((name) => !toolNames.includes(name))
        })}`);
      }
      completedEvidence.push(JSON.stringify({
        step: '3_mcp_client_stdio',
        tools: toolNames,
        get_skill: {
          product_evidence: { matched: evidenceLoaded, canonical_body_sha256: sha256(evidenceBody), response: evidenceContent },
          product_investment: { matched: invLoaded, canonical_body_sha256: sha256(invBody), response: invContent }
        },
        qualified_keyword: { matched: kwMatched, response: kwText },
        bare_keyword: { unmatched: bareTermUnmatched, response: bareText },
        scoped_files: { matched_ledger: ledgerMatched, unrelated_files_unmatched: unrelatedFilesUnmatched, response: filesText },
        audit_session_compliance: { loaded_ids_present: auditTracksLoads, response: auditText },
        native_only_workflow_gap: { verified: nativeOnlyGap, list_response: listWorkflowsText, get_response: nativeOnlyWorkflowText }
      }));
    } catch (err) {
      console.error(`  MCP test error: ${err.message}`);
      allStepsPassed = false;
    } finally {
      const closeResult = await closeMcpClient(mcpClient, transport, 'primary MCP');
      if (!closeResult.closed) {
        allStepsPassed = false;
        missingEvidence.push(`Primary MCP teardown failed: ${closeResult.error}`);
      }
      completedEvidence.push(JSON.stringify({ step: '3_mcp_teardown', ...closeResult }));
    }

    // -------------------------------------------------------------------------
    // Step 4: Negative Consumer Configurations
    // -------------------------------------------------------------------------
    console.log(`\n--- Step 4: Negative Consumer Configurations ---`);
    const consumerNeg = fs.mkdtempSync(path.join(os.tmpdir(), 't09-consumer-neg-'));
    const homeNeg = fs.mkdtempSync(path.join(os.tmpdir(), 't09-home-neg-'));
    const xdgNeg = fs.mkdtempSync(path.join(os.tmpdir(), 't09-xdg-neg-'));
    tempDirsToClean.push(consumerNeg, homeNeg, xdgNeg);

    const skillsrcNeg = `
registry: "https://github.com/HoangNguyen0403/agent-skills-standard"
agents:
  - codex
skills:
  common:
    ref: "${commitSha}"
  product-management:
    ref: "${commitSha}"
    exclude:
      - product-evidence
      - product-investment
workflows: false
mcp:
  enabled: false
  scope: disabled
  prompted: true
telemetry: false
`;
    fs.writeFileSync(path.join(consumerNeg, '.skillsrc'), skillsrcNeg.trim());
    const syncNegRes = await runCliAsync(consumerNeg, ['sync', '--yes'], { HOME: homeNeg, XDG_CONFIG_HOME: xdgNeg });
    console.log(`  Negative sync exit: ${syncNegRes.status}`);

    // Verify MCP on negative consumer returns missing body guidance
    let negMcpPassed = false;
    let negClient = null;
    let negTransport = null;
    try {
      const req = createRequire(path.join(candidateRoot, 'mcp/package.json'));
      const { Client } = req(req.resolve('@modelcontextprotocol/sdk/client/index.js', { paths: [path.join(candidateRoot, 'mcp')] }));
      const { StdioClientTransport } = req(req.resolve('@modelcontextprotocol/sdk/client/stdio.js', { paths: [path.join(candidateRoot, 'mcp')] }));
      negTransport = new StdioClientTransport({
        command: process.execPath,
        args: [mcpPath],
        env: isolatedMcpEnvironment(homeNeg, xdgNeg, consumerNeg, fixtureServer)
      });
      negClient = new Client({ name: 't09-neg-client', version: '1.0.0' }, { capabilities: {} });
      await withTimeout(negClient.connect(negTransport), 8000, 'Neg MCP connect');
      const missingRes = await withTimeout(negClient.callTool({
        name: 'get_skill',
        arguments: { category: 'product-management', name: 'product-investment' }
      }), 5000, 'Neg get_skill');
      const missingText = missingRes.content?.[0]?.text || '';
      const workflowRes = await withTimeout(negClient.callTool({
        name: 'get_workflow',
        arguments: { name: 'discover-product' }
      }), 5000, 'Neg get_workflow');
      const workflowText = workflowRes.content?.[0]?.text || '';
      const noInvestmentInstall = !fs.existsSync(path.join(consumerNeg, '.claude/skills/product-management/product-investment/SKILL.md'));
      const missingGuidancePresent = missingText.includes('Category "product-management" exists, but it does not contain a skill named "product-investment".');
      const workflowGapPresent = workflowRes.isError === true && workflowText.includes("Workflow 'discover-product' not found");
      negMcpPassed = syncNegRes.status === 0 && noInvestmentInstall && missingGuidancePresent && workflowGapPresent;
      if (!negMcpPassed) {
        allStepsPassed = false;
        missingEvidence.push(`Negative MCP configuration failed: PM install absent=${noInvestmentInstall}, precise missing-skill guidance=${missingGuidancePresent}, workflow gap=${workflowGapPresent}, sync exit=${syncNegRes.status}.`);
      }
      completedEvidence.push(JSON.stringify({
        step: '4_negative_configs',
        sync: { argv: ['sync', '--yes'], exit: syncNegRes.status, duration_ms: syncNegRes.durationMs, stdout: syncNegRes.stdout, stderr: syncNegRes.stderr },
        product_investment_not_installed: noInvestmentInstall,
        missing_skill_guidance: { passed: missingGuidancePresent, response: missingText },
        workflow_dependency_gap: { passed: workflowGapPresent, response: workflowText }
      }));
    } catch (error) {
      console.error(`  Negative MCP error: ${error.message}`);
      missingEvidence.push(`Negative MCP evidence unavailable: ${error.message}`);
    } finally {
      const closeResult = await closeMcpClient(negClient, negTransport, 'negative MCP');
      if (!closeResult.closed) {
        allStepsPassed = false;
        missingEvidence.push(`Negative MCP teardown failed: ${closeResult.error}`);
      }
      completedEvidence.push(JSON.stringify({ step: '4_mcp_teardown', ...closeResult }));
    }


    // -------------------------------------------------------------------------
    // Step 5: Antigravity Canonical Workflow Discovery
    // -------------------------------------------------------------------------
    console.log(`\n--- Step 5: Antigravity Canonical Workflow Discovery ---`);
    const consumerAnti = fs.mkdtempSync(path.join(os.tmpdir(), 't09-consumer-anti-'));
    const homeAnti = fs.mkdtempSync(path.join(os.tmpdir(), 't09-home-anti-'));
    const xdgAnti = fs.mkdtempSync(path.join(os.tmpdir(), 't09-xdg-anti-'));
    tempDirsToClean.push(consumerAnti, homeAnti, xdgAnti);

    const skillsrcAnti = `
registry: "https://github.com/HoangNguyen0403/agent-skills-standard"
agents:
  - antigravity
skills: {}
workflows:
  - discover-product
  - validate-product
  - review-product-value
mcp:
  enabled: false
  scope: disabled
  prompted: true
telemetry: false
`;
    fs.writeFileSync(path.join(consumerAnti, '.skillsrc'), skillsrcAnti.trim());
    const syncAntiRes = await runCliAsync(consumerAnti, ['sync', '--yes'], { HOME: homeAnti, XDG_CONFIG_HOME: xdgAnti });
    console.log(`  Antigravity sync exit: ${syncAntiRes.status}`);

    const canonicalWfDir = path.join(consumerAnti, '.agents/workflows');
    const canonicalWorkflowChecks = Object.fromEntries(workflowNames.map((name) => {
      const source = fixtureServer.fileMap.get(`.agents/workflows/${name}.md`)?.toString('utf8') ?? '';
      const installedPath = path.join(canonicalWfDir, `${name}.md`);
      const installed = fs.existsSync(installedPath) ? fs.readFileSync(installedPath, 'utf8') : '';
      return [name, {
        byte_identical: Boolean(source && installed === source),
        source_sha256: source ? sha256(source) : null,
        installed_sha256: installed ? sha256(installed) : null
      }];
    }));
    const hasCanonicalWfs = workflowNames.every((name) => canonicalWorkflowChecks[name].byte_identical);

    let wfCallsPassed = false;
    let antiClient = null;
    let antiTransport = null;
    const workflowResponses = {};
    try {
      const req = createRequire(path.join(candidateRoot, 'mcp/package.json'));
      const { Client } = req(req.resolve('@modelcontextprotocol/sdk/client/index.js', { paths: [path.join(candidateRoot, 'mcp')] }));
      const { StdioClientTransport } = req(req.resolve('@modelcontextprotocol/sdk/client/stdio.js', { paths: [path.join(candidateRoot, 'mcp')] }));
      antiTransport = new StdioClientTransport({
        command: process.execPath,
        args: [mcpPath],
        env: isolatedMcpEnvironment(homeAnti, xdgAnti, consumerAnti, fixtureServer)
      });
      antiClient = new Client({ name: 't09-anti-client', version: '1.0.0' }, { capabilities: {} });
      await withTimeout(antiClient.connect(antiTransport), 8000, 'Antigravity MCP connect');
      const listed = await withTimeout(antiClient.callTool({ name: 'list_workflows', arguments: {} }), 5000, 'Antigravity list_workflows');
      const listedText = listed.content?.[0]?.text || '';
      const results = await Promise.all(workflowNames.map((name) => withTimeout(
        antiClient.callTool({ name: 'get_workflow', arguments: { name } }),
        5000,
        `get_workflow(${name})`
      )));
      wfCallsPassed = workflowNames.every((name, index) => {
        const source = fixtureServer.fileMap.get(`.agents/workflows/${name}.md`)?.toString('utf8') ?? '';
        const body = source.replace(/^---\n[\s\S]*?\n---\n/, '').trimEnd();
        const result = results[index];
        const response = result.content?.[0]?.text || '';
        workflowResponses[name] = { is_error: result.isError === true, contains_canonical_body: response.includes(body), response };
        return result.isError !== true && listedText.includes(name) && response.includes(body);
      });
      completedEvidence.push(JSON.stringify({
        step: '5_antigravity_workflows',
        sync: { argv: ['sync', '--yes'], exit: syncAntiRes.status, duration_ms: syncAntiRes.durationMs, stdout: syncAntiRes.stdout, stderr: syncAntiRes.stderr },
        canonical_workflows: canonicalWorkflowChecks,
        list_workflows: listedText,
        get_workflow: workflowResponses
      }));
    } catch (error) {
      console.error(`  Antigravity MCP error: ${error.message}`);
      missingEvidence.push(`Antigravity workflow lookup unavailable: ${error.message}`);
    } finally {
      const closeResult = await closeMcpClient(antiClient, antiTransport, 'Antigravity MCP');
      if (!closeResult.closed) {
        allStepsPassed = false;
        missingEvidence.push(`Antigravity MCP teardown failed: ${closeResult.error}`);
      }
      completedEvidence.push(JSON.stringify({ step: '5_mcp_teardown', ...closeResult }));
    }
    if (syncAntiRes.status !== 0 || !hasCanonicalWfs || !wfCallsPassed) {
      allStepsPassed = false;
      missingEvidence.push(`Antigravity workflow consumer failed: sync exit=${syncAntiRes.status}, canonical files=${hasCanonicalWfs}, get_workflow bodies=${wfCallsPassed}.`);
    }

    // -------------------------------------------------------------------------
    // Step 6: Artifact-Backed Route Walkthrough Execution & Validation
    // -------------------------------------------------------------------------
    console.log(`\n--- Step 6: Artifact-Backed Route Walkthrough Execution & Validation ---`);
    const transitionsDir = path.join(FIXTURES_DIR, 'transitions');
    let transitionsPassed = true;

    // Use installed validator script from consumer1
    const valScript = valScriptInstalled;

    const fixturesToTest = [
      { dir: '01-reused-context', gate: 'structural', expectedExit: 0, expectedReadiness: 'not_assessed', expectedValid: true },
      { dir: '02-no-access', gate: 'structural', expectedExit: 0, expectedReadiness: 'not_assessed', expectedValid: true },
      { dir: '03-invalidated-assumption', gate: 'structural', expectedExit: 0, expectedReadiness: 'not_assessed', expectedValid: true },
      { dir: '04-capability-gap', gate: 'structural', expectedExit: 0, expectedReadiness: 'not_assessed', expectedValid: true },
      {
        dir: '05-unauthorized-experiment',
        gate: 'experiment',
        expectedExit: 3,
        expectedReadiness: 'proposal_only',
        expectedValid: true,
        expectedIssue: 'AUTHORIZATION_REQUIRED'
      },
      {
        dir: '06-supported-handoff',
        gate: 'commit',
        expectedExit: 3,
        expectedReadiness: 'blocked',
        expectedValid: true,
        expectedIssue: 'AUTHORIZATION_REQUIRED'
      },
      {
        dir: '07-material-query-change',
        gate: 'experiment',
        expectedExit: 3,
        expectedReadiness: 'blocked',
        expectedValid: true,
        expectedIssue: 'OBSOLETE_BINDING'
      },
      { dir: '08-released-inconclusive', gate: 'structural', expectedExit: 0, expectedReadiness: 'not_assessed', expectedValid: true },
      { dir: '09-guardrail-harm', gate: 'structural', expectedExit: 0, expectedReadiness: 'not_assessed', expectedValid: true }
    ];

    const routeCommands = [];
    for (const { dir, gate, expectedExit, expectedReadiness, expectedValid, expectedIssue } of fixturesToTest) {
      const root = path.join(transitionsDir, dir);
      const ledger = path.join(root, 'evidence.json');
      if (!fs.existsSync(ledger) || !valScript) {
        console.error(`  FAIL: Transition ledger or installed validator missing for ${dir}`);
        transitionsPassed = false;
        allStepsPassed = false;
        continue;
      }

      const argv = [valScript, ledger, '--authority-root', root, '--as-of', '2026-10-14T00:00:00Z', '--gate', gate];
      const res = spawnNodeSync(argv, { timeoutMs: 15000, cwd: emptyCwd, env: resourceEnv });
      let envelope = null;
      let parseError = null;
      try {
        envelope = JSON.parse(res.stdout.trim());
      } catch (error) {
        parseError = error.message;
      }
      const exitMatched = res.status === expectedExit;
      const validMatched = envelope?.valid === expectedValid;
      const readinessMatched = envelope?.readiness === expectedReadiness;
      const issueMatched = !expectedIssue || envelope?.issues?.some((issue) => issue.code === expectedIssue);
      const passed = exitMatched && validMatched && readinessMatched && issueMatched;
      routeCommands.push({
        fixture: dir,
        route_assertion_type: 'FIXTURE_ONLY',
        model_behavior_status: 'PENDING_H2',
        note: 'Route walkthrough checks verify static fixture transitions and package execution only. Live model and agent behavior for AC-010, AC-011, and AC-012 remain pending H2 evaluation.',
        cwd: emptyCwd,
        argv,
        expected: { exit: expectedExit, valid: expectedValid, readiness: expectedReadiness, issue: expectedIssue ?? null },
        actual: { exit: res.status, valid: envelope?.valid ?? null, readiness: envelope?.readiness ?? null, issues: envelope?.issues ?? null, stdout: res.stdout, stderr: res.stderr, parse_error: parseError },
        duration_ms: res.durationMs,
        passed
      });
      console.log(`  Transition ${dir} at ${gate}: exit ${res.status}, readiness ${envelope?.readiness} -> ${passed}`);
      if (!passed) {
        transitionsPassed = false;
        allStepsPassed = false;
        missingEvidence.push(`Installed validator route ${dir} (${gate}) did not produce expected envelope: expected=${JSON.stringify({ exit: expectedExit, valid: expectedValid, readiness: expectedReadiness, issue: expectedIssue ?? null })}, actual=${JSON.stringify({ exit: res.status, valid: envelope?.valid ?? null, readiness: envelope?.readiness ?? null, issues: envelope?.issues ?? null, stdout: res.stdout, stderr: res.stderr, parse_error: parseError })}.`);
      }
    }

    const outcomesDir = path.join(transitionsDir, 'outcomes');
    const outcomeFiles = fs.existsSync(outcomesDir) ? fs.readdirSync(outcomesDir).filter((file) => file.endsWith('.json')).sort() : [];
    const outcomeAudit = await validateWithExistingCollector(candidateRoot, outcomesDir, fixtureServer);
    const outcomeResult = outcomeAudit.status === 0 ? JSON.parse(outcomeAudit.stdout) : null;
    const outcomeExpectations = {
      '01-reused-context.json': (item) => item.feature_status === 'requirements_ready' && item.recommended_next_workflow === 'plan-feature',
      '02-no-access.json': (item) => item.missing_evidence.some((line) => line.includes('informed consent')) && item.decision_needed.some((line) => line.includes('authorizes customer recruitment')),
      '03-invalidated-assumption.json': (item) => item.decision_needed.some((line) => line.includes('defer / no-build')) && item.recommended_next_workflow === 'retro-learn',
      '04-capability-gap.json': (item) => item.missing_evidence.some((line) => line.includes('product-management/product-evidence excluded')),
      '05-unauthorized-experiment.json': (item) => item.feature_status === 'not_started' && item.missing_evidence.some((line) => line.includes('Host authorization')),
      '06-supported-handoff.json': (item) => item.feature_status === 'not_started' && item.missing_evidence.some((line) => line.includes('synthetic evidence and host approval gate')),
      '07-material-query-change.json': (item) => item.feature_status === 'not_started' && item.missing_evidence.some((line) => line.includes('query-v2')),
      '08-released-inconclusive.json': (item) => item.feature_status === 'released' && item.missing_evidence.some((line) => line.includes('Mature 30-day telemetry')) && item.recommended_next_workflow === 'retro-learn',
      '09-guardrail-harm.json': (item) => item.feature_status === 'released' && item.decision_needed.some((line) => line.includes('On-call SRE')) && item.recommended_next_workflow === 'incident-hotfix'
    };
    const outcomeScenarioResults = Object.entries(outcomeExpectations).map(([file, check]) => {
      let record = null;
      let error = null;
      try {
        record = JSON.parse(fs.readFileSync(path.join(outcomesDir, file), 'utf8'));
      } catch (caught) {
        error = caught.message;
      }
      const passed = !!record && check(record);
      return { file, passed, error, feature_status: record?.feature_status ?? null, recommended_next_workflow: record?.recommended_next_workflow ?? null };
    });
    const outcomeScenariosPassed = outcomeScenarioResults.length === 9 && outcomeScenarioResults.every(({ passed }) => passed);
    const outcomesOk = outcomeFiles.length === 9 && outcomeResult?.checked === 9 && outcomeResult.issues.length === 0 && outcomeScenariosPassed;
    console.log(`  Existing Outcome collector checked ${outcomeFiles.length} transition records: ${outcomesOk}`);
    if (!outcomesOk) {
      console.error(`  Outcome collector output: ${outcomeAudit.stdout || outcomeAudit.stderr}`);
      allStepsPassed = false;
    }
    if (!transitionsPassed || !outcomesOk) allStepsPassed = false;
    completedEvidence.push(JSON.stringify({
      step: '6_artifact_walkthroughs',
      route_assertion_type: 'FIXTURE_ONLY',
      behavioral_semantics_status: 'PENDING_H2',
      behavioral_semantics_note: 'Static route verification proves package transition mechanics and Outcome collector schema validity only. Behavioral model efficacy and live agent decisions for AC-010, AC-011, and AC-012 remain pending separate H2 evaluation.',
      transitions_passed: transitionsPassed,
      route_commands: routeCommands,
      outcomes_validated: outcomesOk,
      outcome_scenarios: outcomeScenarioResults,
      outcome_collector_exit: outcomeAudit.status,
      outcome_collector_output: outcomeAudit.stdout,
      outcome_collector_error: outcomeAudit.stderr
    }));
  } catch (err) {
    console.error(`\n❌ Smoke harness encountered error: ${err.message}`);
    allStepsPassed = false;
    missingEvidence.push(`Smoke harness error: ${err.message}`);
  } finally {
    // -------------------------------------------------------------------------
    // Teardown: Close Fixture Server & Clean Temp Dirs & Kill Active Children
    // -------------------------------------------------------------------------
    const children = Array.from(activeChildProcesses);
    const childExits = children.map((proc) => new Promise((resolve) => {
      if (proc.exitCode !== null || proc.signalCode !== null) return resolve();
      proc.once('close', resolve);
      proc.once('error', resolve);
    }));
    for (const proc of children) {
      try {
        proc.kill('SIGKILL');
      } catch (error) {
        allStepsPassed = false;
        missingEvidence.push(`Failed to stop child process: ${error.message}`);
      }
    }
    if (childExits.length > 0) {
      try {
        await withTimeout(Promise.all(childExits), 5000, 'child process teardown');
      } catch (error) {
        allStepsPassed = false;
        missingEvidence.push(`Child process teardown incomplete: ${error.message}`);
      }
    }
    if (fixtureServer) {
      try {
        await withTimeout(fixtureServer.close(), 5000, 'fixture server close');
        console.log(`\n✓ Closed loopback registry fixture cleanly`);
      } catch (error) {
        allStepsPassed = false;
        missingEvidence.push(`Registry fixture teardown failed: ${error.message}`);
      }
    }
    for (const dir of tempDirsToClean) {
      try {
        fs.rmSync(dir, { recursive: true, force: true });
      } catch (error) {
        allStepsPassed = false;
        missingEvidence.push(`Temporary directory cleanup failed for ${dir}: ${error.message}`);
      }
    }
    console.log(`✓ Temporary consumer cleanup attempted`);

    const completedAt = new Date().toISOString();
    const runRecord = {
      schema_version: 1,
      run_id: `t09-smoke-${Date.now()}`,
      slug: 'product-evidence-sdlc',
      workflow: 'verify-work',
      feature_status: allStepsPassed ? 'verified' : 'blocked',
      started_at: startedAt,
      completed_at: completedAt,
      requirement_trace: {
        brd_objectives: ['BRD-OBJ-001', 'BRD-OBJ-002', 'BRD-OBJ-003'],
        requirements: ['REQ-001', 'REQ-002', 'REQ-003', 'REQ-004', 'REQ-005', 'REQ-006', 'REQ-007', 'REQ-008'],
        acceptance_criteria: ['AC-001', 'AC-002', 'AC-003', 'AC-004', 'AC-005', 'AC-006', 'AC-007', 'AC-008', 'AC-009', 'AC-010', 'AC-011', 'AC-012', 'AC-013', 'AC-014', 'AC-015'],
        srs: ['SRS-001', 'SRS-002', 'SRS-003', 'SRS-004', 'SRS-005', 'SRS-006', 'SRS-007', 'SRS-008', 'SRS-009', 'SRS-010', 'SRS-011', 'SRS-012', 'SRS-013', 'SRS-014']
      },
      completed_evidence: completedEvidence,
      missing_evidence: missingEvidence,
      decision_needed: allStepsPassed ? [] : [...missingEvidence],
      recommended_next_workflow: allStepsPassed ? 'uat-signoff' : null,
      cost: { source: 'unavailable' },
      agent: {
        identity: 'omp/openai-codex/gpt-6-luna:high',
        model: 'gpt-6-luna'
      }
    };

    let receiptValidation = { passed: false, exit: -1, stdout: '', stderr: 'not run' };
    const validationDir = fs.mkdtempSync(path.join(os.tmpdir(), 't09-runrecord-validation-'));
    try {
      const validationFile = path.join(validationDir, 'consumer-smoke.json');
      fs.writeFileSync(validationFile, JSON.stringify(runRecord, null, 2));
      const validation = await validateWithExistingCollector(candidateRoot, validationDir, fixtureServer);
      let result = null;
      try {
        result = JSON.parse(validation.stdout);
      } catch {
        result = null;
      }
      receiptValidation = {
        passed: validation.status === 0 && result?.checked === 1 && result.issues.length === 0,
        exit: validation.status,
        stdout: validation.stdout,
        stderr: validation.stderr
      };
    } catch (error) {
      receiptValidation = { passed: false, exit: -1, stdout: '', stderr: error.message };
    } finally {
      fs.rmSync(validationDir, { recursive: true, force: true });
    }
    if (!receiptValidation.passed) {
      allStepsPassed = false;
      missingEvidence.push(`Canonical RunRecord collector rejected the smoke receipt: ${receiptValidation.stderr || receiptValidation.stdout}`);
    }
    completedEvidence.push(JSON.stringify({ step: 'runrecord_validation', ...receiptValidation }));
    runRecord.feature_status = allStepsPassed ? 'verified' : 'blocked';
    runRecord.completed_evidence = completedEvidence;
    runRecord.missing_evidence = missingEvidence;
    runRecord.decision_needed = allStepsPassed ? [] : [...missingEvidence];
    runRecord.recommended_next_workflow = allStepsPassed ? 'uat-signoff' : null;
    runRecord.completed_at = new Date().toISOString();
    const receiptBytes = JSON.stringify(runRecord, null, 2);

    try {
      fs.mkdirSync(path.dirname(outPath), { recursive: true });
      fs.writeFileSync(outPath, receiptBytes);
      console.log(`\n✓ Prescribed 14-field RunRecord written to: ${outPath}`);
      const persistedValidationDir = fs.mkdtempSync(path.join(os.tmpdir(), 't09-persisted-runrecord-'));
      try {
        const persistedFile = path.join(persistedValidationDir, 'consumer-smoke.json');
        fs.writeFileSync(persistedFile, fs.readFileSync(outPath));
        const persistedValidation = await validateWithExistingCollector(candidateRoot, persistedValidationDir, fixtureServer);
        const persistedResult = persistedValidation.status === 0 ? JSON.parse(persistedValidation.stdout) : null;
        const persistedOk = persistedValidation.status === 0 && persistedResult?.checked === 1 && persistedResult.issues.length === 0;
        console.log(`Persisted RunRecord collector validation: ${persistedOk}; exit ${persistedValidation.status}`);
        if (!persistedOk) {
          allStepsPassed = false;
          runRecord.feature_status = 'blocked';
          runRecord.missing_evidence = [...runRecord.missing_evidence, `Persisted RunRecord validation failed: ${persistedValidation.stderr || persistedValidation.stdout}`];
          runRecord.decision_needed = [...runRecord.missing_evidence];
          runRecord.completed_evidence = completedEvidence;
          fs.writeFileSync(outPath, JSON.stringify(runRecord, null, 2));
        }
      } finally {
        fs.rmSync(persistedValidationDir, { recursive: true, force: true });
      }
    } catch (error) {
      allStepsPassed = false;
      console.error(`Failed to write or validate RunRecord: ${error.message}`);
    }

  }
  if (!allStepsPassed) {
    console.error('\n❌ T09 integration smoke test failed one or more assertions.');
    process.exit(1);
  } else {
    console.log('\n✅ T09 integration smoke test passed all scenarios cleanly!');
    process.exit(0);
  }
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main().catch(err => {
    console.error(`Fatal smoke test runner error:`, err);
    process.exit(1);
  });
}
