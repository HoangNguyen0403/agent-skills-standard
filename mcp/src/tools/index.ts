import fs from "fs-extra";
import { z } from "zod";
import { SetupHint } from "../config";
import { SessionTracker } from "../services/SessionTracker";
import { MatchResult, SkillIndex } from "../services/SkillIndex";
import { summarizeSessionCostCoverage } from "../services/WorkflowTelemetry";
import { scanWorkflows, readWorkflowBody } from "../services/WorkflowIndex";
import {
  listEvalRuns,
  readEvalsReport,
  verifyEvalRun,
} from "../services/EvalsIndex";

export interface ToolContext {
  projectRoot: string;
  index: SkillIndex;
  tracker: SessionTracker;
  setup: SetupHint;
}

export interface ToolResult {
  content: Array<{ type: "text"; text: string }>;
  isError?: boolean;
  [key: string]: unknown;
}

function setupGuidance(setup: SetupHint): string {
  switch (setup.kind) {
    case "no-agents-md":
      return [
        "No `AGENTS.md` was found by walking up from the current directory.",
        "This MCP needs to be launched from inside a project initialized with agent-skills-standard.",
        "",
        "To set up:",
        "  1. cd into your project root",
        "  2. Run `npx agent-skills-standard@latest init`  (creates .skillsrc)",
        "  3. Run `npx agent-skills-standard@latest sync`  (installs skills)",
        "  4. Restart this MCP server",
      ].join("\n");
    case "no-skills-dir":
      return [
        "No skills are installed in this project yet.",
        "",
        "To install skills:",
        "  Run `npx agent-skills-standard@latest sync` from the project root.",
        "",
        "After running `sync`, restart this MCP server (or reload your AI tool) so it can pick up the new skills.",
      ].join("\n");
    case "ready":
      return "";
  }
}

/** If the project is not yet initialized, return a guided ToolResult instead of failing. */
function maybeEmptyState(ctx: ToolContext): ToolResult | null {
  if (ctx.setup.kind !== "ready" || ctx.index.isEmpty()) {
    const guidance = setupGuidance(ctx.setup);
    if (guidance) {
      return { content: [{ type: "text", text: guidance }] };
    }
    return {
      content: [
        {
          type: "text",
          text: "No skills are loaded in this project. Run `npx agent-skills-standard@latest sync` to install standard skills, then restart the MCP server.",
        },
      ],
    };
  }
  return null;
}

// ---------- load_skills_for_files ----------

export const loadSkillsForFilesSchema = z.object({
  files: z
    .array(z.string().min(1))
    .min(1)
    .describe(
      'Project-relative file paths the agent is about to read or modify (e.g. ["src/cart.dart", "internal/auth.go"]).',
    ),
  force_reload: z
    .boolean()
    .optional()
    .describe(
      "Return full skill bodies even for skills already loaded this session (bypasses dedup). Default false.",
    ),
});

export async function loadSkillsForFiles(
  args: { files: string[]; force_reload?: boolean },
  ctx: ToolContext,
): Promise<ToolResult> {
  const empty = maybeEmptyState(ctx);
  if (empty) return empty;

  const matches = ctx.index.matchFiles(args.files);
  return await finalize(
    "load_skills_for_files",
    args.files,
    matches,
    ctx,
    args.force_reload ?? false,
  );
}

// ---------- load_skills_for_keywords ----------

export const loadSkillsForKeywordsSchema = z.object({
  keywords: z
    .array(z.string().min(1))
    .min(1)
    .describe(
      'Concept words from the user request (e.g. ["auth", "performance", "migration"]). Matched against each skill\'s keyword triggers.',
    ),
  force_reload: z
    .boolean()
    .optional()
    .describe(
      "Return full skill bodies even for skills already loaded this session (bypasses dedup). Default false.",
    ),
});

export async function loadSkillsForKeywords(
  args: { keywords: string[]; force_reload?: boolean },
  ctx: ToolContext,
): Promise<ToolResult> {
  const empty = maybeEmptyState(ctx);
  if (empty) return empty;

  const matches = ctx.index.matchKeywords(args.keywords);
  return await finalize(
    "load_skills_for_keywords",
    args.keywords,
    matches,
    ctx,
    args.force_reload ?? false,
  );
}

