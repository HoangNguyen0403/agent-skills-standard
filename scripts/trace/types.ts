// scripts/trace/types.ts

/** Requirement-ID kind understood by the trace graph. */
export type IdKind = "BRD-OBJ" | "REQ" | "AC" | "SRS";

/** Canonical formal grammar per kind with optional single uppercase-alphanumeric namespace for BRD-OBJ and REQ:
 * BRD-OBJ: optional single uppercase namespace with >=3 digits: `^BRD-OBJ-(?:[A-Z][A-Z0-9]*-)?\d{3,}$`
 * REQ: optional single uppercase namespace with >=3 digits: `^REQ-(?:[A-Z][A-Z0-9]*-)?\d{3,}$`
 * AC: numeric with >=2 digits: `^AC-\d{2,}$`
 * SRS: numeric with >=3 digits: `^SRS-\d{3,}$`
 */
export const ID_GRAMMAR: Record<IdKind, RegExp> = {
  "BRD-OBJ": /^BRD-OBJ-(?:[A-Z][A-Z0-9]*-)?\d{3,}$/,
  REQ: /^REQ-(?:[A-Z][A-Z0-9]*-)?\d{3,}$/,
  AC: /^AC-\d{2,}$/,
  SRS: /^SRS-\d{3,}$/,
};
/**
 * Namespace-qualified historical source-group ID grammar:
 * prefix + generic uppercase namespace identifier segment(s) + canonical terminal >=3-digit numeric suffix.
 * e.g. `REQ-PILOT-001`, `AC-DISC-001`, `REQ-SUB-MODULE-001`.
 * Does not authorize formal declarations or satisfy --required.
 */
export const QUALIFIED_ID_GRAMMAR: Partial<Record<IdKind, RegExp>> = {
  REQ: /^REQ-[A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)*-\d{3,}$/,
  AC: /^AC-[A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)*-\d{3,}$/,
};

/**
 * Namespace prefix grammar for seed family mentions in prose:
 * prefix + uppercase namespace identifier(s) without terminal numeric suffix.
 * Valid as a reference only when member declarations exist in the slug.
 */
export const QUALIFIED_NAMESPACE_GRAMMAR: Partial<Record<IdKind, RegExp>> = {
  REQ: /^REQ-[A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)*$/,
  AC: /^AC-[A-Z][A-Z0-9]*(?:-[A-Z][A-Z0-9]*)*$/,
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
  /** True when `id` matches `ID_GRAMMAR[kind]` or `QUALIFIED_ID_GRAMMAR[kind]`. */
  valid: boolean;
  /** True when `id` is a namespace-qualified source-group ID rather than a numeric formal ID. */
  qualified?: boolean;
  /**
   * Authority implied by the occurrence's own location inside a typed table
   * column: `formal` for an explicit ID column, `source` for a historical
   * candidate/source column. Absent for headings, ID fields, first-cell
   * restatements and prose, which stay untyped and may use family inference.
   */
  authority?: "formal" | "source";
}

/** One documented source-to-formal mapping from PRD requirement or AC tables. */
export interface SourceMapping {
  /** Historical source ID, e.g. "REQ-DISC-001" or "AC-DISC-001". */
  sourceId: string;
  sourceKind: IdKind;
  /** Formal canonical target ID, e.g. "REQ-001" or "AC-001". */
  formalId: string;
  formalKind: IdKind;
  /** File path relative to scan root where mapping was documented. */
  fromFile: string;
  /** 1-indexed line number where mapping was documented. */
  line: number;
}
/** All requirement-doc trace data for one slug (one BRD/PRD/SRS filename group). */
export interface SlugTrace {
  slug: string;
  /** File paths relative to the scan root, sorted. */
  files: string[];
  /** Valid, declaration-role formal IDs, grouped by kind. */
  declared: Map<IdKind, Set<string>>;
  /** Valid, declaration-role historical source-group IDs, grouped by kind. */
  sourceDeclared?: Map<IdKind, Set<string>>;
  /** Explicit source-to-formal relationships resolved from table columns. */
  sourceMappings?: SourceMapping[];
  /** Every token occurrence found across `files` (declarations, references, and malformed tokens). */
  references: TraceRef[];
}
