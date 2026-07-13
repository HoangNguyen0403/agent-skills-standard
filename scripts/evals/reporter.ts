import fs from "fs-extra";
import * as path from "path";
import {
  ARCHIVE_DIR,
  EVALS_REPORT_MD,
  HISTORY_JSON,
  RESULTS_FILENAME,
  ROOT_DIR,
  RUNS_DIR,
  KNOWN_COMPROMISED_BASELINES,
} from "./constants";
import { answerPath, loadManifest } from "./manifest";
import {
  EvalsHistory,
  EvalsHistoryRecord,
  RunResults,
  SkillResult,
} from "./types";

function numericMetric(
  value: number | "n/a" | null | undefined,
): number | null {
  return typeof value === "number" ? value : null;
}

function pct(value: number | "n/a" | null | undefined): string {
  if (value === "n/a" || value === null || value === undefined) return "n/a";
  return `${Math.round(value * 100)}%`;
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
    if (known.has(run.runId)) continue;
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

function isCompromised(skill: SkillResult): boolean {
  return KNOWN_COMPROMISED_BASELINES.some(
    (record) =>
      record.category === skill.category &&
      record.skillName === skill.skillName,
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

function displayDelta(skill: SkillResult): string {
  if (isCompromised(skill)) return "n/a";
  return pct(skill.delta);
}

export function buildEvalsReportMarkdown(
  allResults: RunResults[],
  history?: EvalsHistory,
): string {
  const lines: string[] = [
    "# 🧪 Live Skill Evals Report",
    "",
    `> Generated: ${new Date().toISOString()}`,
    "> Measured, not structural: outcome assertions are evaluated against immutable run inputs. Baseline and with-skill arms are generated in isolated workers; trigger arms receive only the skill name and description.",
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

  const latest = latestPerCategory(allResults);
  const allSkillResults = [...latest.values()].flatMap((run) => run.skills);
  lines.push(
    "## 🔢 Executive Summary (latest complete partition per category)",
    "",
    "| Metric | Value |",
    "| --- | --- |",
  );
  lines.push(`| Categories with a live run | **${latest.size}** |`);
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
    `| Avg. delta (valid baselines only) | **${pct(avg(allSkillResults.filter((skill) => !isCompromised(skill)).map((skill) => skill.delta)))}** |`,
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
    `| Avg. balanced trigger accuracy | **${triggerable.length > 0 ? pct(avg(triggerable.map((skill) => skill.balancedTriggerAccuracy))) : "n/a"}** (${triggerable.length} skills) |`,
    "",
  );

  if (history && history.records.length > 0) {
    lines.push(
      "## 📜 Physical Run History",
      "",
      "| Run | Category | Date | Skills | Baseline | With-Skill | Delta | Agent |",
      "| --- | --- | --- | --- | --- | --- | --- | --- |",
    );
    for (const record of [...history.records].reverse()) {
      lines.push(
        `| \`${record.runId}\` | ${record.category} | ${record.date.split("T")[0]} | ${record.skillCount} | ${pct(record.avgBaselinePassRate)} | ${pct(record.avgWithSkillPassRate)} | ${record.avgDelta >= 0 ? "+" : ""}${pct(record.avgDelta)} | ${record.agent ?? "n/a"} |`,
      );
    }
    lines.push("");
  }

  lines.push(
    "## 📦 Per-Category Results (latest complete partition)",
    "",
    "| Category | Run | Scored | Skills | Baseline | With-Skill | Delta | Assertions | Trigger Recall | Trigger Specificity | Balanced Trigger |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
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
      `| ${category} | \`${run.runId}\` | ${run.scoredAt.split("T")[0]} | ${run.skills.length} | ${pct(avg(run.skills.map((skill) => skill.casePassRate?.baseline ?? skill.baselinePassRate)))} | ${pct(avg(run.skills.map((skill) => skill.casePassRate?.withSkill ?? skill.withSkillPassRate)))} | ${pct(avg(run.skills.filter((skill) => !isCompromised(skill)).map((skill) => skill.delta)))} | ${pct(avgOrNa(run.skills.map((skill) => skill.assertionPassRate?.withSkill)))} | ${pct(avgOrNa(triggerSkills.map((skill) => skill.triggerRecall)))} | ${pct(avgOrNa(triggerSkills.map((skill) => skill.triggerSpecificity)))} | ${pct(avgOrNa(triggerSkills.map((skill) => skill.balancedTriggerAccuracy)))} |`,
    );
  }
  lines.push("");

  lines.push(
    "## 📋 Per-Skill Detail (latest complete partition per category)",
    "",
    "| Skill | Category | Baseline Cases | With-Skill Cases | Delta | With-Skill Assertions | Recall | Specificity | Balanced | Guardrail |",
    "| --- | --- | --- | --- | --- | --- | --- | --- | --- | --- |",
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
      `| \`${skill.skillName}\` | ${skill.category} | ${pct(skill.casePassRate?.baseline ?? skill.baselinePassRate)} | ${pct(skill.casePassRate?.withSkill ?? skill.withSkillPassRate)} | ${displayDelta(skill)} | ${pct(skill.assertionPassRate?.withSkill)} | ${trustedActivation ? pct(skill.triggerRecall) : "n/a"} | ${trustedActivation ? pct(skill.triggerSpecificity ?? skill.triggerPrecision) : "n/a"} | ${trustedActivation ? pct(skill.balancedTriggerAccuracy) : "n/a"} | ${skill.guardrailApplicable ? "yes" : "no"} |`,
    );
  }
  lines.push("");

  const negativeDelta = allSkillResults.filter(
    (skill) =>
      !isCompromised(skill) &&
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
