#!/usr/bin/env node
/**
 * archive-session-receipts.mjs
 *
 * Reproducible extraction of authentic tool-execution records from the native
 * OMP session JSONL of the Task 5 integration owner (session
 * 01a1795b-65e7-7781-b554-a80b16917bba).
 *
 * What it does:
 *  - Parses the native session JSONL as data (no model/LLM involvement).
 *  - Selects ONLY an explicit allowlist of allowlisted tool calls.
 *  - Copies each selected `tool_execution_start` record verbatim and each
 *    matching `message.role === "toolResult"` record verbatim (content,
 *    details, isError, ids, timestamps, original start args).
 *  - Copies nothing else: no assistant reasoning, no user/system prompts, no
 *    credentials, no unrelated session events.
 *  - Writes authored interpretation into a SEPARATE `annotations` block.
 *
 * Usage:
 *   node artifacts/creative-production-improvements/evidence/archive-session-receipts.mjs
 *
 * Environment overrides:
 *   SESSION_FILE  path to the native session JSONL
 *   OUT_FILE      destination JSON path
 *
 * Limits (recorded in the output, not hidden):
 *  - The native records expose `isError` and `details.wallTimeMs`, but not a
 *    numeric process exit code; exit codes are therefore never synthesized.
 *    Where the observed text itself states "Command exited with code N", that
 *    text is preserved as text.
 *  - The native start-args record may itself be truncated by the host when the
 *    command string is long; it is copied exactly as recorded.
 */

import { createHash } from 'node:crypto';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';

const DEFAULT_SESSION = path.join(
  os.homedir(),
  '.omp/agent/sessions/-.paseo-worktrees-3hvsfnnw-creative-production-improvements/2026-10-26T17-56-35-431Z_01a1795b-65e7-7781-b554-a80b16917bba.jsonl',
);
const DEFAULT_OUT = path.join(
  import.meta.dirname,
  'command-receipts.json',
);

const SESSION_FILE = process.env.SESSION_FILE ?? DEFAULT_SESSION;
const OUT_FILE = process.env.OUT_FILE ?? DEFAULT_OUT;

const PHASES = {
  A: {
    id: 'A_pre_alignment_fix',
    from: '2026-10-26T17:56:35.431Z',
    to: '2026-10-26T18:23:04.999Z',
    description:
      'Source settled for marketing cores; alignment helper present but eval expected_output not yet prompt-conformant. Executable gates, baseline suites and smoke-harness development iterations.',
  },
  B: {
    id: 'B_intermediate_post_helper_pre_eval_fix',
    from: '2026-10-26T18:23:05.000Z',
    to: '2026-10-26T18:28:53.999Z',
    description:
      'Alignment helper exercised against the not-yet-corrected eval expected_output; intermediate failure, intermediate eval suite run, live MCP stdio smoke, first token-metric run later reverted.',
  },
  C: {
    id: 'C_final_post_eval_fix',
    from: '2026-10-26T18:28:54.000Z',
    to: '2026-10-26T18:36:00.000Z',
    description:
      'Final expected_output correction applied by the owning worker; final gates, final scorer, final token metrics, build, whole-suite run, final hash listings and cleanup.',
  },
};

/**
 * Explicit allowlist. `annotation` fields are authored interpretation and are
 * emitted under `annotations`, never mixed into the raw record.
 */
