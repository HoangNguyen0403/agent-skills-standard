/**
 * Project-owned operational verification runner for agent-skills-standard.
 *
 * Executes the three representative repository journeys declared in
 * `docs/verification/agent-skills-standard/recipes/`, the doctor gate, the
 * discrepancy scenarios, and the freshness decisions. Every action, raw
 * stdout/stderr, exit code, fixture body, and identity digest is persisted
 * BEFORE any owned scratch state is torn down, and the persisted artifact is
 * re-read byte-for-byte afterwards.
 *
 * Surfaces exercised (authorized real consumer surfaces):
 *   JRN-TRACE-01    repo CLI  scripts/trace/index.ts
 *   JRN-OUTCOME-01  repo CLI  scripts/outcome/index.ts
 *   JRN-CONSUMER-01 production SyncService / LockfileService / WorkflowIndex /
 *                   WorkflowTransformer + repo CLI `doctor --offline --json`
 *
 * Explicit non-claims: no native provider/model invocation, no model
 * compliance, no registry/network acquisition, no release or human acceptance.
 *
 * Modes:
 *   --run              full run (authorized only after parent RUN)
 *   --doctor           readiness report only
 *   --refusal-probe    proves the doctor gate refuses driving (owned recipe drift)
 *
 * Exit codes: 0 proof complete, 1 a technical check failed, 2 all executed
 * checks passed but scoped items remain unexercised/manual, 3 refused.
 */
import { spawn } from 'node:child_process';
import os from 'node:os';
import path from 'node:path';
import { pathToFileURL } from 'node:url';
import fs from 'fs-extra';

import { Agent, getAgentDefinition } from '../../../../cli/src/constants';
import { ConfigService } from '../../../../cli/src/services/ConfigService';
import { LOCKFILE_NAME } from '../../../../cli/src/services/LockfileService';
import { SyncService } from '../../../../cli/src/services/SyncService';
import { WorkflowTransformer } from '../../../../cli/src/services/utils/WorkflowTransformer';
import type { SkillConfig } from '../../../../cli/src/models/config';
import type { CollectedSkill } from '../../../../cli/src/models/types';
import {
  listInstalledWorkflows,
  lookupWorkflow,
} from '../../../../mcp/src/services/WorkflowIndex';
import {
  DEFAULT_REPO_ROOT,
  KIT_REL,
  evidenceDir,
  fileIdentity,
  loadKit,
  reportFailureLines,
  runDoctor,
  sha256Buffer,
  sha256File,
  type DoctorReport,
  type FileIdentity,
  type JourneyRecipe
} from './doctor';

type JsonObject = Record<string, unknown>;
type CheckOutcome = 'pass' | 'fail' | 'blocked' | 'unexercised' | 'manual_decision';

interface CliPolicy {
  loader_rel: string;
  timeout_ms: number;
  env_strip: string[];
  max_capture_bytes: number;
}

interface ActionRecord {
  seq: number;
  phase: string;
  id: string;
  kind: 'cli' | 'api';
  argv: string[] | null;
  cwd: string;
  exit_code: number | null;
  stdout: string;
  stderr: string;
  parsed_json: JsonObject | null;
  started_at: string;
  duration_ms: number;
  note?: string;
}

interface CheckRecord {
  id: string;
  journey: string;
  outcome: CheckOutcome;
  expectation: string;
  observation: string;
}

interface FixtureRecord {
  id: string;
  root: string;
  files: Array<{ rel_path: string; body: string; sha256: string }>;
}

interface DecisionRecord {
  id: string;
  baseline_digest: string | null;
  observed_digest: string | null;
  changed_inputs: string[];
  affected_journeys: string[];
  unaffected_journeys: string[];
  decision: string;
  owner: string;
}

interface Recorder {
  actions: ActionRecord[];
  checks: CheckRecord[];
  fixtures: FixtureRecord[];
  decisions: DecisionRecord[];
  notes: string[];
}

const SCRATCH_PREFIX = 'ags-verification-scratch-';
const CONSUMER_PREFIX = 'ags-verification-consumer-';
const RECIPE_REL_TRACE = 'recipes/trace-audit.json';
const RECIPE_REL_POLICY = 'recipes/cli-policy.json';

const AGENT_IDS = [Agent.Claude, Agent.Cursor];

/* ------------------------------------------------------------------ helpers */

function newRecorder(): Recorder {
  return { actions: [], checks: [], fixtures: [], decisions: [], notes: [] };
}

function asObject(value: unknown): JsonObject | null {
  return typeof value === 'object' && value !== null && !Array.isArray(value)
    ? (value as JsonObject)
    : null;
}

function strField(obj: JsonObject | null, key: string): string | null {
  if (!obj) return null;
  const value = obj[key];
  return typeof value === 'string' ? value : null;
}

function numField(obj: JsonObject | null, key: string): number | null {
  if (!obj) return null;
  const value = obj[key];
  return typeof value === 'number' ? value : null;
}

function boolField(obj: JsonObject | null, key: string): boolean | null {
  if (!obj) return null;
  const value = obj[key];
  return typeof value === 'boolean' ? value : null;
}

function arrayField(obj: JsonObject | null, key: string): unknown[] | null {
  if (!obj) return null;
  const value = obj[key];
  return Array.isArray(value) ? value : null;
}

function recordCheck(rec: Recorder, check: CheckRecord): CheckRecord {
  rec.checks.push(check);
  return check;
}

function recordCheckFrom(rec: Recorder, journey: string, id: string, ok: boolean, expectation: string, observation: string): void {
  recordCheck(rec, { id, journey, outcome: ok ? 'pass' : 'fail', expectation, observation });
}

function recordGap(rec: Recorder, journey: string, id: string, outcome: Exclude<CheckOutcome, 'pass' | 'fail'>, expectation: string, observation: string): void {
  recordCheck(rec, { id, journey, outcome, expectation, observation });
}

function parseJsonObject(text: string): JsonObject | null {
  const trimmed = text.trim();
  if (trimmed.startsWith('{')) {
    try {
      return asObject(JSON.parse(trimmed));
    } catch {
      return null;
    }
  }
  const lines = trimmed.split('\n');
  for (let i = lines.length - 1; i >= 0; i -= 1) {
    const line = lines[i]?.trim() ?? '';
    if (line.startsWith('{') && line.endsWith('}')) {
      try {
        const parsed = asObject(JSON.parse(line));
        if (parsed) return parsed;
      } catch {
        // keep scanning upward for the JSON payload
      }
    }
  }
  return null;
}

function resolveRepoRoot(argv: string[]): string {
  const index = argv.indexOf('--repo-root');
  if (index === -1) return DEFAULT_REPO_ROOT;
  const value = argv[index + 1];
  if (!value) throw new Error('--repo-root requires a value');
  return path.resolve(value);
}

async function readRecipe(repoRoot: string, recipeRel: string): Promise<{ bytes: Buffer; parsed: JsonObject } | null> {
  const abs = path.join(repoRoot, KIT_REL, recipeRel);
  try {
    const bytes = await fs.readFile(abs);
    const parsed = asObject(JSON.parse(bytes.toString('utf8')));
    return parsed ? { bytes, parsed } : null;
  } catch {
    return null;
  }
}

async function readCliPolicy(repoRoot: string): Promise<CliPolicy> {
  const recipe = await readRecipe(repoRoot, RECIPE_REL_POLICY);
  const loaderRel = strField(recipe?.parsed ?? null, 'loader_rel') ?? 'node_modules/tsx/dist/loader.mjs';
  const timeout = numField(recipe?.parsed ?? null, 'timeout_ms') ?? 180_000;
  const maxBytes = numField(recipe?.parsed ?? null, 'max_capture_bytes') ?? 262_144;
  const strip = arrayField(recipe?.parsed ?? null, 'env_strip') ?? [];
  return {
    loader_rel: loaderRel,
    timeout_ms: timeout,
    max_capture_bytes: maxBytes,
    env_strip: strip.filter((entry): entry is string => typeof entry === 'string')
  };
}

function substituteScratch(args: string[], scratchRoot: string): string[] {
  return args.map((arg) => arg.replaceAll('{{SCRATCH}}', scratchRoot));
}

/**
 * Spawns one CLI action. Detached process group with bounded timeout so a hung
 * child and its descendants cannot outlive the run.
 */
async function runCli(
  rec: Recorder,
  policy: CliPolicy,
  opts: {
    phase: string;
    id: string;
    repoRoot: string;
    scriptRel: string;
    args: string[];
    cwd: string;
    loaderRel?: string;
    note?: string;
  }
): Promise<ActionRecord> {
  const loaderRel = opts.loaderRel ?? policy.loader_rel;
  const loaderHref = pathToFileURL(path.join(opts.repoRoot, loaderRel)).href;
  const scriptAbs = path.join(opts.repoRoot, opts.scriptRel);
  const env: NodeJS.ProcessEnv = { ...process.env };
  for (const key of policy.env_strip) delete env[key];

  const startedAt = new Date().toISOString();
  const startedMs = Date.now();
  const { promise, resolve } = Promise.withResolvers<ActionRecord>();
  const argv = [process.execPath, '--import', loaderHref, scriptAbs, ...opts.args];
  const detached = process.platform !== 'win32';
  const child = spawn(argv[0] ?? process.execPath, argv.slice(1), {
    cwd: opts.cwd,
    env,
    detached,
    stdio: ['ignore', 'pipe', 'pipe']
  });

  let stdout = '';
  let stderr = '';
  const timer = setTimeout(() => {
    if (child.pid === undefined) return;
    try {
      if (detached) process.kill(-child.pid, 'SIGKILL');
      else child.kill('SIGKILL');
    } catch {
      child.kill('SIGKILL');
    }
  }, policy.timeout_ms);

  child.stdout?.on('data', (chunk: Buffer) => {
    stdout += chunk.toString('utf8');
  });
  child.stderr?.on('data', (chunk: Buffer) => {
    stderr += chunk.toString('utf8');
  });

  const finish = (exitCode: number | null, spawnError?: string): void => {
    clearTimeout(timer);
    const action: ActionRecord = {
      seq: rec.actions.length + 1,
      phase: opts.phase,
      id: opts.id,
      kind: 'cli',
      argv,
      cwd: opts.cwd,
      exit_code: exitCode,
      stdout: stdout.slice(0, policy.max_capture_bytes),
      stderr: `${stderr}${spawnError ? `\nspawn error: ${spawnError}` : ''}`.slice(0, policy.max_capture_bytes),
      parsed_json: parseJsonObject(stdout),
      started_at: startedAt,
      duration_ms: Date.now() - startedMs,
      ...(opts.note ? { note: opts.note } : {})
    };
    rec.actions.push(action);
    resolve(action);
  };

  child.on('close', (code) => finish(code));
  child.on('error', (error) => finish(null, error.message));
  return promise;
}

