import fs from "fs-extra";
import * as path from "path";
import {
  ARCHIVE_DIR,
  EVALS_REPORT_MD,
  HISTORY_JSON,
  RESULTS_FILENAME,
  ROOT_DIR,
  RUNS_DIR,
} from "./constants";
import { answerPath, loadManifest } from "./manifest";
import {
  EvalsHistory,
  EvalsHistoryRecord,
  EvidenceMode,
  InstructionVersion,
  RunResults,
  SkillResult,
} from "./types";
import { evaluateSkillReadiness } from "./readiness";

function numericMetric(
  value: number | "n/a" | null | undefined,
): number | null {
  return typeof value === "number" ? value : null;
}

function pct(value: number | "n/a" | null | undefined): string {
  if (value === "n/a" || value === null || value === undefined) return "n/a";
  return `${Math.round(value * 100)}%`;
}

function pctPrecise(value: number | "n/a" | null | undefined): string {
  if (value === "n/a" || value === null || value === undefined) return "n/a";
  return `${(value * 100).toFixed(2).replace(/\.00$/, "")}%`;
}

function markdownCell(value: string): string {
  return value.replaceAll("|", "\\|").replaceAll("`", "\\`");
}

function avg(values: Array<number | "n/a" | null | undefined>): number {
  const numeric = values.flatMap((value) => {
    const number = numericMetric(value);
    return number === null ? [] : [number];
  });
  return numeric.length > 0
    ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length
    : 0;
}

function avgOrNa(
  values: Array<number | "n/a" | null | undefined>,
): number | "n/a" {
  const numeric = values.flatMap((value) => {
    const number = numericMetric(value);
    return number === null ? [] : [number];
  });
  return numeric.length > 0
    ? numeric.reduce((sum, value) => sum + value, 0) / numeric.length
    : "n/a";
}

function runIsComplete(runDir: string): boolean {
  const resultsPath = path.join(runDir, RESULTS_FILENAME);
  const manifestPath = path.join(runDir, "manifest.json");
  if (!fs.existsSync(resultsPath) || !fs.existsSync(manifestPath)) return false;
  const manifest = loadManifest(runDir);
  return manifest.skills.every((skill) =>
    skill.cases.every((currentCase) => {
      const arms =
        currentCase.kind === "trigger"
          ? [undefined]
          : (["baseline", "with-skill"] as const).filter(
              (arm) => arm in currentCase.arms,
            );
      return arms.every((arm) =>
        fs.existsSync(answerPath(runDir, manifest, skill, currentCase.id, arm)),
      );
    }),
  );
}

export function loadAllResults(): RunResults[] {
  if (!fs.existsSync(RUNS_DIR)) return [];
  return fs
    .readdirSync(RUNS_DIR, { withFileTypes: true })
    .filter((entry) => entry.isDirectory())
    .map((entry) => path.join(RUNS_DIR, entry.name))
    .filter(runIsComplete)
    .map(
      (runDir) =>
        fs.readJSONSync(path.join(runDir, RESULTS_FILENAME)) as RunResults,
    )
    .sort((a, b) => a.runId.localeCompare(b.runId));
}

export function partitionRun(run: RunResults): RunResults[] {
  // A selective run is development evidence. It cannot replace a complete
  // category projection or make unchanged skills disappear from the report.
  if (run.scope?.kind === "selective") return [];
  if (run.category !== "all") return [run];
  const byCategory = new Map<string, SkillResult[]>();
  for (const skill of run.skills) {
    const skills = byCategory.get(skill.category) ?? [];
    skills.push(skill);
    byCategory.set(skill.category, skills);
  }
  return [...byCategory.entries()].map(([category, skills]) => ({
    ...run,
    category,
    scope: { kind: "category", categories: [category] },
    skills: skills.sort((a, b) => a.skillName.localeCompare(b.skillName)),
  }));
}