const SELECTION = [
  // ---------- Phase A ----------
  {
    toolCallId: 'call_2744314',
    phase: 'A',
    label: 'Dependency provenance: temporary sibling symlinks created',
    interpretation:
      'Creates temporary node_modules symlinks to the sibling ../marketing-pr-delivery worktree after byte-identical dependency manifests were verified. Enables running repository scripts without installing dependencies.',
  },
  {
    toolCallId: 'call_2744499',
    phase: 'A',
    label: 'Skills redundancy audit',
    interpretation:
      'Observed output reports no obvious redundancy. No exit code is exposed by the record; isError is false.',
  },
  {
    toolCallId: 'call_2604052',
    phase: 'A',
    label: 'CLI metadata/schema validation (validate:all)',
    interpretation:
      'Observed output: 345 skills found; per-skill validation lines; validation summary reports Passed: 345 / Failed: 0 and 73 token-efficiency warnings. Read the preserved tail of the raw text for the exact summary wording.',
    limitations: [
      'Per-skill detail lines are dominated by the 73 warning messages; the raw output is preserved in full rather than excerpted.',
    ],
  },
  {
    toolCallId: 'call_2598028',
    phase: 'A',
    label: 'Eval corpus audit (repository-wide)',
    interpretation:
      'Reports 2 audit issues and writes benchmarks/evals/eval-audit.json. The follow-up read record (call_2653312) preserves the report contents that establish both issues are database/database-hana single-assertion findings, not marketing findings.',
  },
  {
    toolCallId: 'call_2653312',
    phase: 'A',
    label: 'Raw eval-audit.json report contents',
    interpretation:
      'Independent raw read of the generated audit report: issueCount 2, both entries category=database, skillName=database-hana, kind=single-assertion, generatedAt 2026-10-26T18:00:16.150Z.',
  },
  {
    toolCallId: 'call_3854624',
    phase: 'A',
    label: 'Target-scoped eval preflight (run 1)',
    interpretation:
      'Preflight restricted to artifacts/creative-production-improvements/evidence/target-skills.txt. Observed output: 0 issues. Report path benchmarks/evals/eval-preflight.json.',
  },
  {
    toolCallId: 'call_2936071',
    phase: 'A',
    label: 'Raw eval-preflight.json report contents',
    interpretation:
      'Independent raw read of the preflight report written at 2026-10-26T18:00:24.318Z: issueCount 0, issues empty. This is the archived proof behind the "0 issues" claim for target skills.',
  },
  {
    toolCallId: 'call_2372344',
    phase: 'A',
    label: 'Repository-wide eval preflight without target filter (failing context)',
    interpretation:
      'Historical context: running evals:preflight with no --skills-file scans the whole corpus and reports 42 issues (isError true; observed text states "Command exited with code 1"). The accepted "0 issues" figure is target-scoped only and must not be read as repository-wide cleanliness.',
    limitations: [
      'The generated benchmarks/evals/eval-preflight.json for this failing run was later restored (call_2615424); only the pre-restore report reads are archived.',
    ],
  },
  {
    toolCallId: 'call_2695290',
    phase: 'A',
    label: 'check-alignment run 1: pre-fix failure',
    interpretation:
      'Historical failing run of the pre-correction alignment gate: isError true. Observed text lists marketing/marketing-content-strategy 59%, marketing/marketing-copywriting 53%, marketing/marketing-demo-video 64% below the 70% threshold.',
  },
  {
    toolCallId: 'call_2604424',
    phase: 'A',
    label: 'test:evals baseline suite',
    interpretation:
      'Eval test suite executed before the alignment helper/expected_output corrections landed. Observed pass/fail counts are in the raw text; this is not the final suite figure.',
  },
  {
    toolCallId: 'call_3820214',
    phase: 'A',
    label: 'Capability docs drift check (read-only)',
    interpretation:
      'Observed output states docs/agent-capabilities.md is up to date. No capability-doc regeneration was required.',
  },
  {
    toolCallId: 'call_2675106',
    phase: 'A',
    label: 'Marketing skill test suite',
    interpretation:
      'Shipped marketing tests plus the demo-storyboard validator test suite. Pass/fail counts are in the raw text.',
  },
  {
    toolCallId: 'call_2187974',
    phase: 'A',
    label: 'Real scorer execution (first run, pre-final eval edit)',
    interpretation:
      'Actual scripts/evals/scorer.ts checkAssertion harness over the candidate corpus. Observed classification: 73 typed cases (19 expected-accepted passed, 54 expected-rejected failed, 0 false positives, 0 false negatives), 18 pressure diagnostic cases with 6 lexical-pass predicate gaps, 10 manual-adjudication cases. The Phase C rerun reproduces identical classifier totals on the final eval source.',
  },
  {
    toolCallId: 'call_4259506',
    phase: 'A',
    label: 'Consumer smoke harness iteration 1 (failed)',
    interpretation:
      'Harbour development iteration: CLI sync inside the disposable consumer returned a null status after ~30.3s wall time and the harness exited non-zero. Preserved as an honest pre-success failure, not a product defect claim.',
  },
  {
    toolCallId: 'call_2559771',
    phase: 'A',
    label: 'Consumer smoke harness iteration 2 (failed)',
    interpretation:
      'Second iteration with the same null-sync-status / ~30.3s wall-time signature before the CLI invocation was corrected in the harness.',
  },
  {
    toolCallId: 'call_2411683',
    phase: 'A',
    label: 'Consumer smoke harness iteration 3 (failed)',
    interpretation:
      'Sync then succeeded (status 0) but the harness failed with ERR_MODULE_NOT_FOUND pointing at mcp/src/services/SkillParser. Harness-side module resolution defect, not a registry output defect.',
  },
  {
    toolCallId: 'call_2750069',
    phase: 'A',
    label: 'Consumer smoke harness iteration 4 (failed)',
    interpretation:
      'Harness failed because a bare keyword "copywriting" did not match marketing-copywriting under the lower-level SkillIndex keyword router. Documents that the harness expectation, not the shipped router fixture, needed correction.',
  },
  {
    toolCallId: 'call_2406365',
    phase: 'A',
    label: 'Consumer smoke harness iteration 5 (failed)',
    interpretation:
      'Harness failed with "skillIndex.getSkill is not a function": the harness called a non-existent SkillIndex API.',
  },
  {
    toolCallId: 'call_2782898',
    phase: 'A',
    label: 'Consumer smoke success (writes consumer-smoke-results.json)',
    interpretation:
      'Local registry fixture + built CLI sync into a disposable consumer; keyword/router checks and installed storyboard validator checks (--check, vtt cue count 6, transcript narration) passed. This run is the provenance of consumer-smoke-results.json.',
    limitations: [
      'Executed at 2026-10-26T18:08:46Z, before the Phase C eval expected_output correction. Marketing SKILL.md/reference bytes it exercises were already frozen and are hash-identical to the final manifest entries; the eval JSON changed later and is not exercised here.',
    ],
  },
  {
    toolCallId: 'call_2783573',
    phase: 'A',
    label: 'Synthetic media video smoke iteration 1 (failed)',
    interpretation:
      'Harness-side failure: the generated fixture storyboard JSON was rejected by the shipped validator (STORYBOARD_INVALID: unknown properties, unsupported schema_version, missing rights/cost, invalid scene id). Preserved as a real pre-success failure of the synthetic harness input.',
  },
  {
    toolCallId: 'call_2320016',
    phase: 'A',
    label: 'Synthetic media video smoke success (writes video-recipe-smoke-results.json)',
    interpretation:
      'ffmpeg/ffprobe synthetic smoke: 0.500083s measured tone onset for a declared 0.50s lead-in, 19.021333s assembled duration for declared 19.0s, sampled boundary packet PTS, selective repair preserving scene-01/03 hashes and retiming the downstream WebVTT cue 13.500s→12.500s, repaired assembly 18.021333s. Provenance of video-recipe-smoke-results.json.',
    limitations: [
      'Synthetic sine tone, not human speech. Sampled keyframe-seek intervals are not continuous packet coverage. A repaired Markdown transcript is not retimed by this harness.',
    ],
  },

  // ---------- Phase B ----------
  {
    toolCallId: 'call_2573326',
    phase: 'B',
    label: 'check-alignment intermediate failure (post-helper, pre-eval fix)',
    interpretation:
      'isError true. After the alignment helper landed but before the eval expected_output correction, the gate still failed with observed marketing percentages 59%/60%/67%. This is the intermediate state referenced by the final report.',
  },
  {
    toolCallId: 'call_2714187',
    phase: 'B',
    label: 'test:evals intermediate suite',
    interpretation:
      'Intermediate eval suite run covering the new alignment helper regression tests; pass/fail counts are in the raw text.',
  },
  {
    toolCallId: 'call_2199970',
    phase: 'B',
    label: 'Live MCP stdio transport smoke success (writes mcp-transport-smoke-results.json)',
    interpretation:
      'Real @modelcontextprotocol/sdk StdioClientTransport against the built candidate mcp/dist entrypoint; observed 11 registered tools, three positive keyword routings, one clean negative, and successful direct get_skill calls. Provenance of mcp-transport-smoke-results.json.',
    limitations: [
      'Direct get_skill checks verify recognizable content markers, not full returned-body byte parity.',
      'Executed at 2026-10-26T18:24:27Z (Phase B); MCP source and marketing skill bodies were unchanged afterwards.',
    ],
  },
  {
    toolCallId: 'call_2521777',
    phase: 'B',
    label: 'calculate-tokens run 1 (superseded)',
    interpretation:
      'First token-metric run. Observed marketing metrics 14614 total / 1218 avg / largest marketing-demo-video 2243 tokens and grand total 241525. Its metadata.json mutation was immediately reverted (call_2772402) so the durable metadata change comes only from the Phase C run.',
  },
  {
    toolCallId: 'call_2772402',
    phase: 'B',
    label: 'Revert of transient skills/metadata.json mutation',
    interpretation:
      'git checkout of the transient first-run metadata mutation; observed output "Updated 1 path from the index". Confirms the durable metadata bytes are produced by the Phase C calculate-tokens run.',
  },

  // ---------- Phase C ----------
  {
    toolCallId: 'call_2914385',
    phase: 'C',
    label: 'Dependency symlinks re-created for final gates',
    interpretation:
      'Temporary sibling symlinks re-created so the final gate commands can resolve the repository toolchain; removed again at call_3404521.',
  },
  {
    toolCallId: 'call_2177178',
    phase: 'C',
    label: 'check-alignment final PASS',
    interpretation:
      'Final alignment gate: isError false. Observed text reports remaining sub-90% warnings for unrelated skills and states all skills meet the 70% threshold.',
  },
  {
    toolCallId: 'call_2610998',
    phase: 'C',
    label: 'Target-scoped eval preflight final',
    interpretation:
      'Final target-scoped preflight: observed 0 issues for the three target skills.',
  },
  {
    toolCallId: 'call_2615424',
    phase: 'C',
    label: 'Restore of generated benchmark eval reports',
    interpretation:
      'git checkout of benchmarks/evals/ restoring generated audit/preflight reports so the branch carries no unrelated generated benchmark churn. The report contents that support the classification are archived as raw reads call_2653312 and call_2936071.',
  },
  {
    toolCallId: 'call_2746244',
    phase: 'C',
    label: 'test:evals final suite',
    interpretation:
      'Final eval suite run on the corrected eval source; pass/fail counts are in the raw text.',
  },
  {
    toolCallId: 'call_2463017',
    phase: 'C',
    label: 'Real scorer execution (final)',
    interpretation:
      'Final real-scorer run on the corrected eval source. Identical classifier totals to the Phase A run: 73 typed (19/19 accepted passed, 54/54 rejected failed, 0/0 false pos/neg), 18 pressure diagnostics with 6 known lexical-pass predicate gaps, 10 manual cases. Pressure and manual cases are diagnostic only, not acceptance successes.',
  },
  {
    toolCallId: 'call_2676840',
    phase: 'C',
    label: 'calculate-tokens final (durable metadata mutation)',
    interpretation:
      'Durable token-metric run. Observed marketing: 12 skills, 14614 total tokens, 1218 avg, largest marketing-demo-video (2243 tokens); grand total 241525 across 345 skills; observed "Updated metadata.json with token_metrics".',
  },
  {
    toolCallId: 'call_3444200',
    phase: 'C',
    label: 'Diff proof for skills/metadata.json',
    interpretation:
      'Observed diff: marketing token_metrics total_tokens 12884→14614, avg 1074→1218, largest 1617→2243 tokens; 3 insertions / 3 deletions in one file.',
  },
  {
    toolCallId: 'call_2593542',
    phase: 'C',
    label: 'Diff proof for keyword-derived marketing/_INDEX.md',
    interpretation:
      'Observed empty diff: the keyword-derived category index is unchanged. This supports the narrower keyword-parity conclusion only; it does NOT establish that every description-derived catalog output is current.',
  },
  {
    toolCallId: 'call_2102178',
    phase: 'C',
    label: 'SDLC workflow surface audit',
    interpretation:
      'Observed raw output ends with "✅ SDLC audit passed."; the full per-workflow listing is preserved.',
  },
  {
    toolCallId: 'call_3011431',
    phase: 'C',
    label: 'Freshness audit',
    interpretation:
      'Observed summary line: "Freshness audit: 18 issues (high 0, med 10, low 8, warn 0)". All findings shown are in unrelated categories; no high-severity blocking finding.',
  },
  {
    toolCallId: 'call_2446387',
    phase: 'C',
    label: 'Repository build',
    interpretation:
      'Observed Vite SSR build of the CLI: 72 modules transformed, dist/index.js 360.34 kB, "built in 36ms". The preserved output also contains a Vite native-config-loader warning; the run is successful but is not warning-free.',
  },
  {
    toolCallId: 'call_2456718',
    phase: 'C',
    label: 'Whole repository test suite',
    interpretation:
      'Single `pnpm test` invocation covering the CLI vitest run plus every root test script. The raw output is preserved in full; it prints per-suite counts, not a combined total. The combined 1,702 figure used in the report is an author-derived sum of the eleven printed counts (1273 CLI vitest + 94 + 62 + 23 + 16 + 8 + 44 + 8 + 24 + 88 + 62), and every printed fail count is 0.',
    derived_claims: [
      '1273 + 94 + 62 + 23 + 16 + 8 + 44 + 8 + 24 + 88 + 62 = 1702 (author-derived, not printed by the command).',
    ],
    limitations: [
      'The run time (details.wallTimeMs) is the host record of the whole invocation; no per-suite timing is re-derived here.',
      'The output contains a Vite native-config warning, so "passed" must not be reported as "warning-free".',
    ],
  },
  {
    toolCallId: 'call_4147437',
    phase: 'C',
    label: 'Hash listing: evidence artifacts + frozen sources + metadata',
    interpretation:
      'Repository-relative SHA-256 listing taken after the final gates. Binds the evidence artifacts and canonical source/metadata bytes that existed at 2026-10-26T18:31:18Z.',
    limitations: [
      'command-receipts.json did not yet exist at this timestamp; it was written at 18:34:32Z and hashed separately at call_2862594.',
      'The recorded start args for this call are host-truncated with a trailing ellipsis; the listing itself is preserved in full.',
    ],
  },
  {
    toolCallId: 'call_3404521',
    phase: 'C',
    label: 'Temporary dependency symlinks removed',
    interpretation:
      'Removes the temporary node_modules symlinks: no repository dependency directories are left in the worktree.',
  },
  {
    toolCallId: 'call_3113177',
    phase: 'C',
    label: 'Final repository status snapshot',
    interpretation:
      'Post-cleanup `git status --short`: only intended tracked modifications plus the untracked implementation/evidence additions are listed; no node_modules or lockfile artifacts appear.',
  },
  {
    toolCallId: 'call_2862594',
    phase: 'C',
    label: 'Hash listing: evidence directory after receipts archive written',
    interpretation:
      'SHA-256 listing of artifacts/creative-production-improvements/evidence/* taken after command-receipts.json was first written. Superseded for the final manifest by the Task 6 correction-wave hash binding.',
  },
];