function recordApiAction(
  rec: Recorder,
  opts: { phase: string; id: string; cwd: string; observation: JsonObject; note?: string }
): void {
  rec.actions.push({
    seq: rec.actions.length + 1,
    phase: opts.phase,
    id: opts.id,
    kind: 'api',
    argv: null,
    cwd: opts.cwd,
    exit_code: 0,
    stdout: JSON.stringify(opts.observation, null, 2),
    stderr: '',
    parsed_json: opts.observation,
    started_at: new Date().toISOString(),
    duration_ms: 0,
    ...(opts.note ? { note: opts.note } : {})
  });
}

/* ------------------------------------------------------- recipe-driven oracles */

interface ScenarioExpectation {
  exit?: number;
  json?: JsonObject;
  issue_code?: string;
  issue_message_contains?: string;
  issue_count?: number;
  stderr_contains?: string;
}

interface ScenarioDefinition {
  id: string;
  kind: string;
  fixture?: string;
  args: string[];
  expect: ScenarioExpectation;
}

function scenarioList(recipe: JsonObject | null): ScenarioDefinition[] {
  const scenarios = arrayField(recipe, 'scenarios') ?? [];
  const result: ScenarioDefinition[] = [];
  for (const raw of scenarios) {
    const scenario = asObject(raw);
    if (!scenario) continue;
    const id = strField(scenario, 'id');
    const kind = strField(scenario, 'kind');
    const args = arrayField(scenario, 'args');
    const expect = asObject(scenario['expect']);
    if (!id || !kind || !args || !expect) continue;
    const parsedArgs = args.filter((arg): arg is string => typeof arg === 'string');
    const parsedFixture = strField(scenario, 'fixture');
    const exitExpect = numField(expect, 'exit');
    const jsonExpect = asObject(expect['json']);
    const codeExpect = strField(expect, 'issue_code');
    const messageExpect = strField(expect, 'issue_message_contains');
    const countExpect = numField(expect, 'issue_count');
    const stderrExpect = strField(expect, 'stderr_contains');
    result.push({
      id,
      kind,
      ...(parsedFixture ? { fixture: parsedFixture } : {}),
      args: parsedArgs,
      expect: {
        ...(exitExpect !== null ? { exit: exitExpect } : {}),
        ...(jsonExpect ? { json: jsonExpect } : {}),
        ...(codeExpect ? { issue_code: codeExpect } : {}),
        ...(messageExpect ? { issue_message_contains: messageExpect } : {}),
        ...(countExpect !== null ? { issue_count: countExpect } : {}),
        ...(stderrExpect ? { stderr_contains: stderrExpect } : {})
      }
    });
  }
  return result;
}

function observedIssueCodes(payload: JsonObject | null): string[] {
  const issues = arrayField(payload, 'issues') ?? [];
  return issues
    .map((issue) => strField(asObject(issue), 'code'))
    .filter((code): code is string => code !== null);
}

interface ScenarioEvaluation {
  ok: boolean;
  problems: string[];
  observations: string[];
}

function evaluateScenario(action: ActionRecord, expect: ScenarioExpectation): ScenarioEvaluation {
  const problems: string[] = [];
  const observations: string[] = [];
  if (expect.exit !== undefined) {
    const ok = action.exit_code === expect.exit;
    if (!ok) problems.push(`exit_code expected ${expect.exit} got ${String(action.exit_code)}`);
    observations.push(`exit_code=${String(action.exit_code)}`);
  }
  if (expect.json) {
    for (const [key, expectedValue] of Object.entries(expect.json)) {
      const actual = action.parsed_json?.[key];
      const ok = JSON.stringify(actual) === JSON.stringify(expectedValue);
      if (!ok) problems.push(`${key} expected ${JSON.stringify(expectedValue)} got ${JSON.stringify(actual)}`);
      else observations.push(`${key}=${JSON.stringify(actual)}`);
    }
  }
  const issues = arrayField(action.parsed_json, 'issues') ?? [];
  if (expect.issue_code) {
    const codes = issues
      .map((issue) => strField(asObject(issue), 'code'))
      .filter((code): code is string => code !== null);
    const ok = codes.includes(expect.issue_code);
    if (!ok) problems.push(`issue_code ${expect.issue_code} absent from [${codes.join(', ')}]`);
    else observations.push(`issue_code=${expect.issue_code}`);
  }
  if (expect.issue_message_contains) {
    const messages = issues
      .map((issue) => strField(asObject(issue), 'message'))
      .filter((message): message is string => message !== null);
    const ok = messages.some((message) => message.includes(expect.issue_message_contains ?? ''));
    if (!ok) problems.push(`no issue message contains "${expect.issue_message_contains}"`);
    else observations.push(`issue_message_contains=${expect.issue_message_contains}`);
  }
  if (expect.issue_count !== undefined) {
    const ok = issues.length === expect.issue_count;
    if (!ok) problems.push(`issue_count expected ${expect.issue_count} got ${issues.length}`);
    else observations.push(`issue_count=${issues.length}`);
  }
  if (expect.stderr_contains) {
    const ok = action.stderr.includes(expect.stderr_contains);
    if (!ok) problems.push(`stderr does not contain "${expect.stderr_contains}"`);
    else observations.push(`stderr_contains=${expect.stderr_contains}`);
  }
  return { ok: problems.length === 0, problems, observations };
}

/* --------------------------------------------------------------- fixtures */

async function writeFixture(
  rec: Recorder,
  opts: { id: string; root: string; files: Array<{ rel_path: string; body: string }> }
): Promise<FixtureRecord> {
  const record: FixtureRecord = { id: opts.id, root: opts.root, files: [] };
  for (const file of opts.files) {
    const abs = path.join(opts.root, file.rel_path);
    await fs.outputFile(abs, file.body, 'utf8');
    const onDisk = await fs.readFile(abs);
    record.files.push({
      rel_path: file.rel_path,
      body: onDisk.toString('utf8'),
      sha256: sha256Buffer(onDisk)
    });
  }
  rec.fixtures.push(record);
  return record;
}

/* ------------------------------------------------------------ journey 1 */

async function runTraceJourney(
  rec: Recorder,
  repoRoot: string,
  procedure: JourneyRecipe,
  recipe: JsonObject,
  policy: CliPolicy,
  scratchRoot: string
): Promise<void> {
  const emptyRoot = path.join(scratchRoot, 'trace-empty');
  await writeFixture(rec, {
    id: 'trace-empty-scope-root',
    root: emptyRoot,
    files: [
      {
        rel_path: 'docs/prd/prd-trace-empty.md',
        body: '# PRD: Trace Empty Scope Fixture\n\nSynthetic fixture owned by the verification kit: declares no requirement tables.\n'
      }
    ]
  });

  for (const scenario of scenarioList(recipe)) {
    const action = await runCli(rec, policy, {
      phase: procedure.journey,
      id: scenario.id,
      repoRoot,
      scriptRel: procedure.entry ?? 'scripts/trace/index.ts',
      args: substituteScratch(scenario.args, scratchRoot),
      cwd: repoRoot
    });
    const evaluation = evaluateScenario(action, scenario.expect);
    const assurance = strField(action.parsed_json, 'assurance');
    let assuranceOk = true;
    if (action.parsed_json && assurance !== null) {
      const expectedAssurance = strField(recipe, 'assurance');
      assuranceOk = expectedAssurance === null || assurance === expectedAssurance;
      if (!assuranceOk) evaluation.problems.push(`assurance expected ${expectedAssurance} got ${assurance}`);
      else evaluation.observations.push(`assurance=${assurance}`);
    }
    recordCheckFrom(
      rec,
      procedure.journey,
      scenario.id,
      evaluation.ok && assuranceOk,
      JSON.stringify(scenario.expect),
      evaluation.problems.length === 0 ? evaluation.observations.join('; ') : evaluation.problems.join('; ')
    );
  }
}

/* ------------------------------------------------------------ journey 2 */

function validRecordFor(identity: { slug: string; workflow: string; run_id: string }): JsonObject {
  return {
    schema_version: 1,
    run_id: identity.run_id,
    slug: identity.slug,
    workflow: identity.workflow,
    feature_status: 'verified',
    started_at: '2026-11-05T00:00:00Z',
    completed_at: '2026-11-05T00:05:00Z',
    requirement_trace: {
      brd_objectives: ['BRD-OBJ-001'],
      requirements: ['REQ-001'],
      acceptance_criteria: ['AC-01'],
      srs: ['SRS-001']
    },
    completed_evidence: ['synthetic verification-kit fixture record; schema-valid by construction'],
    missing_evidence: [],
    decision_needed: [],
    recommended_next_workflow: null,
    cost: { source: 'unavailable' },
    agent: { identity: 'verification-kit', model: 'none (fixture)' }
  };
}

