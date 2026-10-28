// scripts/test-assurance/validate.ts
import fs from "node:fs";
import {
  compareLexicographical,
  computeSha256,
  MAX_EVIDENCE_ARTIFACT_BYTES,
  MAX_JSON_BYTES,
  readCallerRegularFile,
  readContainedRegularFile,
  recomputeRepositoryCategoryInventory,
  type TraversalBudget,
} from "./io";
import {
  checkExactKeys,
  isPathInRoots,
  isRecord,
  validateArtifactObject,
  validateExecutionObject,
  validateIntentObject,
  validateScanReportObject,
  validateSnapshotObject,
  validateVariantManifestObject,
} from "./schema";
import type {
  Artifact,
  AssuranceRequirement,
  Challenge,
  Execution,
  ExecutionEnvironment,
  InputGroup,
  Intent,
  Snapshot,
  ValidationIssue,
  ValidationResult,
  VariantManifest,
} from "./types";

export type ValidateOptions = {
  bundlePath: string;
  evidenceRoot: string;
  repoRoot: string;
  currentPath: string;
  require: AssuranceRequirement;
};

export function compareEnvironment(left: ExecutionEnvironment, right: ExecutionEnvironment): boolean {
  return (
    left.os === right.os &&
    left.arch === right.arch &&
    left.runner === right.runner &&
    left.runner_version === right.runner_version
  );
}

export function compareInputGroupEquality(left: InputGroup, right: InputGroup): boolean {
  if (left.roots.length !== right.roots.length) return false;
  const sortedLeftRoots = [...left.roots].sort(compareLexicographical);
  const sortedRightRoots = [...right.roots].sort(compareLexicographical);
  for (let i = 0; i < sortedLeftRoots.length; i++) {
    if (sortedLeftRoots[i] !== sortedRightRoots[i]) return false;
  }

  if (left.files.length !== right.files.length) return false;
  for (let i = 0; i < left.files.length; i++) {
    if (left.files[i].path !== right.files[i].path || left.files[i].sha256 !== right.files[i].sha256) {
      return false;
    }
  }
  return true;
}

export function compareSnapshotEquality(left: Snapshot, right: Snapshot): boolean {
  return (
    left.repository === right.repository &&
    left.commit === right.commit &&
    left.dirty === right.dirty &&
    compareInputGroupEquality(left.inputs.source, right.inputs.source) &&
    compareInputGroupEquality(left.inputs.tests, right.inputs.tests) &&
    compareInputGroupEquality(left.inputs.dependencies, right.inputs.dependencies) &&
    compareInputGroupEquality(left.inputs.config, right.inputs.config)
  );
}

export function verifyContainedEvidenceArtifact(
  evidenceRoot: string,
  artifact: Artifact,
  maxBytes: number,
  pathPrefix: string,
  issues: ValidationIssue[],
): { ok: true; buffer: Buffer } | { ok: false; code: string } {
  const readRes = readContainedRegularFile(evidenceRoot, artifact.path, maxBytes);
  if (!readRes.ok) {
    if (readRes.code === "ENOENT") {
      issues.push({
        code: "ARTIFACT_MISSING",
        path: pathPrefix + ".path",
        message: "Captured evidence artifact missing from evidence root",
      });
      return { ok: false, code: "ARTIFACT_MISSING" };
    }
    if (readRes.code === "INPUT_TOO_LARGE") {
      issues.push({
        code: "ARTIFACT_TOO_LARGE",
        path: pathPrefix + ".path",
        message: "Captured evidence artifact exceeds maximum size",
      });
      return { ok: false, code: "ARTIFACT_TOO_LARGE" };
    }
    issues.push({
      code: "UNSAFE_PATH",
      path: pathPrefix + ".path",
      message: "Unsafe path or unreadable artifact",
    });
    return { ok: false, code: "UNSAFE_PATH" };
  }

  const computed = computeSha256(readRes.buffer);
  if (computed !== artifact.sha256) {
    issues.push({
      code: "ARTIFACT_DIGEST_MISMATCH",
      path: pathPrefix + ".sha256",
      message: "Captured evidence artifact digest mismatch",
    });
    return { ok: false, code: "ARTIFACT_DIGEST_MISMATCH" };
  }
  return { ok: true, buffer: readRes.buffer };
}

