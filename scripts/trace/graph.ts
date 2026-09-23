// scripts/trace/graph.ts
import type { IdKind, SlugTrace, TraceRef } from "./types";

export type IssueCode =
  | "duplicate-id"
  | "dangling-ref"
  | "orphan-req"
  | "orphan-ac"
  | "unlinked-req"
  | "malformed-id"
  | "slug-file-mismatch";

export type IssueSeverity = "error" | "warn";

export interface TraceIssue {
  code: IssueCode;
  severity: IssueSeverity;
  slug: string;
  id?: string;
  file?: string;
  line?: number;
  message: string;
}

const SEVERITY_BY_CODE: Record<IssueCode, IssueSeverity> = {
  "duplicate-id": "error",
  "dangling-ref": "error",
  "orphan-req": "error",
  "orphan-ac": "error",
  "unlinked-req": "warn",
  "malformed-id": "error",
  "slug-file-mismatch": "warn",
};

function issue(code: IssueCode, slug: string, extra: Omit<TraceIssue, "code" | "severity" | "slug">): TraceIssue {
  return { code, severity: SEVERITY_BY_CODE[code], slug, ...extra };
}

/** Declaration-role, valid refs for `kind`, grouped by id, in first-seen order. */
function declarationsByKind(refs: TraceRef[], kind: IdKind): Map<string, TraceRef[]> {
  const groups = new Map<string, TraceRef[]>();
  for (const ref of refs) {
    if (ref.kind !== kind || ref.role !== "declaration" || !ref.valid) continue;
    const group = groups.get(ref.id);
    if (group) group.push(ref);
    else groups.set(ref.id, [ref]);
  }
  return groups;
}

/** duplicate-id: same (kind, id) declared more than once within one slug. */
function duplicateIdIssues(trace: SlugTrace): TraceIssue[] {
  const out: TraceIssue[] = [];
  const kinds: IdKind[] = ["BRD-OBJ", "REQ", "AC", "SRS"];
  for (const kind of kinds) {
    for (const [id, occurrences] of declarationsByKind(trace.references, kind)) {
      if (occurrences.length < 2) continue;
      const [first, ...rest] = occurrences;
      for (const dup of rest) {
        out.push(
          issue("duplicate-id", trace.slug, {
            id,
            file: dup.fromFile,
            line: dup.line,
            message: `${id} declared again at ${dup.fromFile}:${dup.line}; first declared at ${first.fromFile}:${first.line}`,
          }),
        );
      }
    }
  }
  return out;
}

/** dangling-ref: a valid, referenced id that is never declared anywhere in the slug. */
function danglingRefIssues(trace: SlugTrace): TraceIssue[] {
  const out: TraceIssue[] = [];
  const seen = new Set<string>();
  for (const ref of trace.references) {
    if (ref.role !== "reference" || !ref.valid) continue;
    const key = `${ref.kind}:${ref.id}`;
    if (seen.has(key)) continue;
    if (trace.declared.get(ref.kind)?.has(ref.id)) continue;
    seen.add(key);
    out.push(
      issue("dangling-ref", trace.slug, {
        id: ref.id,
        file: ref.fromFile,
        line: ref.line,
        message: `${ref.id} is referenced at ${ref.fromFile}:${ref.line} but never declared in slug "${trace.slug}"`,
      }),
    );
  }
  return out;
}

/** malformed-id: a token shaped like an ID but violating its kind's grammar. */
function malformedIdIssues(trace: SlugTrace): TraceIssue[] {
  return trace.references
    .filter((ref) => !ref.valid)
    .map((ref) =>
      issue("malformed-id", trace.slug, {
        id: ref.id,
        file: ref.fromFile,
        line: ref.line,
        message: `"${ref.id}" at ${ref.fromFile}:${ref.line} looks like a ${ref.kind} id but violates its grammar`,
      }),
    );
}