async function buildOutcomeFixtures(rec: Recorder, scratchRoot: string): Promise<void> {
  const duplicateRoot = path.join(scratchRoot, 'outcome-duplicate');
  const duplicateIdentity = {
    slug: 'kit-duplicate-slug',
    workflow: 'kit-duplicate-workflow',
    run_id: '20261105T000000Z-kit-duplicate'
  };
  const duplicateBody = JSON.stringify(validRecordFor(duplicateIdentity), null, 2);
  await writeFixture(rec, {
    id: 'outcome-duplicate-identity',
    root: duplicateRoot,
    files: [
      { rel_path: 'record-a.json', body: duplicateBody },
      { rel_path: 'record-b.json', body: duplicateBody }
    ]
  });

  const invalidRoot = path.join(scratchRoot, 'outcome-invalid');
  await writeFixture(rec, {
    id: 'outcome-invalid-schema',
    root: invalidRoot,
    files: [
      {
        rel_path: 'record-invalid.json',
        body: JSON.stringify(
          {
            slug: 'kit-invalid-slug',
            workflow: 'kit-invalid-workflow',
            run_id: '20261105T000000Z-kit-invalid'
          },
          null,
          2
        )
      }
    ]
  });
}

async function runOutcomeJourney(
  rec: Recorder,
  repoRoot: string,
  procedure: JourneyRecipe,
  recipe: JsonObject,
  policy: CliPolicy,
  scratchRoot: string
): Promise<void> {
  await buildOutcomeFixtures(rec, scratchRoot);

  for (const scenario of scenarioList(recipe)) {
    const action = await runCli(rec, policy, {
      phase: procedure.journey,
      id: scenario.id,
      repoRoot,
      scriptRel: procedure.entry ?? 'scripts/outcome/index.ts',
      args: substituteScratch(scenario.args, scratchRoot),
      cwd: repoRoot,
      note: scenario.fixture ? `synthetic schema-valid fixture scope: ${scenario.fixture}` : undefined
    });
    const evaluation = evaluateScenario(action, scenario.expect);
    recordCheckFrom(
      rec,
      procedure.journey,
      scenario.id,
      evaluation.ok,
      JSON.stringify(scenario.expect),
      evaluation.problems.length === 0 ? evaluation.observations.join('; ') : evaluation.problems.join('; ')
    );
  }
}

/* ------------------------------------------------------------ journey 3 */

async function walkFiles(root: string, prefix = ''): Promise<string[]> {
  const out: string[] = [];
  const entries = await fs.readdir(root, { withFileTypes: true });
  for (const entry of entries) {
    const rel = prefix === '' ? entry.name : path.posix.join(prefix, entry.name);
    if (entry.isDirectory()) out.push(...(await walkFiles(path.join(root, entry.name), rel)));
    else out.push(rel);
  }
  return out.sort();
}

function isRootAttributionFile(filePath: string): boolean {
  return !filePath.includes('/') && /^(LICENSE|NOTICE)(?:\.(?:md|txt))?$/i.test(filePath);
}

function isPackagedResource(relativePath: string): boolean {
  const flat = relativePath.split(path.sep).join('/');
  return (
    flat === 'SKILL.md' ||
    /^(references|scripts|assets)\//.test(flat) ||
    isRootAttributionFile(flat)
  );
}

async function snapshotTree(root: string): Promise<Record<string, string>> {
  const snapshot: Record<string, string> = {};
  for (const rel of await walkFiles(root)) {
    const digest = sha256File(path.join(root, rel));
    if (digest) snapshot[rel] = digest;
  }
  return snapshot;
}

function diffSnapshots(before: Record<string, string>, after: Record<string, string>): string[] {
  const changed: string[] = [];
  for (const key of new Set([...Object.keys(before), ...Object.keys(after)])) {
    if (before[key] !== after[key]) changed.push(key);
  }
  return changed.sort();
}

function doctorCheckStatus(report: JsonObject | null, name: string): string | null {
  const data = asObject(report?.['data']);
  const checks = arrayField(data, 'checks') ?? [];
  for (const entry of checks) {
    const check = asObject(entry);
    if (strField(check, 'name') === name) return strField(check, 'status');
  }
  return null;
}

