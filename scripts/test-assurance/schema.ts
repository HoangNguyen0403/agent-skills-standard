// scripts/test-assurance/schema.ts
import {
  compareLexicographical,
  hasControlCharacters,
  hasOverlappingRoots,
  isCommitHex,
  isSha256,
  MAX_EXECUTION_ARTIFACTS,
  MAX_INPUT_FILES_PER_SNAPSHOT,
  MAX_SELECTED_ROOTS_PER_SNAPSHOT,
  validateRelativePathSecurity,
} from "./io";
import type {
  Artifact,
  ExcludedItem,
  Execution,
  ExecutionOutcome,
  Intent,
  OracleBasis,
  ScanReport,
  Snapshot,
  TestLayer,
  ValidationIssue,
  VariantManifest,
  ViolationSeverity,
} from "./types";

export function isRecord(val: unknown): val is Record<string, unknown> {
  return typeof val === "object" && val !== null && !Array.isArray(val);
}

// SEC-4: checkExactKeys never reflects unknown property names in issue path or message
export function checkExactKeys(
  obj: unknown,
  allowedKeys: readonly string[],
  pathPrefix: string,
  issues: ValidationIssue[],
): obj is Record<string, unknown> {
  if (!isRecord(obj)) {
    issues.push({
      code: "INVALID_SCHEMA",
      path: pathPrefix,
      message: "Expected object at " + pathPrefix,
    });
    return false;
  }
  const keys = Object.keys(obj);
  const allowedSet = new Set(allowedKeys);
  let valid = true;
  for (const k of keys) {
    if (!allowedSet.has(k)) {
      issues.push({
        code: "UNKNOWN_PROPERTY",
        path: pathPrefix,
        message: "Unknown property at " + pathPrefix,
      });
      valid = false;
    }
  }
  return valid;
}

export function isPathInRoots(filePath: string, roots: string[]): boolean {
  for (const root of roots) {
    if (filePath === root || filePath.startsWith(root + "/")) {
      return true;
    }
  }
  return false;
}

export function validateArtifactObject(
  artifact: unknown,
  pathPrefix: string,
  issues: ValidationIssue[],
): artifact is Artifact {
  if (!checkExactKeys(artifact, ["path", "sha256"], pathPrefix, issues)) return false;
  let ok = true;
  if (typeof artifact.path !== "string" || !validateRelativePathSecurity(artifact.path).ok) {
    issues.push({
      code: typeof artifact.path === "string" && !validateRelativePathSecurity(artifact.path).ok ? "UNSAFE_PATH" : "INVALID_SCHEMA",
      path: pathPrefix + ".path",
      message: "Unsafe or invalid artifact path at " + pathPrefix + ".path",
    });
    ok = false;
  }
  if (!isSha256(artifact.sha256)) {
    issues.push({
      code: "INVALID_SCHEMA",
      path: pathPrefix + ".sha256",
      message: "Invalid artifact sha256 at " + pathPrefix + ".sha256",
    });
    ok = false;
  }
  return ok;
}

