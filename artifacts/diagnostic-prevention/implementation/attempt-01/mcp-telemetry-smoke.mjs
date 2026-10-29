#!/usr/bin/env node
// artifacts/diagnostic-prevention/implementation/attempt-01/mcp-telemetry-smoke.mjs
// Bounded throwaway scenario helper for Task 8:
// Exercises the ACTUAL built local MCP entrypoint (mcp/dist/index.js) through the
// official @modelcontextprotocol/sdk Client + StdioClientTransport against an
// isolated fixture skill/workflow tree. Verifies direct body load vs dedup stub,
// workflow discovery vs body load, truthful conditional pricing (missing != zero),
// exact operation-derived telemetry counters, and terminal teardown via the
// documented SDK close contract.
//
// This file is verification tooling only. It is not a permanent test suite, it
// makes no rollout/authenticity/efficacy claim, and it never imports internal
// handlers to fabricate results.

import fs from 'node:fs';
import path from 'node:path';
import crypto from 'node:crypto';
import os from 'node:os';
import { spawnSync } from 'node:child_process';
import { createRequire } from 'node:module';
import { fileURLToPath, pathToFileURL } from 'node:url';

const __filename = fileURLToPath(import.meta.url);
const __dirname = path.dirname(__filename);
const DEFAULT_CANDIDATE_ROOT = path.resolve(__dirname, '../../../..');
const STDERR_TAIL_LIMIT = 8192;