async function runConsumerJourney(
  rec: Recorder,
  repoRoot: string,
  procedure: JourneyRecipe,
  recipe: JsonObject,
  policy: CliPolicy,
  ownedDirs: string[]
): Promise<void> {
  const journeyId = procedure.journey;
  const skill = asObject(recipe['skill']);
  const category = strField(skill, 'category');
  const skillId = strField(skill, 'id');
  const candidateRef = strField(skill, 'ref');
  const registry = strField(recipe, 'registry');
  const workflows = (arrayField(recipe, 'workflows') ?? []).filter(
    (entry): entry is string => typeof entry === 'string'
  );
  if (!category || !skillId || !candidateRef || !registry || workflows.length === 0) {
    recordGap(
      rec,
      journeyId,
      'C0-recipe-shape',
      'blocked',
      'recipe declares skill identity, registry and workflows',
      'recipe shape is incomplete; consumer journey not driven'
    );
    return;
  }

  const expect = asObject(recipe['expect']);
  const sentinelName = strField(expect, 'sentinel_name') ?? 'consumer-user-notes.txt';
  const sentinelBody = strField(expect, 'sentinel_body') ?? '';
  const expectedLockVersion = numField(expect, 'lock_version');
  const expectedCatalogVersion = numField(expect, 'lock_workflow_catalog_version');
  const doctorExpect = asObject(expect?.['doctor']);

  // Candidate bytes: skill resources plus the source root LICENSE/NOTICE
  // files collected by SkillSyncService (mirrored; not invoked).
  const skillSourceDir = path.join(repoRoot, 'skills', category, skillId);
  const allSkillFiles = await walkFiles(skillSourceDir);
  const packagedFiles = allSkillFiles.filter(isPackagedResource);
  const excludedFiles = allSkillFiles.filter((rel) => !isPackagedResource(rel));
  const packagedNames = new Set(packagedFiles.map((rel) => rel.toLowerCase()));
  const rootAttributionNames = (await fs.readdir(repoRoot, { withFileTypes: true }))
    .filter((entry) =>
      entry.isFile() &&
      isRootAttributionFile(entry.name) &&
      !packagedNames.has(entry.name.toLowerCase())
    )
    .map((entry) => entry.name)
    .sort();
  const skillFiles: Array<{ name: string; content: string; bytes: Buffer }> = [];
  for (const rel of packagedFiles) {
    const bytes = await fs.readFile(path.join(skillSourceDir, rel));
    skillFiles.push({ name: rel.split(path.sep).join('/'), content: bytes.toString('utf8'), bytes });
  }
  const rootAttributionDigests: string[] = [];
  for (const name of rootAttributionNames) {
    const bytes = await fs.readFile(path.join(repoRoot, name));
    skillFiles.push({ name, content: bytes.toString('utf8'), bytes });
    rootAttributionDigests.push(`${name}=${sha256Buffer(bytes)}`);
  }
  recordCheckFrom(
    rec,
    journeyId,
    'C1-candidate-skill-package',
    skillFiles.length > 0 &&
      packagedFiles.includes('SKILL.md') &&
      packagedFiles.some((rel) => rel.startsWith('references/')) &&
      rootAttributionNames.every((name) => skillFiles.some((file) => file.name === name)),
    'packaged skill files include SKILL.md, references/**, and collected root attribution files; evals/** excluded',
    `included=[${skillFiles.map((f) => f.name).join(', ')}]; root_attribution_sha256=[${rootAttributionDigests.join(', ') || 'none'}]; excluded=[${excludedFiles.join(', ') || 'none'}]`
  );

  const workflowPayloads: Array<{ name: string; content: string; bytes: Buffer }> = [];
  for (const name of workflows) {
    const file = `${name}.md`;
    const bytes = await fs.readFile(path.join(repoRoot, '.agents', 'workflows', file));
    workflowPayloads.push({ name: file, content: bytes.toString('utf8'), bytes });
  }

  const consumerDir = await fs.mkdtemp(path.join(os.tmpdir(), CONSUMER_PREFIX));
  ownedDirs.push(consumerDir);
  const originalCwd = process.cwd();
  const collectedSkills: CollectedSkill[] = [{ category, skill: skillId, files: skillFiles }];
  const collectedWorkflows: CollectedSkill[] = [{ category: '.agents', skill: 'workflows', files: workflowPayloads }];
  const config: SkillConfig = {
    registry,
    agents: AGENT_IDS,
    skills: { [category]: { ref: candidateRef, include: [skillId] } },
    skills_mode: 'explicit',
    custom_overrides: [],
    prune: true,
    workflows: [...workflows],
    workflows_ref: candidateRef
  };

  try {
    await new ConfigService().saveConfig(config, consumerDir);
    await fs.outputFile(path.join(consumerDir, sentinelName), sentinelBody, 'utf8');
    const sentinelBefore = sha256File(path.join(consumerDir, sentinelName));

    process.chdir(consumerDir);
    const syncService = new SyncService();
    await syncService.beginInstall(config, { dryRun: false, force: [] });
    await syncService.writeSkills(collectedSkills, config);
    await syncService.writeWorkflows(collectedWorkflows, config);
    const plan = await syncService.completeInstall(config, {
      skills: collectedSkills,
      workflows: collectedWorkflows,
      specialistsOk: true,
      refreshIndices: false,
      workflowAcquisition: { status: 'complete', workflows: collectedWorkflows, failures: [] }
    });

    // Expected concrete resource paths for a clean install.
    const expectedPaths = new Set<string>();
    for (const agentId of AGENT_IDS) {
      const def = getAgentDefinition(agentId);
      for (const file of skillFiles) {
        expectedPaths.add(path.posix.join(def.path, category, skillId, file.name));
      }
    }
    for (const payload of workflowPayloads) {
      const key = payload.name.replace(/\.md$/, '');
      expectedPaths.add(path.posix.join('.agents', 'workflows', payload.name));
      for (const agentId of AGENT_IDS) {
        const def = getAgentDefinition(agentId);
        const transformed = WorkflowTransformer.transform({ name: payload.name, content: payload.content }, def.workflowFormat);
        if (!transformed) continue;
        expectedPaths.add(
          def.workflowFormat === 'skill'
            ? path.posix.join(def.workflowPath, key, transformed.name)
            : path.posix.join(def.workflowPath, transformed.name)
        );
      }
    }

    const added = new Set(plan.added);
    const missingFromPlan = [...expectedPaths].filter((rel) => !added.has(rel));
    const unexpectedAdded = [...added].filter((rel) => !expectedPaths.has(rel));
    const unexpectedSideEffects = [
      ...plan.unknown.map((rel) => `unknown:${rel}`),
      ...plan.pruned.map((rel) => `pruned:${rel}`),
      ...plan.kept.map((rel) => `kept:${rel}`)
    ];
    recordApiAction(rec, {
      phase: journeyId,
      id: 'C2-install-plan',
      cwd: consumerDir,
      observation: {
        added: plan.added,
        updated: plan.updated,
        unchanged: plan.unchanged,
        unknown: plan.unknown,
        pruned: plan.pruned,
        kept: plan.kept,
        keptOrphans: plan.keptOrphans,
        expected_resource_count: expectedPaths.size
      },
      note: 'SyncService.beginInstall/writeSkills/writeWorkflows/completeInstall InstallPlan'
    });
    recordCheckFrom(
      rec,
      journeyId,
      'C2-install-plan-ownership-effects',
      missingFromPlan.length === 0 && unexpectedAdded.length === 0 && unexpectedSideEffects.length === 0,
      `added covers all ${expectedPaths.size} expected installed resources, with no unknown/pruned/kept entries`,
      `missing=[${missingFromPlan.join(', ')}]; unexpected_added=[${unexpectedAdded.join(', ')}]; side_effects=[${unexpectedSideEffects.join(', ')}]`
    );

    // Installed bytes parity for every packaged file, both agents.
    const byteProblems: string[] = [];
    for (const agentId of AGENT_IDS) {
      const def = getAgentDefinition(agentId);
      for (const file of skillFiles) {
        const target = path.join(consumerDir, def.path, category, skillId, file.name);
        const actual = (await fs.pathExists(target)) ? await fs.readFile(target) : null;
        if (!actual || !actual.equals(file.bytes)) byteProblems.push(`${agentId}:${file.name}`);
      }
    }
    recordCheckFrom(
      rec,
      journeyId,
      'C3-installed-skill-bytes',
      byteProblems.length === 0,
      `${skillFiles.length} packaged files byte-identical under ${AGENT_IDS.length} agents`,
      byteProblems.length === 0 ? 'all byte-identical' : `mismatched: ${byteProblems.join(', ')}`
    );

    // Lockfile: concrete entries, provenance, digests, ownership metadata.
    const lockRaw = asObject(await fs.readJson(path.join(consumerDir, LOCKFILE_NAME)));
    const lockEntries = asObject(lockRaw?.['entries']);
    const lockSources = asObject(lockRaw?.['sources']);
    const lockEntryPaths = lockEntries ? Object.keys(lockEntries) : [];
    const lockMissing = [...expectedPaths].filter((rel) => !lockEntryPaths.includes(rel));
    const lockUnexpected = lockEntryPaths.filter((rel) => !expectedPaths.has(rel));
    recordApiAction(rec, {
      phase: journeyId,
      id: 'C4-lockfile-observation',
      cwd: consumerDir,
      observation: {
        lock_version: numField(lockRaw, 'version'),
        registry: strField(lockRaw, 'registry'),
        sources: lockSources,
        entry_count: lockEntryPaths.length,
        entries: lockEntryPaths
      }
    });
    recordCheckFrom(
      rec,
      journeyId,
      'C4-lockfile-entry-surface',
      numField(lockRaw, 'version') === expectedLockVersion &&
        strField(lockRaw, 'registry') === registry &&
        lockMissing.length === 0 &&
        lockUnexpected.length === 0,
      `lock version ${String(expectedLockVersion)}, entries exactly the expected resource set`,
      `version=${String(numField(lockRaw, 'version'))}; missing=[${lockMissing.join(', ')}]; unexpected=[${lockUnexpected.join(', ')}]`
    );
    recordCheckFrom(
      rec,
      journeyId,
      'C5-lockfile-source-provenance',
      strField(asObject(lockSources?.[`skills/${category}`]), 'ref') === candidateRef &&
        strField(asObject(lockSources?.['workflows']), 'ref') === candidateRef,
      `sources skills/${category} and workflows both ref ${candidateRef}`,
      JSON.stringify(lockSources)
    );

    const skillExpectedPaths = new Set<string>();
    for (const agentId of AGENT_IDS) {
      const def = getAgentDefinition(agentId);
      for (const file of skillFiles) {
        skillExpectedPaths.add(path.posix.join(def.path, category, skillId, file.name));
      }
    }
    const digestProblems: string[] = [];
    const ownerProblems: string[] = [];
    for (const rel of expectedPaths) {
      const entry = asObject(lockEntries?.[rel]);
      const onDisk = sha256File(path.join(consumerDir, rel));
      if (!entry || onDisk === null || strField(entry, 'sha256') !== onDisk) {
        digestProblems.push(rel);
        continue;
      }
      const expectedOwner = skillExpectedPaths.has(rel) ? 'skill' : 'workflow';
      if (strField(entry, 'owner') !== expectedOwner || !strField(entry, 'source') || !strField(entry, 'agent')) {
        ownerProblems.push(`${rel}:owner=${String(strField(entry, 'owner'))},source=${String(strField(entry, 'source'))},agent=${String(strField(entry, 'agent'))}`);
      }
    }
    recordCheckFrom(
      rec,
      journeyId,
      'C6-lockfile-digests-and-ownership',
      digestProblems.length === 0 && ownerProblems.length === 0,
      'every lock entry digest equals on-disk sha256 and carries owner/source/agent metadata',
      digestProblems.length === 0 && ownerProblems.length === 0
        ? `${expectedPaths.size} entries verified`
        : `digest_mismatch=[${digestProblems.join(', ')}]; metadata=[${ownerProblems.join('; ')}]`
    );

    // Workflow catalog: canonical body, native exports, transformer parity.
    const catalog = asObject(lockRaw?.['workflowCatalog']);
    const catalogWorkflows = asObject(catalog?.['workflows']);
    const catalogProblems: string[] = [];
    let catalogBindings = 0;
    for (const payload of workflowPayloads) {
      const key = payload.name.replace(/\.md$/, '');
      const entry = asObject(catalogWorkflows?.[key]);
      const canonicalPath = path.posix.join('.agents', 'workflows', payload.name);
      const canonicalDigest = sha256File(path.join(consumerDir, canonicalPath));
      if (!entry) {
        catalogProblems.push(`${key}: no catalog entry`);
        continue;
      }
      if (strField(entry, 'digest') !== canonicalDigest || canonicalDigest !== sha256Buffer(payload.bytes)) {
        catalogProblems.push(`${key}: canonical digest mismatch`);
      }
      const conflicts = arrayField(entry, 'nativeConflicts') ?? [];
      if (conflicts.length > 0) catalogProblems.push(`${key}: native conflicts ${JSON.stringify(conflicts)}`);
      const bindings = arrayField(entry, 'nativeBindings') ?? [];
      for (const agentId of AGENT_IDS) {
        const def = getAgentDefinition(agentId);
        const transformed = WorkflowTransformer.transform({ name: payload.name, content: payload.content }, def.workflowFormat);
        if (!transformed) {
          catalogProblems.push(`${key}: transformer returned null for ${agentId}`);
          continue;
        }
        const expectedPath =
          def.workflowFormat === 'skill'
            ? path.posix.join(def.workflowPath, key, transformed.name)
            : path.posix.join(def.workflowPath, transformed.name);
        const binding = bindings
          .map((raw) => asObject(raw))
          .find((candidate) => strField(candidate, 'agent') === agentId);
        if (!binding) {
          catalogProblems.push(`${key}: no binding for ${agentId}`);
          continue;
        }
        const diskContent = (await fs.pathExists(path.join(consumerDir, expectedPath)))
          ? (await fs.readFile(path.join(consumerDir, expectedPath))).toString('utf8')
          : null;
        const parity =
          strField(binding, 'path') === expectedPath &&
          diskContent === transformed.content &&
          strField(binding, 'outputDigest') === sha256Buffer(Buffer.from(transformed.content, 'utf8')) &&
          strField(binding, 'canonicalDigest') === canonicalDigest;
        if (!parity) catalogProblems.push(`${key}: binding parity failed for ${agentId}`);
        else catalogBindings += 1;
      }
    }
    recordApiAction(rec, {
      phase: journeyId,
      id: 'C7-workflow-catalog-observation',
      cwd: consumerDir,
      observation: { catalog_version: numField(catalog, 'version'), workflows: Object.keys(catalogWorkflows ?? {}) }
    });
    recordCheckFrom(
      rec,
      journeyId,
      'C7-workflow-catalog-parity',
      numField(catalog, 'version') === expectedCatalogVersion &&
        catalogProblems.length === 0 &&
        catalogBindings === workflows.length * AGENT_IDS.length,
      `catalog version ${String(expectedCatalogVersion)} with ${workflows.length * AGENT_IDS.length} verified native bindings`,
      catalogProblems.length === 0 ? `${catalogBindings} bindings verified` : catalogProblems.join('; ')
    );

    // MCP installed-canonical discovery.
    const listed = await listInstalledWorkflows(consumerDir);
    const listedNames = (listed ?? []).map((entry) => entry.name).sort();
    const lookupProblems: string[] = [];
    for (const name of workflows) {
      const lookup = await lookupWorkflow(consumerDir, name);
      const expectedDigest = sha256File(path.join(consumerDir, '.agents', 'workflows', `${name}.md`));
      if (lookup.status !== 'managed' || lookup.nativeParity !== true || lookup.digest !== expectedDigest) {
        lookupProblems.push(`${name}: status=${lookup.status} nativeParity=${String(lookup.nativeParity)} digest_match=${String(lookup.digest === expectedDigest)}`);
      }
    }
    recordApiAction(rec, {
      phase: journeyId,
      id: 'C8-mcp-discovery-observation',
      cwd: consumerDir,
      observation: { list_installed: listedNames }
    });
    recordCheckFrom(
      rec,
      journeyId,
      'C8-mcp-installed-canonical-discovery',
      lookupProblems.length === 0 &&
        listedNames.length === workflows.length &&
        workflows.every((name) => listedNames.includes(name)),
      `WorkflowIndex lists ${workflows.length} canonical workflows; each lookup managed+nativeParity+digest match`,
      lookupProblems.length === 0 ? `listed=[${listedNames.join(', ')}]` : lookupProblems.join('; ')
    );

    // Unrelated consumer file preserved.
    const sentinelAfter = sha256File(path.join(consumerDir, sentinelName));
    recordCheckFrom(
      rec,
      journeyId,
      'C9-unrelated-file-preserved',
      sentinelBefore !== null && sentinelBefore === sentinelAfter,
      `${sentinelName} digest unchanged across install cycles`,
      `before=${String(sentinelBefore)} after=${String(sentinelAfter)}`
    );

    // Real CLI doctor, offline JSON, read-only over the consumer tree.
    const beforeDoctor = await snapshotTree(consumerDir);
    const doctorAction = await runCli(rec, policy, {
      phase: journeyId,
      id: 'C10-cli-doctor-offline',
      repoRoot,
      scriptRel: 'cli/src/index.ts',
      args: ['doctor', '--offline', '--json'],
      cwd: consumerDir
    });
    const afterDoctor = await snapshotTree(consumerDir);
    const fsChanges = diffSnapshots(beforeDoctor, afterDoctor);
    const doctorPayload = doctorAction.parsed_json;
    const doctorData = asObject(doctorPayload?.['data']);
    const expectedStatuses = asObject(doctorExpect?.['check_status']);
    const statusProblems: string[] = [];
    for (const [name, expectedStatus] of Object.entries(expectedStatuses ?? {})) {
      const actual = doctorCheckStatus(doctorPayload, name);
      if (actual !== expectedStatus) statusProblems.push(`${name}: expected ${String(expectedStatus)} got ${String(actual)}`);
    }
    recordCheckFrom(
      rec,
      journeyId,
      'C10-cli-doctor-report',
      doctorAction.exit_code === 0 &&
        strField(doctorPayload, 'kind') === (strField(doctorExpect, 'kind') ?? 'doctor.report') &&
        numField(doctorPayload, 'schema_version') === 1 &&
        boolField(doctorData, 'healthy') === true &&
        statusProblems.length === 0,
      'doctor exits 0, emits doctor.report schema 1, healthy=true with expected check statuses',
      statusProblems.length === 0
        ? `exit=${String(doctorAction.exit_code)}; healthy=${String(boolField(doctorData, 'healthy'))}; summary=${JSON.stringify(asObject(doctorData?.['summary']))}`
        : `exit=${String(doctorAction.exit_code)}; ${statusProblems.join('; ')}`
    );
    recordCheckFrom(
      rec,
      journeyId,
      'C11-cli-doctor-read-only',
      fsChanges.length === 0,
      `doctor introduces no filesystem change across ${Object.keys(beforeDoctor).length} consumer files`,
      fsChanges.length === 0 ? 'no changes' : `changed: ${fsChanges.join(', ')}`
    );
  } finally {
    process.chdir(originalCwd);
  }
}