/** Projects aggregate runs before choosing the newest complete category partition. */
export function latestPerCategory(
  results: RunResults[],
): Map<string, RunResults> {
  const latest = new Map<string, RunResults>();
  for (const physicalRun of results) {
    for (const partition of partitionRun(physicalRun)) {
      const existing = latest.get(partition.category);
      if (
        !existing ||
        new Date(partition.scoredAt) > new Date(existing.scoredAt) ||
        (partition.scoredAt === existing.scoredAt &&
          partition.runId > existing.runId)
      ) {
        latest.set(partition.category, partition);
      }
    }
  }
  return latest;
}

function latestPerCategoryIncludingSelective(
  results: RunResults[],
): Map<string, RunResults> {
  const latest = new Map<string, RunResults>();
  for (const run of results) {
    const partitions =
      run.category === "all" ? partitionRunIncludingSelective(run) : [run];
    for (const partition of partitions) {
      const existing = latest.get(partition.category);
      if (
        !existing ||
        new Date(partition.scoredAt) > new Date(existing.scoredAt) ||
        (partition.scoredAt === existing.scoredAt &&
          partition.runId > existing.runId)
      ) {
        latest.set(partition.category, partition);
      }
    }
  }
  return latest;
}

function partitionRunIncludingSelective(run: RunResults): RunResults[] {
  const byCategory = new Map<string, SkillResult[]>();
  for (const skill of run.skills) {
    const skills = byCategory.get(skill.category) ?? [];
    skills.push(skill);
    byCategory.set(skill.category, skills);
  }
  return [...byCategory.entries()].map(([category, skills]) => ({
    ...run,
    category,
    scope: { kind: "category", categories: [category] },
    skills: skills.sort((a, b) => a.skillName.localeCompare(b.skillName)),
  }));
}

export function loadHistory(): EvalsHistory {
  if (fs.existsSync(HISTORY_JSON))
    return fs.readJSONSync(HISTORY_JSON) as EvalsHistory;
  return { lastUpdated: new Date(0).toISOString(), records: [] };
}

function saveHistory(history: EvalsHistory): void {
  fs.ensureDirSync(path.dirname(HISTORY_JSON));
  fs.writeJSONSync(HISTORY_JSON, history, { spaces: 2 });
}

function syncHistoryAndArchive(allResults: RunResults[]): EvalsHistory {
  const history = loadHistory();
  const known = new Set(history.records.map((record) => record.runId));
  fs.ensureDirSync(ARCHIVE_DIR);
  for (const run of [...allResults].sort((a, b) =>
    a.runId.localeCompare(b.runId),
  )) {
    const archivePath = path.join(ARCHIVE_DIR, `${run.runId}.md`);
    fs.writeFileSync(archivePath, buildEvalsReportMarkdown([run]));
    if (known.has(run.runId)) {
      const existing = history.records.find(
        (record) => record.runId === run.runId,
      );
      const mode = evidenceMode(run);
      if (existing && !existing.evidenceMode && mode !== "unknown")
        existing.evidenceMode = mode;
      const proto = resolveRunProtocol(run);
      if (existing && !existing.protocolProvenance && proto !== "unknown")
        existing.protocolProvenance = proto;
      continue;
    }
    const proto = resolveRunProtocol(run);
    history.records.push({
      runId: run.runId,
      category: run.category,
      version: run.version,
      date: run.scoredAt,
      skillCount: run.skills.length,
      avgBaselinePassRate: avg(
        run.skills.map((skill) => skill.baselinePassRate),
      ),
      avgWithSkillPassRate: avg(
        run.skills.map((skill) => skill.withSkillPassRate),
      ),
      avgDelta: avg(run.skills.map((skill) => skill.delta)),
      agent: run.metadata.agent,
      model: run.metadata.model,
      evidenceMode: run.metadata.evidenceMode,
      protocolProvenance: proto !== "unknown" ? proto : undefined,
    });
  }
  history.records.sort(
    (a, b) => a.date.localeCompare(b.date) || a.runId.localeCompare(b.runId),
  );
  history.lastUpdated = allResults.reduce(
    (latest, run) => (run.scoredAt > latest ? run.scoredAt : latest),
    history.lastUpdated,
  );
  saveHistory(history);
  return history;
}