/** orphan-req / orphan-ac: declared id with zero downstream reference-role mentions anywhere in the slug. */
function orphanIssues(trace: SlugTrace, kind: "REQ" | "AC", code: "orphan-req" | "orphan-ac"): TraceIssue[] {
  const out: TraceIssue[] = [];
  const downstreamKind = kind === "REQ" ? "AC" : "SRS";
  for (const [id, occurrences] of declarationsByKind(trace.references, kind)) {
    const referenced = trace.references.some((ref) => ref.role === "reference" && ref.valid && ref.kind === kind && ref.id === id);
    if (referenced) continue;
    const declaration = occurrences[0];
    out.push(
      issue(code, trace.slug, {
        id,
        file: declaration.fromFile,
        line: declaration.line,
        message: `${id} is declared at ${declaration.fromFile}:${declaration.line} but no ${downstreamKind}-* references it`,
      }),
    );
  }
  return out;
}

/** unlinked-req: a REQ declaration whose declaring line has no BRD-OBJ-* token alongside it. */
function unlinkedReqIssues(trace: SlugTrace): TraceIssue[] {
  const out: TraceIssue[] = [];
  for (const [id, occurrences] of declarationsByKind(trace.references, "REQ")) {
    const declaration = occurrences[0];
    const linked = trace.references.some(
      (ref) => ref.kind === "BRD-OBJ" && ref.valid && ref.fromFile === declaration.fromFile && ref.line === declaration.line,
    );
    if (linked) continue;
    out.push(
      issue("unlinked-req", trace.slug, {
        id,
        file: declaration.fromFile,
        line: declaration.line,
        message: `${id} at ${declaration.fromFile}:${declaration.line} does not trace to any BRD-OBJ-*`,
      }),
    );
  }
  return out;
}

/**
 * slug-file-mismatch: a file's own declared ids are never referenced from
 * within its own slug, but are consistently referenced from exactly one
 * other slug's files — the filename's slug likely does not match its content.
 */
function slugFileMismatchIssues(allSlugs: SlugTrace[]): TraceIssue[] {
  const out: TraceIssue[] = [];
  for (const trace of allSlugs) {
    const others = allSlugs.filter((s) => s.slug !== trace.slug);
    const byFile = new Map<string, TraceRef[]>();
    for (const ref of trace.references) {
      if (ref.role !== "declaration" || !ref.valid) continue;
      const group = byFile.get(ref.fromFile);
      if (group) group.push(ref);
      else byFile.set(ref.fromFile, [ref]);
    }

    for (const [file, declarations] of byFile) {
      const referencingSlugs = new Set<string>();
      let referencedWithinSlug = false;
      for (const decl of declarations) {
        if (trace.references.some((r) => r.role === "reference" && r.valid && r.kind === decl.kind && r.id === decl.id)) {
          referencedWithinSlug = true;
        }
        for (const other of others) {
          if (other.references.some((r) => r.role === "reference" && r.valid && r.kind === decl.kind && r.id === decl.id)) {
            referencingSlugs.add(other.slug);
          }
        }
      }
      if (referencedWithinSlug || referencingSlugs.size !== 1) continue;
      const [target] = [...referencingSlugs];
      out.push(
        issue("slug-file-mismatch", trace.slug, {
          file,
          message: `ids declared in ${file} (slug "${trace.slug}") are only referenced from slug "${target}"`,
        }),
      );
    }
  }
  return out;
}

/** Runs every graph check across all discovered slugs and returns the combined issue list. */
export function buildTraceGraph(slugs: SlugTrace[]): TraceIssue[] {
  const issues: TraceIssue[] = [];
  for (const trace of slugs) {
    issues.push(
      ...duplicateIdIssues(trace),
      ...danglingRefIssues(trace),
      ...malformedIdIssues(trace),
      ...orphanIssues(trace, "REQ", "orphan-req"),
      ...orphanIssues(trace, "AC", "orphan-ac"),
      ...unlinkedReqIssues(trace),
    );
  }
  issues.push(...slugFileMismatchIssues(slugs));
  return issues;
}