/* --------------------------------------------------- discrepancy scenarios */

function declaredJourneys(recipes: JourneyRecipe[]): Array<{ id: string; inputs: string[] }> {
  return recipes.map((recipe) => ({
    id: recipe.journey,
    inputs: [...recipe.consumed_recipe_inputs, ...recipe.consumed_product_inputs]
  }));
}

function staleJourneys(
  journeys: Array<{ id: string; inputs: string[] }>,
  before: Map<string, string | null>,
  after: Map<string, string | null>
): string[] {
  const stale: string[] = [];
  for (const journey of journeys) {
    const changed = journey.inputs.some((input) => before.get(input) !== after.get(input));
    if (changed) stale.push(journey.id);
  }
  return stale;
}

function snapshotInputs(repoRoot: string, relPaths: string[]): Map<string, string | null> {
  const snapshot = new Map<string, string | null>();
  for (const rel of relPaths) snapshot.set(rel, fileIdentity(repoRoot, rel).sha256);
  return snapshot;
}

async function mutateOwnedRecipe(
  rec: Recorder,
  repoRoot: string,
  recipeRel: string,
  mutate: (original: string) => { drifted: string; note: string }
): Promise<{ original: Buffer; drifted: Buffer; applied: boolean; note: string }> {
  const abs = path.join(repoRoot, KIT_REL, recipeRel);
  const original = await fs.readFile(abs);
  const { drifted, note } = mutate(original.toString('utf8'));
  const applied = drifted !== original.toString('utf8');
  if (!applied) return { original, drifted: original, applied, note: `${note} (no textual change applied)` };
  await fs.writeFile(abs, drifted, 'utf8');
  rec.notes.push(`owned recipe mutation: ${recipeRel} — ${note}`);
  return { original, drifted: Buffer.from(drifted, 'utf8'), applied, note };
}

async function restoreOwnedRecipe(repoRoot: string, recipeRel: string, original: Buffer): Promise<boolean> {
  const abs = path.join(repoRoot, KIT_REL, recipeRel);
  await fs.writeFile(abs, original);
  return (await fs.readFile(abs)).equals(original);
}