// ---------- get_skill ----------

export const getSkillSchema = z.object({
  category: z
    .string()
    .min(1)
    .describe('Skill category (e.g. "flutter", "golang").'),
  name: z
    .string()
    .min(1)
    .describe("Skill id — the directory name under the category."),
});

export async function getSkill(
  args: { category: string; name: string },
  ctx: ToolContext,
): Promise<ToolResult> {
  const empty = maybeEmptyState(ctx);
  if (empty) return empty;

  const skill = ctx.index.findSkill(args.category, args.name);
  if (!skill) {
    ctx.tracker.record({
      via: "get_skill",
      input: [`${args.category}/${args.name}`],
      loaded: [],
    });
    return alternativeSkillSuggestion(args, ctx);
  }
  const body = await fs.readFile(skill.path, "utf8").catch(() => null);
  if (!body) {
    // Don't leak filesystem paths — describe the gap functionally.
    return {
      content: [
        {
          type: "text",
          text: [
            `The skill index references "${args.category}/${args.name}" but its SKILL.md is missing.`,
            "This usually means the skill was deleted or moved after the server started.",
            "Restart the MCP server, or run `npx agent-skills-standard@latest sync` to reinstall skills.",
          ].join("\n"),
        },
      ],
    };
  }
  ctx.tracker.record({
    via: "get_skill",
    input: [`${args.category}/${args.name}`],
    loaded: [`${skill.category}/${skill.id}`],
  });
  return {
    content: [
      {
        type: "text",
        text: renderSkill(skill.category, skill.id, body, "direct"),
      },
    ],
  };
}

// ---------- get_category_guide ----------

export const getCategoryGuideSchema = z.object({
  category: z
    .string()
    .min(1)
    .describe(
      'Framework or category name (e.g. "nextjs", "react", "nestjs", "golang", "database").',
    ),
});

export async function getCategoryGuide(
  args: { category: string },
  ctx: ToolContext,
): Promise<ToolResult> {
  const empty = maybeEmptyState(ctx);
  if (empty) return empty;

  const categories = ctx.index.listCategories();
  const categoryHit = categories.find(
    (category) => category.toLowerCase() === args.category.toLowerCase(),
  );
  if (!categoryHit) {
    ctx.tracker.record({
      via: "get_category_guide",
      input: [args.category],
      loaded: [],
    });
    return {
      content: [
        {
          type: "text",
          text: [
            `Category "${args.category}" does not exist in this project.`,
            "",
            `**Available categories:** ${categories.join(", ")}`,
          ].join("\n"),
        },
      ],
    };
  }

  const guidePath = ctx.index.getCategoryGuidePath(categoryHit);
  if (!guidePath || !(await fs.pathExists(guidePath))) {
    ctx.tracker.record({
      via: "get_category_guide",
      input: [args.category],
      loaded: [`category/${categoryHit}`],
    });
    return {
      content: [
        {
          type: "text",
          text: [
            `Category "${categoryHit}" is installed, but it does not provide a category guide yet.`,
            "",
            "Use `list_categories`, `load_skills_for_files`, or `load_skills_for_keywords` to keep routing through the category normally.",
          ].join("\n"),
        },
      ],
    };
  }

  const body = await fs.readFile(guidePath, "utf8");
  const skills = ctx.index
    .listSkillsInCategory(categoryHit)
    .map((skill) => `${skill.category}/${skill.id}`)
    .sort();
  const routing = Object.entries(ctx.index.getRouting())
    .filter(([, cats]) => cats.includes(categoryHit))
    .map(([ext]) => `.${ext}`);

  ctx.tracker.record({
    via: "get_category_guide",
    input: [args.category],
    loaded: [`category/${categoryHit}`],
  });

  const lines = [
    `<!-- Provenance: Loaded category/${categoryHit} via get_category_guide -->`,
    "",
    `# Category Guide: ${categoryHit}`,
    routing.length
      ? `Routed file types: ${routing.join(", ")}`
      : "Routed file types: keyword-driven or category-local only",
    "",
    "## Skills In Category",
    ...skills.map((skill) => `- ${skill}`),
    "",
    body,
  ];
  return { content: [{ type: "text", text: lines.join("\n") }] };
}