export function validateSnapshotObject(
  snapshot: unknown,
  pathPrefix: string,
  issues: ValidationIssue[],
): snapshot is Snapshot {
  if (!checkExactKeys(snapshot, ["repository", "commit", "dirty", "inputs"], pathPrefix, issues)) return false;
  let ok = true;
  if (typeof snapshot.repository !== "string" || snapshot.repository.trim() === "") {
    issues.push({
      code: "INVALID_SCHEMA",
      path: pathPrefix + ".repository",
      message: "Invalid repository at " + pathPrefix + ".repository",
    });
    ok = false;
  }
  if (!isCommitHex(snapshot.commit)) {
    issues.push({
      code: "INVALID_SCHEMA",
      path: pathPrefix + ".commit",
      message: "Invalid commit at " + pathPrefix + ".commit",
    });
    ok = false;
  }
  if (typeof snapshot.dirty !== "boolean") {
    issues.push({
      code: "INVALID_SCHEMA",
      path: pathPrefix + ".dirty",
      message: "Invalid dirty flag at " + pathPrefix + ".dirty",
    });
    ok = false;
  }
  if (!checkExactKeys(snapshot.inputs, ["source", "tests", "dependencies", "config"], pathPrefix + ".inputs", issues)) {
    return false;
  }

  const inputsObj = snapshot.inputs as Record<string, unknown>;
  let totalRoots = 0;
  let totalFiles = 0;

  // Pre-bound check (SEC-1)
  for (const cat of ["source", "tests", "dependencies", "config"] as const) {
    const group = inputsObj[cat];
    if (isRecord(group)) {
      if (Array.isArray(group.roots)) totalRoots += group.roots.length;
      if (Array.isArray(group.files)) totalFiles += group.files.length;
    }
  }

  if (totalRoots > MAX_SELECTED_ROOTS_PER_SNAPSHOT) {
    issues.push({
      code: "INPUT_TOO_LARGE",
      path: pathPrefix + ".inputs",
      message: "Total snapshot roots exceeded bound",
    });
    return false;
  }
  if (totalFiles > MAX_INPUT_FILES_PER_SNAPSHOT) {
    issues.push({
      code: "INPUT_TOO_LARGE",
      path: pathPrefix + ".inputs",
      message: "Total snapshot files exceeded bound",
    });
    return false;
  }

  const seenPaths = new Map<string, string>();
  for (const cat of ["source", "tests", "dependencies", "config"] as const) {
    const group = inputsObj[cat];
    const groupPath = pathPrefix + ".inputs." + cat;
    if (!checkExactKeys(group, ["roots", "files"], groupPath, issues) || !isRecord(group)) {
      ok = false;
      continue;
    }
    const roots = group.roots;
    const files = group.files;
    if (!Array.isArray(roots) || roots.length === 0) {
      issues.push({
        code: "INVALID_SCHEMA",
        path: groupPath + ".roots",
        message: "Roots must be non-empty array at " + groupPath + ".roots",
      });
      ok = false;
    } else {
      const validRoots: string[] = [];
      for (let i = 0; i < roots.length; i++) {
        const root = roots[i];
        if (typeof root !== "string" || !validateRelativePathSecurity(root).ok) {
          issues.push({
            code: "INVALID_SCHEMA",
            path: groupPath + ".roots",
            message: "Root path invalid in " + groupPath + ".roots",
          });
          ok = false;
        } else {
          validRoots.push(root);
        }
      }
      // SEC-1: Sorted prefix overlap check
      if (hasOverlappingRoots(validRoots)) {
        issues.push({
          code: "INVALID_SCHEMA",
          path: groupPath + ".roots",
          message: "Overlapping roots at " + groupPath + ".roots",
        });
        ok = false;
      }
    }

    if (!Array.isArray(files) || files.length === 0) {
      issues.push({
        code: "INVALID_SCHEMA",
        path: groupPath + ".files",
        message: "Files must be non-empty array at " + groupPath + ".files",
      });
      ok = false;
    } else {
      const rootStrings = Array.isArray(roots) ? roots.filter((r): r is string => typeof r === "string") : [];
      for (let i = 0; i < files.length; i++) {
        const fileObj = files[i];
        const filePathPrefix = groupPath + ".files[" + i + "]";
        if (!validateArtifactObject(fileObj, filePathPrefix, issues)) {
          ok = false;
          continue;
        }

        // F6: Deterministic comparator order
        if (i > 0) {
          const prevFile = files[i - 1];
          if (isRecord(prevFile) && typeof prevFile.path === "string") {
            if (compareLexicographical(prevFile.path, fileObj.path) >= 0) {
              issues.push({
                code: "INVALID_SCHEMA",
                path: groupPath + ".files",
                message: "Files must be uniquely sorted lexicographically at " + groupPath + ".files",
              });
              ok = false;
            }
          }
        }

        // F4: Check file membership in approved category roots
        if (!isPathInRoots(fileObj.path, rootStrings)) {
          issues.push({
            code: "INVALID_SCHEMA",
            path: filePathPrefix,
            message: "File does not belong to any category root at " + filePathPrefix,
          });
          ok = false;
        }

        if (seenPaths.has(fileObj.path)) {
          issues.push({
            code: "INVALID_SCHEMA",
            path: filePathPrefix,
            message: "Disjoint category violation: file exists in multiple categories",
          });
          ok = false;
        } else {
          seenPaths.set(fileObj.path, cat);
        }
      }
    }
  }
  return ok;
}