function isCompromised(skill: SkillResult, run?: RunResults): boolean {
  return (
    run?.compromisedSkills?.some(
      (record) =>
        record.category === skill.category &&
        record.skillName === skill.skillName &&
        record.arm === "baseline",
    ) ?? false
  );
}

function activationEvidenceTrusted(run: RunResults): boolean {
  const manifestPath = path.join(RUNS_DIR, run.runId, "manifest.json");
  // Keep pure reporter/unit-test inputs usable when no physical run exists.
  if (!fs.existsSync(manifestPath)) return true;
  const manifest = loadManifest(path.dirname(manifestPath));
  return (
    manifest.schemaVersion === 2 && manifest.activationEvidenceVersion === 3
  );
}

function displayDelta(skill: SkillResult, run?: RunResults): string {
  if (isCompromised(skill, run)) return "n/a";
  return pct(skill.delta);
}

function evidenceMode(run: RunResults): EvidenceMode | "unknown" {
  if (run.metadata.evidenceMode) return run.metadata.evidenceMode;
  if (/composite/i.test(run.metadata.agent ?? "")) return "composite";
  return "unknown";
}

interface ProtocolFacts {
  knownProtocols: Set<InstructionVersion>;
  unresolvedContributorCount: number;
  hasKnownHeterogeneity: boolean;
}

function classifyContributorProtocols(
  protocols: Array<InstructionVersion | undefined>,
): ProtocolFacts {
  const knownProtocols = new Set(
    protocols.filter(
      (protocol): protocol is InstructionVersion => protocol !== undefined,
    ),
  );
  return {
    knownProtocols,
    unresolvedContributorCount: protocols.filter(
      (protocol) => protocol === undefined,
    ).length,
    hasKnownHeterogeneity: knownProtocols.size > 1,
  };
}

function resolveRunLevelProtocol(
  run: RunResults,
): InstructionVersion | "mixed" | undefined {
  if (run.metadata.protocolProvenance) return run.metadata.protocolProvenance;
  const manifestPath = path.join(RUNS_DIR, run.runId, "manifest.json");
  if (!fs.existsSync(manifestPath)) return undefined;
  try {
    const manifest = loadManifest(path.dirname(manifestPath));
    return manifest.schemaVersion === 2
      ? manifest.protocol?.instructionVersion
      : "governing-skill-v1";
  } catch {
    return undefined;
  }
}

function protocolFacts(
  run: RunResults,
  skills: SkillResult[] = run.skills,
): ProtocolFacts {
  if (run.provenance) {
    return classifyContributorProtocols(
      skills.map(
        (skill) =>
          run.provenance?.[`${skill.category}/${skill.skillName}`]?.protocol
            ?.instructionVersion,
      ),
    );
  }

  const runProtocol = resolveRunLevelProtocol(run);
  if (runProtocol === "mixed") {
    return {
      knownProtocols: new Set(),
      unresolvedContributorCount: 0,
      hasKnownHeterogeneity: true,
    };
  }
  if (runProtocol) {
    return {
      knownProtocols: new Set([runProtocol]),
      unresolvedContributorCount: 0,
      hasKnownHeterogeneity: false,
    };
  }
  return classifyContributorProtocols(skills.map(() => undefined));
}

function mergeProtocolFacts(facts: ProtocolFacts[]): ProtocolFacts {
  const knownProtocols = new Set(
    facts.flatMap((fact) => [...fact.knownProtocols]),
  );
  return {
    knownProtocols,
    unresolvedContributorCount: facts.reduce(
      (total, fact) => total + fact.unresolvedContributorCount,
      0,
    ),
    hasKnownHeterogeneity:
      knownProtocols.size > 1 ||
      facts.some((fact) => fact.hasKnownHeterogeneity),
  };
}

function protocolLabel(
  facts: ProtocolFacts,
): InstructionVersion | "mixed" | "unknown" {
  if (facts.hasKnownHeterogeneity) return "mixed";
  if (facts.unresolvedContributorCount > 0) return "unknown";
  return [...facts.knownProtocols][0] ?? "unknown";
}