// ---------- list_categories ----------

export const listCategoriesSchema = z.object({});

export async function listCategories(
  _args: Record<string, never>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const empty = maybeEmptyState(ctx);
  if (empty) return empty;

  const categories = ctx.index.listCategories();
  const routing = ctx.index.getRouting();
  ctx.tracker.record({
    via: "list_categories",
    input: [],
    loaded: categories.map((category) => `category/${category}`),
  });
  const lines: string[] = ["# Skill categories", ""];
  for (const cat of categories) {
    const skills = ctx.index.listSkillsInCategory(cat);
    const exts = Object.entries(routing)
      .filter(([, cats]) => cats.includes(cat))
      .map(([ext]) => `.${ext}`);
    lines.push(
      `- **${cat}** — ${skills.length} skill(s)${exts.length ? ` — files: ${exts.join(", ")}` : ""}`,
    );
  }
  return { content: [{ type: "text", text: lines.join("\n") }] };
}

// ---------- audit_session_compliance ----------

export const auditSessionComplianceSchema = z.object({});

export async function auditSessionCompliance(
  _args: Record<string, never>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const loaded = ctx.tracker.loadedSkills();
  const events = ctx.tracker.events_();
  const gaps = complianceGaps(ctx);
  const lines: string[] = [
    "# Session compliance",
    "",
    `Session started: ${ctx.tracker.startedAt_()}`,
    `Skills loaded: ${loaded.length}`,
    "",
    "## Loaded skills",
    ...(loaded.length ? loaded.map((s) => `- ${s}`) : ["_(none yet)_"]),
    "",
    "## Coverage gaps",
    ...(gaps.length
      ? gaps.map((g) => `- ⚠️  ${g}`)
      : ["_(none — every routed category loaded at least one skill)_"]),
    "",
    "## Tool calls",
    ...(events.length
      ? events.map(
          (e) =>
            `- ${e.at} — ${e.via}(${e.input.join(", ")}) → ${e.loaded.join(", ") || "(no match)"}`,
        )
      : ["_(none yet)_"]),
  ];
  return { content: [{ type: "text", text: lines.join("\n") }] };
}

/**
 * Flags categories that files were routed to (via load_skills_for_files calls)
 * but for which the session never actually loaded a skill — e.g. the agent
 * edited .kt files but no android/kotlin skill was ever loaded.
 */
function complianceGaps(ctx: ToolContext): string[] {
  const routing = ctx.index.getRouting();
  const loadedCategories = new Set(
    ctx.tracker.loadedSkills().map((s) => s.split("/")[0]),
  );
  const touched = new Map<string, Set<string>>();

  for (const event of ctx.tracker.events_()) {
    if (event.via !== "load_skills_for_files") continue;
    for (const file of event.input) {
      const match = /\.([a-zA-Z0-9]+)$/.exec(file);
      if (!match) continue;
      for (const category of routing[match[1]] ?? []) {
        if (!touched.has(category)) touched.set(category, new Set());
        touched.get(category)!.add(`.${match[1]}`);
      }
    }
  }

  const gaps: string[] = [];
  for (const [category, exts] of touched) {
    if (!loadedCategories.has(category)) {
      gaps.push(
        `Files with ${[...exts].join(", ")} route to "${category}", but no ${category} skill was loaded this session.`,
      );
    }
  }
  return gaps;
}

// ---------- get_session_cost ----------