export function validate(options: ValidateOptions): ValidationResult {
  const issues: ValidationIssue[] = [];
  const requested = options.require;
  let exitCodePrecedence: 0 | 1 | 2 = 0;

  let declarationVerdict: "valid" | "invalid" = "valid";
  let staticVerdict: "absent" | "complete" | "incomplete" | "not_applicable" | "invalid" = "absent";
  let executionVerdict: "absent" | "passed" | "failed" | "invalid" = "absent";
  let faultVerdict: "absent" | "demonstrated" | "not_detected" | "invalid" = "absent";
  let freshnessVerdict: "not_applicable" | "current" | "stale" | "invalid" = "not_applicable";
  let reviewVerdict: "absent" | "accepted" | "rejected" = "absent";

  try {
    // 1. Validate requested option
    const validRequires: AssuranceRequirement[] = ["declared", "executed", "fault"];
    if (!validRequires.includes(requested)) {
      issues.push({ code: "INVALID_USAGE", path: "require", message: "Invalid --require flag value" });
      return {
        schema_version: 1,
        trust: "local-untrusted",
        // SEC-4: an out-of-contract --require value is never echoed into the result
        requested: "declared",
        satisfied: false,
        declaration: "invalid",
        static: "invalid",
        execution: "invalid",
        fault: "invalid",
        freshness: "invalid",
        review: "absent",
        issues,
        exit_code: 2,
      };
    }

    // 2. Read caller current.json (SEC-5 post-read identity protected)
    const currentRead = readCallerRegularFile(options.currentPath, MAX_JSON_BYTES);
    if (!currentRead.ok) {
      issues.push({
        code: "INVALID_USAGE",
        path: "current",
        message: "Missing, unreadable, or invalid current.json file",
      });
      return {
        schema_version: 1,
        trust: "local-untrusted",
        requested,
        satisfied: false,
        declaration: "invalid",
        static: "invalid",
        execution: "invalid",
        fault: "invalid",
        freshness: "invalid",
        review: "absent",
        issues,
        exit_code: 2,
      };
    }

    let currentParsed: unknown;
    try {
      currentParsed = JSON.parse(currentRead.buffer.toString("utf8"));
    } catch {
      issues.push({ code: "INVALID_SCHEMA", path: "current", message: "current.json is not valid JSON" });
      return {
        schema_version: 1,
        trust: "local-untrusted",
        requested,
        satisfied: false,
        declaration: "invalid",
        static: "invalid",
        execution: "invalid",
        fault: "invalid",
        freshness: "invalid",
        review: "absent",
        issues,
        exit_code: 2,
      };
    }

    const currentIssues: ValidationIssue[] = [];
    if (!validateSnapshotObject(currentParsed, "current", currentIssues)) {
      issues.push(...currentIssues);
      return {
        schema_version: 1,
        trust: "local-untrusted",
        requested,
        satisfied: false,
        declaration: "invalid",
        static: "invalid",
        execution: "invalid",
        fault: "invalid",
        freshness: "invalid",
        review: "absent",
        issues,
        exit_code: 2,
      };
    }
    const currentSnapshot = currentParsed as Snapshot;

    // 3. Inspect repository root
    try {
      const repoStat = fs.lstatSync(options.repoRoot);
      if (repoStat.isSymbolicLink() || !repoStat.isDirectory()) {
        issues.push({ code: "INVALID_USAGE", path: "repo-root", message: "repo-root must be a directory and not a symlink" });
        return {
          schema_version: 1,
          trust: "local-untrusted",
          requested,
          satisfied: false,
          declaration: "invalid",
          static: "invalid",
          execution: "invalid",
          fault: "invalid",
          freshness: "invalid",
          review: "absent",
          issues,
          exit_code: 2,
        };
      }
    } catch (err: unknown) {
      // Fail closed, but never disguise an internal/programming error as caller misuse.
      // A filesystem failure carries a string `code`; anything else is our own defect.
      const isFsError =
        typeof err === "object" && err !== null && "code" in err && typeof err.code === "string";
      issues.push(
        isFsError
          ? { code: "INVALID_USAGE", path: "repo-root", message: "repo-root is inaccessible" }
          : { code: "INTERNAL_ERROR", path: "repo-root", message: "Repository root inspection failed unexpectedly" },
      );
      return {
        schema_version: 1,
        trust: "local-untrusted",
        requested,
        satisfied: false,
        declaration: "invalid",
        static: "invalid",
        execution: "invalid",
        fault: "invalid",
        freshness: "invalid",
        review: "absent",
        issues,
        exit_code: 2,
      };
    }

    // 4. Recompute repository tree against current.json with shared traversal budget (SEC-1)
    let repositoryCurrentTreeMatch = true;
    const traversalBudget: TraversalBudget = { visitedEntries: 0, files: 0 };
    const visitedPaths = new Set<string>();

    for (const cat of ["source", "tests", "dependencies", "config"] as const) {
      const group = currentSnapshot.inputs[cat];
      const recomputed = recomputeRepositoryCategoryInventory(
        options.repoRoot,
        group.roots,
        traversalBudget,
        issues,
        visitedPaths,
      );
      if (!recomputed.ok) {
        if (recomputed.isInvalid) {
          exitCodePrecedence = 2;
          freshnessVerdict = "invalid";
          repositoryCurrentTreeMatch = false;
          break;
        }
        if (recomputed.isStale) {
          repositoryCurrentTreeMatch = false;
        }
      } else {
        if (!compareInputGroupEquality({ roots: group.roots, files: recomputed.files }, group)) {
          repositoryCurrentTreeMatch = false;
        }
      }
    }

    // 5. Read bundle.json (SEC-5 post-read identity protected)
    const bundleRead = readCallerRegularFile(options.bundlePath, MAX_JSON_BYTES);
    if (!bundleRead.ok) {
      issues.push({ code: "INVALID_USAGE", path: "bundle", message: "Cannot read bundle.json" });
      return {
        schema_version: 1,
        trust: "local-untrusted",
        requested,
        satisfied: false,
        declaration: "invalid",
        static: "invalid",
        execution: "invalid",
        fault: "invalid",
        freshness: "invalid",
        review: "absent",
        issues,
        exit_code: 2,
      };
    }

    let bundleParsed: unknown;
    try {
      bundleParsed = JSON.parse(bundleRead.buffer.toString("utf8"));
    } catch {
      issues.push({ code: "INVALID_SCHEMA", path: "bundle", message: "bundle.json is not valid JSON" });
      return {
        schema_version: 1,
        trust: "local-untrusted",
        requested,
        satisfied: false,
        declaration: "invalid",
        static: "invalid",
        execution: "invalid",
        fault: "invalid",
        freshness: "invalid",
        review: "absent",
        issues,
        exit_code: 2,
      };
    }

    if (
      !checkExactKeys(
        bundleParsed,
        ["schema_version", "trust", "intent", "baseline", "challenge", "static_report", "review"],
        "bundle",
        issues,
      )
    ) {
      return {
        schema_version: 1,
        trust: "local-untrusted",
        requested,
        satisfied: false,
        declaration: "invalid",
        static: "invalid",
        execution: "invalid",
        fault: "invalid",
        freshness: "invalid",
        review: "absent",
        issues,
        exit_code: 2,
      };
    }

    const rawBundle = bundleParsed as Record<string, unknown>;
    if (rawBundle.schema_version !== 1) {
      issues.push({ code: "INVALID_SCHEMA", path: "bundle.schema_version", message: "Unknown schema_version" });
      declarationVerdict = "invalid";
      exitCodePrecedence = 2;
    }
    if (rawBundle.trust !== "local-untrusted") {
      issues.push({ code: "INVALID_SCHEMA", path: "bundle.trust", message: "trust must be local-untrusted" });
      declarationVerdict = "invalid";
      exitCodePrecedence = 2;
    }

    // 6. Validate Intent (F5 / SEC-3: validatedIntent is strictly typed and non-null on success)
    let validatedIntent: Intent | null = null;
    const intentIssues: ValidationIssue[] = [];
    if (!validateIntentObject(rawBundle.intent, "bundle.intent", intentIssues)) {
      issues.push(...intentIssues);
      declarationVerdict = "invalid";
      exitCodePrecedence = 2;
    } else {
      validatedIntent = rawBundle.intent;
      const oraArtifactRes = verifyContainedEvidenceArtifact(
        options.evidenceRoot,
        validatedIntent.oracle.ref,
        MAX_EVIDENCE_ARTIFACT_BYTES,
        "bundle.intent.oracle.ref",
        issues,
      );
      if (!oraArtifactRes.ok) {
        declarationVerdict = "invalid";
        exitCodePrecedence = 2;
      }
    }

    // 7. Validate Baseline Execution
    let baselineObj: Execution | null = null;
    if (rawBundle.baseline !== null) {
      const baseIssues: ValidationIssue[] = [];
      if (!validateExecutionObject(rawBundle.baseline, "bundle.baseline", baseIssues)) {
        issues.push(...baseIssues);
        executionVerdict = "invalid";
        exitCodePrecedence = 2;
      } else {
        baselineObj = rawBundle.baseline;
        if (validatedIntent !== null) {
          if (baselineObj.intent_id !== validatedIntent.id) {
            issues.push({ code: "INVALID_SCHEMA", path: "bundle.baseline.intent_id", message: "baseline intent_id does not match intent.id" });
            executionVerdict = "invalid";
            exitCodePrecedence = 2;
          }
          if (baselineObj.command !== validatedIntent.command) {
            issues.push({ code: "INVALID_SCHEMA", path: "bundle.baseline.command", message: "baseline command does not match intent.command" });
            executionVerdict = "invalid";
            exitCodePrecedence = 2;
          }
        }
        for (let i = 0; i < baselineObj.artifacts.length; i++) {
          const art = baselineObj.artifacts[i];
          const artRes = verifyContainedEvidenceArtifact(
            options.evidenceRoot,
            art,
            MAX_EVIDENCE_ARTIFACT_BYTES,
            "bundle.baseline.artifacts[" + i + "]",
            issues,
          );
          if (!artRes.ok) {
            executionVerdict = "invalid";
            exitCodePrecedence = 2;
          }
        }
        if (executionVerdict !== "invalid") {
          executionVerdict = baselineObj.outcome === "passed" ? "passed" : "failed";
        }
      }
    } else {
      executionVerdict = "absent";
    }

    // 8. Validate Challenge (F3, F4, F5/SEC-3)
    if (rawBundle.challenge !== null) {
      if (rawBundle.baseline === null) {
        issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge", message: "Challenge cannot exist without baseline" });
        faultVerdict = "invalid";
        exitCodePrecedence = 2;
      } else if (
        !checkExactKeys(
          rawBundle.challenge,
          ["fault_id", "description", "variant", "execution", "adjudication"],
          "bundle.challenge",
          issues,
        )
      ) {
        faultVerdict = "invalid";
        exitCodePrecedence = 2;
      } else {
        const ch = rawBundle.challenge as Record<string, unknown>;
        let chValid = true;
        if (typeof ch.fault_id !== "string" || ch.fault_id.trim() === "") {
          issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.fault_id", message: "Invalid fault_id" });
          chValid = false;
        }
        if (typeof ch.description !== "string" || ch.description.trim() === "") {
          issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.description", message: "Invalid description" });
          chValid = false;
        }
        if (!validateArtifactObject(ch.variant, "bundle.challenge.variant", issues)) {
          chValid = false;
        }
        if (!validateExecutionObject(ch.execution, "bundle.challenge.execution", issues)) {
          chValid = false;
        }
        if (
          !checkExactKeys(
            ch.adjudication,
            ["reviewer", "oracle_ref", "artifact_path", "marker", "classification"],
            "bundle.challenge.adjudication",
            issues,
          )
        ) {
          chValid = false;
        } else {
          const adj = ch.adjudication as Record<string, unknown>;
          const validClassifications = ["intended_assertion", "unrelated_failure", "invalid_variant"];
          if (!validClassifications.includes(adj.classification as string)) {
            issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.adjudication.classification", message: "Invalid classification" });
            chValid = false;
          }
          for (const k of ["reviewer", "oracle_ref", "artifact_path", "marker"]) {
            if (typeof adj[k] !== "string" || (adj[k] as string).trim() === "") {
              issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.adjudication." + k, message: "Invalid " + k });
              chValid = false;
            }
          }
        }

        if (!chValid) {
          faultVerdict = "invalid";
          exitCodePrecedence = 2;
        } else {
          const challengeObj = ch as unknown as Challenge;
          const chExec = challengeObj.execution;

          // F3: Challenge execution MUST bind to intent.id
          if (validatedIntent !== null) {
            if (chExec.intent_id !== validatedIntent.id) {
              issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.execution.intent_id", message: "challenge intent_id does not match intent.id" });
              faultVerdict = "invalid";
              exitCodePrecedence = 2;
            }
          } else {
            faultVerdict = "invalid";
            exitCodePrecedence = 2;
          }

          // Challenge variant artifact read & parse
          const varRes = verifyContainedEvidenceArtifact(
            options.evidenceRoot,
            challengeObj.variant,
            MAX_EVIDENCE_ARTIFACT_BYTES,
            "bundle.challenge.variant",
            issues,
          );
          let variantManifest: VariantManifest | null = null;
          if (!varRes.ok) {
            faultVerdict = "invalid";
            exitCodePrecedence = 2;
          } else {
            try {
              const vParsed = JSON.parse(varRes.buffer.toString("utf8"));
              if (!validateVariantManifestObject(vParsed, "variant_manifest", issues)) {
                faultVerdict = "invalid";
                exitCodePrecedence = 2;
              } else {
                variantManifest = vParsed;
              }
            } catch {
              issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.variant", message: "Variant manifest is not valid JSON" });
              faultVerdict = "invalid";
              exitCodePrecedence = 2;
            }
          }

          // Verify captured challenge execution artifacts
          const capturedMap = new Map<string, Buffer>();
          for (let i = 0; i < chExec.artifacts.length; i++) {
            const art = chExec.artifacts[i];
            const artRes = verifyContainedEvidenceArtifact(
              options.evidenceRoot,
              art,
              MAX_EVIDENCE_ARTIFACT_BYTES,
              "bundle.challenge.execution.artifacts[" + i + "]",
              issues,
            );
            if (!artRes.ok) {
              faultVerdict = "invalid";
              exitCodePrecedence = 2;
            } else {
              capturedMap.set(art.path, artRes.buffer);
            }
          }

          // Consistency against baseline (F6: property-order independent canonical comparisons)
          if (baselineObj) {
            if (chExec.command !== baselineObj.command) {
              issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.execution.command", message: "Challenge command must match baseline command" });
              faultVerdict = "invalid";
              exitCodePrecedence = 2;
            }
            if (!compareEnvironment(chExec.environment, baselineObj.environment)) {
              issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.execution.environment", message: "Challenge environment must match baseline environment" });
              faultVerdict = "invalid";
              exitCodePrecedence = 2;
            }
            if (chExec.snapshot.repository !== baselineObj.snapshot.repository) {
              issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.execution.snapshot.repository", message: "Challenge repository must match baseline repository" });
              faultVerdict = "invalid";
              exitCodePrecedence = 2;
            }
            if (chExec.snapshot.commit !== baselineObj.snapshot.commit) {
              issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.execution.snapshot.commit", message: "Challenge commit must match baseline commit" });
              faultVerdict = "invalid";
              exitCodePrecedence = 2;
            }
            for (const cat of ["tests", "dependencies", "config"] as const) {
              if (!compareInputGroupEquality(chExec.snapshot.inputs[cat], baselineObj.snapshot.inputs[cat])) {
                issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.execution.snapshot.inputs." + cat, message: "Challenge " + cat + " must match baseline" });
                faultVerdict = "invalid";
                exitCodePrecedence = 2;
              }
            }

            // Source roots equality
            const baseSrcRoots = baselineObj.snapshot.inputs.source.roots;
            const chSrcRoots = chExec.snapshot.inputs.source.roots;
            if (
              baseSrcRoots.length !== chSrcRoots.length ||
              baseSrcRoots.some((r, idx) => r !== chSrcRoots[idx])
            ) {
              issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.execution.snapshot.inputs.source.roots", message: "Challenge source roots must match baseline source roots" });
              faultVerdict = "invalid";
              exitCodePrecedence = 2;
            }

            // F4: All challenge source files MUST belong to approved source roots
            for (const sf of chExec.snapshot.inputs.source.files) {
              if (!isPathInRoots(sf.path, baseSrcRoots)) {
                issues.push({ code: "INVALID_SCHEMA", path: "bundle.challenge.execution.snapshot.inputs.source.files", message: "Challenge source file outside approved source roots" });
                faultVerdict = "invalid";
                exitCodePrecedence = 2;
              }
            }

            // F4: Complete source inventory difference & manifest source-root membership
            if (variantManifest && faultVerdict !== "invalid") {
              const baseSrcMap = new Map<string, string>();
              for (const f of baselineObj.snapshot.inputs.source.files) baseSrcMap.set(f.path, f.sha256);
              const chSrcMap = new Map<string, string>();
              for (const f of chExec.snapshot.inputs.source.files) chSrcMap.set(f.path, f.sha256);

              const changedPathsInManifest = new Set<string>();
              for (const c of variantManifest.changes) {
                changedPathsInManifest.add(c.path);

                // F4: Manifest change path must belong to approved source roots
                if (!isPathInRoots(c.path, baseSrcRoots)) {
                  issues.push({ code: "INVALID_SCHEMA", path: "variant_manifest.changes", message: "Variant manifest change path outside approved source roots" });
                  faultVerdict = "invalid";
                  exitCodePrecedence = 2;
                }

                const baseExpected = baseSrcMap.get(c.path) ?? null;
                const chExpected = chSrcMap.get(c.path) ?? null;
                if (c.before_sha256 !== baseExpected) {
                  issues.push({ code: "INVALID_SCHEMA", path: "variant_manifest.changes", message: "before_sha256 does not match baseline source inventory" });
                  faultVerdict = "invalid";
                  exitCodePrecedence = 2;
                }
                if (c.after_sha256 !== chExpected) {
                  issues.push({ code: "INVALID_SCHEMA", path: "variant_manifest.changes", message: "after_sha256 does not match challenge source inventory" });
                  faultVerdict = "invalid";
                  exitCodePrecedence = 2;
                }
              }

              // Check no other differences exist between baseSrcMap and chSrcMap
              const allSrcPaths = new Set([...baseSrcMap.keys(), ...chSrcMap.keys()]);
              for (const p of allSrcPaths) {
                const bSha = baseSrcMap.get(p) ?? null;
                const cSha = chSrcMap.get(p) ?? null;
                if (bSha !== cSha) {
                  if (!changedPathsInManifest.has(p)) {
                    issues.push({ code: "INVALID_SCHEMA", path: "variant_manifest.changes", message: "changes list does not match complete source inventory difference" });
                    faultVerdict = "invalid";
                    exitCodePrecedence = 2;
                  }
                } else {
                  if (changedPathsInManifest.has(p)) {
                    issues.push({ code: "INVALID_SCHEMA", path: "variant_manifest.changes", message: "Identical path listed in variant manifest changes" });
                    faultVerdict = "invalid";
                    exitCodePrecedence = 2;
                  }
                }
              }
            }
          }

          // Fault demonstration judgment (F5/SEC-3: safe against malformed intent)
          if (faultVerdict !== "invalid") {
            if (validatedIntent === null) {
              faultVerdict = "invalid";
              exitCodePrecedence = 2;
            } else {
              const adj = challengeObj.adjudication;
              const markerBuf = capturedMap.get(adj.artifact_path);
              const markerFound = markerBuf !== undefined && markerBuf.toString("utf8").includes(adj.marker);

              const isDemonstrated =
                baselineObj !== null &&
                baselineObj.outcome === "passed" &&
                chExec.outcome === "assertion_failed" &&
                adj.classification === "intended_assertion" &&
                adj.reviewer.trim().length > 0 &&
                chExec.failure?.oracle_ref === validatedIntent.oracle.ref.path &&
                adj.oracle_ref === validatedIntent.oracle.ref.path &&
                adj.marker === chExec.failure?.marker &&
                adj.artifact_path === chExec.failure?.artifact_path &&
                markerFound;

              if (isDemonstrated) {
                faultVerdict = "demonstrated";
              } else {
                faultVerdict = "not_detected";
              }
            }
          }
        }
      }
    } else {
      faultVerdict = "absent";
    }

    // 9. Validate Static Report (F1: Full strict TestGuard adapter)
    if (rawBundle.static_report !== null) {
      if (!validateArtifactObject(rawBundle.static_report, "bundle.static_report", issues)) {
        staticVerdict = "invalid";
        exitCodePrecedence = 2;
      } else {
        const repRes = verifyContainedEvidenceArtifact(
          options.evidenceRoot,
          rawBundle.static_report as Artifact,
          MAX_EVIDENCE_ARTIFACT_BYTES,
          "bundle.static_report",
          issues,
        );
        if (!repRes.ok) {
          staticVerdict = "invalid";
          exitCodePrecedence = 2;
        } else {
          try {
            const repParsed = JSON.parse(repRes.buffer.toString("utf8"));
            if (!validateScanReportObject(repParsed, issues)) {
              staticVerdict = "invalid";
              exitCodePrecedence = 2;
            } else {
              // Mapping of a recognized TestGuard envelope to the static dimension:
              // complete -> complete; incomplete|error -> incomplete (an error envelope
              // such as invalid_usage/output_failure performed no analysis, so it is
              // disclosed as incomplete evidence and is never promoted); not_applicable
              // -> not_applicable. A static report never satisfies executed/fault.
              if (repParsed.analysis.status === "complete") {
                staticVerdict = "complete";
              } else if (repParsed.analysis.status === "incomplete" || repParsed.analysis.status === "error") {
                staticVerdict = "incomplete";
              } else if (repParsed.analysis.status === "not_applicable") {
                staticVerdict = "not_applicable";
              } else {
                staticVerdict = "invalid";
                exitCodePrecedence = 2;
              }
            }
          } catch {
            issues.push({ code: "INVALID_SCHEMA", path: "bundle.static_report", message: "static_report is not valid JSON" });
            staticVerdict = "invalid";
            exitCodePrecedence = 2;
          }
        }
      }
    } else {
      staticVerdict = "absent";
    }

    // 10. Validate Review
    if (rawBundle.review !== null) {
      if (!checkExactKeys(rawBundle.review, ["reviewer", "decision", "rationale"], "bundle.review", issues)) {
        exitCodePrecedence = 2;
      } else {
        const rev = rawBundle.review as Record<string, unknown>;
        if (typeof rev.reviewer !== "string" || rev.reviewer.trim() === "") {
          issues.push({ code: "INVALID_SCHEMA", path: "bundle.review.reviewer", message: "Invalid reviewer" });
          exitCodePrecedence = 2;
        }
        if (rev.decision !== "accepted" && rev.decision !== "rejected") {
          issues.push({ code: "INVALID_SCHEMA", path: "bundle.review.decision", message: "Invalid decision" });
          exitCodePrecedence = 2;
        } else {
          reviewVerdict = rev.decision;
        }
        if (typeof rev.rationale !== "string") {
          issues.push({ code: "INVALID_SCHEMA", path: "bundle.review.rationale", message: "Invalid rationale" });
          exitCodePrecedence = 2;
        }
      }
    } else {
      reviewVerdict = "absent";
    }

    // 11. Freshness evaluation (F6: Canonical property-order independent snapshot comparison)
    if (freshnessVerdict !== "invalid") {
      if (!repositoryCurrentTreeMatch) {
        freshnessVerdict = "stale";
      } else if (baselineObj !== null) {
        const snapMatches = compareSnapshotEquality(baselineObj.snapshot, currentSnapshot);
        freshnessVerdict = snapMatches ? "current" : "stale";
      } else {
        freshnessVerdict = "not_applicable";
      }
    }
  } catch {
    // Defense-in-depth: an unexpected throw stays fail-closed (structured result, exit 2)
    // but is labeled as our own defect rather than the caller's malformed input.
    issues.push({ code: "INTERNAL_ERROR", path: "validation", message: "Unexpected validation error" });
    exitCodePrecedence = 2;
    declarationVerdict = "invalid";
  }

  // 12. Satisfaction evaluation (F2: ANY invalid condition sets satisfied = false)
  const anyInvalidCondition =
    declarationVerdict === "invalid" ||
    staticVerdict === "invalid" ||
    executionVerdict === "invalid" ||
    faultVerdict === "invalid" ||
    freshnessVerdict === "invalid" ||
    exitCodePrecedence === 2;

  let satisfied = false;
  const isDeclValid = declarationVerdict === "valid";
  const isReviewAccepted = reviewVerdict !== "rejected";
  const isFresh = freshnessVerdict === "current";
  const isNotStale = freshnessVerdict !== "stale" && freshnessVerdict !== "invalid";

  if (!anyInvalidCondition) {
    if (requested === "declared") {
      satisfied = isDeclValid && isNotStale && isReviewAccepted;
    } else if (requested === "executed") {
      satisfied = isDeclValid && executionVerdict === "passed" && isFresh && isReviewAccepted;
    } else if (requested === "fault") {
      satisfied =
        isDeclValid &&
        executionVerdict === "passed" &&
        faultVerdict === "demonstrated" &&
        isFresh &&
        isReviewAccepted;
    }
  }

  // 13. Exit code computation (SRS §5 & F2)
  let exitCode: 0 | 1 | 2 = 0;
  if (anyInvalidCondition) {
    exitCode = 2;
    satisfied = false; // F2: Invariant: satisfied is always false on exit 2
  } else if (
    freshnessVerdict === "stale" ||
    !satisfied ||
    reviewVerdict === "rejected"
  ) {
    exitCode = 1;
    satisfied = false;
    if (!satisfied && !issues.some((i) => i.code === "INSUFFICIENT_EVIDENCE")) {
      issues.push({
        code: "INSUFFICIENT_EVIDENCE",
        path: "requirements",
        message: "Requested assurance level was not satisfied",
      });
    }
    if (reviewVerdict === "rejected" && !issues.some((i) => i.code === "REVIEW_REJECTED")) {
      issues.push({
        code: "REVIEW_REJECTED",
        path: "bundle.review",
        message: "Review record indicates rejection",
      });
    }
    if (freshnessVerdict === "stale" && !issues.some((i) => i.code === "INVENTORY_DRIFT")) {
      issues.push({
        code: "INVENTORY_DRIFT",
        path: "freshness",
        message: "Historical input inventory drift or tree mismatch detected",
      });
    }
  } else {
    exitCode = 0;
  }

  return {
    schema_version: 1,
    trust: "local-untrusted",
    requested,
    satisfied,
    declaration: declarationVerdict,
    static: staticVerdict,
    execution: executionVerdict,
    fault: faultVerdict,
    freshness: freshnessVerdict,
    review: reviewVerdict,
    issues,
    exit_code: exitCode,
  };
}
