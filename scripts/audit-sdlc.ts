import fs from "fs-extra";
import path from "path";
import pc from "picocolors";
import { DEFAULT_WORKFLOWS } from "../cli/src/constants";

const ROOT = path.join(__dirname, "..");
const WORKFLOWS_DIR = path.join(ROOT, ".agents", "workflows");
const CODEX_SKILLS_DIR = path.join(ROOT, ".codex", "skills");
const CODEX_AGENTS_DIR = path.join(ROOT, ".codex", "agents");
const PROMPTS_DIR = path.join(ROOT, ".github", "prompts");
const QUICK_REFERENCE_FILE = path.join(
  ROOT,
  "docs",
  "sdlc-workflow-quick-reference.md",
);

const REQUIRED_WORKFLOWS = [...new Set(DEFAULT_WORKFLOWS)];
const REQUIRED_REQUIREMENT_TERMS = ["BRD-lite", "PRD", "SRS/FRS"];
const AGENTIC_RUNTIME_WORKFLOWS = [
  "sdlc",
  "brainstorm-feature",
  "plan-feature",
  "system-design-session",
  "design-solution",
  "implementation-readiness",
  "implement-feature",
  "verify-work",
  "retro-learn",
  "uat-signoff",
  "incident-hotfix",
];
const REQUIRED_RUNTIME_SECTIONS = [
  "## Runtime Contract",
  "## Handoff Payload",
  "## Blocking Questions",
  "## Next Workflow",
];
const REQUIRED_COST_CALL = "get_session_cost";
const SECURITY_ARTIFACT_MARKDOWN = "artifacts/security-review.md";
const TRUST_POLICY_REFERENCE = "trust-review-policy.md";
const SECURITY_EVIDENCE_WORKFLOWS = [
  "code-review",
  "review-ticket",
  "codebase-review",
  "security-test",
  "pentest",
];
const SECURITY_ARTIFACT_CONTRACT_TERMS = [
  "source provenance",
  "runtime contract",
  "review context",
  "handoff",
];
const SECURITY_FINDING_QUALITY_TERMS = ["exploit path", "confidence"];
const TRUST_POLICY_WORKFLOWS = [
  "code-review",
  "review-ticket",
  "security-test",
];

// Core BA->PM->IT->QA->release chain that the `sdlc` router must be able to reach.
// Adjacent/specialist workflows (pentest, security-test, skill-benchmark, battle-test,
// update-docs, zephyr-coverage-analysis) are invoked directly and are not routed by sdlc.
const CORE_SDLC_CHAIN = [
  "brainstorm-feature",
  "plan-feature",
  "system-design-session",
  "design-solution",
  "implementation-readiness",
  "implement-feature",
  "verify-work",
  "uat-signoff",
  "traceability-audit",
  "deploy-release",
  "publish-notes",
  "retro-learn",
  "session-report",
  "dev-fix",
  "review-ticket",
  "code-review",
  "codebase-review",
  "verify-bug",
  "incident-hotfix",
];

// Workflows that talk directly to the requesting operator and must carry `operator_profile`
// in their Handoff Payload per `common-operator-profile`. Implementation-side workflows only
// carry the key without register rules and are not required to declare it explicitly.
const OPERATOR_FACING_WORKFLOWS = [
  "sdlc",
  "brainstorm-feature",
  "plan-feature",
  "system-design-session",
  "verify-work",
  "uat-signoff",
  "publish-notes",
  "session-report",
];

const NEXT_WORKFLOW_ALIASES = new Set(["none", "n/a", ""]);

interface WorkflowRule {
  maxLines?: number;
  requireGoal?: boolean;
  requireOutputTemplate?: boolean;
  notes?: string;
}

/**
 * Explicit per-workflow rule map defining line count limits and structure requirements.
 * Documented Exception Policy:
 * 1. Default limits (80 lines, Goal section, and Output Template section) apply to all standard
 *    step-by-step tasks (STRICT workflows).
 * 2. Exceptions are allowed for complex, multi-artifact lifecycles or orchestrators (e.g., dev-fix,
 *    verify-bug, codebase-review) that generate custom documents/scorecards instead of a single output
 *    template, or require more verbose steps/context.
 */