/** ------------------------------------------------------------------ */

const sessionText = fs.readFileSync(SESSION_FILE, 'utf8');
const sessionSha256 = createHash('sha256').update(sessionText).digest('hex');
const lines = sessionText.split('\n').filter((line) => line.trim() !== '');

const records = lines.map((line, index) => {
  try {
    return { index, value: JSON.parse(line) };
  } catch (error) {
    throw new Error(`Unparseable session line ${index + 1}: ${error.message}`);
  }
});

const starts = new Map();
const results = new Map();
for (const { value } of records) {
  if (value?.type === 'custom' && value.customType === 'tool_execution_start') {
    starts.set(value.data.toolCallId, value);
  } else if (
    value?.type === 'message' &&
    value?.message?.role === 'toolResult'
  ) {
    results.set(value.message.toolCallId, value);
  }
}

const phaseFor = (iso) => {
  for (const phase of Object.values(PHASES)) {
    if (iso >= phase.from && iso <= phase.to) return phase.id;
  }
  throw new Error(`No phase covers timestamp ${iso}`);
};

const receipts = [];
const annotations = [];
const missing = [];

for (const entry of SELECTION) {
  const start = starts.get(entry.toolCallId);
  const result = results.get(entry.toolCallId);
  if (!start || !result) {
    missing.push({
      toolCallId: entry.toolCallId,
      hasStart: Boolean(start),
      hasResult: Boolean(result),
    });
    continue;
  }

  const startTimestamp = start.data.startedAt ?? start.timestamp;
  const resultTimestamp = result.timestamp;
  const declaredPhaseId = PHASES[entry.phase].id;
  const derivedPhaseId = phaseFor(startTimestamp);
  if (declaredPhaseId !== derivedPhaseId) {
    throw new Error(
      `Phase mismatch for ${entry.toolCallId}: declared ${declaredPhaseId}, derived ${derivedPhaseId}`,
    );
  }

  receipts.push({
    selection_label: entry.label,
    source_phase: declaredPhaseId,
    phase_check: {
      declared: declaredPhaseId,
      derived_from_started_at: derivedPhaseId,
      consistent: true,
    },
    tool_call_id: entry.toolCallId,
    tool_name: start.data.toolName,
    tool_execution_start: {
      record_id: start.id,
      parent_id: start.parentId,
      started_at: startTimestamp,
      timestamp: start.timestamp,
      args: start.data.args ?? null,
    },
    tool_result: {
      record_id: result.id,
      parent_id: result.parentId,
      timestamp: resultTimestamp,
      message: result.message,
    },
  });

  annotations.push({
    tool_call_id: entry.toolCallId,
    tool_name: start.data.toolName,
    label: entry.label,
    authored: true,
    interpretation: entry.interpretation,
    ...(entry.derived_claims ? { derived_claims: entry.derived_claims } : {}),
    ...(entry.limitations ? { limitations: entry.limitations } : {}),
  });
}

