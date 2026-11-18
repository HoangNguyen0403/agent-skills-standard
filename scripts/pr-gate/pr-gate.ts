// scripts/pr-gate/pr-gate.ts
//
// SRS-AFC-01..05: `pr-gate` job body. Reads only the `pull_request` event
// payload (`$GITHUB_EVENT_PATH`) and local git; never interpolates event fields
// into a shell. Reports authored-line size (SRS-AFC-02), review-evidence
// declarations (SRS-AFC-03) and trunk paths from `review_gate.py classify`
// (SRS-AFC-04), then exits according to `PR_GATE_MODE` (SRS-AFC-05).
//
// Exit codes: 0 clean/report mode, 1 findings in enforce mode, 2 infrastructure
// error (missing event/SHAs, unreadable diff, malformed policy) — always a
// failure, never a pass.

import { execFileSync } from "node:child_process";
import fs from "node:fs";
import { isGeneratedPath } from "../metrics/pr-baseline";

export type GateMode = "report" | "enforce";

const DEFAULT_MAX_AUTHORED_LINES = 1000;
const SIZE_EXCEPTION_LABEL = "size-exception";
const DEPENDABOT_AUTHOR = "dependabot[bot]";
const REVIEW_POLICY = "docs/review-policy.md";
const REVIEW_GATE = "skills/common/common-review-policy/scripts/review_gate.py";

/** Infrastructure failure: the gate could not evaluate the change. Never a pass. */
export class GateInfraError extends Error {
  public constructor(message: string) {
    super(message);
    this.name = "GateInfraError";
  }
}

export interface GateEvent {
  readonly body: string;
  readonly labels: readonly string[];
  readonly author: string;
  /** `user.type` from the payload; the dependabot skip requires `Bot`. */
  readonly authorType: string;
  readonly baseSha: string;
  readonly headSha: string;
}

export interface DiffEntry {
  readonly path: string;
  readonly additions: number;
  readonly deletions: number;
  /** `git diff --numstat` reports `-` for binary files. */
  readonly binary: boolean;
}

export interface SizeReport {
  readonly authoredLines: number;
  readonly generatedLines: number;
  readonly authoredFiles: readonly DiffEntry[];
  readonly generatedFiles: readonly DiffEntry[];
  readonly binaryFiles: readonly DiffEntry[];
}

export interface BodyReport {
  readonly findings: readonly string[];
  /** `Gate check: not run: <reason>` — reported, not a breach. */
  readonly gateCheckNotRun: string | null;
}

export interface ClassifiedPath {
  readonly path: string;
  readonly class: string;
}

export interface GateDeps {
  readonly env: Readonly<Record<string, string | undefined>>;
  readonly readEventFile: (file: string) => string;
  readonly git: (args: readonly string[]) => string;
  readonly classify: (args: readonly string[]) => {
    readonly status: number;
    readonly stdout: string;
    readonly stderr: string;
  };
  readonly appendSummary: (markdown: string) => void;
  readonly log: (line: string) => void;
}

const HEADING = /^##\s+(.+?)\s*$/;
const LIST_MARKER = /^(?:[-*+]|\d+\.)\s+/;

/** Actions workflow-command data escaping (percent, CR, LF). */
export function escapeWorkflowCommand(value: string): string {
  return value.replace(/%/g, "%25").replace(/\r/g, "%0D").replace(/\n/g, "%0A");
}

export function parseEvent(raw: string): GateEvent {
  let parsed: unknown;
  try {
    parsed = JSON.parse(raw);
  } catch {
    throw new GateInfraError("GITHUB_EVENT_PATH is not valid JSON");
  }
  const record = asRecord(parsed);
  const pull = asRecord(record?.["pull_request"]);
  if (!pull)
    throw new GateInfraError("event payload has no pull_request object");

  const baseSha = asString(asRecord(pull["base"])?.["sha"]);
  const headSha = asString(asRecord(pull["head"])?.["sha"]);
  if (!baseSha) throw new GateInfraError("pull_request.base.sha is missing");
  if (!headSha) throw new GateInfraError("pull_request.head.sha is missing");

  const labels = Array.isArray(pull["labels"])
    ? pull["labels"]
        .map((label) => asString(asRecord(label)?.["name"]))
        .filter((name): name is string => Boolean(name))
    : [];
  return {
    body: asString(pull["body"]) ?? "",
    labels,
    author: asString(asRecord(pull["user"])?.["login"]) ?? "",
    authorType: asString(asRecord(pull["user"])?.["type"]) ?? "",
    baseSha,
    headSha,
  };
}