const WORKFLOW_RULES: Record<string, WorkflowRule> = {
  // Strict standard tasks (<= 80 lines, must have Goal and Output Template)
  sdlc: {
    maxLines: 100,
    requireGoal: true,
    requireOutputTemplate: true,
    notes: "Router must enumerate the full workflow graph incl. post-verify tail (uat-signoff, deploy-release, incident-hotfix, traceability-audit, session-report, retro-learn, codebase-review).",
  },
  "brainstorm-feature": {
    maxLines: 80,
    requireGoal: true,
    requireOutputTemplate: true,
  },
  "plan-feature": {
    maxLines: 80,
    requireGoal: true,
    requireOutputTemplate: true,
  },
  "system-design-session": {
    maxLines: 80,
    requireGoal: true,
    requireOutputTemplate: true,
    notes:
      "Architecture/capacity session upstream of design-solution; phase-gated with adaptive depth.",
  },
  "design-solution": {
    maxLines: 80,
    requireGoal: true,
    requireOutputTemplate: true,
  },
  "implementation-readiness": {
    maxLines: 80,
    requireGoal: true,
    requireOutputTemplate: true,
  },
  "implement-feature": {
    maxLines: 80,
    requireGoal: true,
    requireOutputTemplate: true,
  },
  "review-ticket": {
    maxLines: 80,
    requireGoal: true,
    requireOutputTemplate: true,
  },
  "verify-work": {
    maxLines: 80,
    requireGoal: true,
    requireOutputTemplate: true,
  },
  "deploy-release": {
    maxLines: 80,
    requireGoal: true,
    requireOutputTemplate: true,
  },
  "traceability-audit": {
    maxLines: 80,
    requireGoal: true,
    requireOutputTemplate: true,
  },
  "session-report": {
    maxLines: 80,
    requireGoal: true,
    requireOutputTemplate: true,
  },
  "publish-notes": {
    maxLines: 80,
    requireGoal: true,
    requireOutputTemplate: true,
  },
  "retro-learn": {
    maxLines: 80,
    requireGoal: true,
    requireOutputTemplate: true,
  },

  // Exceptions / Complex workflows
  "code-review": {
    maxLines: 80,
    requireGoal: true,
    requireOutputTemplate: true,
    notes:
      "Standard code review workflow, fits within standard template but uses bold Goal",
  },
  "codebase-review": {
    maxLines: 80,
    requireGoal: true,
    requireOutputTemplate: false,
    notes:
      "Codebase-wide audit that produces a custom report format instead of a simple template",
  },
  "skill-benchmark": {
    maxLines: 80,
    requireGoal: true,
    requireOutputTemplate: false,
    notes:
      "Benchmarks skill compliance, relies on dynamic scorecards instead of a static output template",
  },
  pentest: {
    maxLines: 80,
    requireGoal: true,
    requireOutputTemplate: true,
    notes:
      "Deep security pentest workflow with structured vulnerability findings",
  },
  "dev-fix": {
    maxLines: 170,
    requireGoal: true,
    requireOutputTemplate: false,
    notes:
      "Full developer lifecycle bug-fix manager. Requires custom templates (plan, task, walkthrough) and exceeds 80 lines due to complexity; now schema-aligned with Runtime Contract/Handoff Payload/Blocking Questions.",
  },
  "verify-bug": {
    maxLines: 115,
    requireGoal: true,
    requireOutputTemplate: false,
    notes:
      "Enterprise UAT bug verification flow. Relies on custom Walkthrough templates and exceeds 80 lines due to multi-market/VPN handling; now schema-aligned with Runtime Contract/Handoff Payload/Blocking Questions.",
  },
  "security-test": {
    maxLines: 90,
    requireGoal: true,
    requireOutputTemplate: true,
    notes:
      "High-speed PR security audit check. Has a slightly longer line count limit (90 lines).",
  },
  "uat-signoff": {
    maxLines: 80,
    requireGoal: true,
    requireOutputTemplate: true,
  },
  "incident-hotfix": {
    maxLines: 80,
    requireGoal: true,
    requireOutputTemplate: true,
  },
};