export const getSessionCostSchema = z.object({
  workflow: z
    .string()
    .min(1)
    .optional()
    .describe("Workflow name being finalized, e.g. 'plan-feature'."),
  model: z
    .string()
    .min(1)
    .optional()
    .describe("Model used by the host runtime, if known."),
  promptTokens: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe(
      "Uncached prompt/input tokens from the host runtime, if available.",
    ),
  cachedPromptTokens: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe(
      "Cached prompt/input tokens from the host runtime, if available.",
    ),
  completionTokens: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe("Completion/output tokens from the host runtime, if available."),
  reasoningTokens: z
    .number()
    .int()
    .nonnegative()
    .optional()
    .describe(
      "Reasoning tokens from the host runtime, if reported separately.",
    ),
  inputCostPer1M: z
    .number()
    .nonnegative()
    .optional()
    .describe(
      "Uncached input-token price per 1M tokens for the selected model.",
    ),
  cachedInputCostPer1M: z
    .number()
    .nonnegative()
    .optional()
    .describe("Cached input-token price per 1M tokens for the selected model."),
  outputCostPer1M: z
    .number()
    .nonnegative()
    .optional()
    .describe("Output-token price per 1M tokens for the selected model."),
  reasoningCostPer1M: z
    .number()
    .nonnegative()
    .optional()
    .describe("Reasoning-token price per 1M tokens when billed separately."),
  otherCost: z
    .number()
    .nonnegative()
    .optional()
    .describe(
      "Any additional runtime/tooling/provider cost in the target currency.",
    ),
  currency: z
    .string()
    .min(1)
    .default("USD")
    .describe("Currency label for estimated cost."),
});

export async function getSessionCost(
  args: {
    workflow?: string;
    model?: string;
    promptTokens?: number;
    cachedPromptTokens?: number;
    completionTokens?: number;
    reasoningTokens?: number;
    inputCostPer1M?: number;
    cachedInputCostPer1M?: number;
    outputCostPer1M?: number;
    reasoningCostPer1M?: number;
    otherCost?: number;
    currency?: string;
  },
  ctx: ToolContext,
): Promise<ToolResult> {
  const empty = maybeEmptyState(ctx);
  if (empty) return empty;

  ctx.tracker.record({
    via: "get_session_cost",
    input: args.workflow ? [args.workflow] : [],
    loaded: [],
  });

  const loaded = ctx.tracker.loadedSkills();
  const workflows = ctx.tracker.loadedWorkflows();
  const events = ctx.tracker.events_();
  const summary = ctx.tracker.summary();
  const costCoverage = summarizeSessionCostCoverage(args);
  const skillCost = ctx.tracker.skillContextCost();
  const skillShareOfPrompt =
    args.promptTokens && args.promptTokens > 0
      ? `${Math.round((skillCost.totalEstimatedTokens / args.promptTokens) * 100)}%`
      : "[Agent: provide promptTokens to compute share]";

  const lines: string[] = [
    "# Session Telemetry",
    "",
    "Exact LLM token usage depends on the host runtime. MCP-observed fields below are measured directly; token and cost fields are exact only when the host supplies usage numbers.",
    "",
    "| Metric | Value |",
    "|---|---|",
    `| **Workflow** | ${args.workflow ?? "[Agent: fill workflow name]"} |`,
    `| **Session Started** | ${summary.startedAt} |`,
    `| **Elapsed Seconds** | ${summary.elapsedSeconds} |`,
    `| **MCP Tool Calls** | ${summary.toolCalls} |`,
    `| **Skills Loaded** | ${loaded.length} |`,
    `| **Workflows Loaded** | ${workflows.length} |`,
    `| **No-Match Calls** | ${summary.noMatchCalls} |`,
    `| **Model** | ${args.model ?? "[Agent: fill from platform usage]"} |`,
    `| **Prompt Tokens** | ${args.promptTokens ?? "[Agent: fill from platform usage]"} |`,
    `| **Cached Prompt Tokens** | ${args.cachedPromptTokens ?? "[Agent: fill if runtime reports cache]"} |`,
    `| **Completion Tokens** | ${args.completionTokens ?? "[Agent: fill from platform usage]"} |`,
    `| **Reasoning Tokens** | ${args.reasoningTokens ?? "[Agent: fill if runtime reports reasoning]"} |`,
    `| **Other Runtime Cost** | ${formatOtherCost(args.otherCost, args.currency) ?? "[Agent: fill if runtime has extra billed items]"} |`,
    `| **Cost Status** | ${costCoverage.exactCostAvailable ? "Exact estimate available" : "Partial - host usage or pricing fields missing"} |`,
    `| **Estimated Cost** | ${costCoverage.estimatedCost ?? "[Agent: provide tokens and rates to calculate]"} |`,
    `| **Missing Host Fields** | ${costCoverage.missingHostFields.length ? costCoverage.missingHostFields.join(", ") : "_(none)_"} |`,
    "",
    "## Skill Context Cost",
    "",
    "Estimated from skill body size (chars/4) — not exact tokenizer output, but a stable relative signal for how much of the prompt budget skill loading consumed.",
    "",
    "| Metric | Value |",
    "|---|---|",
    `| **Est. Skill Context Tokens (this session)** | ${skillCost.totalEstimatedTokens} |`,
    `| **Skills Deduped (context reused, not resent)** | ${skillCost.dedupedSkillCount} |`,
    `| **Est. Tokens Saved by Dedup** | ${skillCost.estimatedTokensSaved} |`,
    `| **Skill Context Share of Prompt Tokens** | ${skillShareOfPrompt} |`,
    `| **No-Match Calls (wasted lookups)** | ${summary.noMatchCalls} |`,
    "",
    "## Calls By Tool",
    "",
    "| Tool | Calls |",
    "|---|---:|",
    ...Object.entries(summary.callsByTool).map(
      ([tool, calls]) => `| ${tool} | ${calls} |`,
    ),
    "",
    "## Loaded Skills",
    "",
    ...(loaded.length ? loaded.map((skill) => `- ${skill}`) : ["_(none)_"]),
    "",
    "## Loaded Workflows",
    "",
    ...(workflows.length
      ? workflows.map((workflow) => `- ${workflow}`)
      : ["_(none)_"]),
    "",
    "## Tool Call Timeline",
    "",
    ...(events.length
      ? events.map(
          (event) =>
            `- ${event.at} — ${event.via}(${event.input.join(", ")}) → ${event.loaded.join(", ") || "(no match)"}`,
        )
      : ["_(none)_"]),
  ];
  return { content: [{ type: "text", text: lines.join("\n") }] };
}