export function validateExecutionObject(
  exec: unknown,
  pathPrefix: string,
  issues: ValidationIssue[],
): exec is Execution {
  if (
    !checkExactKeys(
      exec,
      ["id", "intent_id", "snapshot", "environment", "command", "outcome", "exit_code", "duration_ms", "artifacts", "failure"],
      pathPrefix,
      issues,
    )
  ) {
    return false;
  }
  let ok = true;
  if (typeof exec.id !== "string" || exec.id.trim() === "") {
    issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".id", message: "Invalid id at " + pathPrefix + ".id" });
    ok = false;
  }
  if (typeof exec.intent_id !== "string" || exec.intent_id.trim() === "") {
    issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".intent_id", message: "Invalid intent_id at " + pathPrefix + ".intent_id" });
    ok = false;
  }
  if (!validateSnapshotObject(exec.snapshot, pathPrefix + ".snapshot", issues)) {
    ok = false;
  }
  if (!checkExactKeys(exec.environment, ["os", "arch", "runner", "runner_version"], pathPrefix + ".environment", issues)) {
    ok = false;
  } else {
    const env = exec.environment as Record<string, unknown>;
    for (const key of ["os", "arch", "runner", "runner_version"]) {
      if (typeof env[key] !== "string" || (env[key] as string).trim() === "") {
        issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".environment." + key, message: "Invalid field at " + pathPrefix + ".environment." + key });
        ok = false;
      }
    }
  }
  if (typeof exec.command !== "string" || exec.command.trim() === "") {
    issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".command", message: "Invalid command at " + pathPrefix + ".command" });
    ok = false;
  }
  const validOutcomes: ExecutionOutcome[] = ["passed", "assertion_failed", "build_failed", "setup_failed", "timeout"];
  if (!validOutcomes.includes(exec.outcome as ExecutionOutcome)) {
    issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".outcome", message: "Invalid outcome at " + pathPrefix + ".outcome" });
    ok = false;
  }
  if (typeof exec.duration_ms !== "number" || !Number.isFinite(exec.duration_ms) || exec.duration_ms < 0) {
    issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".duration_ms", message: "Invalid duration_ms at " + pathPrefix + ".duration_ms" });
    ok = false;
  }

  // Outcome rules (§4.3)
  if (exec.outcome === "passed") {
    if (exec.exit_code !== 0 || exec.failure !== null) {
      issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".exit_code", message: "Passed outcome requires exit_code 0 and failure null at " + pathPrefix });
      ok = false;
    }
  } else if (exec.outcome === "assertion_failed") {
    if (typeof exec.exit_code !== "number" || !Number.isInteger(exec.exit_code) || exec.exit_code === 0 || exec.failure === null) {
      issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".exit_code", message: "assertion_failed requires non-zero integer exit and non-null failure at " + pathPrefix });
      ok = false;
    }
  } else if (exec.outcome === "build_failed" || exec.outcome === "setup_failed") {
    if (typeof exec.exit_code !== "number" || !Number.isInteger(exec.exit_code) || exec.exit_code === 0 || exec.failure !== null) {
      issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".exit_code", message: "build_failed/setup_failed requires non-zero integer exit and failure null at " + pathPrefix });
      ok = false;
    }
  } else if (exec.outcome === "timeout") {
    if (exec.exit_code !== null || exec.failure !== null) {
      issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".exit_code", message: "timeout requires exit_code null and failure null at " + pathPrefix });
      ok = false;
    }
  }

  if (!Array.isArray(exec.artifacts) || exec.artifacts.length === 0) {
    issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".artifacts", message: "artifacts must contain at least one output artifact at " + pathPrefix + ".artifacts" });
    ok = false;
  } else if (exec.artifacts.length > MAX_EXECUTION_ARTIFACTS) {
    // SEC-1: reject over-budget arrays before iterating or reading any artifact
    issues.push({ code: "INPUT_TOO_LARGE", path: pathPrefix + ".artifacts", message: "Too many execution artifacts at " + pathPrefix + ".artifacts" });
    ok = false;
  } else {
    for (let i = 0; i < exec.artifacts.length; i++) {
      if (!validateArtifactObject(exec.artifacts[i], pathPrefix + ".artifacts[" + i + "]", issues)) {
        ok = false;
      }
    }
  }

  if (exec.failure !== null) {
    if (!checkExactKeys(exec.failure, ["test", "oracle_ref", "artifact_path", "marker"], pathPrefix + ".failure", issues)) {
      ok = false;
    } else {
      const fail = exec.failure as Record<string, unknown>;
      for (const f of ["test", "oracle_ref", "artifact_path", "marker"]) {
        if (typeof fail[f] !== "string" || (fail[f] as string).trim() === "") {
          issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".failure." + f, message: "Invalid field at " + pathPrefix + ".failure." + f });
          ok = false;
        }
      }
      // SEC-1-R1: the failure lookup is a dependent artifact iteration, so it is
      // restricted to arrays that already passed the size bound above. An over-budget
      // array stays rejected (INPUT_TOO_LARGE) and is never traversed again.
      if (Array.isArray(exec.artifacts) && exec.artifacts.length <= MAX_EXECUTION_ARTIFACTS) {
        const found = exec.artifacts.some((a) => isRecord(a) && a.path === fail.artifact_path);
        if (!found) {
          issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".failure.artifact_path", message: "failure.artifact_path must name a captured artifact" });
          ok = false;
        }
      }
    }
  }
  return ok;
}

