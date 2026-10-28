// scripts/test-assurance/index.ts
import fs from "node:fs";
import path from "node:path";
import { validate, type ValidateOptions } from "./validate";
import type { AssuranceRequirement, ValidationResult } from "./types";

// SEC-4: only in-contract values reach the result's requested field
function sanitizeRequirement(value: string | undefined): AssuranceRequirement {
  return value === "executed" || value === "fault" ? value : "declared";
}

type ParsedArgs = {
  bundle?: string;
  evidenceRoot?: string;
  repoRoot?: string;
  current?: string;
  require?: string;
  json: boolean;
  help: boolean;
  unknownTokens: string[];
  missingValueFlags: string[];
};

function parseArgs(argv: string[]): ParsedArgs {
  const parsed: ParsedArgs = {
    json: false,
    help: false,
    unknownTokens: [],
    missingValueFlags: [],
  };
  const VALUED_FLAGS: Record<string, true> = {
    "--bundle": true,
    "--evidence-root": true,
    "--repo-root": true,
    "--current": true,
    "--require": true,
  };

  for (let i = 0; i < argv.length; i++) {
    const token = argv[i];
    if (token === "--help" || token === "-h") {
      parsed.help = true;
    } else if (token === "--json") {
      parsed.json = true;
    } else if (Object.hasOwn(VALUED_FLAGS, token)) {
      if (i + 1 >= argv.length || argv[i + 1].startsWith("--")) {
        parsed.missingValueFlags.push(token);
      } else {
        const val = argv[++i];
        if (token === "--bundle") parsed.bundle = val;
        else if (token === "--evidence-root") parsed.evidenceRoot = val;
        else if (token === "--repo-root") parsed.repoRoot = val;
        else if (token === "--current") parsed.current = val;
        else if (token === "--require") parsed.require = val;
      }
    } else {
      parsed.unknownTokens.push(token);
    }
  }
  return parsed;
}

export function formatHumanOutput(result: ValidationResult): string {
  const lines: string[] = [
    "AI Test Assurance Validation Summary",
    "-----------------------------------",
    `Trust:       ${result.trust}`,
    `Requested:   ${result.requested}`,
    `Satisfied:   ${result.satisfied ? "yes" : "no"}`,
    `Declaration: ${result.declaration}`,
    `Static:      ${result.static}`,
    `Execution:   ${result.execution}`,
    `Fault:       ${result.fault}`,
    `Freshness:   ${result.freshness}`,
    `Review:      ${result.review}`,
    `Exit Code:   ${result.exit_code}`,
  ];

  if (result.issues.length > 0) {
    lines.push("\nIssues:");
    for (const iss of result.issues) {
      lines.push(`  [${iss.code}] ${iss.path}: ${iss.message}`);
    }
  }
  return lines.join("\n");
}

export function run(argv: string[] = process.argv.slice(2)): { exitCode: number; output: string } {
  const parsed = parseArgs(argv);

  if (parsed.help) {
    const help = [
      "Usage: node --import tsx scripts/test-assurance/index.ts [options]",
      "",
      "Options:",
      "  --bundle <path>         Path to bundle.json (required)",
      "  --evidence-root <path>  Directory root for evidence artifacts (required)",
      "  --repo-root <path>      Directory root of repository under test (required)",
      "  --current <path>        Path to current.json snapshot (required)",
      "  --require <level>       Required assurance level: declared | executed | fault (required)",
      "  --json                  Output result as JSON object with newline",
      "  --help, -h              Show this help message",
      "",
      "Exit codes:",
      "  0: Satisfied required assurance level without stale or invalid conditions",
      "  1: Stale input inventory, insufficient evidence for level, or rejected review",
      "  2: Invalid arguments, malformed schemas, unreadable inputs, missing artifacts",
    ].join("\n");
    return { exitCode: 0, output: help };
  }

  // F7: Reject unknown tokens or missing values
  if (parsed.unknownTokens.length > 0 || parsed.missingValueFlags.length > 0) {
    const issues = [
      ...parsed.unknownTokens.map(() => ({
        code: "INVALID_USAGE",
        path: "arguments",
        message: "Unknown command-line argument",
      })),
      ...parsed.missingValueFlags.map((flag) => ({
        code: "INVALID_USAGE",
        path: flag,
        message: `Missing required value for flag: ${flag}`,
      })),
    ];

    const errorResult: ValidationResult = {
      schema_version: 1,
      trust: "local-untrusted",
      requested: sanitizeRequirement(parsed.require),
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

    const output = parsed.json ? JSON.stringify(errorResult) : formatHumanOutput(errorResult);
    return { exitCode: 2, output };
  }

  const { bundle: bundlePath, evidenceRoot, repoRoot, current: currentPath, require: requireVal } = parsed;

  if (!bundlePath || !evidenceRoot || !repoRoot || !currentPath || !requireVal) {
    const missing: string[] = [];
    if (!bundlePath) missing.push("--bundle");
    if (!evidenceRoot) missing.push("--evidence-root");
    if (!repoRoot) missing.push("--repo-root");
    if (!currentPath) missing.push("--current");
    if (!requireVal) missing.push("--require");

    const issues = missing.map((flag) => ({
      code: "INVALID_USAGE",
      path: flag,
      message: `Missing required command-line flag: ${flag}`,
    }));

    const errorResult: ValidationResult = {
      schema_version: 1,
      trust: "local-untrusted",
      requested: sanitizeRequirement(requireVal),
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

    const output = parsed.json ? JSON.stringify(errorResult) : formatHumanOutput(errorResult);
    return { exitCode: 2, output };
  }

  const options: ValidateOptions = {
    bundlePath,
    evidenceRoot,
    repoRoot,
    currentPath,
    require: requireVal as AssuranceRequirement,
  };

  const result = validate(options);
  const output = parsed.json ? JSON.stringify(result) : formatHumanOutput(result);
  return { exitCode: result.exit_code, output };
}

function isDirectExecution(): boolean {
  if (!process.argv[1]) return false;
  try {
    const resolvedArgv = fs.realpathSync(process.argv[1]);
    const resolvedSelf = fs.realpathSync(__filename);
    return resolvedArgv === resolvedSelf;
  } catch {
    try {
      return path.resolve(process.argv[1]) === path.resolve(__filename);
    } catch {
      return false;
    }
  }
}

if (isDirectExecution()) {
  const { exitCode, output } = run();
  try {
    process.stdout.write(output + "\n");
    process.exitCode = exitCode;
  } catch {
    process.stderr.write("Failed to write to stdout\n");
    process.exitCode = 2;
  }
}
