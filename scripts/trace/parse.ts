// scripts/trace/parse.ts
import fs from "fs";
import path from "path";
import {
  ID_GRAMMAR,
  QUALIFIED_ID_GRAMMAR,
  QUALIFIED_NAMESPACE_GRAMMAR,
  type IdKind,
  type SlugTrace,
  type SourceMapping,
  type TraceRef,
} from "./types";

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
const SRS_ARTIFACT_SUFFIXES = ["-evaluation"] as const;

/** Strips a known SRS artifact-kind prefix or suffix so the file joins its feature's slug. */
function slugFromFilenameTail(tail: string): string {
  for (const prefix of SRS_ARTIFACT_PREFIXES) {
    if (tail.startsWith(prefix)) return tail.slice(prefix.length);
  }
  for (const suffix of SRS_ARTIFACT_SUFFIXES) {
    if (tail.endsWith(suffix)) return tail.slice(0, -suffix.length);
  }
  return tail;
}

/** Captures complete reserved-prefix candidates, including malformed separator runs. */
const TOKEN_RE = /\b(BRD-OBJ|REQ|AC|SRS)(?:-[A-Za-z0-9]+|--+[A-Za-z0-9-]*)+/g;

/** Captures the same complete candidate at the beginning of a field value. */
const ID_TOKEN_AT_START_RE = /^(BRD-OBJ|REQ|AC|SRS)(?:-[A-Za-z0-9]+|--+[A-Za-z0-9-]*)+/;


/**
 * Bold standalone ID field label, e.g. `**Objective ID**:`, `**AC ID**`,
 * `**ID**:`. `ID` must be its own word *inside* the bold span, so hyphenated
 * prose (`**duplicate-id**`) is not a label.
 */
const ID_FIELD_LABEL_RE = /\*\*(?:[^*]*\s)?ID\s*:?\s*\*\*/i;