/**
 * Parses `git diff --numstat -z -M` output. Records are NUL-terminated:
 * `adds\tdels\tpath\0` normally, and `adds\tdels\t\0old\0new\0` for a rename or
 * copy. The destination path is the entry path, so accounting follows the file
 * to where it now lives; an unchanged move reports 0/0 while an edited move
 * reports its own additions and deletions.
 */
export function parseNumstat(raw: string): DiffEntry[] {
  const entries: DiffEntry[] = [];
  const fields = raw.split("\0");
  for (let index = 0; index < fields.length; index += 1) {
    const record = fields[index];
    if (record === "") continue;
    const parts = record.split("\t");
    if (parts.length < 3) continue;
    const [added, removed] = parts;
    let file = parts.slice(2).join("\t");
    if (file === "") {
      // Rename/copy: the two pathnames follow as their own NUL-terminated fields.
      const destination = fields[index + 2];
      if (destination === undefined || destination === "") continue;
      file = destination;
      index += 2;
    }
    const binary = added === "-" || removed === "-";
    entries.push({
      path: file,
      additions: binary ? 0 : Number.parseInt(added, 10) || 0,
      deletions: binary ? 0 : Number.parseInt(removed, 10) || 0,
      binary,
    });
  }
  return entries;
}

export function summarizeSize(entries: readonly DiffEntry[]): SizeReport {
  const authoredFiles: DiffEntry[] = [];
  const generatedFiles: DiffEntry[] = [];
  const binaryFiles: DiffEntry[] = [];
  let authoredLines = 0;
  let generatedLines = 0;
  for (const entry of entries) {
    if (entry.binary) binaryFiles.push(entry);
    if (isGeneratedPath(entry.path)) {
      generatedFiles.push(entry);
      generatedLines += entry.additions + entry.deletions;
    } else {
      authoredFiles.push(entry);
      authoredLines += entry.additions + entry.deletions;
    }
  }
  return {
    authoredLines,
    generatedLines,
    authoredFiles,
    generatedFiles,
    binaryFiles,
  };
}

function extractSection(body: string, title: string): string | null {
  const lines = body.replace(/\r\n?/g, "\n").split("\n");
  const wanted = title.toLowerCase();
  let start = -1;
  for (let index = 0; index < lines.length; index += 1) {
    const heading = HEADING.exec(lines[index]);
    if (heading && heading[1].toLowerCase() === wanted) {
      start = index + 1;
      break;
    }
  }
  if (start === -1) return null;
  let end = lines.length;
  for (let index = start; index < lines.length; index += 1) {
    if (HEADING.test(lines[index])) {
      end = index;
      break;
    }
  }
  return lines.slice(start, end).join("\n");
}

/** Removes HTML comments and `<...>` placeholders, then trims. */
export function cleanDeclarationText(text: string): string {
  return text
    .replace(/<!--[\s\S]*?-->/g, " ")
    .replace(/<[^>]*>/g, " ")
    .trim();
}

function hasContent(section: string | null): boolean {
  if (section === null) return false;
  return !isBlankDeclaration(cleanDeclarationText(section));
}

/** A value counts as empty when it has no Unicode letters or digits. */
function isBlankDeclaration(value: string): boolean {
  return !/[\p{L}\p{N}]/u.test(value);
}

function declarationValue(section: string, field: string): string | null {
  const wanted = field.toLowerCase();
  for (const rawLine of section.replace(/\r\n?/g, "\n").split("\n")) {
    const line = rawLine.trim().replace(LIST_MARKER, "");
    const colon = line.indexOf(":");
    if (colon === -1) continue;
    if (line.slice(0, colon).trim().toLowerCase() !== wanted) continue;
    return cleanDeclarationText(line.slice(colon + 1));
  }
  return null;
}