export function validateVariantManifestObject(
  variant: unknown,
  pathPrefix: string,
  issues: ValidationIssue[],
): variant is VariantManifest {
  if (!checkExactKeys(variant, ["schema_version", "changes"], pathPrefix, issues)) return false;
  let ok = true;
  if (variant.schema_version !== 1) {
    issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".schema_version", message: "Unknown schema_version" });
    ok = false;
  }
  if (!Array.isArray(variant.changes) || variant.changes.length === 0) {
    issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".changes", message: "changes must be non-empty array" });
    ok = false;
  } else {
    for (let i = 0; i < variant.changes.length; i++) {
      const change = variant.changes[i];
      const changePath = pathPrefix + ".changes[" + i + "]";
      if (!checkExactKeys(change, ["path", "before_sha256", "after_sha256"], changePath, issues)) {
        ok = false;
        continue;
      }
      if (typeof change.path !== "string" || !validateRelativePathSecurity(change.path).ok) {
        issues.push({ code: "INVALID_SCHEMA", path: changePath + ".path", message: "Invalid path" });
        ok = false;
      } else if (i > 0) {
        const prevChange = variant.changes[i - 1];
        if (isRecord(prevChange) && typeof prevChange.path === "string") {
          if (compareLexicographical(prevChange.path, change.path) >= 0) {
            issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".changes", message: "changes must be sorted lexicographically by unique path" });
            ok = false;
          }
        }
      }
      const bSha = change.before_sha256;
      const aSha = change.after_sha256;
      if (bSha !== null && !isSha256(bSha)) {
        issues.push({ code: "INVALID_SCHEMA", path: changePath + ".before_sha256", message: "Invalid before_sha256" });
        ok = false;
      }
      if (aSha !== null && !isSha256(aSha)) {
        issues.push({ code: "INVALID_SCHEMA", path: changePath + ".after_sha256", message: "Invalid after_sha256" });
        ok = false;
      }
      if (bSha === null && aSha === null) {
        issues.push({ code: "INVALID_SCHEMA", path: changePath, message: "At least one digest must be non-null" });
        ok = false;
      }
      if (bSha === aSha) {
        issues.push({ code: "INVALID_SCHEMA", path: changePath, message: "before_sha256 and after_sha256 must differ" });
        ok = false;
      }
    }
  }
  return ok;
}