const REQUIRED_SPECIALISTS = [
  "specialist-ac-verifier",
  "specialist-architecture-guard",
  "specialist-codebase-scout",
  "specialist-confluence-searcher",
  "specialist-integration-test-generator",
  "specialist-jira-analyst",
  "specialist-pr-commenter-batch",
  "specialist-pr-reviewer",
  "specialist-security-reviewer",
  "specialist-tc-creator",
  "specialist-tdd-implementer",
  "specialist-test-gap-finder",
  "specialist-zephyr-scanner",
];

const REQUIRED_RUNTIME_REFERENCES = [
  "skills/common/common-security-audit/references/vibe-security-scan.md",
  "skills/common/common-security-audit/references/trust-review-policy.md",
];

const PORTABILITY_PATTERNS = [
  { pattern: "../../skills/", label: "repo-local skills path" },
  { pattern: "file://", label: "absolute file URI" },
  { pattern: "/Users/", label: "machine-local absolute path" },
  { pattern: "alignment tokens:", label: "alignment-token placeholder" },
];

function fail(message: string, failures: string[]) {
  failures.push(message);
  console.log(pc.red(`  ✗ ${message}`));
}

function pass(message: string) {
  console.log(pc.green(`  ✓ ${message}`));
}

function extractNextWorkflowTokens(content: string): string[] {
  const tokens: string[] = [];
  const blockRegex = /## Next Workflow\r?\n([\s\S]*?)(?=\r?\n## |\r?\n```|$)/g;
  let match: RegExpExecArray | null;
  while ((match = blockRegex.exec(content)) !== null) {
    const block = match[1];
    const candidates = block.match(/[a-z][a-z0-9]*(?:-[a-z0-9]+)+/g) ?? [];
    for (const candidate of candidates) {
      if (!NEXT_WORKFLOW_ALIASES.has(candidate.toLowerCase())) {
        tokens.push(candidate);
      }
    }
  }
  return tokens;
}

function checkPortableContent(
  relPath: string,
  content: string,
  failures: string[],
) {
  for (const { pattern, label } of PORTABILITY_PATTERNS) {
    if (content.includes(pattern)) {
      fail(`${relPath} contains non-portable ${label}: ${pattern}`, failures);
    }
  }

  const docsLinkPattern = /\]\((?:\.\.\/)*docs\//;
  if (docsLinkPattern.test(content)) {
    fail(`${relPath} links to unsynced docs/ runtime material`, failures);
  }
}