/** SRS-AFC-03: the declaration check. Callers skip it for dependabot. */
export function checkBody(body: string): BodyReport {
  const findings: string[] = [];
  const requirements = extractSection(body, "Requirements");
  if (!hasContent(requirements))
    findings.push("`## Requirements` is missing or empty");

  const evidence = extractSection(body, "Evidence");
  if (evidence === null) {
    findings.push("`## Evidence` section is missing");
  } else {
    const review = declarationValue(evidence, "Independent review");
    if (review === null || isBlankDeclaration(review)) {
      findings.push(
        "`## Evidence` lacks a non-empty `Independent review:` line",
      );
    }
    const gate = declarationValue(evidence, "Gate check");
    if (gate === null || isBlankDeclaration(gate)) {
      findings.push("`## Evidence` lacks a non-empty `Gate check:` line");
    }
  }

  const notVerified = extractSection(body, "Not verified");
  if (!hasContent(notVerified))
    findings.push("`## Not verified` is missing or empty");

  const gateValue =
    evidence === null ? null : declarationValue(evidence, "Gate check");
  const notRun =
    gateValue !== null && /^not run\b/i.test(gateValue) ? gateValue : null;
  return { findings, gateCheckNotRun: notRun };
}

export function isSizeException(labels: readonly string[]): boolean {
  return labels.some(
    (label) => label.trim().toLowerCase() === SIZE_EXCEPTION_LABEL,
  );
}

export function resolveMode(
  env: Readonly<Record<string, string | undefined>>,
): GateMode {
  const raw = (env["PR_GATE_MODE"] ?? "report").trim().toLowerCase();
  if (raw === "report" || raw === "enforce") return raw;
  throw new GateInfraError(
    `PR_GATE_MODE must be report or enforce, got "${raw}"`,
  );
}

export function resolveMaxAuthoredLines(
  env: Readonly<Record<string, string | undefined>>,
): number {
  const raw = env["PR_GATE_MAX_AUTHORED_LINES"];
  if (raw === undefined || raw.trim() === "") return DEFAULT_MAX_AUTHORED_LINES;
  const value = Number(raw);
  if (!Number.isInteger(value) || value < 0) {
    throw new GateInfraError(
      `PR_GATE_MAX_AUTHORED_LINES must be a non-negative integer, got "${raw}"`,
    );
  }
  return value;
}

/** Resolves the common ancestor of the PR base and head; both SHAs must exist locally. */
export function resolveMergeBase(
  deps: Pick<GateDeps, "git">,
  baseSha: string,
  headSha: string,
): string {
  const mergeBase = deps
    .git(["merge-base", baseSha, headSha])
    .trim()
    .toLowerCase();
  if (!/^[0-9a-f]{40}$/.test(mergeBase)) {
    throw new GateInfraError(
      `git merge-base ${baseSha} ${headSha} did not return a full commit OID`,
    );
  }
  return mergeBase;
}

/** SRS-AFC-04: runs `review_gate.py classify`; exit 2 is an infrastructure failure. */
export function classifyTrunkPaths(
  deps: Pick<GateDeps, "classify">,
  mergeBase: string,
  headSha: string,
): ClassifiedPath[] {
  const result = deps.classify([
    REVIEW_GATE,
    "classify",
    "--policy",
    REVIEW_POLICY,
    "--base",
    mergeBase,
    "--head",
    headSha,
    "--json",
  ]);
  if (result.status === 2) {
    throw new GateInfraError(
      `review_gate.py classify failed (exit 2): ${result.stderr.trim() || "no stderr"}`,
    );
  }
  if (result.status !== 0) {
    throw new GateInfraError(
      `review_gate.py classify failed (exit ${result.status}): ${result.stderr.trim()}`,
    );
  }
  let parsed: unknown;
  try {
    parsed = JSON.parse(result.stdout);
  } catch {
    throw new GateInfraError(
      "review_gate.py classify --json returned invalid JSON",
    );
  }
  const rows = asRecord(parsed)?.["paths"];
  if (!Array.isArray(rows))
    throw new GateInfraError(
      "review_gate.py classify --json has no paths array",
    );
  const out: ClassifiedPath[] = [];
  for (const row of rows) {
    const record = asRecord(row);
    const filePath = asString(record?.["path"]);
    const cls = asString(record?.["class"]);
    if (filePath && cls) out.push({ path: filePath, class: cls });
  }
  return out;
}