export function validateIntentObject(
  intent: unknown,
  pathPrefix: string,
  issues: ValidationIssue[],
): intent is Intent {
  if (
    !checkExactKeys(
      intent,
      ["id", "requirements", "owner", "contract", "fault", "layer", "cases", "command", "oracle", "boundaries"],
      pathPrefix,
      issues,
    )
  ) {
    return false;
  }
  let ok = true;
  for (const f of ["id", "owner", "contract", "fault", "command"]) {
    if (typeof intent[f] !== "string" || (intent[f] as string).trim() === "") {
      issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + "." + f, message: "Invalid field at " + pathPrefix + "." + f });
      ok = false;
    }
  }
  const validLayers: TestLayer[] = ["unit", "integration", "contract", "e2e"];
  if (!validLayers.includes(intent.layer as TestLayer)) {
    issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".layer", message: "Invalid layer at " + pathPrefix + ".layer" });
    ok = false;
  }
  if (!Array.isArray(intent.requirements) || intent.requirements.length === 0 || !intent.requirements.every((r) => typeof r === "string" && r.trim() !== "")) {
    issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".requirements", message: "requirements must be non-empty array of strings" });
    ok = false;
  }
  if (!Array.isArray(intent.cases) || intent.cases.length === 0 || !intent.cases.every((c) => typeof c === "string" && c.trim() !== "")) {
    issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".cases", message: "cases must be non-empty array of strings" });
    ok = false;
  }
  if (!checkExactKeys(intent.oracle, ["ref", "basis", "owner", "rationale"], pathPrefix + ".oracle", issues)) {
    ok = false;
  } else {
    const ora = intent.oracle as Record<string, unknown>;
    if (!validateArtifactObject(ora.ref, pathPrefix + ".oracle.ref", issues)) ok = false;
    const validBases: OracleBasis[] = ["approved_requirement", "external_specification", "independently_reviewed_example"];
    if (!validBases.includes(ora.basis as OracleBasis)) {
      issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".oracle.basis", message: "Invalid basis at " + pathPrefix + ".oracle.basis" });
      ok = false;
    }
    if (typeof ora.owner !== "string" || ora.owner.trim() === "") {
      issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".oracle.owner", message: "Invalid owner at " + pathPrefix + ".oracle.owner" });
      ok = false;
    }
    if (typeof ora.rationale !== "string" || ora.rationale.trim() === "") {
      issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".oracle.rationale", message: "Invalid rationale at " + pathPrefix + ".oracle.rationale" });
      ok = false;
    }
  }
  if (!checkExactKeys(intent.boundaries, ["real", "mocked", "justification"], pathPrefix + ".boundaries", issues)) {
    ok = false;
  } else {
    const bnd = intent.boundaries as Record<string, unknown>;
    if (!Array.isArray(bnd.real) || !bnd.real.every((r) => typeof r === "string")) {
      issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".boundaries.real", message: "real must be array of strings" });
      ok = false;
    }
    if (!Array.isArray(bnd.mocked) || !bnd.mocked.every((m) => typeof m === "string")) {
      issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".boundaries.mocked", message: "mocked must be array of strings" });
      ok = false;
    }
    if (typeof bnd.justification !== "string" || bnd.justification.trim() === "") {
      issues.push({ code: "INVALID_SCHEMA", path: pathPrefix + ".boundaries.justification", message: "Invalid justification" });
      ok = false;
    }
  }
  return ok;
}