async function main() {
  console.log(pc.blue("🔍 Auditing SDLC workflow surface...\n"));

  const failures: string[] = [];
  const workflowEntries = await fs.readdir(WORKFLOWS_DIR, {
    withFileTypes: true,
  });
  const canonicalWorkflows = new Set(
    workflowEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith(".md"))
      .map((entry) => path.basename(entry.name, ".md")),
  );

  for (const workflow of REQUIRED_WORKFLOWS) {
    if (!canonicalWorkflows.has(workflow)) {
      fail(`Missing workflow: ${workflow}`, failures);
      continue;
    }

    const file = path.join(WORKFLOWS_DIR, `${workflow}.md`);
    const content = await fs.readFile(file, "utf8");
    checkPortableContent(path.relative(ROOT, file), content, failures);
    const rules = WORKFLOW_RULES[workflow];
    if (rules) {
      const lines = content.trimEnd().split(/\r?\n/).length;
      const maxLines = rules.maxLines ?? 80;
      if (lines > maxLines) {
        fail(`${workflow}.md exceeds ${maxLines} lines (${lines})`, failures);
      } else {
        pass(`${workflow}.md present (${lines} lines)`);
      }

      if (rules.requireGoal) {
        const hasGoal =
          content.includes("Goal:") ||
          content.includes("Goal**:") ||
          /\*\*Goal\*\*:/i.test(content);
        if (!hasGoal) {
          fail(`${workflow}.md missing Goal section`, failures);
        }
      }

      if (rules.requireOutputTemplate) {
        const hasOutputTemplate = content
          .toLowerCase()
          .includes("output template");
        if (!hasOutputTemplate) {
          fail(`${workflow}.md missing Output Template`, failures);
        }
        if (CORE_SDLC_CHAIN.includes(workflow) && !content.includes("feature_status:")) {
          fail(
            `${workflow}.md fenced Output Template missing feature_status Outcome Report field`,
            failures,
          );
        }
      }

      if (OPERATOR_FACING_WORKFLOWS.includes(workflow)) {
        if (content.includes("operator_profile")) {
          pass(`${workflow}.md Handoff Payload carries operator_profile`);
        } else {
          fail(`${workflow}.md missing operator_profile in Handoff Payload`, failures);
        }
      }

      if (AGENTIC_RUNTIME_WORKFLOWS.includes(workflow)) {
        for (const section of REQUIRED_RUNTIME_SECTIONS) {
          if (content.includes(section)) {
            pass(`${workflow}.md includes ${section.replace("## ", "")}`);
          } else {
            fail(`${workflow}.md missing ${section}`, failures);
          }
        }
        const costCallExact = `get_session_cost(workflow="${workflow}")`;
        if (content.includes(costCallExact)) {
          pass(`${workflow}.md includes exact Cost Report call`);
        } else {
          fail(
            `${workflow}.md Cost Report must call ${costCallExact}`,
            failures,
          );
        }

        const contractIndex = content.indexOf("## Runtime Contract");
        const firstFenceIndex = content.indexOf("```md");
        if (contractIndex === -1 || firstFenceIndex === -1) {
          fail(
            `${workflow}.md cannot verify contract placement (missing section or fence)`,
            failures,
          );
        } else if (contractIndex > firstFenceIndex) {
          fail(
            `${workflow}.md Runtime Contract must appear before the fenced Output Template, not as a placeholder inside it`,
            failures,
          );
        } else {
          pass(`${workflow}.md Runtime Contract is top-level`);
        }

      }

      const nextWorkflowTokens = extractNextWorkflowTokens(content);
      for (const token of nextWorkflowTokens) {
        if (!REQUIRED_WORKFLOWS.includes(token)) {
          fail(
            `${workflow}.md Next Workflow references unknown workflow: ${token}`,
            failures,
          );
        }
      }
      if (nextWorkflowTokens.length > 0) {
        pass(`${workflow}.md Next Workflow references are valid`);
      }

      if (SECURITY_EVIDENCE_WORKFLOWS.includes(workflow)) {
        if (content.includes(SECURITY_ARTIFACT_MARKDOWN)) {
          pass(`${workflow}.md includes ${SECURITY_ARTIFACT_MARKDOWN}`);
        } else {
          fail(
            `${workflow}.md missing ${SECURITY_ARTIFACT_MARKDOWN}`,
            failures,
          );
        }
        for (const term of SECURITY_ARTIFACT_CONTRACT_TERMS) {
          if (content.toLowerCase().includes(term)) {
            pass(`${workflow}.md includes ${term}`);
          } else {
            fail(`${workflow}.md missing ${term}`, failures);
          }
        }
      }

      if (workflow === "codebase-review") {
        if (content.includes("artifacts/codebase-review.md")) {
          pass(`${workflow}.md includes artifacts/codebase-review.md`);
        } else {
          fail(`${workflow}.md missing artifacts/codebase-review.md`, failures);
        }
      }

      if (
        ["code-review", "review-ticket", "security-test", "pentest"].includes(
          workflow,
        )
      ) {
        for (const term of SECURITY_FINDING_QUALITY_TERMS) {
          if (content.toLowerCase().includes(term)) {
            pass(`${workflow}.md includes ${term}`);
          } else {
            fail(`${workflow}.md missing ${term}`, failures);
          }
        }
      }

      if (TRUST_POLICY_WORKFLOWS.includes(workflow)) {
        if (content.includes(TRUST_POLICY_REFERENCE)) {
          pass(`${workflow}.md includes ${TRUST_POLICY_REFERENCE}`);
        } else {
          fail(`${workflow}.md missing ${TRUST_POLICY_REFERENCE}`, failures);
        }
      }
    } else {
      fail(
        `Workflow ${workflow} has no rules defined in audit-sdlc.ts`,
        failures,
      );
    }
  }

  const sdlcFile = path.join(WORKFLOWS_DIR, "sdlc.md");
  if (await fs.pathExists(sdlcFile)) {
    const sdlcContent = await fs.readFile(sdlcFile, "utf8");
    for (const workflow of CORE_SDLC_CHAIN) {
      if (sdlcContent.includes(`\`${workflow}\``)) {
        pass(`sdlc.md router can reach ${workflow}`);
      } else {
        fail(`sdlc.md router cannot reach core workflow: ${workflow}`, failures);
      }
    }
  }

  if (await fs.pathExists(QUICK_REFERENCE_FILE)) {
    const quickRef = await fs.readFile(QUICK_REFERENCE_FILE, "utf8");
    for (const workflow of REQUIRED_WORKFLOWS) {
      if (quickRef.includes(`\`${workflow}\``)) {
        pass(`quick reference includes ${workflow}`);
      } else {
        fail(`Quick reference missing workflow: ${workflow}`, failures);
      }
    }
    for (const term of REQUIRED_REQUIREMENT_TERMS) {
      if (quickRef.includes(term)) {
        pass(`quick reference includes requirement term: ${term}`);
      } else {
        fail(`Quick reference missing requirement term: ${term}`, failures);
      }
    }
  } else {
    fail("Missing docs/sdlc-workflow-quick-reference.md", failures);
  }

  for (const relPath of REQUIRED_RUNTIME_REFERENCES) {
    if (await fs.pathExists(path.join(ROOT, relPath))) {
      pass(`${relPath} present`);
    } else {
      fail(`Missing required reference: ${relPath}`, failures);
    }
  }

  for (const specialist of REQUIRED_SPECIALISTS) {
    const skillFile = path.join(
      ROOT,
      "skills",
      "specialists",
      specialist,
      "SKILL.md",
    );
    const evalFile = path.join(
      ROOT,
      "skills",
      "specialists",
      specialist,
      "evals",
      "evals.json",
    );
    if (await fs.pathExists(skillFile)) {
      pass(`${specialist} specialist present`);
    } else {
      fail(`Missing specialist: ${specialist}`, failures);
    }
    if (await fs.pathExists(evalFile)) {
      pass(`${specialist} eval present`);
    } else {
      fail(`Missing specialist eval: ${specialist}`, failures);
    }
  }

  const SPECIALISTS_DIR = path.join(ROOT, "skills", "specialists");
  if (await fs.pathExists(SPECIALISTS_DIR)) {
    const specialistEntries = await fs.readdir(SPECIALISTS_DIR, {
      withFileTypes: true,
    });
    for (const entry of specialistEntries.filter(
      (e) => e.isDirectory() && e.name.startsWith("specialist-"),
    )) {
      const skillFile = path.join(SPECIALISTS_DIR, entry.name, "SKILL.md");
      if (!(await fs.pathExists(skillFile))) continue;
      const content = await fs.readFile(skillFile, "utf8");
      const hasBudget = /## Budget/i.test(content);
      const hasOutput = /## Output/i.test(content);
      const hasBlocked = content.includes("BLOCKED");
      if (hasBudget) {
        pass(`${entry.name} declares Budget`);
      } else {
        fail(`${entry.name} SKILL.md missing ## Budget section`, failures);
      }
      if (hasOutput) {
        pass(`${entry.name} declares Output`);
      } else {
        fail(`${entry.name} SKILL.md missing ## Output section`, failures);
      }
      if (hasBlocked) {
        pass(`${entry.name} declares explicit BLOCKED handling`);
      } else {
        fail(
          `${entry.name} SKILL.md missing explicit BLOCKED handling`,
          failures,
        );
      }
    }
  }

  if (await fs.pathExists(CODEX_SKILLS_DIR)) {
    const entries = await fs.readdir(CODEX_SKILLS_DIR, { withFileTypes: true });
    for (const entry of entries.filter((item) => item.isDirectory())) {
      const skillFile = path.join(CODEX_SKILLS_DIR, entry.name, "SKILL.md");
      if (!(await fs.pathExists(skillFile))) continue;
      if (!canonicalWorkflows.has(entry.name)) {
        fail(
          `Generated Codex workflow skill has no canonical source: ${entry.name}`,
          failures,
        );
      }
      const content = await fs.readFile(skillFile, "utf8");
      checkPortableContent(path.relative(ROOT, skillFile), content, failures);
      if (!content.startsWith("---\n")) {
        fail(
          `Generated Codex skill missing frontmatter: ${entry.name}`,
          failures,
        );
      }
      if (content.includes(".agents/workflows/")) {
        fail(
          `Generated Codex skill has source-path trigger/reference: ${entry.name}`,
          failures,
        );
      }
      if (
        SECURITY_EVIDENCE_WORKFLOWS.includes(entry.name) &&
        !content.toLowerCase().includes("source provenance")
      ) {
        fail(
          `Generated Codex skill missing source provenance language: ${entry.name}`,
          failures,
        );
      }
      if (
        SECURITY_EVIDENCE_WORKFLOWS.includes(entry.name) &&
        !content.toLowerCase().includes("runtime contract")
      ) {
        fail(
          `Generated Codex skill missing runtime contract language: ${entry.name}`,
          failures,
        );
      }
    }
  }

  if (await fs.pathExists(PROMPTS_DIR)) {
    const entries = await fs.readdir(PROMPTS_DIR);
    const securityPromptsNeedingContract = new Set([
      "code-review.prompt.md",
      "review-ticket.prompt.md",
      "codebase-review.prompt.md",
      "security-test.prompt.md",
      "pentest.prompt.md",
    ]);
    for (const entry of entries.filter((name) => name.endsWith(".prompt.md"))) {
      const promptFile = path.join(PROMPTS_DIR, entry);
      const content = await fs.readFile(promptFile, "utf8");
      checkPortableContent(path.relative(ROOT, promptFile), content, failures);
      if (
        securityPromptsNeedingContract.has(entry) &&
        !content.toLowerCase().includes("source provenance")
      ) {
        fail(`${entry} missing source provenance language`, failures);
      }
      if (
        securityPromptsNeedingContract.has(entry) &&
        !content.toLowerCase().includes("runtime contract")
      ) {
        fail(`${entry} missing runtime contract language`, failures);
      }
    }
  }

  if (await fs.pathExists(CODEX_AGENTS_DIR)) {
    const entries = await fs.readdir(CODEX_AGENTS_DIR);
    for (const specialist of REQUIRED_SPECIALISTS) {
      const agentName = `${specialist.replace(/^specialist-/, "")}.toml`;
      if (entries.includes(agentName)) {
        pass(`Generated Codex agent present: ${agentName}`);
      } else {
        fail(`Missing generated Codex agent: ${agentName}`, failures);
      }
    }
    if (await fs.pathExists(path.join(CODEX_SKILLS_DIR, "specialists"))) {
      fail(
        "Specialists exported under .codex/skills; expected native agents only",
        failures,
      );
    }
  }

  if (failures.length > 0) {
    console.log(
      pc.red(`\n❌ SDLC audit failed with ${failures.length} issue(s).`),
    );
    process.exit(1);
  }

  console.log(pc.green("\n✅ SDLC audit passed."));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