const EXPECTED_TOOLS = [
  'audit_session_compliance',
  'get_category_guide',
  'get_eval_report',
  'get_session_cost',
  'get_skill',
  'get_workflow',
  'list_categories',
  'list_workflows',
  'load_skills_for_files',
  'load_skills_for_keywords',
  'verify_eval_run',
];

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
    if (flag === '--mcp') {
      const val = argv[++i];
      if (!val || val.startsWith('--')) throw new Error('--mcp requires a value');
      args.mcp = path.resolve(val);
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
  node artifacts/diagnostic-prevention/implementation/attempt-01/mcp-telemetry-smoke.mjs [options]

Options:
  --candidate-root <path>  Absolute path to repository candidate root (default: repo root)
  --mcp <path>             Absolute path to built MCP entrypoint (default: <root>/mcp/dist/index.js)
  --out <path>             Path to write the verification outcome JSON (required exclusive)
  --keep-temp              Retain temporary workspace for post-run inspection
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
 * Bound a promise in time. The losing promise keeps a no-op rejection handler so a
 * late failure can never surface as an unhandledRejection after the timeout fires.
 */
function withTimeout(promise, ms, label) {
  const observed = Promise.resolve(promise);
  observed.catch(() => {});
  let timer;
  const timeoutPromise = new Promise((_, reject) => {
    timer = setTimeout(() => reject(new Error(`${label} timed out after ${ms}ms`)), ms);
  });
  return Promise.race([observed, timeoutPromise]).finally(() => clearTimeout(timer));
}

/**
 * Publish an honest blocked receipt without ever overwriting existing evidence.
 * Returns the path written, or null when publication was impossible/refused.
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

export async function runMcpTelemetrySmoke(options = {}) {
  const candidateRoot = options.candidateRoot || DEFAULT_CANDIDATE_ROOT;
  const mcpPath = options.mcp || path.join(candidateRoot, 'mcp/dist/index.js');
  const outPath = options.out || path.join(
    candidateRoot,
    'artifacts/diagnostic-prevention/implementation/attempt-01/mcp-telemetry-smoke-run.json'
  );

  // Invariant: output reservation is exclusive; never overwrite prior evidence.
  if (fs.existsSync(outPath)) {
    throw new Error(`Output file already exists, refusing to overwrite: ${outPath}`);
  }
  if (!fs.existsSync(candidateRoot) || !fs.statSync(candidateRoot).isDirectory()) {
    throw new Error(`Candidate root directory not found: ${candidateRoot}`);
  }
  if (!fs.existsSync(mcpPath) || !fs.statSync(mcpPath).isFile()) {
    throw new Error(`Built MCP entrypoint not found at ${mcpPath}. Run 'pnpm --filter ./mcp build' first.`);
  }

  const commitSha = getCandidateCommitSha(candidateRoot);
  const mcpSha = sha256(fs.readFileSync(mcpPath));

  console.log('=== MCP Telemetry Smoke Runner ===');
  console.log(`Candidate Root: ${candidateRoot}`);
  console.log(`Commit SHA:     ${commitSha}`);
  console.log(`MCP Entrypoint: ${mcpPath} (sha256: ${mcpSha.slice(0, 12)}, ${fs.statSync(mcpPath).size} bytes)`);

  let Client;
  let StdioClientTransport;
  try {
    const req = createRequire(path.join(candidateRoot, 'mcp/package.json'));
    const clientPath = req.resolve('@modelcontextprotocol/sdk/client/index.js', { paths: [path.join(candidateRoot, 'mcp')] });
    const stdioPath = req.resolve('@modelcontextprotocol/sdk/client/stdio.js', { paths: [path.join(candidateRoot, 'mcp')] });
    const clientMod = await import(pathToFileURL(clientPath).href);
    const stdioMod = await import(pathToFileURL(stdioPath).href);
    Client = clientMod.Client || clientMod.default?.Client;
    StdioClientTransport = stdioMod.StdioClientTransport || stdioMod.default?.StdioClientTransport;
  } catch (err) {
    throw new Error(`Failed to load @modelcontextprotocol/sdk from ${candidateRoot}/mcp: ${err.message}`);
  }
  if (!Client || !StdioClientTransport) {
    throw new Error('Failed to resolve Client or StdioClientTransport from @modelcontextprotocol/sdk');
  }

  // Isolated fixture tree. Everything the child sees lives under this temp base.
  const runId = crypto.randomBytes(6).toString('hex');
  const tempBase = path.join(os.tmpdir(), `mcp-telemetry-smoke-${runId}`);
  const tempHome = path.join(tempBase, 'home');
  const tempXdg = path.join(tempBase, 'xdg');
  const projectRoot = path.join(tempBase, 'project');
  const telemetryPath = path.join(tempHome, 'telemetry.jsonl');
  const skillsDir = path.join(projectRoot, '.claude/skills');

  fs.mkdirSync(tempHome, { recursive: true });
  fs.mkdirSync(tempXdg, { recursive: true });
  fs.mkdirSync(path.join(skillsDir, 'common', 'sample-skill'), { recursive: true });
  fs.mkdirSync(path.join(projectRoot, '.agents/workflows'), { recursive: true });

  fs.writeFileSync(
    path.join(projectRoot, 'AGENTS.md'),
    '# Fixture project\n\n<!-- SKILLS_INDEX_START -->\n<!-- SKILLS_INDEX_END -->\n',
    'utf8'
  );

  // The parser reads triggers from frontmatter metadata.triggers, NOT from prose.
  const sampleSkillContent = `---
name: sample-skill
description: Isolated test skill for MCP telemetry smoke.
metadata:
  triggers:
    files:
      - "**/*.ts"
    keywords:
      - sample
      - smoke
---
# Sample Skill

Canonical sample skill body for MCP telemetry and direct body load smoke verification.
`;
  fs.writeFileSync(path.join(skillsDir, 'common', 'sample-skill', 'SKILL.md'), sampleSkillContent, 'utf8');

  const sampleWorkflowContent = `# Sample Workflow

## Goal
Verify workflow listing vs direct body retrieval.

## Steps
1. Discover workflow.
2. Load workflow body.
`;
  fs.writeFileSync(path.join(projectRoot, '.agents/workflows/sample-workflow.md'), sampleWorkflowContent, 'utf8');
  fs.writeFileSync(path.join(projectRoot, '.skillsrc'), 'telemetry: true\n', 'utf8');

  const mcpEnv = {
    PATH: process.env.PATH || '/usr/bin:/bin:/usr/local/bin:/opt/homebrew/bin',
    HOME: tempHome,
    XDG_CONFIG_HOME: tempXdg,
    TMPDIR: os.tmpdir(),
    LANG: 'C.UTF-8',
    LC_ALL: 'C.UTF-8',
    SKILLS_PROJECT_ROOT: projectRoot,
    MCP_TRANSPORT: 'stdio',
    AGS_TELEMETRY: '1',
    AGS_TELEMETRY_PATH: telemetryPath,
  };

  // Cross-block state: declared once so the finally block and the outcome record
  // never reference a binding that only existed inside try.
  let transport = null;
  let client = null;
  let connectPromise = null;
  let connected = false;
  let childExitPromise = null;
  let stderrTail = '';
  let parsedRecord = null;
  let closeErr = null;
  let cleanupErr = null;
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
    console.log('Connecting MCP client over StdioClientTransport...');
    transport = new StdioClientTransport({
      command: process.execPath,
      args: [mcpPath],
      env: mcpEnv,
      cwd: projectRoot,
      stderr: 'pipe',
    });
    const stderrStream = transport.stderr;
    if (stderrStream) {
      stderrStream.on('data', (chunk) => {
        stderrTail = (stderrTail + chunk.toString('utf8')).slice(-STDERR_TAIL_LIMIT);
      });
    }

    client = new Client({ name: 'mcp-telemetry-smoke-client', version: '1.0.0' }, { capabilities: {} });
    connectPromise = client.connect(transport);
    await withTimeout(connectPromise, 10000, 'MCP client connect');
    connected = true;

    // Documented contract: Protocol.connect takes ownership of transport.onclose.
    // Chain the SDK's handler instead of replacing it, so internal close handling
    // still runs while we observe the actual child close event.
    const protocolOnclose = transport.onclose;
    childExitPromise = new Promise((resolve) => {
      transport.onclose = () => {
        try {
          protocolOnclose?.();
        } finally {
          resolve();
        }
      };
    });
    console.log('Connected to MCP server via stdio.');

    const toolsRes = await withTimeout(client.listTools(), 5000, 'listTools');
    const toolNames = toolsRes.tools.map((t) => t.name).sort();
    const exactToolSet = JSON.stringify(toolNames) === JSON.stringify(EXPECTED_TOOLS);
    observe({
      id: 'T01_list_tools',
      description: 'MCP server exposes the exact expected tool set for this revision',
      expected_tools: EXPECTED_TOOLS,
      actual_tools: toolNames,
      passed: exactToolSet,
    });

    const getSkillRes = await withTimeout(
      client.callTool({ name: 'get_skill', arguments: { category: 'common', name: 'sample-skill' } }),
      5000,
      'get_skill'
    );
    const getSkillText = getSkillRes.content?.[0]?.text || '';
    observe({
      id: 'T02_direct_get_skill_body',
      description: 'get_skill returns the full skill body directly',
      passed: getSkillText.includes('Canonical sample skill body for MCP telemetry') &&
        getSkillText.includes('<!-- skill: common/sample-skill | matched: direct -->'),
      response_snippet: getSkillText.slice(0, 200),
    });

    const dedupRes = await withTimeout(
      client.callTool({ name: 'load_skills_for_keywords', arguments: { keywords: ['smoke'] } }),
      5000,
      'load_skills_for_keywords'
    );
    const dedupText = dedupRes.content?.[0]?.text || '';
    observe({
      id: 'T03_repeated_load_dedup_stub',
      description: 'Repeated load returns the dedup stub and omits the body already loaded this session',
      passed: dedupText.includes('<!-- skill: common/sample-skill |') &&
        dedupText.includes('already loaded this session, body omitted') &&
        !dedupText.includes('Canonical sample skill body for MCP telemetry'),
      response_snippet: dedupText.slice(0, 240),
    });

    const listWfRes = await withTimeout(client.callTool({ name: 'list_workflows', arguments: {} }), 5000, 'list_workflows');
    const listWfText = listWfRes.content?.[0]?.text || '';
    const getWfRes = await withTimeout(
      client.callTool({ name: 'get_workflow', arguments: { name: 'sample-workflow' } }),
      5000,
      'get_workflow'
    );
    const getWfText = getWfRes.content?.[0]?.text || '';
    observe({
      id: 'T04_workflow_listing_vs_body',
      description: 'list_workflows discovers the workflow without a body; get_workflow returns the full body with provenance',
      passed: listWfText.includes('sample-workflow') &&
        getWfText.includes('<!-- Provenance: Loaded workflow/sample-workflow via get_workflow -->') &&
        getWfText.includes('Verify workflow listing vs direct body retrieval') &&
        !listWfText.includes('Verify workflow listing vs direct body retrieval'),
      listed_snippet: listWfText.slice(0, 160),
      body_provenance: getWfText.slice(0, 160),
    });

    const costMissingText = (await withTimeout(
      client.callTool({ name: 'get_session_cost', arguments: { workflow: 'sample-workflow' } }),
      5000,
      'get_session_cost(missing)'
    )).content?.[0]?.text || '';
    observe({
      id: 'T05_cost_missing_not_zero',
      description: 'Missing usage tokens and rates report Partial status, enumerate the gap, and never coerce to $0.00',
      passed: costMissingText.includes('Partial - host usage or pricing fields missing') &&
        costMissingText.includes('promptTokens, completionTokens, inputCostPer1M, outputCostPer1M') &&
        costMissingText.includes('| **Missing Host Fields** | promptTokens, completionTokens, inputCostPer1M, outputCostPer1M |') &&
        !costMissingText.includes('USD 0.000000'),
    });

    const costCachedMissingText = (await withTimeout(
      client.callTool({
        name: 'get_session_cost',
        arguments: {
          workflow: 'sample-workflow',
          promptTokens: 1000,
          completionTokens: 500,
          cachedPromptTokens: 200,
          inputCostPer1M: 3.0,
          outputCostPer1M: 15.0,
        },
      }),
      5000,
      'get_session_cost(missing-cached-rate)'
    )).content?.[0]?.text || '';
    observe({
      id: 'T06_positive_cached_missing_rate_partial',
      description: 'Positive cached tokens without a cached rate stay Partial and never publish the uncached-only total',
      passed: costCachedMissingText.includes('Partial - host usage or pricing fields missing') &&
        costCachedMissingText.includes('cachedInputCostPer1M') &&
        !costCachedMissingText.includes('USD 0.010500'),
    });

    const costZeroText = (await withTimeout(
      client.callTool({
        name: 'get_session_cost',
        arguments: {
          workflow: 'sample-workflow',
          promptTokens: 1000,
          completionTokens: 500,
          cachedPromptTokens: 0,
          reasoningTokens: 0,
          inputCostPer1M: 3.0,
          outputCostPer1M: 15.0,
        },
      }),
      5000,
      'get_session_cost(zero-cached)'
    )).content?.[0]?.text || '';
    observe({
      id: 'T07_known_zero_cached_rates_not_demanded',
      description: 'Known zero cached/reasoning usage does not demand absent rates and computes the exact cost',
      passed: costZeroText.includes('Exact estimate available') &&
        costZeroText.includes('USD 0.010500') &&
        costZeroText.includes('| **Missing Host Fields** | _(none)_ |'),
    });

    const costCompleteText = (await withTimeout(
      client.callTool({
        name: 'get_session_cost',
        arguments: {
          workflow: 'sample-workflow',
          promptTokens: 1000,
          cachedPromptTokens: 200,
          completionTokens: 500,
          reasoningTokens: 100,
          inputCostPer1M: 3.0,
          cachedInputCostPer1M: 1.5,
          outputCostPer1M: 15.0,
          reasoningCostPer1M: 30.0,
        },
      }),
      5000,
      'get_session_cost(complete)'
    )).content?.[0]?.text || '';
    // (1000/1e6)*3 + (200/1e6)*1.5 + (500/1e6)*15 + (100/1e6)*30 = 0.003 + 0.0003 + 0.0075 + 0.003
    observe({
      id: 'T08_complete_rates_exact_cost',
      description: 'Complete cached and reasoning rates compute the exact total',
      passed: costCompleteText.includes('Exact estimate available') &&
        costCompleteText.includes('USD 0.013800') &&
        costCompleteText.includes('| **Missing Host Fields** | _(none)_ |'),
    });
  } catch (error) {
    allPassed = false;
    assertions.push({
      id: 'UNEXPECTED_CLIENT_ERROR',
      description: 'Error during MCP client session execution',
      error: error.message,
      passed: false,
    });
    console.error('Unexpected error in MCP client session:', error);
  } finally {
    console.log('Tearing down MCP client connection and transport...');
    if (connectPromise && !connected) {
      // connect() is still settling after a timeout: wait on its real lifecycle
      // promise (start() spawns or rejects) so a late spawn cannot escape close.
      try {
        await withTimeout(connectPromise.catch(() => {}), 2000, 'connect settle before teardown');
      } catch (err) {
        closeErr = `connect settle error: ${err.message}`;
      }
    }
    if (client) {
      try {
        await withTimeout(client.close(), 8000, 'client close');
      } catch (err) {
        closeErr = `client close error: ${err.message}`;
      }
    }
    if (transport) {
      try {
        // No-op when client.close() already closed it; otherwise drives the
        // documented close path (stdin end, then bounded SIGTERM/SIGKILL).
        await withTimeout(transport.close(), 8000, 'transport close');
      } catch (err) {
        closeErr = closeErr ? `${closeErr}; transport close error: ${err.message}` : `transport close error: ${err.message}`;
      }
    }
    if (childExitPromise) {
      try {
        await withTimeout(childExitPromise, 8000, 'child process exit');
      } catch (err) {
        closeErr = closeErr ? `${closeErr}; ${err.message}` : err.message;
      }
    }

    // Isolation + telemetry-target proof from the child's own stderr.
    observe({
      id: 'T00_child_isolation',
      description: 'Child server served the isolated fixture skills directory and wrote telemetry to the isolated path',
      passed: stderrTail.includes(`serving skills from ${skillsDir}`) &&
        stderrTail.includes(`telemetry: on (env) → ${telemetryPath}`),
      stderr_tail: stderrTail,
    });

    console.log('Verifying flushed local telemetry file...');
    if (!fs.existsSync(telemetryPath)) {
      observe({
        id: 'T09_persisted_telemetry_fields',
        description: 'Telemetry file was not flushed upon session exit',
        telemetry_path: telemetryPath,
        passed: false,
      });
    } else {
      try {
        const lines = fs.readFileSync(telemetryPath, 'utf8').split('\n').map((l) => l.trim()).filter(Boolean);
        if (lines.length === 0) {
          observe({
            id: 'T09_persisted_telemetry_fields',
            description: 'Telemetry file is empty (0 records flushed)',
            telemetry_path: telemetryPath,
            passed: false,
          });
        } else {
          parsedRecord = JSON.parse(lines[lines.length - 1]);
          const skillBodies = parsedRecord.skillBodies?.['common/sample-skill'] ?? 0;
          const skillStubs = parsedRecord.skillStubs?.['common/sample-skill'] ?? 0;
          const workflowLoads = parsedRecord.workflows?.['workflow/sample-workflow'] ?? 0;
          const totalWorkflows = Object.values(parsedRecord.workflows ?? {}).reduce((a, b) => a + b, 0);
          const totalSkills = Object.values(parsedRecord.skills ?? {}).reduce((a, b) => a + b, 0);
          const calls = parsedRecord.callsByTool ?? {};
          observe({
            id: 'T09_persisted_telemetry_fields',
            description: 'One flushed record with exact operation-derived counts; list_workflows discovery did not load a body',
            record_count: lines.length,
            single_record: lines.length === 1,
            skill_bodies: parsedRecord.skillBodies,
            skill_stubs: parsedRecord.skillStubs,
            workflows: parsedRecord.workflows,
            calls_by_tool: calls,
            no_match_calls: parsedRecord.noMatchCalls,
            passed: lines.length === 1 &&
              skillBodies === 1 &&
              skillStubs === 1 &&
              totalSkills === 2 &&
              workflowLoads === 1 &&
              totalWorkflows === 1 &&
              calls.get_skill === 1 &&
              calls.load_skills_for_keywords === 1 &&
              calls.list_workflows === 1 &&
              calls.get_workflow === 1 &&
              calls.get_session_cost === 4 &&
              parsedRecord.noMatchCalls === 0,
          });
        }
      } catch (parseErr) {
        observe({
          id: 'T09_persisted_telemetry_fields',
          description: 'Failed to parse telemetry file JSONL',
          error: parseErr.message,
          passed: false,
        });
      }
    }

    if (!options.keepTemp && fs.existsSync(tempBase)) {
      try {
        fs.rmSync(tempBase, { recursive: true, force: true });
      } catch (err) {
        cleanupErr = `cleanup error: ${err.message}`;
        console.error('Error cleaning up tempBase:', err);
      }
    }

    if (closeErr || cleanupErr) {
      teardownSuccess = false;
      teardownError = [closeErr, cleanupErr].filter(Boolean).join('; ');
      allPassed = false;
      console.error('Teardown failure:', teardownError);
    } else {
      teardownSuccess = true;
    }
  }

  const finalCompleted = allPassed && teardownSuccess;
  const outcomeRecord = {
    schema_version: '1.0.0',
    name: 'mcp-telemetry-smoke',
    timestamp: new Date().toISOString(),
    candidate_root: candidateRoot,
    candidate_commit_sha: commitSha,
    mcp_path: mcpPath,
    mcp_build_sha256: mcpSha,
    fixture_skills_dir: skillsDir,
    telemetry_path: telemetryPath,
    assertions,
    persisted_telemetry_summary: parsedRecord
      ? {
          skillBodies: parsedRecord.skillBodies,
          skillStubs: parsedRecord.skillStubs,
          workflows: parsedRecord.workflows,
          callsByTool: parsedRecord.callsByTool,
          noMatchCalls: parsedRecord.noMatchCalls,
        }
      : null,
    child_stderr_tail: stderrTail,
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
    'artifacts/diagnostic-prevention/implementation/attempt-01/mcp-telemetry-smoke-run.json'
  );

  try {
    const outcome = await runMcpTelemetrySmoke(args);
    if (!outcome.completed) process.exit(1);
  } catch (err) {
    console.error('Fatal smoke runner error:', err.message);
    publishBlockedReceipt(fallbackOut, {
      schema_version: '1.0.0',
      name: 'mcp-telemetry-smoke',
      timestamp: new Date().toISOString(),
      stage: 'precondition',
      candidate_root: args.candidateRoot || DEFAULT_CANDIDATE_ROOT,
      mcp_path: args.mcp || null,
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