// F1: Full strict nested validation of TestGuard v0.2 ScanReport (SRS §§3.1-3.2)
export function validateScanReportObject(
  report: unknown,
  issues: ValidationIssue[],
): report is ScanReport {
  if (
    !checkExactKeys(
      report,
      ["schema_version", "tool", "scope", "analysis", "findings", "diagnostics", "policy", "exit_code"],
      "static_report",
      issues,
    )
  ) {
    return false;
  }
  let ok = true;
  if (report.schema_version !== 1) {
    issues.push({ code: "INVALID_SCHEMA", path: "static_report.schema_version", message: "Unknown schema_version" });
    ok = false;
  }

  // 1. Tool validation
  if (!checkExactKeys(report.tool, ["name", "version", "commit", "built_at"], "static_report.tool", issues)) {
    ok = false;
  } else {
    const t = report.tool as Record<string, unknown>;
    if (t.name !== "testguard") {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.tool.name", message: "tool.name must be testguard" });
      ok = false;
    }
    if (typeof t.version !== "string" || t.version.trim() === "") {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.tool.version", message: "Invalid tool.version" });
      ok = false;
    }
    if (t.commit !== null && (typeof t.commit !== "string" || t.commit.trim() === "")) {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.tool.commit", message: "Invalid tool.commit" });
      ok = false;
    }
    if (t.built_at !== null && (typeof t.built_at !== "string" || t.built_at.trim() === "")) {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.tool.built_at", message: "Invalid tool.built_at" });
      ok = false;
    }
  }

  // 2. Scope validation
  if (
    !checkExactKeys(
      report.scope,
      ["requested_paths", "effective_mode", "files", "excluded", "unsupported", "config_applied"],
      "static_report.scope",
      issues,
    )
  ) {
    ok = false;
  } else {
    const s = report.scope as Record<string, unknown>;
    if (!Array.isArray(s.requested_paths) || s.requested_paths.length === 0 || !s.requested_paths.every((p) => typeof p === "string" && p.trim() !== "")) {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.scope.requested_paths", message: "requested_paths must be non-empty array of strings" });
      ok = false;
    }
    if (s.effective_mode !== "full") {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.scope.effective_mode", message: "effective_mode must be full" });
      ok = false;
    }
    if (!Array.isArray(s.files) || !s.files.every((f) => typeof f === "string")) {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.scope.files", message: "files must be array of strings" });
      ok = false;
    } else {
      // Check sorted unique
      for (let i = 1; i < s.files.length; i++) {
        if (compareLexicographical(s.files[i - 1] as string, s.files[i] as string) >= 0) {
          issues.push({ code: "INVALID_SCHEMA", path: "static_report.scope.files", message: "files must be sorted unique" });
          ok = false;
          break;
        }
      }
    }
    if (!Array.isArray(s.excluded)) {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.scope.excluded", message: "excluded must be array" });
      ok = false;
    } else {
      const validReasons = ["default_directory", "generated", "non_test"];
      for (let i = 0; i < s.excluded.length; i++) {
        const item = s.excluded[i];
        if (!checkExactKeys(item, ["path", "reason"], "static_report.scope.excluded[" + i + "]", issues)) {
          ok = false;
          continue;
        }
        if (typeof (item as ExcludedItem).path !== "string" || !validReasons.includes((item as ExcludedItem).reason)) {
          issues.push({ code: "INVALID_SCHEMA", path: "static_report.scope.excluded[" + i + "]", message: "Invalid excluded item" });
          ok = false;
        }
      }
    }
    if (!Array.isArray(s.unsupported) || !s.unsupported.every((u) => typeof u === "string")) {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.scope.unsupported", message: "unsupported must be array of strings" });
      ok = false;
    } else {
      for (let i = 1; i < s.unsupported.length; i++) {
        if (compareLexicographical(s.unsupported[i - 1] as string, s.unsupported[i] as string) >= 0) {
          issues.push({ code: "INVALID_SCHEMA", path: "static_report.scope.unsupported", message: "unsupported must be sorted unique" });
          ok = false;
          break;
        }
      }
    }
    if (s.config_applied !== false) {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.scope.config_applied", message: "config_applied must be false" });
      ok = false;
    }
  }

  // 3. Analysis validation
  if (
    !checkExactKeys(
      report.analysis,
      ["status", "reason", "discovered_files", "analyzed_files", "analyzed_tests", "failed_files"],
      "static_report.analysis",
      issues,
    )
  ) {
    ok = false;
  } else {
    const a = report.analysis as Record<string, unknown>;
    const validStatuses = ["complete", "incomplete", "not_applicable", "error"];
    if (!validStatuses.includes(a.status as string)) {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.analysis.status", message: "Invalid status" });
      ok = false;
    }
    const validReasons = [
      "analyzed",
      "input_failure",
      "empty_scope",
      "empty_allowed",
      "unsupported_scope",
      "invalid_usage",
      "output_failure",
    ];
    if (!validReasons.includes(a.reason as string)) {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.analysis.reason", message: "Invalid reason" });
      ok = false;
    }
    for (const countKey of ["discovered_files", "analyzed_files", "analyzed_tests", "failed_files"] as const) {
      const val = a[countKey];
      if (typeof val !== "number" || !Number.isInteger(val) || val < 0) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.analysis." + countKey, message: countKey + " must be non-negative integer" });
        ok = false;
      }
    }
  }

  // 4. Findings validation (TestGuard violation.go keys/severity values, SRS §3.1)
  let computedBlockerCount = 0;
  const rawFindings = report.findings;
  if (!Array.isArray(rawFindings)) {
    issues.push({ code: "INVALID_SCHEMA", path: "static_report.findings", message: "findings must be array" });
    ok = false;
  } else {
    const validSeverities: ViolationSeverity[] = ["Blocker", "Warning", "Advisory"];
    for (let i = 0; i < rawFindings.length; i++) {
      const finding: unknown = rawFindings[i];
      const findingPath = "static_report.findings[" + i + "]";
      if (
        !checkExactKeys(
          finding,
          ["rule_id", "severity", "file_path", "line_number", "column", "message", "suggestion"],
          findingPath,
          issues,
        ) ||
        !isRecord(finding)
      ) {
        ok = false;
        continue;
      }
      let findingOk = true;
      if (typeof finding.rule_id !== "string" || finding.rule_id.trim() === "") {
        issues.push({ code: "INVALID_SCHEMA", path: findingPath + ".rule_id", message: "Invalid rule_id at " + findingPath + ".rule_id" });
        findingOk = false;
      }
      if (!validSeverities.includes(finding.severity as ViolationSeverity)) {
        issues.push({ code: "INVALID_SCHEMA", path: findingPath + ".severity", message: "Invalid severity at " + findingPath + ".severity" });
        findingOk = false;
      }
      // file_path is producer data, not a validator read target: bound it and forbid control characters
      if (
        typeof finding.file_path !== "string" ||
        finding.file_path.trim() === "" ||
        hasControlCharacters(finding.file_path)
      ) {
        issues.push({ code: "INVALID_SCHEMA", path: findingPath + ".file_path", message: "Invalid file_path at " + findingPath + ".file_path" });
        findingOk = false;
      }
      for (const positionKey of ["line_number", "column"] as const) {
        const position = finding[positionKey];
        if (typeof position !== "number" || !Number.isInteger(position) || position < 0) {
          issues.push({ code: "INVALID_SCHEMA", path: findingPath + "." + positionKey, message: positionKey + " must be non-negative integer" });
          findingOk = false;
        }
      }
      if (typeof finding.message !== "string" || typeof finding.suggestion !== "string") {
        issues.push({ code: "INVALID_SCHEMA", path: findingPath, message: "message and suggestion must be strings" });
        findingOk = false;
      }
      if (!findingOk) {
        ok = false;
      } else if (finding.severity === "Blocker") {
        computedBlockerCount++;
      }
    }
  }

  // 5. Diagnostics validation
  if (!Array.isArray(report.diagnostics)) {
    issues.push({ code: "INVALID_SCHEMA", path: "static_report.diagnostics", message: "diagnostics must be array" });
    ok = false;
  } else {
    for (let i = 0; i < report.diagnostics.length; i++) {
      const diag = report.diagnostics[i];
      const diagPath = "static_report.diagnostics[" + i + "]";
      if (!checkExactKeys(diag, ["code", "path", "message"], diagPath, issues) || !isRecord(diag)) {
        ok = false;
        continue;
      }
      if (typeof diag.code !== "string" || diag.code.trim() === "" || typeof diag.message !== "string") {
        issues.push({ code: "INVALID_SCHEMA", path: diagPath, message: "Invalid diagnostic entry" });
        ok = false;
      }
      if (diag.path !== null && typeof diag.path !== "string") {
        issues.push({ code: "INVALID_SCHEMA", path: diagPath + ".path", message: "Diagnostic path must be string or null" });
        ok = false;
      }
    }
  }

  // 6. Policy validation
  if (!checkExactKeys(report.policy, ["blocker_count", "status"], "static_report.policy", issues)) {
    ok = false;
  } else {
    const p = report.policy as Record<string, unknown>;
    if (typeof p.blocker_count !== "number" || !Number.isInteger(p.blocker_count) || p.blocker_count < 0) {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.policy.blocker_count", message: "blocker_count must be non-negative integer" });
      ok = false;
    }
    if (p.status !== "no_blocker" && p.status !== "blocker_found") {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.policy.status", message: "policy status must be no_blocker or blocker_found" });
      ok = false;
    }
  }

  // 7. Exit code validation
  const validExitCodes: number[] = [0, 1, 2, 3];
  if (typeof report.exit_code !== "number" || !validExitCodes.includes(report.exit_code)) {
    issues.push({ code: "INVALID_SCHEMA", path: "static_report.exit_code", message: "exit_code must be 0, 1, 2, or 3" });
    ok = false;
  }

  // 8. Cross-field decision and exit precedence invariants (SRS §3.2)
  if (ok) {
    const analysis = report.analysis as ScanReport["analysis"];
    const policy = report.policy as ScanReport["policy"];
    const scope = report.scope as ScanReport["scope"];
    const findings = report.findings as ScanReport["findings"];
    const diagnostics = report.diagnostics as ScanReport["diagnostics"];
    const exitCode = report.exit_code as ScanReport["exit_code"];

    // analyzed_files === scope.files.length
    if (analysis.analyzed_files !== scope.files.length) {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.analysis.analyzed_files", message: "analyzed_files must equal scope.files.length" });
      ok = false;
    }

    // F1-R1 (SRS §3.1): discovery covers the whole candidate population. Successfully
    // analyzed files and failed candidate files are disjoint subsets of discovered
    // files, so their sum cannot exceed it. Equality is not required: generated
    // exclusions account for the remainder.
    if (analysis.discovered_files < analysis.analyzed_files + analysis.failed_files) {
      issues.push({
        code: "INVALID_SCHEMA",
        path: "static_report.analysis.discovered_files",
        message: "discovered_files must cover analyzed_files plus failed_files",
      });
      ok = false;
    }

    // Blocker count must equal actual count of blocker findings
    if (policy.blocker_count !== computedBlockerCount) {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.policy.blocker_count", message: "blocker_count must match count of blocker findings" });
      ok = false;
    }

    // Policy status must match blocker_count
    if (policy.blocker_count > 0 && policy.status !== "blocker_found") {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.policy.status", message: "status must be blocker_found when blocker_count > 0" });
      ok = false;
    }
    if (policy.blocker_count === 0 && policy.status !== "no_blocker") {
      issues.push({ code: "INVALID_SCHEMA", path: "static_report.policy.status", message: "status must be no_blocker when blocker_count === 0" });
      ok = false;
    }

    if (analysis.status === "complete") {
      if (analysis.reason !== "analyzed") {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.analysis.reason", message: "Complete scan reason must be analyzed" });
        ok = false;
      }
      if (analysis.failed_files > 0) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.analysis.failed_files", message: "Complete scan cannot have failed_files > 0" });
        ok = false;
      }
      if (analysis.analyzed_tests === 0) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.analysis.analyzed_tests", message: "Complete scan cannot have 0 analyzed_tests" });
        ok = false;
      }
      if (scope.unsupported.length > 0) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.scope.unsupported", message: "Complete scan cannot have unsupported files" });
        ok = false;
      }
      // F1-R2 (SRS §3.2): the diagnostics channel is failure-only for this producer
      // (traversal/read/parse/usage/output). The producer emits none for a complete
      // analysis, and unknown/new codes must stay failures, so any entry contradicts
      // "complete / exit 0-1".
      if (diagnostics.length > 0) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.diagnostics", message: "Complete scan cannot carry failure diagnostics" });
        ok = false;
      }
      const expectedExit = policy.blocker_count > 0 ? 1 : 0;
      if (exitCode !== expectedExit) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.exit_code", message: "Complete scan exit_code must match policy blockers" });
        ok = false;
      }
    } else if (analysis.status === "incomplete") {
      const validIncompleteReasons = ["input_failure", "unsupported_scope", "empty_scope"];
      if (!validIncompleteReasons.includes(analysis.reason)) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.analysis.reason", message: "Invalid incomplete reason" });
        ok = false;
      }
      // Producer invariant: empty_scope means no analyzable test declarations were located
      if (analysis.reason === "empty_scope" && analysis.analyzed_tests !== 0) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.analysis.analyzed_tests", message: "empty_scope scan cannot report analyzed_tests" });
        ok = false;
      }
      if (exitCode !== 2) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.exit_code", message: "incomplete scan must exit 2" });
        ok = false;
      }
    } else if (analysis.status === "not_applicable") {
      if (analysis.reason !== "empty_allowed") {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.analysis.reason", message: "not_applicable scan reason must be empty_allowed" });
        ok = false;
      }
      if (analysis.analyzed_tests !== 0) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.analysis.analyzed_tests", message: "not_applicable scan cannot report analyzed_tests" });
        ok = false;
      }
      if (findings.length > 0 || scope.unsupported.length > 0 || analysis.failed_files > 0 || policy.blocker_count > 0) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.analysis.status", message: "not_applicable report cannot have findings, unsupported, or failed files" });
        ok = false;
      }
      // F1-R2: the producer emits no diagnostics for authorized empty scope;
      // every diagnostic code, including empty_scope, remains failure-only.
      if (diagnostics.length > 0) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.diagnostics", message: "not_applicable scan cannot carry failure diagnostics" });
        ok = false;
      }
      if (exitCode !== 3) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.exit_code", message: "not_applicable scan must exit 3" });
        ok = false;
      }
    } else if (analysis.status === "error") {
      const validErrorReasons = ["invalid_usage", "output_failure"];
      if (!validErrorReasons.includes(analysis.reason)) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.analysis.reason", message: "Invalid error reason" });
        ok = false;
      }
      if (exitCode !== 2) {
        issues.push({ code: "INVALID_SCHEMA", path: "static_report.exit_code", message: "error scan must exit 2" });
        ok = false;
      }
    }
  }
  return ok;
}
