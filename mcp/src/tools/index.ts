import fs from "fs-extra";
import { z } from "zod";
import { SetupHint } from "../config";
import { SessionTracker } from "../services/SessionTracker";
import { MatchResult, SkillIndex } from "../services/SkillIndex";

export interface ToolContext {
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
});

export async function loadSkillsForFiles(
  args: { files: string[] },
  ctx: ToolContext,
): Promise<ToolResult> {
  const empty = maybeEmptyState(ctx);
  if (empty) return empty;

  const matches = ctx.index.matchFiles(args.files);
  return await finalize("load_skills_for_files", args.files, matches, ctx);
}

// ---------- load_skills_for_keywords ----------

export const loadSkillsForKeywordsSchema = z.object({
  keywords: z
    .array(z.string().min(1))
    .min(1)
    .describe(
      'Concept words from the user request (e.g. ["auth", "performance", "migration"]). Matched against each skill\'s keyword triggers.',
    ),
});

export async function loadSkillsForKeywords(
  args: { keywords: string[] },
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
  const lines: string[] = [
    "# Session compliance",
    "",
    `Session started: ${ctx.tracker.startedAt_()}`,
    `Skills loaded: ${loaded.length}`,
    "",
    "## Loaded skills",
    ...(loaded.length ? loaded.map((s) => `- ${s}`) : ["_(none yet)_"]),
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

// ---------- helpers ----------

async function finalize(
  via: "load_skills_for_files" | "load_skills_for_keywords",
  input: string[],
  matches: MatchResult[],
  ctx: ToolContext,
): Promise<ToolResult> {
  if (matches.length === 0) {
    ctx.tracker.record({ via, input, loaded: [] });
    return noMatchGuidance(via, input, ctx);
  }

  const blocks: string[] = [];
  const loaded: string[] = [];
  for (const match of matches) {
    try {
      const body = await fs.readFile(match.skill.path, "utf8");
      blocks.push(
        renderSkill(
          match.skill.category,
          match.skill.id,
          body,
          `${match.matchedBy}:${match.reason}`,
        ),
      );
      loaded.push(`${match.skill.category}/${match.skill.id}`);
    } catch {
      // Don't leak filesystem paths on error.
      blocks.push(
        `### ERROR: Could not read skill content for ${match.skill.category}/${match.skill.id}`,
      );
    }
  }
  ctx.tracker.record({ via, input, loaded });
  return { content: [{ type: "text", text: blocks.join("\n\n---\n\n") }] };
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
    "Try `load_skills_for_keywords` with concept words from the user request, or `list_categories` to see which categories cover what.",
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

function renderSkill(
  category: string,
  id: string,
  body: string,
  why: string,
): string {
  return `<!-- skill: ${category}/${id} | matched: ${why} -->\n${body}`;
}