// ---------- list_workflows ----------

export const listWorkflowsSchema = z.object({});

export async function listWorkflows(
  _args: Record<string, never>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const workflows = await scanWorkflows(ctx.projectRoot);
  ctx.tracker.record({
    via: "list_workflows",
    input: [],
    loaded: workflows.map((w) => `workflow/${w.name}`),
  });

  if (workflows.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "No workflows found in `.agents/workflows`.",
        },
      ],
    };
  }

  const lines: string[] = ["# Available Workflows", ""];
  for (const wf of workflows) {
    lines.push(
      `- **${wf.name}**${wf.description ? `: ${wf.description}` : ""}`,
    );
  }

  return { content: [{ type: "text", text: lines.join("\n") }] };
}

// ---------- get_workflow ----------

export const getWorkflowSchema = z.object({
  name: z
    .string()
    .describe(
      "The exact name of the workflow (without extension, e.g. 'dev-fix')",
    ),
});

export async function getWorkflow(
  args: { name: string },
  ctx: ToolContext,
): Promise<ToolResult> {
  const workflows = await scanWorkflows(ctx.projectRoot);
  const matched = workflows.find(
    (w) =>
      w.name.toLowerCase() === args.name.toLowerCase() ||
      w.name.toLowerCase() === args.name.replace(/\.md$/, "").toLowerCase(),
  );

  if (!matched) {
    ctx.tracker.record({
      via: "get_workflow",
      input: [args.name],
      loaded: [],
    });
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Workflow '${args.name}' not found. Available workflows:\n${workflows.map((w) => `  - ${w.name}`).join("\n")}`,
        },
      ],
    };
  }

  const body = await readWorkflowBody(matched.path);
  if (!body) {
    return {
      isError: true,
      content: [
        {
          type: "text",
          text: `Failed to read workflow file at '${matched.path}'.`,
        },
      ],
    };
  }

  ctx.tracker.record({
    via: "get_workflow",
    input: [args.name],
    loaded: [`workflow/${matched.name}`],
  });

  const header = `<!-- Provenance: Loaded workflow/${matched.name} via get_workflow -->`;
  return {
    content: [
      {
        type: "text",
        text: `${header}\n\n# Workflow: ${matched.name}\n${matched.description ? `> [!IMPORTANT]\n> ${matched.description}\n` : ""}\n${body}`,
      },
    ],
  };
}

// ---------- verify_eval_run ----------