async function runDiscrepancyScenarios(
  rec: Recorder,
  repoRoot: string,
  recipes: JourneyRecipe[],
  policy: CliPolicy,
  scratchRoot: string
): Promise<void> {
  const traceProcedure = recipes.find((recipe) => recipe.journey === 'JRN-TRACE-01');

  /* 1. Missing explicit driver reference: a real owned recipe that names a
   *    non-existent entry. The filesystem/process error is retained, and the
   *    gap is scoped to a manual owner rather than silently falling back. */
  if (traceProcedure) {
    const mutation = await mutateOwnedRecipe(rec, repoRoot, RECIPE_REL_TRACE, (original) => ({
      drifted: original.replace('"entry": "scripts/trace/index.ts"', '"entry": "scripts/trace/nonexistent-driver.ts"'),
      note: 'declared driver entry replaced with a non-existent path'
    }));
    try {
      const identity = fileIdentity(repoRoot, path.posix.join(KIT_REL, RECIPE_REL_TRACE));
      const action = await runCli(rec, policy, {
        phase: 'SCN-MISSING-DRIVER',
        id: 'scn-missing-driver-spawn',
        repoRoot,
        scriptRel: 'scripts/trace/nonexistent-driver.ts',
        args: [],
        cwd: repoRoot
      });
      const spawnErrorRetained =
        action.exit_code !== 0 &&
        /(Cannot find module|ERR_MODULE_NOT_FOUND|Cannot find package)/.test(action.stderr);
      recordCheckFrom(
        rec,
        'SCN-MISSING-DRIVER',
        'scn-missing-driver',
        spawnErrorRetained,
        'declared driver missing must surface the real process error and block only dependent scope',
        `recipe_digest=${String(identity.sha256)}; exit=${String(action.exit_code)}; stderr=${action.stderr
          .trim()
          .split('\n')[0] ?? ''}; owner=worker R (kit recipes); dependent scope=JRN-TRACE-01; other journeys unaffected`
      );
    } finally {
      const restored = await restoreOwnedRecipe(repoRoot, RECIPE_REL_TRACE, mutation.original);
      recordCheckFrom(
        rec,
        'SCN-MISSING-DRIVER',
        'scn-missing-driver-recipe-restored',
        restored,
        'owned recipe restored byte-identically after the missing-driver probe',
        `restored=${String(restored)}; digest=${String(fileIdentity(repoRoot, path.posix.join(KIT_REL, RECIPE_REL_TRACE)).sha256)}`
      );
    }
  }

  /* 2. Harness failure: a loader that genuinely does not exist. The process
   *    error is real; nothing about product health is inferred from it. */
  const harnessFailure = await runCli(rec, policy, {
    phase: 'SCN-HARNESS',
    id: 'scn-harness-failure',
    repoRoot,
    scriptRel: 'scripts/trace/index.ts',
    args: ['--slug', 'pstack-verification-readiness', '--required', '--json'],
    cwd: repoRoot,
    loaderRel: 'node_modules/tsx-missing/dist/loader.mjs'
  });
  recordCheckFrom(
    rec,
    'SCN-HARNESS',
    'scn-harness-failure-retained',
    harnessFailure.exit_code !== 0 &&
      /(ERR_MODULE_NOT_FOUND|Cannot find module|Cannot find package)/.test(harnessFailure.stderr),
    'missing loader produces a real harness-level process error, never a product PASS',
    `exit=${String(harnessFailure.exit_code)}; stderr=${harnessFailure.stderr.trim().split('\n')[0] ?? ''}`
  );

  /* 3. Controlled recipe drift: an owned recipe file is actually changed to a
   *    bad command, driven, corrected, and re-driven. Product bytes must be
   *    unchanged throughout. */
  if (traceProcedure) {
    const productBefore = snapshotInputs(repoRoot, traceProcedure.consumed_product_inputs);
    const mutation = await mutateOwnedRecipe(rec, repoRoot, RECIPE_REL_TRACE, (original) => ({
      drifted: original.replace('"--slug", "pstack-verification-readiness"', '"--slug-id", "pstack-verification-readiness"'),
      note: 'valid --slug flag drifted to the invalid --slug-id flag'
    }));
    try {
      const driftedRecipe = asObject(JSON.parse(mutation.drifted.toString('utf8')));
      const driftedArgs = scenarioList(driftedRecipe)[0]?.args ?? [];
      const driftAction = await runCli(rec, policy, {
        phase: 'SCN-RECIPE-DRIFT',
        id: 'scn-recipe-drift-bad-command',
        repoRoot,
        scriptRel: 'scripts/trace/index.ts',
        args: driftedArgs,
        cwd: repoRoot
      });
      recordCheckFrom(
        rec,
        'SCN-RECIPE-DRIFT',
        'scn-recipe-drift-detected',
        mutation.applied && driftAction.exit_code === 2,
        'drifted owned recipe (--slug-id) fails with the CLI usage exit code 2',
        `applied=${String(mutation.applied)}; exit=${String(driftAction.exit_code)}; stderr=${driftAction.stderr.trim().split('\n')[0] ?? ''}`
      );
    } finally {
      const restored = await restoreOwnedRecipe(repoRoot, RECIPE_REL_TRACE, mutation.original);
      const restoredRecipe = asObject(JSON.parse(mutation.original.toString('utf8')));
      const correctedArgs = scenarioList(restoredRecipe)[0]?.args ?? [];
      const redriveAction = await runCli(rec, policy, {
        phase: 'SCN-RECIPE-DRIFT',
        id: 'scn-recipe-drift-redrive',
        repoRoot,
        scriptRel: 'scripts/trace/index.ts',
        args: correctedArgs,
        cwd: repoRoot
      });
      const productAfter = snapshotInputs(repoRoot, traceProcedure.consumed_product_inputs);
      const productChanged = traceProcedure.consumed_product_inputs.filter(
        (input) => productBefore.get(input) !== productAfter.get(input)
      );
      recordCheckFrom(
        rec,
        'SCN-RECIPE-DRIFT',
        'scn-recipe-drift-corrected-redrive',
        restored && redriveAction.exit_code === 0 && productChanged.length === 0,
        'owned recipe restored, re-driven live to exit 0, with product bytes unchanged',
        `restored=${String(restored)}; redrive_exit=${String(redriveAction.exit_code)}; product_changed=[${productChanged.join(', ')}]`
      );
    }
  }

  /* 4. Freshness: two deltas to fields the runner actually consumes.
   *    (a) a scenario argument in the trace recipe (journey-scoped);
   *    (b) the CLI policy timeout that runCli applies to trace and outcome (shared).
   *    For each delta the prior proof is withheld, the affected journeys are
   *    re-driven live under the mutated input, and the owned recipe is restored
   *    and re-driven again. Staleness is a recorded digest observation; the
   *    graded evidence is the live re-drive, and the disposition stays manual. */
  const journeys = declaredJourneys(recipes);
  const allInputs = [...new Set(journeys.flatMap((journey) => journey.inputs))].sort();

  const scopedBefore = snapshotInputs(repoRoot, allInputs);
  const scopedMutation = await mutateOwnedRecipe(rec, repoRoot, RECIPE_REL_TRACE, (original) => ({
    drifted: original.replace('"--slug", "trace-empty"', '"--slug", "trace-empty-drifted"'),
    note: 'consumed scenario argument drifted: trace-empty-scope --slug trace-empty -> trace-empty-drifted'
  }));
  try {
    const scopedAfter = snapshotInputs(repoRoot, allInputs);
    const stale = staleJourneys(journeys, scopedBefore, scopedAfter);
    const drifted = scopedMutation.applied
      ? asObject(JSON.parse(scopedMutation.drifted.toString('utf8')))
      : null;
    const driftedScenario = scenarioList(drifted).find((scenario) => scenario.id === 'trace-empty-scope');
    const redrive = await runCli(rec, policy, {
      phase: 'SCN-FRESHNESS',
      id: 'freshness-journey-scoped-redrive',
      repoRoot,
      scriptRel: traceProcedure?.entry ?? 'scripts/trace/index.ts',
      args: substituteScratch(driftedScenario?.args ?? [], scratchRoot),
      cwd: repoRoot
    });
    const baseline = rec.actions.find(
      (action) => action.phase === 'JRN-TRACE-01' && action.id === 'trace-empty-scope'
    );
    const baselineCode = observedIssueCodes(baseline?.parsed_json ?? null)[0] ?? null;
    const redriveCode = observedIssueCodes(redrive.parsed_json)[0] ?? null;
    const record: DecisionRecord = {
      id: 'freshness-journey-scoped',
      baseline_digest: scopedBefore.get(path.posix.join(KIT_REL, RECIPE_REL_TRACE)) ?? null,
      observed_digest: scopedAfter.get(path.posix.join(KIT_REL, RECIPE_REL_TRACE)) ?? null,
      changed_inputs: allInputs.filter((input) => scopedBefore.get(input) !== scopedAfter.get(input)),
      affected_journeys: stale,
      unaffected_journeys: journeys.map((journey) => journey.id).filter((id) => !stale.includes(id)),
      decision:
        'pending-manual-owner: the trace recipe scenario argument is consumed by the runner; its digest changed, the prior JRN-TRACE-01 proof is withheld until a live re-drive, and only the parent owner may accept the new disposition',
      owner: 'parent integration owner (R does not accept freshness)'
    };
    rec.decisions.push(record);
    recordCheckFrom(
      rec,
      'SCN-FRESHNESS',
      'freshness-journey-scoped-withholds-prior-proof',
      scopedMutation.applied &&
        stale.length === 1 &&
        stale[0] === 'JRN-TRACE-01' &&
        baselineCode !== null &&
        redriveCode !== null &&
        redriveCode !== baselineCode,
      'a consumed trace-recipe argument delta marks only JRN-TRACE-01 stale; the prior proof is withheld and a live re-drive observes a different real result',
      `changed=[${record.changed_inputs.join(', ')}]; stale=[${stale.join(', ')}]; fresh=[${record.unaffected_journeys.join(', ')}]; baseline_issue=${String(baselineCode)}; redrive_issue=${String(redriveCode)}; redrive_exit=${String(redrive.exit_code)}`
    );
    recordGap(
      rec,
      'SCN-FRESHNESS',
      'freshness-journey-scoped-decision',
      'manual_decision',
      'the freshness decision is a manual owner disposition, not a technical PASS',
      record.decision
    );
  } finally {
    const restored = await restoreOwnedRecipe(repoRoot, RECIPE_REL_TRACE, scopedMutation.original);
    const restoredRecipe = asObject(JSON.parse(scopedMutation.original.toString('utf8')));
    const restoredScenario = scenarioList(restoredRecipe).find((scenario) => scenario.id === 'trace-empty-scope');
    const restoreRedrive = await runCli(rec, policy, {
      phase: 'SCN-FRESHNESS',
      id: 'freshness-journey-scoped-restored-redrive',
      repoRoot,
      scriptRel: traceProcedure?.entry ?? 'scripts/trace/index.ts',
      args: substituteScratch(restoredScenario?.args ?? [], scratchRoot),
      cwd: repoRoot
    });
    const baseline = rec.actions.find(
      (action) => action.phase === 'JRN-TRACE-01' && action.id === 'trace-empty-scope'
    );
    const baselineCode = observedIssueCodes(baseline?.parsed_json ?? null)[0] ?? null;
    const restoredCode = observedIssueCodes(restoreRedrive.parsed_json)[0] ?? null;
    recordCheckFrom(
      rec,
      'SCN-FRESHNESS',
      'freshness-journey-scoped-restored',
      restored && restoredCode === baselineCode,
      'owned recipe restored byte-identically and the live re-drive reproduces the baseline observation',
      `restored=${String(restored)}; restored_issue=${String(restoredCode)}; baseline_issue=${String(baselineCode)}; digest=${String(
        fileIdentity(repoRoot, path.posix.join(KIT_REL, RECIPE_REL_TRACE)).sha256
      )}`
    );
  }

  const sharedBefore = snapshotInputs(repoRoot, allInputs);
  const sharedMutation = await mutateOwnedRecipe(rec, repoRoot, RECIPE_REL_POLICY, (original) => ({
    drifted: original.replace('"timeout_ms": 180000', '"timeout_ms": 60000'),
    note: 'consumed CLI policy timeout drifted: 180000 -> 60000 (read by runCli for trace and outcome)'
  }));
  try {
    const sharedAfter = snapshotInputs(repoRoot, allInputs);
    const stale = staleJourneys(journeys, sharedBefore, sharedAfter);
    const mutatedPolicy = await readCliPolicy(repoRoot);
    const traceRecipeCarrier = await readRecipe(repoRoot, RECIPE_REL_TRACE);
    const outcomeRecipeCarrier = await readRecipe(repoRoot, 'recipes/outcome-audit.json');
    const traceScenario = scenarioList(traceRecipeCarrier?.parsed ?? null).find(
      (scenario) => scenario.id === 'trace-valid-scope'
    );
    const outcomeScenario = scenarioList(outcomeRecipeCarrier?.parsed ?? null).find(
      (scenario) => scenario.id === 'outcome-exact-one-valid'
    );
    const traceArgs = traceScenario?.args ?? [];
    const outcomeArgs = outcomeScenario?.args ?? [];
    const traceRedrive = await runCli(rec, mutatedPolicy, {
      phase: 'SCN-FRESHNESS',
      id: 'freshness-shared-input-trace-redrive',
      repoRoot,
      scriptRel: 'scripts/trace/index.ts',
      args: traceArgs,
      cwd: repoRoot
    });
    const outcomeRedrive = await runCli(rec, mutatedPolicy, {
      phase: 'SCN-FRESHNESS',
      id: 'freshness-shared-input-outcome-redrive',
      repoRoot,
      scriptRel: 'scripts/outcome/index.ts',
      args: outcomeArgs,
      cwd: repoRoot
    });
    // A non-null exit alone accepted a degraded re-drive. Reuse the recipe oracles so each
    // shared-input re-drive must reproduce its declared clean result, not merely terminate.
    const traceEvaluation = traceScenario ? evaluateScenario(traceRedrive, traceScenario.expect) : null;
    const outcomeEvaluation = outcomeScenario ? evaluateScenario(outcomeRedrive, outcomeScenario.expect) : null;
    const traceIssueCount = (arrayField(traceRedrive.parsed_json, 'issues') ?? []).length;
    const outcomeIssueCount = (arrayField(outcomeRedrive.parsed_json, 'issues') ?? []).length;
    const redriveProblems = [
      ...(traceEvaluation ? traceEvaluation.problems : ['trace-valid-scope scenario not declared']),
      ...(outcomeEvaluation ? outcomeEvaluation.problems : ['outcome-exact-one-valid scenario not declared']),
      ...(traceIssueCount === 0 ? [] : [`trace re-drive reported ${String(traceIssueCount)} issue(s)`]),
      ...(outcomeIssueCount === 0 ? [] : [`outcome re-drive reported ${String(outcomeIssueCount)} issue(s)`])
    ];
    const record: DecisionRecord = {
      id: 'freshness-shared-input',
      baseline_digest: sharedBefore.get(path.posix.join(KIT_REL, RECIPE_REL_POLICY)) ?? null,
      observed_digest: sharedAfter.get(path.posix.join(KIT_REL, RECIPE_REL_POLICY)) ?? null,
      changed_inputs: allInputs.filter((input) => sharedBefore.get(input) !== sharedAfter.get(input)),
      affected_journeys: stale,
      unaffected_journeys: journeys.map((journey) => journey.id).filter((id) => !stale.includes(id)),
      decision:
        'pending-manual-owner: cli-policy.json is read by runCli for JRN-TRACE-01 and JRN-OUTCOME-01 only; its timeout digest changed, both prior proofs are withheld and re-driven live, and JRN-CONSUMER-01 keeps its current unmodified identity. Only the parent owner may accept the disposition',
      owner: 'parent integration owner (R does not accept freshness)'
    };
    rec.decisions.push(record);
    recordCheckFrom(
      rec,
      'SCN-FRESHNESS',
      'freshness-shared-input-consumed-field',
      sharedMutation.applied &&
        mutatedPolicy.timeout_ms !== policy.timeout_ms &&
        stale.length === 2 &&
        stale.includes('JRN-TRACE-01') &&
        stale.includes('JRN-OUTCOME-01') &&
        record.unaffected_journeys.length === 1 &&
        record.unaffected_journeys[0] === 'JRN-CONSUMER-01' &&
        redriveProblems.length === 0,
      'a real delta to the runner-consumed CLI policy marks only the two consuming journeys stale, with both re-driven live to their declared clean results; the independent consumer journey keeps its identity',
      `changed=[${record.changed_inputs.join(', ')}]; stale=[${stale.join(', ')}]; fresh=[${record.unaffected_journeys.join(', ')}]; policy_timeout=${String(policy.timeout_ms)}->${String(mutatedPolicy.timeout_ms)}; trace_redrive_exit=${String(traceRedrive.exit_code)}; outcome_redrive_exit=${String(outcomeRedrive.exit_code)}; trace_issues=${String(traceIssueCount)}; outcome_issues=${String(outcomeIssueCount)}; problems=[${redriveProblems.join('; ')}]`
    );
    recordGap(
      rec,
      'SCN-FRESHNESS',
      'freshness-shared-input-decision',
      'manual_decision',
      'the shared-input freshness decision is a manual owner disposition, not a technical PASS',
      record.decision
    );
  } finally {
    const restored = await restoreOwnedRecipe(repoRoot, RECIPE_REL_POLICY, sharedMutation.original);
    const restoredPolicy = await readCliPolicy(repoRoot);
    recordCheckFrom(
      rec,
      'SCN-FRESHNESS',
      'freshness-shared-input-restored',
      restored && restoredPolicy.timeout_ms === policy.timeout_ms,
      'shared recipe restored byte-identically and the consumed timeout value is back to the baseline',
      `restored=${String(restored)}; timeout=${String(restoredPolicy.timeout_ms)}; digest=${String(
        fileIdentity(repoRoot, path.posix.join(KIT_REL, RECIPE_REL_POLICY)).sha256
      )}`
    );
  }

  /* 5. Product regression branch is genuinely unexercised: no defect was
   *    manufactured and none was encountered. */
  recordGap(
    rec,
    'SCN-PRODUCT-REGRESSION',
    'disc-product-regression',
    'unexercised',
    'a current product defect contradicting approved criteria would be recorded here',
    'no product defect encountered while driving the declared journeys; no regression was manufactured'
  );

  /* 6. Governance separation (VER-005) is not mechanically provable. */
  recordGap(
    rec,
    'SCN-GOVERNANCE',
    'ver-005-governance-separation',
    'manual_decision',
    'readiness, technical proof, human acceptance and release authority are separate',
    'this kit produces technical proof only; acceptance and release remain human gates'
  );

  void scratchRoot;
}