if (missing.length > 0) {
  throw new Error(
    `Selection referenced records that do not exist in the session: ${JSON.stringify(missing)}`,
  );
}

receipts.sort((a, b) =>
  a.tool_execution_start.started_at.localeCompare(
    b.tool_execution_start.started_at,
  ),
);

const excluded = {
  assistant_reasoning_and_tool_call_requests: records.filter(
    (r) => r.value?.type === 'message' && r.value?.message?.role === 'assistant',
  ).length,
  user_and_system_prompts: records.filter(
    (r) => r.value?.type === 'message' && r.value?.message?.role === 'user',
  ).length,
  credential_pins: records.filter((r) => r.value?.type === 'credential_pin')
    .length,
  memory_recall_events: records.filter(
    (r) => r.value?.type === 'custom' && r.value?.customType === 'memory_recall',
  ).length,
  other_tool_calls_not_selected:
    starts.size - receipts.length,
};

const output = {
  receipt_version: '2.0.0',
  schema:
    'Authentic per-tool-call archive: verbatim tool_execution_start records + verbatim toolResult messages for an explicit allowlist, with authored interpretation isolated in `annotations`.',
  task: 'Task 5 integration and observable verification — Task 6 correction wave (B1)',
  slug: 'creative-production-improvements',
  base_commit: '1aecf6c3f3b49c01b2d66cd3afac856d29cc538d',
  extracted_at: new Date().toISOString(),
  extraction: {
    script: 'artifacts/creative-production-improvements/evidence/archive-session-receipts.mjs',
    method:
      'Node reads the native OMP session JSONL as data, indexes tool_execution_start custom records and message.role="toolResult" records by toolCallId, and emits the selected pairs verbatim. No model, network, or shell command execution is involved.',
    source_session_file:
      '~/.omp/agent/sessions/-.paseo-worktrees-3hvsfnnw-creative-production-improvements/2026-10-26T17-56-35-431Z_01a1795b-65e7-7781-b554-a80b16917bba.jsonl',
    source_session_file_absolute_sha256: sessionSha256,
    source_session_line_count: lines.length,
    source_agent_id: '01a1795b-65e7-7781-b554-a80b16917bba',
    source_agent_role:
      'Integration owner (Task 5). The reviewer independently read the same source file for call_2456718 / message b564ee90.',
    selection_policy: [
      'Allowlist of validation, audit, preflight, alignment, test-suite, build, scorer, consumer, MCP, media-smoke, token-metric, hash and cleanup tool calls.',
      'Only tool_execution_start args and the matching toolResult message are copied.',
      'No assistant reasoning, user/system prompts, credentials, memory events or unrelated session records are copied.',
      'Authored interpretation lives only in `annotations`, keyed by toolCallId.',
    ],
    excluded_record_counts: excluded,
  },
  phases: PHASES,
  limitations: [
    'Native records expose isError and details.wallTimeMs but no numeric exit code. Exit codes are not synthesized; where the observed text says "Command exited with code N", that text is preserved verbatim as text.',
    'Long command strings can be truncated by the host editor before persistence; args are preserved exactly as recorded, including any trailing ellipsis.',
    'The final SHA-256 listing (call_4147437, 18:31:18Z) is a retrospective state binding written after the gates ran. It cannot establish that the bytes hashed are byte-identical to the bytes each process read minutes earlier; it binds the files that existed when the listing was taken.',
    'command-receipts.json was written at 18:34:32Z, after the final hash listing, and was hashed separately.',
    'This archive proves observed command output and host error flags. It does not prove the tests are correct, complete, or that their assertions are sound; those remain review judgements.',
    'Consumer, MCP and media smoke runs completed before the Phase C eval expected_output correction. They exercise marketing SKILL.md/reference bytes that are hash-identical to the final manifest; eval JSON is not exercised by those smokes.',
    'Raw media files and temporary consumer directories are not archived; those paths are historical run metadata only.',
  ],
  receipts,
  annotations,
};

fs.writeFileSync(OUT_FILE, `${JSON.stringify(output, null, 2)}\n`, 'utf8');

const bytes = fs.statSync(OUT_FILE).size;
console.log(
  `Wrote ${receipts.length} authentic receipts (${annotations.length} annotations) to ${OUT_FILE} (${bytes} bytes)`,
);
console.log(`Source session sha256: ${sessionSha256}`);
console.log(
  `Excluded: ${JSON.stringify(excluded)}`,
);