export const verifyEvalRunSchema = z.object({
  run_id: z
    .string()
    .optional()
    .describe(
      "A specific run id under benchmarks/evals/runs/ (e.g. 'dart-v2.6.0-2026-07-10'). Omit to verify all committed runs.",
    ),
});

export async function verifyEvalRunTool(
  args: { run_id?: string },
  ctx: ToolContext,
): Promise<ToolResult> {
  const runIds = args.run_id ? [args.run_id] : listEvalRuns(ctx.projectRoot);

  if (runIds.length === 0) {
    return {
      content: [
        {
          type: "text",
          text: "No eval runs found under `benchmarks/evals/runs/`. Run the `evals-run` workflow first (see docs/EVALS.md) to produce one.",
        },
      ],
    };
  }

  const outcomes = runIds.map((id: string) =>
    verifyEvalRun(ctx.projectRoot, id),
  );
  const lines: string[] = ["# Eval Run Verification", ""];
  let anyFailed = false;
  for (const o of outcomes) {
    if (o.ok) {
      lines.push(
        `✅ \`${o.runId}\`: verified — committed results.json matches recomputed scores.`,
      );
    } else {
      anyFailed = true;
      lines.push(`❌ \`${o.runId}\`: ${o.reason}`);
      for (const d of o.diffs || []) lines.push(`   - ${d}`);
    }
  }

  return {
    content: [{ type: "text", text: lines.join("\n") }],
    isError: anyFailed,
  };
}

// ---------- get_eval_report ----------

export const getEvalReportSchema = z.object({});

export async function getEvalReport(
  _args: Record<string, never>,
  ctx: ToolContext,
): Promise<ToolResult> {
  const report = readEvalsReport(ctx.projectRoot);
  if (!report) {
    return {
      content: [
        {
          type: "text",
          text: "No `evals-report.md` found at the project root yet. Run the `evals-run` workflow (see docs/EVALS.md) and then `pnpm evals:report` to generate one.",
        },
      ],
    };
  }
  return { content: [{ type: "text", text: report }] };
}

// ---------- helpers ----------

async function finalize(
  via: "load_skills_for_files" | "load_skills_for_keywords",
  input: string[],
  matches: MatchResult[],
  ctx: ToolContext,
  forceReload = false,
): Promise<ToolResult> {
  if (matches.length === 0) {
    ctx.tracker.record({ via, input, loaded: [] });
    return noMatchGuidance(via, input, ctx);
  }

  const alreadyLoaded = new Set(ctx.tracker.loadedSkills());
  const blocks: string[] = [];
  const loaded: string[] = [];
  const dedupedSkills: string[] = [];
  let estimatedTokens = 0;
  let estimatedTokensSaved = 0;

  for (const match of matches) {
    const key = `${match.skill.category}/${match.skill.id}`;
    const why = `${match.matchedBy}:${match.reason}`;
    try {
      const body = await fs.readFile(match.skill.path, "utf8");
      if (!forceReload && alreadyLoaded.has(key)) {
        blocks.push(dedupStub(match.skill.category, match.skill.id, why));
        dedupedSkills.push(key);
        estimatedTokensSaved += estimateTokens(body);
      } else {
        blocks.push(
          renderSkill(match.skill.category, match.skill.id, body, why),
        );
        estimatedTokens += estimateTokens(body);
      }
      loaded.push(key);
    } catch {
      // Don't leak filesystem paths on error.
      blocks.push(`### ERROR: Could not read skill content for ${key}`);
    }
  }
  ctx.tracker.record({
    via,
    input,
    loaded,
    estimatedTokens,
    dedupedSkills,
    estimatedTokensSaved,
  });
  return { content: [{ type: "text", text: blocks.join("\n\n---\n\n") }] };
}

/** Rough token estimate (chars/4) — good enough for relative cost/savings reporting. */
function estimateTokens(text: string): number {
  return Math.ceil(text.length / 4);
}

function dedupStub(category: string, id: string, why: string): string {
  return `<!-- skill: ${category}/${id} | matched: ${why} | already loaded this session, body omitted (pass force_reload: true to resend) -->`;
}

