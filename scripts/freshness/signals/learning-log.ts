// scripts/freshness/signals/learning-log.ts
import fs from "fs-extra";
import path from "path";
import { daysBetween } from "../audit";
import type { FreshnessIssue } from "../types";

/** One `## Agent Learning Log: Iteration #N` block. */
export interface LearningLogEntry {
  iteration: number;
  /** YYYY-MM-DD from the `**Date**:` line, or "" when missing. */
  date: string;
  task: string;
  signal: string;
  /** `category/skill` ids this entry concerns (explicit line ∪ known mentions). */
  skills: string[];
  /** 1-based line of the heading. */
  line: number;
}

/** Repo-relative path of the log. */
export const LEARNING_LOG_PATH = "AGENTS_LEARNING.md";

const HEADING_RE = /^## Agent Learning Log: Iteration #(\d+)\s*$/;
const DATE_RE =
  /^\*\*Date\*\*:\s*(\d{4}-\d{2}-\d{2})(?:\s*\|\s*\*\*Task\*\*:\s*(.*?))?(?:\s*\|\s*\*\*Signal\*\*.*)?$/;
const SIGNAL_RE = /^\*\*Signal\*\*:\s*(.+?)\s*$/;
const SKILLS_RE = /^\*\*Skills\*\*:\s*(.+?)\s*$/;
const SKILL_ID_RE = /[a-z0-9-]+\/[a-z0-9-]+/g;
/** An explicit `**Skills**:` id must look exactly like `category/skill`. */
const SKILL_ID_EXACT = /^[a-z0-9-]+\/[a-z0-9-]+$/;
/** Strips HTML comments (e.g. the template's inline hint) before parsing a line. */
const HTML_COMMENT_RE = /<!--[\s\S]*?-->/g;

/** Any leftover comment delimiter fragment once well-formed comments are gone. */
const STRAY_COMMENT_DELIMITER_RE = /<!--|-->/g;

/**
 * Removes every HTML comment. A single `.replace` pass can leave a stray
 * `<!--` behind on malformed or adjacent comments (e.g. removing the inner
 * comment in `<!<!---->--` reassembles a new, unterminated `<!--`), so this
 * first re-scans to a fixed point and then strips any remaining bare
 * delimiter fragment — the line is for parsing headings/ids, never
 * rendered, so no partial delimiter needs to survive either way.
 */
function stripHtmlComments(text: string): string {
  let stripped = text;
  let previous: string;
  do {
    previous = stripped;
    stripped = stripped.replace(HTML_COMMENT_RE, "");
  } while (stripped !== previous);
  return stripped.replace(STRAY_COMMENT_DELIMITER_RE, "");
}

/** Reads AGENTS_LEARNING.md; null when the repo has none. */
export function readLearningLog(repoRoot: string): string | null {
  const file = path.join(repoRoot, LEARNING_LOG_PATH);
  return fs.existsSync(file) ? fs.readFileSync(file, "utf8") : null;
}

/**
 * Splits the log into iterations. Skills are collected from an explicit
 * `**Skills**:` line and from any `category/skill` token in the body
 * that names a skill in `knownSkills` (so older entries count too).
 * Explicit ids are kept only when they name a known skill; unknown or
 * malformed ids are reported via `onUnknown` and otherwise ignored.
 */
export function parseLearningLog(
  text: string,
  knownSkills: ReadonlySet<string>,
  onUnknown: (id: string, line: number) => void = () => {},
): LearningLogEntry[] {
  const lines = text.split(/\r?\n/);
  const entries: LearningLogEntry[] = [];
  let current: LearningLogEntry | null = null;
  const add = (entry: LearningLogEntry, id: string) => {
    if (!entry.skills.includes(id)) entry.skills.push(id);
  };
  lines.forEach((raw, index) => {
    const line = stripHtmlComments(raw).trimEnd();
    const heading = line.match(HEADING_RE);
    if (heading) {
      current = { iteration: Number(heading[1]), date: "", task: "", signal: "", skills: [], line: index + 1 };
      entries.push(current);
      return;
    }
    if (!current) return;
    const date = line.match(DATE_RE);
    if (date) {
      current.date = date[1];
      current.task = (date[2] ?? "").trim();
      return;
    }
    const signal = line.match(SIGNAL_RE);
    if (signal) {
      current.signal = signal[1];
      return;
    }
    const explicit = line.match(SKILLS_RE);
    if (explicit) {
      for (const id of explicit[1].split(",").map((s) => s.trim()).filter(Boolean)) {
        if (!SKILL_ID_EXACT.test(id) || !knownSkills.has(id)) {
          onUnknown(id, index + 1);
          continue;
        }
        add(current, id);
      }
      return;
    }
    for (const id of line.match(SKILL_ID_RE) ?? []) {
      if (knownSkills.has(id)) add(current, id);
    }
  });
  return entries;
}

interface LearningLogOptions {
  today: Date;
  /** Entries older than this many days are ignored. */
  windowDays: number;
}

/** One low issue per skill named by at least one entry inside the window. */
export function learningLogIssues(entries: LearningLogEntry[], options: LearningLogOptions): FreshnessIssue[] {
  const bySkill = new Map<string, { iterations: number[]; line: number }>();
  for (const entry of entries) {
    if (!entry.date || daysBetween(entry.date, options.today) > options.windowDays) continue;
    for (const id of entry.skills) {
      const hit = bySkill.get(id);
      if (hit) hit.iterations.push(entry.iteration);
      else bySkill.set(id, { iterations: [entry.iteration], line: entry.line });
    }
  }
  const issues: FreshnessIssue[] = [];
  for (const [id, { iterations, line }] of bySkill) {
    const slash = id.indexOf("/");
    issues.push({
      type: "learning-log-gap",
      severity: "low",
      category: id.slice(0, slash),
      skillName: id.slice(slash + 1),
      message: `${iterations.length} learning-log entr${iterations.length === 1 ? "y" : "ies"} in the last ${options.windowDays} days name this skill (${iterations.map((n) => `#${n}`).join(", ")})`,
      file: LEARNING_LOG_PATH,
      line,
    });
  }
  return issues;
}
