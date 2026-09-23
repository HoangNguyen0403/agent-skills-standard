// scripts/trace/parse.ts
import fs from "fs";
import path from "path";
import { ID_GRAMMAR, type IdKind, type SlugTrace, type TraceRef } from "./types";

/** Sub-directories scanned under the repo/fixture root, in scan order. */
const SOURCE_DIRS = ["docs/brd", "docs/prd", "docs/srs"] as const;

/** Matches `brd-<slug>.md`, `prd-<slug>.md`, `srs-<slug>.md`. */
const FILENAME_RE = /^(brd|prd|srs)-(.+)\.md$/;

/**
 * Slug-scoped SRS artifact kinds. `srs-task-list-<slug>.md` and
 * `srs-walkthrough-<slug>.md` belong to `<slug>`; without this they would each
 * mint a phantom slug (`task-list-<slug>`) whose ids all dangle.
 */
const SRS_ARTIFACT_PREFIXES = ["task-list-", "walkthrough-"] as const;

/** Strips a known SRS artifact-kind prefix so the file joins its feature's slug. */
function slugFromFilenameTail(tail: string): string {
  for (const prefix of SRS_ARTIFACT_PREFIXES) {
    if (tail.startsWith(prefix)) return tail.slice(prefix.length);
  }
  return tail;
}

/** ID-shaped token: known prefix, hyphen, alphanumeric suffix (grammar checked separately). */
const TOKEN_RE = /\b(BRD-OBJ|REQ|AC|SRS)-([A-Za-z0-9]+)\b/g;

/**
 * Splits a `| a | b | c |` row into trimmed cells. Returns `undefined` for
 * non-table lines and for header-separator rows (`| --- | --- |`).
 */
function tableCells(line: string): string[] | undefined {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return undefined;
  const inner = trimmed.slice(1, -1);
  const cells = inner.split("|").map((c) => c.trim());
  if (cells.every((c) => /^:?-+:?$/.test(c))) return undefined;
  return cells;
}

/** Span of the first cell's content within `line` (best-effort, for role classification). */
function firstCellSpan(line: string): { text: string; start: number; end: number } | undefined {
  const cells = tableCells(line);
  if (!cells || cells.length === 0) return undefined;
  const start = line.indexOf("|") + 1;
  const nextBar = line.indexOf("|", start);
  const end = nextBar === -1 ? line.length : nextBar;
  return { text: cells[0], start, end };
}

/** Scans one file's lines (fenced code blocks skipped) into raw token occurrences. */
function scanFile(content: string, fromFile: string): TraceRef[] {
  const refs: TraceRef[] = [];
  const lines = content.split(/\r?\n/);
  let inFence = false;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      continue;
    }
    if (inFence) continue;

    const headingMarker = line.match(/^#{1,6}\s+/);
    const headingStart = headingMarker ? headingMarker[0].length : undefined;
    const idField = /\*\*[^*]*\bID\b[^*]*\*\*\s*:?/i.test(line);
    const cellSpan = firstCellSpan(line);

    TOKEN_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    let seenFirstOnLine = false;
    while ((match = TOKEN_RE.exec(line))) {
      const kind = match[1] as IdKind;
      const id = `${match[1]}-${match[2]}`;
      const valid = ID_GRAMMAR[kind].test(id);

      let role: "declaration" | "reference" = "reference";
      let weak = false;
      if (headingStart !== undefined && match.index === headingStart) {
        role = "declaration";
      } else if (idField && !seenFirstOnLine) {
        role = "declaration";
      } else if (cellSpan && cellSpan.text === id && match.index >= cellSpan.start && match.index < cellSpan.end) {
        // A trace-matrix row restates ids declared elsewhere; only treat this as
        // a declaration if no stronger declaration exists (resolved in parseRepo).
        role = "declaration";
        weak = true;
      }
      seenFirstOnLine = true;

      refs.push({ id, kind, fromFile, line: lineNo, role, weak, valid });
    }
  }

  return refs;
}

/** Recursively lists `.md` files directly under `dir` (non-recursive by design: docs/{brd,prd,srs} are flat). */
function listMarkdownFiles(dir: string): string[] {
  if (!fs.existsSync(dir)) return [];
  return fs
    .readdirSync(dir, { withFileTypes: true })
    .filter((d) => d.isFile() && d.name.endsWith(".md"))
    .map((d) => d.name)
    .sort();
}

/**
 * Scans `docs/brd/`, `docs/prd/`, `docs/srs/` under `root` for `*-<slug>.md`
 * files and returns one `SlugTrace` per discovered slug, sorted by slug.
 * Missing source directories are skipped (fail-open on absence).
 */
export function parseRepo(root: string): SlugTrace[] {
  const bySlug = new Map<string, { files: Set<string>; refs: TraceRef[] }>();

  for (const dir of SOURCE_DIRS) {
    const absDir = path.join(root, dir);
    for (const filename of listMarkdownFiles(absDir)) {
      const match = filename.match(FILENAME_RE);
      if (!match) continue;
      const slug = match[1] === "srs" ? slugFromFilenameTail(match[2]) : match[2];
      const relFile = path.join(dir, filename);
      const content = fs.readFileSync(path.join(absDir, filename), "utf8");
      const refs = scanFile(content, relFile);

      let entry = bySlug.get(slug);
      if (!entry) {
        entry = { files: new Set(), refs: [] };
        bySlug.set(slug, entry);
      }
      entry.files.add(relFile);
      entry.refs.push(...refs);
    }
  }

  const slugs: SlugTrace[] = [];
  for (const [slug, entry] of [...bySlug.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    // A trace matrix restates ids that a heading or an **ID** field already
    // declared, so those table cells are references, not second declarations.
    // Demotion requires an existing strong declaration: a PRD's requirements
    // table is itself the declaration site, so two rows for the same id there
    // must still raise duplicate-id.
    const strong = new Set<string>();
    for (const ref of entry.refs) {
      if (ref.role === "declaration" && !ref.weak && ref.valid) strong.add(`${ref.kind}:${ref.id}`);
    }
    for (const ref of entry.refs) {
      if (ref.role !== "declaration" || !ref.weak || !ref.valid) continue;
      if (strong.has(`${ref.kind}:${ref.id}`)) ref.role = "reference";
    }

    const declared = new Map<IdKind, Set<string>>();
    for (const ref of entry.refs) {
      if (ref.role !== "declaration" || !ref.valid) continue;
      if (!declared.has(ref.kind)) declared.set(ref.kind, new Set());
      declared.get(ref.kind)!.add(ref.id);
    }
    slugs.push({
      slug,
      files: [...entry.files].sort(),
      declared,
      references: entry.refs,
    });
  }
  return slugs;
}

/** True when neither `docs/brd/` nor `docs/prd/` exists under `root`. */
export function hasNoRequirementSources(root: string): boolean {
  return !fs.existsSync(path.join(root, "docs/brd")) && !fs.existsSync(path.join(root, "docs/prd"));
}