/** Inline markup a field value may be wrapped in before the id token (`**`, `` ` ``, `_`, `"`). */
const VALUE_MARKUP_RE = /^[`*_'"[\]()]*/;


/**
 * Index of the ID-shaped value that immediately follows an ID field label, or
 * `undefined` when the line has no label, the label is not standalone, or
 * descriptive words separate the label from any later token.
 */
function idFieldValueStart(line: string): number | undefined {
  const label = ID_FIELD_LABEL_RE.exec(line);
  if (!label) return undefined;
  let start = label.index + label[0].length;
  const separator = /^\s*:?\s*/.exec(line.slice(start));
  if (separator) start += separator[0].length;
  const markup = VALUE_MARKUP_RE.exec(line.slice(start));
  if (markup) start += markup[0].length;
  const value = ID_TOKEN_AT_START_RE.exec(line.slice(start));
  return value && value.index === 0 ? start : undefined;
}
/**
 * Splits a `| a | b | c |` row into trimmed cells. Returns `undefined` for
 * non-table lines and for header-separator rows (`| --- | --- |`).
 */
function tableCells(line: string): string[] | undefined {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return undefined;
  const inner = trimmed.slice(1, -1);
  const rawCells = inner.split("|").map((c) => c.trim());
  if (rawCells.every((c) => /^:?-+:?$/.test(c))) return undefined; // header separator
  return rawCells;
}

function isSeparatorRow(line: string | undefined): boolean {
  if (!line) return false;
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return false;
  const inner = trimmed.slice(1, -1);
  const cells = inner.split("|").map((c) => c.trim());
  return cells.length > 0 && cells.every((c) => /^:?-+:?$/.test(c));
}

interface TableColumnInfo {
  formalCol?: number;
  sourceCol?: number;
}

function parseTableHeader(headerLine: string): TableColumnInfo {
  const cells = tableCells(headerLine) ?? [];
  let formalCol: number | undefined;
  let sourceCol: number | undefined;

  for (let c = 0; c < cells.length; c++) {
    const header = cells[c].toLowerCase();
    if (/^(req|ac|srs|brd(-obj)?)\s*(id)?$/i.test(header) || header === "id" || header === "requirement id") {
      if (formalCol === undefined) formalCol = c;
    } else if (/^candidate\s+requirement$/i.test(header) || /^source(\s+group)?$/i.test(header)) {
      sourceCol = c;
    }
  }
  return { formalCol, sourceCol };
}

/** Cell text and absolute line offsets for occurrence-level table classification. */
function tableCellSpans(line: string): { text: string; start: number; end: number }[] | undefined {
  const trimmed = line.trim();
  if (!trimmed.startsWith("|") || !trimmed.endsWith("|")) return undefined;
  const spans: { text: string; start: number; end: number }[] = [];
  let start = line.indexOf("|") + 1;
  while (start < line.length) {
    const separator = line.indexOf("|", start);
    if (separator < 0) break;
    const raw = line.slice(start, separator);
    const leading = raw.length - raw.trimStart().length;
    const text = raw.trim();
    spans.push({ text, start: start + leading, end: start + leading + text.length });
    start = separator + 1;
  }
  return spans;
}


/** Scans one file's lines (fenced code blocks skipped) into raw token occurrences. */
function scanFile(content: string, fromFile: string): { refs: TraceRef[]; mappings: SourceMapping[] } {
  const refs: TraceRef[] = [];
  const mappings: SourceMapping[] = [];
  const lines = content.split(/\r?\n/);
  let inFence = false;
  let currentTable: TableColumnInfo | null = null;

  for (let i = 0; i < lines.length; i++) {
    const line = lines[i];
    const lineNo = i + 1;

    if (/^\s*```/.test(line)) {
      inFence = !inFence;
      currentTable = null;
      continue;
    }
    if (inFence) continue;

    const trimmed = line.trim();
    const isTableRow = trimmed.startsWith("|") && trimmed.endsWith("|");
    if (isTableRow) {
      if (isSeparatorRow(line)) {
        // Separator row: header was previous line
        continue;
      }
      if (isSeparatorRow(lines[i + 1])) {
        // This line is a table header
        currentTable = parseTableHeader(line);
        continue;
      }
    } else {
      currentTable = null;
    }

    const headingMarker = line.match(/^#{1,6}\s+/);
    const headingStart = headingMarker ? headingMarker[0].length : undefined;
    const idFieldStart = idFieldValueStart(line);
    const bulletLeadMatch = line.match(/^\s*[-*]\s+\*\*([A-Za-z0-9_-]+)/);
    const bulletLeadId = bulletLeadMatch ? bulletLeadMatch[1] : undefined;
    const rowCellSpans = isTableRow ? tableCellSpans(line) : undefined;
    const rowCells = rowCellSpans?.map((span) => span.text);

    // If this row has both formal and source columns, extract source mappings
    if (currentTable && currentTable.formalCol !== undefined && currentTable.sourceCol !== undefined && rowCells) {
      const formalCell = rowCells[currentTable.formalCol] ?? "";
      const sourceCell = rowCells[currentTable.sourceCol] ?? "";

      TOKEN_RE.lastIndex = 0;
      const formalTokens: { id: string; kind: IdKind }[] = [];
      let m: RegExpExecArray | null;
      while ((m = TOKEN_RE.exec(formalCell))) {
        const k = (m[0].startsWith("BRD-OBJ-") ? "BRD-OBJ" : m[1]) as IdKind;
        formalTokens.push({ id: m[0], kind: k });
      }

      TOKEN_RE.lastIndex = 0;
      const sourceTokens: { id: string; kind: IdKind }[] = [];
      while ((m = TOKEN_RE.exec(sourceCell))) {
        const k = (m[0].startsWith("BRD-OBJ-") ? "BRD-OBJ" : m[1]) as IdKind;
        sourceTokens.push({ id: m[0], kind: k });
      }

      for (const f of formalTokens) {
        for (const s of sourceTokens) {
          if ((s.kind !== "REQ" && s.kind !== "AC") || /^(?:REQ|AC)-\d/.test(s.id)) continue;
          mappings.push({
            sourceId: s.id,
            sourceKind: s.kind,
            formalId: f.id,
            formalKind: f.kind,
            fromFile,
            line: lineNo,
          });
        }
      }
    }

    TOKEN_RE.lastIndex = 0;
    let match: RegExpExecArray | null;
    while ((match = TOKEN_RE.exec(line))) {
      const id = match[0];
      const kind = (id.startsWith("BRD-OBJ-") ? "BRD-OBJ" : match[1]) as IdKind;
      const isFormal = ID_GRAMMAR[kind]?.test(id) ?? false;
      const isQualifiedId = QUALIFIED_ID_GRAMMAR[kind]?.test(id) ?? false;
      const isQualifiedNs = QUALIFIED_NAMESPACE_GRAMMAR[kind]?.test(id) ?? false;

      let role: "declaration" | "reference" = "reference";
      let weak = false;
      let isMappedSource = false;
      if (headingStart !== undefined && match.index === headingStart) {
        role = "declaration";
      } else if (idFieldStart !== undefined && match.index === idFieldStart) {
        role = "declaration";
      } else if (bulletLeadId && match.index === line.indexOf(bulletLeadId)) {
        role = "declaration";
      } else if (currentTable && currentTable.formalCol !== undefined && rowCellSpans) {
        const formalSpan = rowCellSpans[currentTable.formalCol];
        const sourceSpan = currentTable.sourceCol === undefined ? undefined : rowCellSpans[currentTable.sourceCol];
        if (formalSpan && match.index >= formalSpan.start && match.index + id.length <= formalSpan.end) {
          role = "declaration";
          weak = true;
        }
        if (sourceSpan && match.index >= sourceSpan.start && match.index + id.length <= sourceSpan.end) {
          isMappedSource = (kind === "REQ" || kind === "AC") && !/^(?:REQ|AC)-\d/.test(id);
        }
      } else if (
        currentTable &&
        currentTable.formalCol === undefined &&
        currentTable.sourceCol !== undefined &&
        rowCellSpans
      ) {
        const sourceSpan = rowCellSpans[currentTable.sourceCol];
        if (sourceSpan && match.index >= sourceSpan.start && match.index + id.length <= sourceSpan.end) {
          role = "declaration";
          weak = true;
          isMappedSource = (kind === "REQ" || kind === "AC") && !/^(?:REQ|AC)-\d/.test(id);
        }
      } else {
        const firstCell = rowCellSpans?.[0];
        if (
          firstCell &&
          firstCell.text === id &&
          match.index >= firstCell.start &&
          match.index + id.length <= firstCell.end
        ) {
          role = "declaration";
          weak = true;
        }
      }

      // Declarations and mapped rows require canonical >=3-digit terminal suffix
      // Prose references can reference declared qualified namespace prefixes (e.g. REQ-DISC)
      const valid =
        role === "declaration" || isMappedSource
          ? isFormal || isQualifiedId
          : isFormal || isQualifiedId || isQualifiedNs;
      const qualified = (isQualifiedId || (!isMappedSource && role === "reference" && isQualifiedNs)) && !isFormal;

      refs.push({ id, kind, fromFile, line: lineNo, role, weak, valid, qualified });
    }
  }

  return { refs, mappings };
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
  const bySlug = new Map<string, { files: Set<string>; refs: TraceRef[]; mappings: SourceMapping[] }>();

  for (const dir of SOURCE_DIRS) {
    const absDir = path.join(root, dir);
    for (const filename of listMarkdownFiles(absDir)) {
      const match = filename.match(FILENAME_RE);
      if (!match) continue;
      const slug = match[1] === "srs" ? slugFromFilenameTail(match[2]) : match[2];
      const relFile = path.join(dir, filename);
      const content = fs.readFileSync(path.join(absDir, filename), "utf8");
      const scanResult = scanFile(content, relFile);

      let entry = bySlug.get(slug);
      if (!entry) {
        entry = { files: new Set(), refs: [], mappings: [] };
        bySlug.set(slug, entry);
      }
      entry.files.add(relFile);
      entry.refs.push(...scanResult.refs);
      entry.mappings.push(...scanResult.mappings);
    }
  }

  const slugs: SlugTrace[] = [];
  for (const [slug, entry] of [...bySlug.entries()].sort((a, b) => a[0].localeCompare(b[0]))) {
    // Demote table cells that restate IDs already declared by headings/idFields
    const strong = new Set<string>();
    for (const ref of entry.refs) {
      if (ref.role === "declaration" && !ref.weak && ref.valid) strong.add(`${ref.kind}:${ref.id}`);
    }
    for (const ref of entry.refs) {
      if (ref.role !== "declaration" || !ref.weak || !ref.valid) continue;
      if (strong.has(`${ref.kind}:${ref.id}`)) ref.role = "reference";
    }

    const declared = new Map<IdKind, Set<string>>();
    const sourceDeclared = new Map<IdKind, Set<string>>();
    for (const ref of entry.refs) {
      if (ref.role !== "declaration" || !ref.valid) continue;
      if (ref.qualified) {
        if (!sourceDeclared.has(ref.kind)) sourceDeclared.set(ref.kind, new Set());
        sourceDeclared.get(ref.kind)!.add(ref.id);
      } else {
        if (!declared.has(ref.kind)) declared.set(ref.kind, new Set());
        declared.get(ref.kind)!.add(ref.id);
      }
    }

    slugs.push({
      slug,
      files: [...entry.files].sort(),
      declared,
      sourceDeclared,
      sourceMappings: entry.mappings,
      references: entry.refs,
    });
  }
  return slugs;
}

/** True when neither `docs/brd/` nor `docs/prd/` exists under `root`. */
export function hasNoRequirementSources(root: string): boolean {
  return !fs.existsSync(path.join(root, "docs/brd")) && !fs.existsSync(path.join(root, "docs/prd"));
}
