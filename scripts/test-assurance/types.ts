// scripts/test-assurance/types.ts

export type Artifact = {
  path: string;
  sha256: string;
};

export type OracleBasis =
  | "approved_requirement"
  | "external_specification"
  | "independently_reviewed_example";

export type TestLayer = "unit" | "integration" | "contract" | "e2e";

export type Intent = {
  id: string;
  requirements: string[];
  owner: string;
  contract: string;
  fault: string;
  layer: TestLayer;
  cases: string[];
  command: string;
  oracle: {
    ref: Artifact;
    basis: OracleBasis;
    owner: string;
    rationale: string;
  };
  boundaries: {
    real: string[];
    mocked: string[];
    justification: string;
  };
};

export type InputGroup = {
  roots: string[];
  files: Artifact[];
};

export type Snapshot = {
  repository: string;
  commit: string;
  dirty: boolean;
  inputs: {
    source: InputGroup;
    tests: InputGroup;
    dependencies: InputGroup;
    config: InputGroup;
  };
};

export type ExecutionOutcome =
  | "passed"
  | "assertion_failed"
  | "build_failed"
  | "setup_failed"
  | "timeout";

export type ExecutionEnvironment = {
  os: string;
  arch: string;
  runner: string;
  runner_version: string;
};

export type ExecutionFailure = {
  test: string;
  oracle_ref: string;
  artifact_path: string;
  marker: string;
};

export type Execution = {
  id: string;
  intent_id: string;
  snapshot: Snapshot;
  environment: ExecutionEnvironment;
  command: string;
  outcome: ExecutionOutcome;
  exit_code: number | null;
  duration_ms: number;
  artifacts: Artifact[];
  failure: ExecutionFailure | null;
};

export type VariantChange = {
  path: string;
  before_sha256: string | null;
  after_sha256: string | null;
};

export type VariantManifest = {
  schema_version: 1;
  changes: VariantChange[];
};

export type AdjudicationClassification =
  | "intended_assertion"
  | "unrelated_failure"
  | "invalid_variant";

export type ChallengeAdjudication = {
  reviewer: string;
  oracle_ref: string;
  artifact_path: string;
  marker: string;
  classification: AdjudicationClassification;
};

export type Challenge = {
  fault_id: string;
  description: string;
  variant: Artifact;
  execution: Execution;
  adjudication: ChallengeAdjudication;
};

export type ReviewDecision = "accepted" | "rejected";

export type Review = {
  reviewer: string;
  decision: ReviewDecision;
  rationale: string;
};

export type Bundle = {
  schema_version: 1;
  trust: "local-untrusted";
  intent: Intent;
  baseline: Execution | null;
  challenge: Challenge | null;
  static_report: Artifact | null;
  review: Review | null;
};

// ScanReport findings carry the TestGuard violation.go keys and severity values
// verbatim (SRS §3.1 "existing violation.go keys/severity values unchanged").
export type ViolationSeverity = "Blocker" | "Warning" | "Advisory";

export type Violation = {
  rule_id: string;
  severity: ViolationSeverity;
  file_path: string;
  line_number: number;
  column: number;
  message: string;
  suggestion: string;
};

export type ScanDiagnostic = {
  code: string;
  path: string | null;
  message: string;
};

export type ExcludedItem = {
  path: string;
  reason: "default_directory" | "generated" | "non_test";
};

export type ScanReportScope = {
  requested_paths: string[];
  effective_mode: "full";
  files: string[];
  excluded: ExcludedItem[];
  unsupported: string[];
  config_applied: false;
};

export type ScanReportAnalysis = {
  status: "complete" | "incomplete" | "not_applicable" | "error";
  reason:
    | "analyzed"
    | "input_failure"
    | "empty_scope"
    | "empty_allowed"
    | "unsupported_scope"
    | "invalid_usage"
    | "output_failure";
  discovered_files: number;
  analyzed_files: number;
  analyzed_tests: number;
  failed_files: number;
};

export type ScanReportPolicy = {
  blocker_count: number;
  status: "no_blocker" | "blocker_found";
};

export type ScanReport = {
  schema_version: 1;
  tool: {
    name: "testguard";
    version: string;
    commit: string | null;
    built_at: string | null;
  };
  scope: ScanReportScope;
  analysis: ScanReportAnalysis;
  findings: Violation[];
  diagnostics: ScanDiagnostic[];
  policy: ScanReportPolicy;
  exit_code: 0 | 1 | 2 | 3;
};

export type AssuranceRequirement = "declared" | "executed" | "fault";

export type ValidationIssue = {
  code: string;
  path: string;
  message: string;
};

export type ValidationResult = {
  schema_version: 1;
  trust: "local-untrusted";
  requested: AssuranceRequirement;
  satisfied: boolean;
  declaration: "valid" | "invalid";
  static: "absent" | "complete" | "incomplete" | "not_applicable" | "invalid";
  execution: "absent" | "passed" | "failed" | "invalid";
  fault: "absent" | "demonstrated" | "not_detected" | "invalid";
  freshness: "not_applicable" | "current" | "stale" | "invalid";
  review: "absent" | "accepted" | "rejected";
  issues: ValidationIssue[];
  exit_code: 0 | 1 | 2;
};
