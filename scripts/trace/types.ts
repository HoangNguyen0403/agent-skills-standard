// scripts/trace/types.ts

/** Requirement-ID kind understood by the trace graph. */
export type IdKind = "BRD-OBJ" | "REQ" | "AC" | "SRS";

/** Canonical grammar per kind: `^BRD-OBJ-\d{3,}$`, `^REQ-\d{3,}$`, `^AC-\d{3,}$`, `^SRS-\d{3,}$`. */
export const ID_GRAMMAR: Record<IdKind, RegExp> = {
  "BRD-OBJ": /^BRD-OBJ-\d{3,}$/,
  REQ: /^REQ-\d{3,}$/,
  AC: /^AC-\d{3,}$/,
  SRS: /^SRS-\d{3,}$/,
};

/** How a token occurrence was used at its source location. */
export type TraceRole = "declaration" | "reference";

/**
 * One ID-shaped token occurrence found while scanning a slug's files.
 * `valid` is false for tokens that look like an ID (prefix + alnum suffix)
 * but violate the kind's grammar (e.g. `REQ-1`, `AC-01`, `REQ-abc`).
 */
export interface TraceRef {
  /** Full token text, e.g. "REQ-001". */
  id: string;
  kind: IdKind;
  /** File path relative to the scan root. */
  fromFile: string;
  /** 1-indexed line number within `fromFile`. */
  line: number;
  role: TraceRole;
  /**
   * True when the declaration role was inferred only from a table's first
   * cell. A trace matrix restates ids that a heading already declared, so a
   * weak declaration is demoted to a reference when a strong one exists.
   */
  weak?: boolean;
  /** True when `id` matches `ID_GRAMMAR[kind]`. */
  valid: boolean;
}

/** All requirement-doc trace data for one slug (one BRD/PRD/SRS filename group). */
export interface SlugTrace {
  slug: string;
  /** File paths relative to the scan root, sorted. */
  files: string[];
  /** Valid, declaration-role IDs, grouped by kind. */
  declared: Map<IdKind, Set<string>>;
  /** Every token occurrence found across `files` (declarations, references, and malformed tokens). */
  references: TraceRef[];
}