/**
 * Renders an arbitrary repository path as an inert Markdown code span. JSON
 * quoting keeps control characters on one line before choosing the delimiter.
 */
export function renderSummaryPath(filePath: string): string {
  const content = JSON.stringify(filePath);
  const backtickRuns = content.match(/`+/g) ?? [];
  const longestRun = backtickRuns.reduce(
    (longest, run) => Math.max(longest, run.length),
    0,
  );
  const delimiter = "`".repeat(longestRun + 1);
  const padded =
    content.startsWith("`") || content.endsWith("`")
      ? ` ${content} `
      : content;
  return `${delimiter}${padded}${delimiter}`;
}

function renderSummary(input: {
  readonly mode: GateMode;
  readonly mergeBase: string;
  readonly size: SizeReport;
  readonly maxAuthoredLines: number;
  readonly exceptionClaimed: boolean;
  readonly bodyFindings: readonly string[];
  readonly bodySkipped: boolean;
  readonly gateCheckNotRun: string | null;
  readonly trunkPaths: readonly ClassifiedPath[];
}): string {
  const lines: string[] = [];
  lines.push("## pr-gate");
  lines.push("");
  lines.push(`- Mode: \`${input.mode}\``);
  lines.push(
    `- Authored lines: **${input.size.authoredLines}** / ${input.maxAuthoredLines}` +
      (input.size.generatedLines > 0
        ? ` (generated excluded: ${input.size.generatedLines})`
        : ""),
  );
  lines.push(`- Merge base: ${renderSummaryPath(input.mergeBase)}`);
  if (input.exceptionClaimed)
    lines.push("- Size exception claimed: `size-exception` label");
  if (input.bodySkipped)
    lines.push("- Body checks skipped for `dependabot[bot]`");
  if (input.bodyFindings.length > 0) {
    lines.push("", "### Missing review evidence", "");
    for (const finding of input.bodyFindings) lines.push(`- ${finding}`);
  }
  if (input.gateCheckNotRun)
    lines.push(
      "",
      "- Local gate not run: declared under `## Evidence` (not a breach)",
    );
  lines.push("", "### Trunk paths (line review required)", "");
  if (input.trunkPaths.length === 0) {
    lines.push("- none");
  } else {
    for (const entry of input.trunkPaths)
      lines.push(`- ${renderSummaryPath(entry.path)}`);
  }
  if (input.size.binaryFiles.length > 0) {
    lines.push("", "### Binary files (0 authored lines)", "");
    for (const entry of input.size.binaryFiles)
      lines.push(`- ${renderSummaryPath(entry.path)}`);
  }
  return `${lines.join("\n")}\n`;
}

/** Ordered, single-line-per-command output channel (annotations). */
function annotate(deps: GateDeps, mode: GateMode, message: string): void {
  const command = mode === "enforce" ? "error" : "warning";
  deps.log(`::${command} title=pr-gate::${escapeWorkflowCommand(message)}`);
}

export function runGate(deps: GateDeps): number {
  let mode: GateMode = "report";
  try {
    mode = resolveMode(deps.env);
    const maxAuthoredLines = resolveMaxAuthoredLines(deps.env);

    const eventPath = deps.env["GITHUB_EVENT_PATH"];
    if (!eventPath) throw new GateInfraError("GITHUB_EVENT_PATH is not set");
    let rawEvent: string;
    try {
      rawEvent = deps.readEventFile(eventPath);
    } catch (error) {
      throw new GateInfraError(
        `cannot read GITHUB_EVENT_PATH: ${error instanceof Error ? error.message : String(error)}`,
      );
    }
    const event = parseEvent(rawEvent);

    // SRS-AFC-01/04: review_gate.py rejects a head that does not descend from
    // --base, and a PR base branch advances while the PR is open. The merge base
    // is the stable comparison point for both the diff and the classifier.
    const mergeBase = resolveMergeBase(deps, event.baseSha, event.headSha);
    const diff = deps.git([
      "diff",
      "--numstat",
      "-z",
      "-M",
      mergeBase,
      event.headSha,
    ]);
    const size = summarizeSize(parseNumstat(diff));
    const exceptionClaimed = isSizeException(event.labels);
    const bodySkipped =
      event.author === DEPENDABOT_AUTHOR && event.authorType === "Bot";
    const body = bodySkipped
      ? { findings: [], gateCheckNotRun: null }
      : checkBody(event.body);
    const trunkPaths = classifyTrunkPaths(
      deps,
      mergeBase,
      event.headSha,
    ).filter((entry) => entry.class === "trunk");

    const findings: string[] = [];
    if (size.authoredLines > maxAuthoredLines && !exceptionClaimed) {
      findings.push(
        `Authored lines ${size.authoredLines} exceed the budget of ${maxAuthoredLines}; add the \`size-exception\` label with a reason under \`## Blast radius\`.`,
      );
    }
    findings.push(...body.findings);

    for (const finding of findings) annotate(deps, mode, finding);
    // Informational in both modes: the trunk list raises attention, never fails the job.
    for (const entry of trunkPaths) {
      deps.log(
        `::notice title=pr-gate::${escapeWorkflowCommand(`Trunk path requires line review: ${entry.path}`)}`,
      );
    }

    deps.appendSummary(
      renderSummary({
        mode,
        mergeBase,
        size,
        maxAuthoredLines,
        exceptionClaimed,
        bodyFindings: body.findings,
        bodySkipped,
        gateCheckNotRun: body.gateCheckNotRun,
        trunkPaths,
      }),
    );

    if (mode === "enforce" && findings.length > 0) return 1;
    return 0;
  } catch (error) {
    const message = error instanceof Error ? error.message : String(error);
    deps.log(`::error title=pr-gate::${escapeWorkflowCommand(message)}`);
    return 2;
  }
}

function asRecord(value: unknown): Record<string, unknown> | null {
  return typeof value === "object" && value !== null && !Array.isArray(value)
    ? (value as Record<string, unknown>)
    : null;
}

function asString(value: unknown): string | null {
  return typeof value === "string" ? value : null;
}

function runGit(args: readonly string[], cwd: string): string {
  return execFileSync("git", [...args], {
    cwd,
    encoding: "utf8",
    maxBuffer: 64 * 1024 * 1024,
  });
}

function runClassify(
  args: readonly string[],
  cwd: string,
): { status: number; stdout: string; stderr: string } {
  const [script, ...rest] = args;
  try {
    const stdout = execFileSync("python3", [script, ...rest], {
      cwd,
      encoding: "utf8",
      stdio: ["ignore", "pipe", "pipe"],
    });
    return { status: 0, stdout, stderr: "" };
  } catch (error) {
    const failure = error as {
      status?: number;
      stdout?: string;
      stderr?: string;
    };
    return {
      status: failure.status ?? 1,
      stdout: failure.stdout ?? "",
      stderr: failure.stderr ?? "",
    };
  }
}

export function createDeps(
  env: Readonly<Record<string, string | undefined>>,
  cwd: string,
): GateDeps {
  return {
    env,
    readEventFile: (file) => fs.readFileSync(file, "utf8"),
    git: (args) => runGit(args, cwd),
    classify: (args) => runClassify(args, cwd),
    appendSummary: (markdown) => {
      const target = env["GITHUB_STEP_SUMMARY"];
      if (target) fs.appendFileSync(target, markdown);
    },
    log: (line) => process.stdout.write(`${line}\n`),
  };
}

/* c8 ignore start -- CLI entry point; behavior covered through runGate(). */
// tsx runs this file directly; `import.meta` is unavailable because the repo
// compiles scripts as CommonJS, so entry detection is by invoked filename.
if (
  process.argv[1] !== undefined &&
  /[\\/]pr-gate\.(?:ts|js)$/.test(process.argv[1])
) {
  process.exitCode = runGate(createDeps(process.env, process.cwd()));
}
/* c8 ignore stop */