/* --------------------------------------------------------------- retention */

interface Retention {
  artifact_path: string;
  sha256_before_cleanup: string;
  bytes_before_cleanup: number;
  sha256_after_cleanup: string | null;
  bytes_after_cleanup: number | null;
  identical: boolean;
  removed: Array<{ dir: string; removed: boolean }>;
}

async function persistThenCleanup(
  artifactPath: string,
  payload: unknown,
  ownedDirs: string[]
): Promise<Retention> {
  await fs.ensureDir(path.dirname(artifactPath));
  const before = Buffer.from(JSON.stringify(payload, null, 2), 'utf8');
  await fs.writeFile(artifactPath, before);
  const readBack = await fs.readFile(artifactPath);
  const removed: Array<{ dir: string; removed: boolean }> = [];
  for (const dir of ownedDirs) {
    if (!dir) continue;
    const base = path.basename(dir);
    if (!base.startsWith(SCRATCH_PREFIX) && !base.startsWith(CONSUMER_PREFIX)) {
      removed.push({ dir, removed: false });
      continue;
    }
    await fs.remove(dir);
    removed.push({ dir: basenameForEvidence(dir), removed: !(await fs.pathExists(dir)) });
  }
  const after = (await fs.pathExists(artifactPath)) ? await fs.readFile(artifactPath) : null;
  return {
    artifact_path: artifactPath,
    sha256_before_cleanup: sha256Buffer(readBack),
    bytes_before_cleanup: readBack.byteLength,
    sha256_after_cleanup: after ? sha256Buffer(after) : null,
    bytes_after_cleanup: after ? after.byteLength : null,
    identical: readBack.equals(before) && after !== null && after.equals(before),
    removed
  };
}

/** Records the owned temp directory by its role, never by absolute host path. */
function basenameForEvidence(dir: string): string {
  const base = path.basename(dir);
  return base.startsWith(CONSUMER_PREFIX) ? `${CONSUMER_PREFIX}<unique>` : `${SCRATCH_PREFIX}<unique>`;
}

async function writeReceipt(
  artifactPath: string,
  receiptPath: string,
  status: string,
  retention: Retention,
  rec: Recorder
): Promise<void> {
  const failures = rec.checks.filter((check) => check.outcome === 'fail');
  await fs.writeJson(
    receiptPath,
    {
      kind: 'kit.run-receipt',
      generated_at: new Date().toISOString(),
      status,
      artifact: {
        path: path.relative(DEFAULT_REPO_ROOT, artifactPath),
        sha256_before_cleanup: retention.sha256_before_cleanup,
        bytes_before_cleanup: retention.bytes_before_cleanup,
        sha256_after_cleanup: retention.sha256_after_cleanup,
        bytes_after_cleanup: retention.bytes_after_cleanup,
        identical_after_cleanup: retention.identical
      },
      cleanup: { scope: 'owned temp consumer/scratch directories only', removed: retention.removed },
      checks: {
        total: rec.checks.length,
        passed: rec.checks.filter((check) => check.outcome === 'pass').length,
        failed: failures.length,
        blocked: rec.checks.filter((check) => check.outcome === 'blocked').length,
        unexercised: rec.checks.filter((check) => check.outcome === 'unexercised').length,
        manual_decision: rec.checks.filter((check) => check.outcome === 'manual_decision').length
      },
      failures: failures.map((check) => `${check.id}: ${check.observation}`)
    },
    { spaces: 2 }
  );
}

function summaryStatus(rec: Recorder): { status: string; exitCode: number } {
  const failures = rec.checks.filter((check) => check.outcome === 'fail');
  const open = rec.checks.filter(
    (check) => check.outcome === 'blocked' || check.outcome === 'unexercised' || check.outcome === 'manual_decision'
  );
  if (failures.length > 0) return { status: 'FAIL', exitCode: 1 };
  if (open.length > 0) return { status: 'PROOF_INCOMPLETE', exitCode: 2 };
  return { status: 'PROOF_COMPLETE', exitCode: 0 };
}

function artifactName(repoRoot: string, mode: string, status: string): { artifact: string; receipt: string } {
  const stamp = new Date().toISOString().replace(/[:.]/g, '-');
  const dir = evidenceDir(repoRoot);
  const base = `${mode}-${status.toLowerCase()}-${stamp}`;
  return { artifact: path.join(dir, `${base}.json`), receipt: path.join(dir, `${base}.receipt.json`) };
}

/* -------------------------------------------------------------------- gates */