export function resolveRunProtocol(
  run: RunResults,
): InstructionVersion | "mixed" | "unknown" {
  return protocolLabel(protocolFacts(run));
}

export function resolveCategoryProtocol(
  run: RunResults,
): InstructionVersion | "mixed" | "unknown" {
  return protocolLabel(protocolFacts(run));
}

export function resolveSkillProtocol(
  skill: SkillResult,
  run?: RunResults,
): string {
  if (run?.provenance) {
    const key = `${skill.category}/${skill.skillName}`;
    const protocol = run.provenance[key]?.protocol?.instructionVersion;
    if (protocol) return protocol;
  }
  if (run) {
    const protocol = resolveRunProtocol(run);
    if (protocol !== "mixed" && protocol !== "unknown") return protocol;
  }
  return "unknown";
}


export function buildEvalsReportMarkdown(
  allResults: RunResults[],
  history?: EvalsHistory,
  options: { includeSelective?: boolean } = {},
): string {
  const lines: string[] = [
    "# 🧪 Live Skill Evals Report",
    "",
    `> Generated: ${new Date().toISOString()}`,
    "> Measured transcript-assertion evidence, not structural or executable task verification: outcome assertions are evaluated against transcripts from isolated evaluation workers. Workers are instructed not to use tools and have read-only filesystem capability, but neither tool-use prohibition nor tool invocation is host-enforced or retained here; tool-free execution is unverified. Trigger arms receive only the skill name and description.",
    "> Historical v1 runs remain readable through the compatibility adapter. v2 metrics report case pass rate, assertion pass rate, trigger recall, trigger specificity, and balanced trigger accuracy.",
    "> Activation metrics are omitted for legacy trigger evidence until a clean activation-evidence v2 run replaces it.",
    "",
  ];
  if (allResults.length === 0) {
    lines.push(
      "## No runs yet",
      "",
      "No eligible eval runs have been committed under `benchmarks/evals/runs/`.",
      "",
    );
    return lines.join("\n");
  }

  const latest = options.includeSelective
    ? latestPerCategoryIncludingSelective(allResults)
    : latestPerCategory(allResults);
  const allSkillResults = [...latest.values()].flatMap((run) => run.skills);
  const sourceRuns = new Map(
    allSkillResults.map((skill) => [
      `${skill.category}/${skill.skillName}`,
      latest.get(skill.category),
    ]),
  );
  const readiness = allSkillResults.map((skill) => {
    const run = sourceRuns.get(`${skill.category}/${skill.skillName}`);
    return evaluateSkillReadiness(skill, {
      compromised: isCompromised(skill, run),
      activationEvidenceTrusted: run ? activationEvidenceTrusted(run) : false,
    });
  });
  const outcomeReadyCount = readiness.filter(
    (result) => result.outcomeReady,
  ).length;
  const activationReadyCount = readiness.filter(
    (result) => result.activationReady,
  ).length;
  const strictReadyCount = readiness.filter((result) => result.ready).length;
  const modes = new Set([...latest.values()].map(evidenceMode));
  const freshEvidence =
    modes.size === 1 &&
    modes.has("fresh") &&
    [...latest.values()].every(
      (run) => (run.metadata.reusedAnswerCount ?? 0) === 0,
    );
  const catalogReady =
    allSkillResults.length > 0 &&
    strictReadyCount === allSkillResults.length &&
    freshEvidence;
  const summaryProtocolFacts = mergeProtocolFacts(
    [...latest.values()].map((run) => protocolFacts(run)),
  );
  const hasUnknownProtocols =
    summaryProtocolFacts.unresolvedContributorCount > 0;
  const hasMixedProtocols =
    summaryProtocolFacts.hasKnownHeterogeneity;
  const protocolSummary = protocolLabel(summaryProtocolFacts);

  lines.push(
    "## 🔢 Executive Summary (latest complete partition per category)",
    "",
    "| Metric | Value |",
    "| --- | --- |",
  );
  lines.push(`| Categories with a live run | **${latest.size}** |`);
  lines.push(
    `| Catalog release status | **${catalogReady ? "READY" : "NOT READY"}** |`,
    `| Outcome readiness | **${outcomeReadyCount === allSkillResults.length ? "READY" : "NOT READY"}** |`,
    `| Activation readiness | **${activationReadyCount === allSkillResults.length ? "READY" : "NOT READY"}** |`,
    `| Evidence mode | **${modes.size === 1 ? [...modes][0] : "mixed"}** |`,
    `| Protocol provenance | **${protocolSummary}** |`,
    `| Unresolved protocol contributors | **${summaryProtocolFacts.unresolvedContributorCount}** |`,
    `| Strict outcome-ready skills | **${outcomeReadyCount}/${allSkillResults.length}** |`,
    `| Activation-ready skills | **${activationReadyCount}/${allSkillResults.length}** |`,
    `| Strict release-ready skills | **${strictReadyCount}/${allSkillResults.length}** |`,
  );
  lines.push(
    `| Skills covered (unique category/skill) | **${allSkillResults.length}** |`,
  );
  lines.push(
    `| Avg. baseline case pass rate | **${pct(avg(allSkillResults.map((skill) => skill.casePassRate?.baseline ?? skill.baselinePassRate)))}** |`,
  );
  lines.push(
    `| Avg. with-skill case pass rate | **${pct(avg(allSkillResults.map((skill) => skill.casePassRate?.withSkill ?? skill.withSkillPassRate)))}** |`,
  );
  lines.push(
    `| Avg. delta (valid baselines only) | **${pct(avg(allSkillResults.filter((skill) => !isCompromised(skill, sourceRuns.get(`${skill.category}/${skill.skillName}`))).map((skill) => skill.delta)))}** |`,
  );
  lines.push(
    `| Avg. assertion pass rate | **${pct(avgOrNa(allSkillResults.map((skill) => skill.assertionPassRate?.withSkill)))}** |`,
  );
  const triggerable = [...latest.values()].flatMap((run) =>
    activationEvidenceTrusted(run)
      ? run.skills.filter(
          (skill) =>
            skill.balancedTriggerAccuracy !== null &&
            skill.balancedTriggerAccuracy !== undefined,
        )
      : [],
  );
  lines.push(
    `| Avg. balanced trigger accuracy | **${triggerable.length > 0 ? pctPrecise(avg(triggerable.map((skill) => skill.balancedTriggerAccuracy))) : "n/a"}** (${triggerable.length} skills) |`,
  );
  const triggerGate = triggerable.filter(
    (skill) =>
      typeof skill.triggerRecall === "number" &&
      typeof skill.triggerSpecificity === "number",
  );
  lines.push(
    `| Avg. trigger recall | **${triggerGate.length > 0 ? pctPrecise(avg(triggerGate.map((skill) => skill.triggerRecall as number))) : "n/a"}** |`,
    `| Avg. trigger specificity | **${triggerGate.length > 0 ? pctPrecise(avg(triggerGate.map((skill) => skill.triggerSpecificity as number))) : "n/a"}** |`,
    `| Skills meeting ≥90% recall and specificity | **${triggerGate.filter((skill) => (skill.triggerRecall as number) >= 0.9 && (skill.triggerSpecificity as number) >= 0.9).length}/${triggerGate.length}** |`,
    "",
  );
  if (hasMixedProtocols) {
    lines.push(
      "> ⚠️ **Cross-Protocol Composite Notice**: Current results combine evidence from multiple instruction protocol generations. Aggregate pass rates represent a heterogeneous composite, not a homogeneous comparison.",
      "",
    );
  }
  if (hasUnknownProtocols) {
    lines.push(
      "> ⚠️ **Unresolved Protocol Provenance Notice**: At least one contributing skill has unresolved protocol provenance. This is uncertainty, not evidence that the contributor used a different protocol; protocol-specific aggregate comparisons cannot be certified.",
      "",
    );
  }

  if (history && history.records.length > 0) {
    const physicalRuns = new Map(
      allResults.map((run) => [run.runId, run]),
    );
    lines.push(
      "## 📜 Physical Run History",
      "",
      "| Run | Category | Date | Skills | Baseline | With-Skill | Delta | Evidence | Protocol | Unresolved | Agent |",
      "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
    );
    for (const record of [...history.records].reverse()) {
      const physicalRun = physicalRuns.get(record.runId);
      const facts = physicalRun ? protocolFacts(physicalRun) : undefined;
      const protocol = facts
        ? protocolLabel(facts)
        : (record.protocolProvenance ?? "historical");
      const unresolvedCount = facts
        ? String(facts.unresolvedContributorCount)
        : "unknown";
      lines.push(
        `| \`${record.runId}\` | ${record.category} | ${record.date.split("T")[0]} | ${record.skillCount} | ${pct(record.avgBaselinePassRate)} | ${pct(record.avgWithSkillPassRate)} | ${record.avgDelta >= 0 ? "+" : ""}${pct(record.avgDelta)} | ${record.evidenceMode ?? "unknown"} | ${protocol} | ${unresolvedCount} | ${record.agent ?? "n/a"} |`,
      );
    }
    lines.push("");
  }

  lines.push(
    "## 📦 Per-Category Results (latest complete partition)",
    "",
    "| Category | Run | Scored | Protocol | Skills | Baseline | With-Skill | Delta | Assertions | Trigger Recall | Trigger Specificity | Balanced Trigger |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  );
  for (const [category, run] of [...latest.entries()].sort(([a], [b]) =>
    a.localeCompare(b),
  )) {
    const triggerSkills = activationEvidenceTrusted(run)
      ? run.skills.filter(
          (skill) =>
            skill.balancedTriggerAccuracy !== null &&
            skill.balancedTriggerAccuracy !== undefined,
        )
      : [];
    lines.push(
      `| ${category} | \`${run.runId}\` | ${run.scoredAt.split("T")[0]} | ${resolveCategoryProtocol(run)} | ${run.skills.length} | ${pct(avg(run.skills.map((skill) => skill.casePassRate?.baseline ?? skill.baselinePassRate)))} | ${pct(avg(run.skills.map((skill) => skill.casePassRate?.withSkill ?? skill.withSkillPassRate)))} | ${pct(avg(run.skills.filter((skill) => !isCompromised(skill, run)).map((skill) => skill.delta)))} | ${pct(avgOrNa(run.skills.map((skill) => skill.assertionPassRate?.withSkill)))} | ${pct(avgOrNa(triggerSkills.map((skill) => skill.triggerRecall)))} | ${pct(avgOrNa(triggerSkills.map((skill) => skill.triggerSpecificity)))} | ${pct(avgOrNa(triggerSkills.map((skill) => skill.balancedTriggerAccuracy)))} |`,
    );
  }
  lines.push("");

  lines.push(
    "## 📋 Per-Skill Detail (latest complete partition per category)",
    "",
    "| Skill | Category | Protocol | Baseline Cases | With-Skill Cases | Delta | With-Skill Assertions | Recall | Specificity | Balanced | Guardrail |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
  );
  for (const skill of [...allSkillResults].sort(
    (a, b) =>
      a.category.localeCompare(b.category) ||
      a.skillName.localeCompare(b.skillName),
  )) {
    const sourceRun = latest.get(skill.category);
    const trustedActivation = sourceRun
      ? activationEvidenceTrusted(sourceRun)
      : false;
    lines.push(
      `| \`${skill.skillName}\` | ${skill.category} | ${resolveSkillProtocol(skill, sourceRun)} | ${pct(skill.casePassRate?.baseline ?? skill.baselinePassRate)} | ${pct(skill.casePassRate?.withSkill ?? skill.withSkillPassRate)} | ${displayDelta(skill, sourceRun)} | ${pct(skill.assertionPassRate?.withSkill)} | ${trustedActivation ? pct(skill.triggerRecall) : "n/a"} | ${trustedActivation ? pct(skill.triggerSpecificity ?? skill.triggerPrecision) : "n/a"} | ${trustedActivation ? pct(skill.balancedTriggerAccuracy) : "n/a"} | ${skill.guardrailApplicable ? "yes" : "no"} |`,
    );
  }
  lines.push("");


  const notReadySkills = allSkillResults.flatMap((skill) => {
    const run = sourceRuns.get(`${skill.category}/${skill.skillName}`);
    const result = evaluateSkillReadiness(skill, {
      compromised: isCompromised(skill, run),
      activationEvidenceTrusted: run ? activationEvidenceTrusted(run) : false,
    });
    return result.ready ? [] : [{ skill, result }];
  });
  if (notReadySkills.length > 0) {
    lines.push(
      "## 🚫 Skills Below Strict Release Gate",
      "",
      "These skills are not release-ready. Trigger accuracy alone does not make them ready.",
      "",
      "| Skill | Category | Failures |",
      "| --- | --- | --- |",
    );
    for (const { skill, result } of notReadySkills) {
      lines.push(
        `| \`${skill.skillName}\` | ${skill.category} | ${result.failures.join("; ")} |`,
      );
    }
    lines.push("");

    const residualFailures = notReadySkills
      .flatMap(({ skill }) =>
        skill.scores
          .filter(
            (score) =>
              score.arm !== "baseline" &&
              !score.passed &&
              score.failedAssertions.length > 0,
          )
          .map((score) => ({ skill, score })),
      )
      .sort(
        (a, b) =>
          a.skill.category.localeCompare(b.skill.category) ||
          a.skill.skillName.localeCompare(b.skill.skillName) ||
          a.score.id.localeCompare(b.score.id),
      );
    if (residualFailures.length > 0) {
      lines.push(
        "## 🧭 Residual Failure Matrix",
        "",
        "This matrix records every failed non-baseline transcript arm for a skill below the strict gate. It is diagnostic evidence only; it does not alter immutable scores.",
        "",
        "| Skill | Category | Case | Arm | Failed assertions |",
        "| --- | --- | --- | --- | --- |",
      );
      for (const { skill, score } of residualFailures) {
        lines.push(
          `| \`${markdownCell(skill.skillName)}\` | ${skill.category} | \`${markdownCell(score.id)}\` | ${score.arm} | ${markdownCell(score.failedAssertions.join("; "))} |`,
        );
      }
      lines.push("");
    }
  }

  const negativeDelta = allSkillResults.filter(
    (skill) =>
      !isCompromised(
        skill,
        sourceRuns.get(`${skill.category}/${skill.skillName}`),
      ) &&
      typeof skill.delta === "number" &&
      skill.delta < 0,
  );
  if (negativeDelta.length > 0) {
    lines.push(
      "## ⚠️ Skills Where With-Skill Underperformed Baseline",
      "",
      "| Skill | Category | Delta |",
      "| --- | --- | --- |",
    );
    for (const skill of negativeDelta)
      lines.push(
        `| \`${skill.skillName}\` | ${skill.category} | ${pct(skill.delta)} |`,
      );
    lines.push("");
  }

  lines.push(
    "## 🛡️ How to Verify This Report",
    "",
    "1. `pnpm evals:verify -- --all` — re-score committed transcripts from each run's immutable `inputs.json` snapshot.",
    "2. `pnpm evals:report` — regenerate the deterministic category projection, history, and archive.",
    "3. Root, CLI, and MCP verification must report the same result for the same run.",
    "",
  );
  return lines.join("\n");
}

export function generateReport(): void {
  const allResults = loadAllResults();
  const history = syncHistoryAndArchive(allResults);
  fs.outputFileSync(
    EVALS_REPORT_MD,
    buildEvalsReportMarkdown(allResults, history),
  );
}

export function generateRunReport(runId: string): string {
  const runDir = path.join(RUNS_DIR, runId);
  const resultsPath = path.join(runDir, RESULTS_FILENAME);
  if (!fs.existsSync(resultsPath))
    throw new Error(`No committed results.json for run ${runId}`);
  const results = fs.readJSONSync(resultsPath) as RunResults;
  const reportPath = path.join(runDir, "report.md");
  fs.outputFileSync(
    reportPath,
    buildEvalsReportMarkdown([results], undefined, {
      includeSelective: true,
    }),
  );
  return reportPath;
}