/**
 * Best-practice 1.4 (avoid "not found"): when a load returns no match, return
 * what's available so the LLM can pick the next useful action instead of giving up.
 */
function noMatchGuidance(
  via: "load_skills_for_files" | "load_skills_for_keywords",
  input: string[],
  ctx: ToolContext,
): ToolResult {
  const categories = ctx.index.listCategories();
  const routing = ctx.index.getRouting();

  const lines: string[] = [];
  if (via === "load_skills_for_files") {
    const exts = Array.from(
      new Set(
        input
          .map((f) => {
            const m = /\.([a-zA-Z0-9]+)$/.exec(f);
            return m ? m[1] : "";
          })
          .filter(Boolean),
      ),
    );
    if (exts.length) {
      const routed = exts.filter((e) => Boolean(routing[e]));
      const unrouted = exts.filter((e) => !routing[e]);
      if (unrouted.length) {
        lines.push(
          `No skills are routed to file extensions: ${unrouted.map((e) => "." + e).join(", ")}.`,
        );
      }
      if (routed.length) {
        lines.push(
          `Files with extensions ${routed.map((e) => "." + e).join(", ")} did not match any tier-eligible skill (broad-glob skills are demoted unless they are the registered base-language skill for the category).`,
        );
      }
    } else {
      lines.push("Files have no extensions, so no router rules apply.");
    }
  } else {
    lines.push(
      `No skill keyword triggers matched: ${input.join(", ")}. Keyword matches are case-insensitive substring matches against each skill's declared triggers.`,
    );
  }

  lines.push("");
  lines.push(
    `**Available categories** (${categories.length}): ${categories.join(", ")}`,
  );
  lines.push("");
  lines.push(
    "Try `load_skills_for_keywords` with concept words from the user request, `list_categories` to see coverage, or `get_category_guide` when you already know the framework/category.",
  );

  return { content: [{ type: "text", text: lines.join("\n") }] };
}

/**
 * Best-practice 1.4: when get_skill misses, suggest alternatives instead of
 * a flat "not found". Returns up to 5 nearest matches by category + name overlap.
 */
function alternativeSkillSuggestion(
  args: { category: string; name: string },
  ctx: ToolContext,
): ToolResult {
  const categories = ctx.index.listCategories();
  const categoryHit = categories.find(
    (c) => c.toLowerCase() === args.category.toLowerCase(),
  );

  const lines: string[] = [];
  if (categoryHit) {
    const sibs = ctx.index.listSkillsInCategory(categoryHit).map((s) => s.id);
    const close = sibs
      .map((id) => ({ id, score: similarity(id, args.name) }))
      .sort((a, b) => b.score - a.score)
      .slice(0, 5)
      .map((s) => `${categoryHit}/${s.id}`);
    lines.push(
      `Category "${categoryHit}" exists, but it does not contain a skill named "${args.name}".`,
    );
    if (close.length) {
      lines.push("", "**Closest matches in this category:**");
      lines.push(...close.map((s) => `- ${s}`));
    }
  } else {
    lines.push(`Category "${args.category}" does not exist in this project.`);
    lines.push("", `**Available categories:** ${categories.join(", ")}`);
    lines.push(
      "",
      "Use `list_categories` for a fuller view, or call `load_skills_for_files` / `load_skills_for_keywords` to let the router pick.",
    );
  }
  return { content: [{ type: "text", text: lines.join("\n") }] };
}

function similarity(a: string, b: string): number {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  if (al === bl) return 1;
  if (al.includes(bl) || bl.includes(al)) return 0.7;
  // Cheap token-overlap score
  const at = new Set(al.split(/[-_/]/));
  const bt = new Set(bl.split(/[-_/]/));
  const overlap = [...at].filter((t) => bt.has(t)).length;
  return overlap / Math.max(at.size, bt.size, 1);
}

function formatOtherCost(
  otherCost: number | undefined,
  currency: string | undefined,
): string | null {
  if (otherCost === undefined) return null;
  return `${currency ?? "USD"} ${otherCost.toFixed(6)}`;
}

function renderSkill(
  category: string,
  id: string,
  body: string,
  why: string,
): string {
  return `<!-- skill: ${category}/${id} | matched: ${why} -->\n${body}`;
}