/**
 * The single drive gate. The same function guards `--run` and is exercised by
 * `--refusal-probe`, so refusal is the production behavior, not a mock.
 */
export function guardDrive(report: DoctorReport): { allowed: boolean; refusals: string[] } {
  return { allowed: report.healthy, refusals: reportFailureLines(report) };
}

/* --------------------------------------------------------------------- main */

interface RunEnvelope {
  kind: 'kit.verification-run';
  schema_version: 1;
  mode: string;
  status: string;
  started_at: string;
  finished_at: string;
  repo_root: string;
  source_revision: string;
  declared_source_revision: string | null;
  doctor: DoctorReport | null;
  gate: { allowed: boolean; refusals: string[] };
  state_identity: {
    recipe_identity: FileIdentity[];
    harness_identity: FileIdentity[];
    consumed_input_identity: FileIdentity[];
    runtime: DoctorReport['runtime'];
    dependency_identity: DoctorReport['dependency_identity'];
    dirty_identity: DoctorReport['dirty_identity'];
  } | null;
  notes: string[];
  fixtures: FixtureRecord[];
  actions: ActionRecord[];
  checks: CheckRecord[];
  decisions: DecisionRecord[];
  error: string | null;
}

function buildEnvelope(
  repoRoot: string,
  mode: string,
  doctor: DoctorReport | null,
  gate: { allowed: boolean; refusals: string[] },
  rec: Recorder,
  startedAt: string,
  status: string,
  error: string | null
): RunEnvelope {
  return {
    kind: 'kit.verification-run',
    schema_version: 1,
    mode,
    status,
    started_at: startedAt,
    finished_at: new Date().toISOString(),
    repo_root: repoRoot,
    source_revision: doctor?.source_revision ?? 'unavailable',
    declared_source_revision: doctor?.declared_source_revision ?? null,
    doctor,
    gate,
    state_identity: doctor
      ? {
          recipe_identity: doctor.recipe_identity,
          harness_identity: doctor.harness_identity,
          consumed_input_identity: doctor.consumed_input_identity,
          runtime: doctor.runtime,
          dependency_identity: doctor.dependency_identity,
          dirty_identity: doctor.dirty_identity
        }
      : null,
    notes: rec.notes,
    fixtures: rec.fixtures,
    actions: rec.actions,
    checks: rec.checks,
    decisions: rec.decisions,
    error
  };
}

export async function refusalProbe(repoRoot: string): Promise<number> {
  const rec = newRecorder();
  const startedAt = new Date().toISOString();
  const mutation = await mutateOwnedRecipe(rec, repoRoot, RECIPE_REL_TRACE, (original) => ({
    drifted: original.replace('"entry": "scripts/trace/index.ts"', '"entry": "scripts/trace/nonexistent-driver.ts"'),
    note: 'refusal probe: declared trace driver replaced with a non-existent path'
  }));
  let doctor: DoctorReport | null = null;
  let gate: { allowed: boolean; refusals: string[] } = { allowed: false, refusals: ['doctor did not run'] };
  let error: string | null = null;
  try {
    doctor = runDoctor(repoRoot);
    gate = guardDrive(doctor);
  } catch (thrown) {
    error = thrown instanceof Error ? (thrown.stack ?? thrown.message) : String(thrown);
  } finally {
    const restored = await restoreOwnedRecipe(repoRoot, RECIPE_REL_TRACE, mutation.original);
    recordCheckFrom(
      rec,
      'GATE',
      'gate-refusal-recipe-restored',
      restored,
      'owned recipe restored byte-identically after the refusal probe',
      `restored=${String(restored)}`
    );
  }
  recordCheckFrom(
    rec,
    'GATE',
    'gate-refuses-unhealthy-doctor',
    error === null &&
      mutation.applied &&
      doctor !== null &&
      !gate.allowed &&
      gate.refusals.some((line) => line.includes('CHK-JOURNEY-ENTRYPOINTS')),
    'an unhealthy doctor makes the drive gate refuse before any journey executes',
    `doctor_healthy=${String(doctor?.healthy ?? null)}; allowed=${String(gate.allowed)}; refusals=[${gate.refusals.join(' | ')}]${
      error ? `; error=${error.split('\n')[0] ?? ''}` : ''
    }`
  );
  const { status, exitCode } = summaryStatus(rec);
  const names = artifactName(repoRoot, 'refusal', status);
  const envelope = buildEnvelope(repoRoot, 'refusal-probe', doctor, gate, rec, startedAt, status, error);
  const retention = await persistThenCleanup(names.artifact, envelope, []);
  await writeReceipt(names.artifact, names.receipt, status, retention, rec);
  console.log(
    `refusal-probe ${status} — allowed=${String(gate.allowed)} artifact=${path.relative(repoRoot, retention.artifact_path)} identical=${String(retention.identical)}`
  );
  return exitCode;
}

export async function executeAll(repoRoot: string = DEFAULT_REPO_ROOT): Promise<number> {
  const rec = newRecorder();
  const startedAt = new Date().toISOString();
  let doctor: DoctorReport | null = null;
  let gate: { allowed: boolean; refusals: string[] } = { allowed: false, refusals: ['doctor did not run'] };
  let error: string | null = null;
  try {
    doctor = runDoctor(repoRoot);
    gate = guardDrive(doctor);
  } catch (thrown) {
    error = thrown instanceof Error ? (thrown.stack ?? thrown.message) : String(thrown);
  }
  recordCheckFrom(
    rec,
    'GATE',
    'doctor-readiness',
    doctor !== null && doctor.healthy,
    'doctor checks runtime, build, dependencies, source/recipe/harness identity and state',
    doctor
      ? doctor.healthy
        ? 'healthy'
        : reportFailureLines(doctor).join(' | ')
      : (error ?? 'doctor did not run')
  );

  const ownedDirs: string[] = [];

  if (!gate.allowed) {
    const status = 'REFUSED';
    const names = artifactName(repoRoot, 'run', status);
    const envelope = buildEnvelope(repoRoot, 'run', doctor, gate, rec, startedAt, status, error);
    const retention = await persistThenCleanup(names.artifact, envelope, ownedDirs);
    await writeReceipt(names.artifact, names.receipt, status, retention, rec);
    console.log(`run REFUSED — doctor unhealthy: ${gate.refusals.join(' | ')}`);
    return 3;
  }

  try {
    const kit = loadKit(repoRoot);
    const policy = await readCliPolicy(repoRoot);
    const scratchRoot = await fs.mkdtemp(path.join(os.tmpdir(), SCRATCH_PREFIX));
    ownedDirs.push(scratchRoot);

    for (const procedure of kit.recipes) {
      const loaded = await readRecipe(repoRoot, path.posix.relative(KIT_REL, procedure.recipe_path));
      if (!loaded) {
        recordGap(
          rec,
          procedure.journey,
          `${procedure.journey}-recipe-unreadable`,
          'blocked',
          'recipe readable before driving',
          `recipe ${procedure.recipe_path} unreadable; journey not driven`
        );
        continue;
      }
      if (procedure.journey === 'JRN-TRACE-01') {
        await runTraceJourney(rec, repoRoot, procedure, loaded.parsed, policy, scratchRoot);
      } else if (procedure.journey === 'JRN-OUTCOME-01') {
        await runOutcomeJourney(rec, repoRoot, procedure, loaded.parsed, policy, scratchRoot);
      } else if (procedure.journey === 'JRN-CONSUMER-01') {
        await runConsumerJourney(rec, repoRoot, procedure, loaded.parsed, policy, ownedDirs);
      }
    }

    await runDiscrepancyScenarios(rec, repoRoot, kit.recipes, policy, scratchRoot);
  } catch (thrown) {
    error = thrown instanceof Error ? (thrown.stack ?? thrown.message) : String(thrown);
    recordCheckFrom(rec, 'RUN', 'run-aborted', false, 'run completes without an unhandled error', error);
  }

  const { status, exitCode } = summaryStatus(rec);
  const finalNames = artifactName(repoRoot, 'run', status);
  const envelope = buildEnvelope(repoRoot, 'run', doctor, gate, rec, startedAt, status, error);
  const retention = await persistThenCleanup(finalNames.artifact, envelope, ownedDirs);
  await writeReceipt(finalNames.artifact, finalNames.receipt, status, retention, rec);
  console.log(
    `run ${status} — checks pass=${rec.checks.filter((c) => c.outcome === 'pass').length} fail=${rec.checks.filter((c) => c.outcome === 'fail').length} ` +
      `blocked=${rec.checks.filter((c) => c.outcome === 'blocked').length} unexercised=${rec.checks.filter((c) => c.outcome === 'unexercised').length} ` +
      `manual=${rec.checks.filter((c) => c.outcome === 'manual_decision').length}; artifact=${path.relative(repoRoot, retention.artifact_path)} identical=${String(retention.identical)}`
  );
  return exitCode;
}

async function main(argv: string[]): Promise<number> {
  const repoRoot = resolveRepoRoot(argv);
  if (argv.includes('--doctor')) {
    const report = runDoctor(repoRoot);
    console.log(JSON.stringify(report, null, 2));
    return report.healthy ? 0 : 1;
  }
  if (argv.includes('--refusal-probe')) return refusalProbe(repoRoot);
  if (argv.includes('--run')) return executeAll(repoRoot);
  console.log('Project verification runner — mode not selected.');
  console.log('Usage: node --import tsx docs/verification/agent-skills-standard/scripts/run-verification.ts [--run | --doctor | --refusal-probe] [--repo-root <dir>]');
  return 0;
}

if (process.argv[1] && path.resolve(process.argv[1]) === path.resolve(__filename)) {
  main(process.argv.slice(2))
    .then((code) => {
      process.exitCode = code;
    })
    .catch((error: unknown) => {
      console.error(`fatal: ${error instanceof Error ? (error.stack ?? error.message) : String(error)}`);
      process.exitCode = 1;
    });
}
