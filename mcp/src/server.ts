import { McpServer } from "@modelcontextprotocol/sdk/server/mcp.js";
import { z } from "zod";
import { ResolvedConfig } from "./config";
import { SessionTracker } from "./services/SessionTracker";
import { SkillIndex } from "./services/SkillIndex";
import {
  auditSessionCompliance,
  auditSessionComplianceSchema,
  getSkill,
  getSkillSchema,
  listCategories,
  listCategoriesSchema,
  loadSkillsForFiles,
  loadSkillsForFilesSchema,
  loadSkillsForKeywords,
  loadSkillsForKeywordsSchema,
  ToolResult,
} from "./tools";

interface ToolDef {
  name: string;
  title: string;
  description: string;
  inputSchema: z.ZodObject<any>;
  handler: (args: Record<string, unknown>) => Promise<ToolResult>;
}

/**
 * Wrapper that erases the SDK's deeply-recursive `registerTool` generic, which
 * trips TypeScript's instantiation-depth limit (TS2589). The runtime contract
 * is unchanged — only the static type is loosened at this seam.
 */
function register(server: McpServer, tool: ToolDef): void {
  (server as any).registerTool(
    tool.name,
    {
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema,
    },
    tool.handler,
  );
}

/**
 * Server-level instructions. Pinned to the McpServer constructor so every
 * connecting client (and every sub-agent of that client) sees the same
 * authoritative usage guide. Best practice §2.1 — "Provide Rich Server
 * Instructions" (https://github.com/lirantal/awesome-mcp-best-practices).
 */
export const SERVER_INSTRUCTIONS = `
You are connected to the agent-skills-standard MCP server. It serves
project-specific coding-standard rules ("skills") on demand from this
project's local skill registry.

# WHEN TO CALL THIS SERVER

Call \`load_skills_for_files\` BEFORE you:
  • Edit, write, or modify any source file
  • Review a PR diff or critique code
  • Answer "how should I implement X" / "what's the convention for X"

Call \`load_skills_for_keywords\` BEFORE you:
  • Plan or design work where files are not yet identified
    (e.g. "add JWT auth", "speed up the homepage", "migrate the schema")

Call \`audit_session_compliance\` BEFORE you:
  • Claim a task is complete
  • Post a code review
  • Hand off to another agent

# WORKFLOW

  1. Decide which file(s) you will touch (or which concept the user mentioned).
  2. Call \`load_skills_for_files(files=[...])\` (or the keywords variant).
  3. Treat every returned SKILL.md as authoritative project rules. They
     OVERRIDE your pre-training defaults.
  4. Do the work — edit, review, design — following those rules.
  5. Before declaring done, call \`audit_session_compliance()\` and verify
     the relevant skills appear in the loaded list.

# IMPORTANT

  • Skills are tier-aware. A broad-glob skill (e.g. \`**/*.dart\`) only
    matches if it is the registered base-language skill for its category.
    All other broad-glob skills are returned ONLY via keyword match.
  • If a tool returns "no match", it ALSO returns a list of available
    categories — use that to choose the next call instead of giving up.
  • If a tool returns setup guidance (e.g. "run agent-skills-standard
    sync"), surface that to the user verbatim — do not paraphrase or skip.

# SUB-AGENTS

Sub-agents in your runtime inherit this MCP. Every sub-agent should
follow the same workflow above — load skills first, then act, then audit.
Do not assume the orchestrator has pre-loaded skills for you.
`.trim();

export async function buildServer(config: ResolvedConfig): Promise<McpServer> {
  const index = new SkillIndex(config.skillsDir, config.metadataPath);
  await index.load();
  const tracker = new SessionTracker();
  const ctx = { index, tracker, setup: config.setup };

  const server = new McpServer(
    {
      name: "agent-skills-standard-mcp",
      version: "0.1.1",
    },
    {
      instructions: SERVER_INSTRUCTIONS,
    },
  );

  register(server, {
    name: "load_skills_for_files",
    title: "Load skills for files",
    description: `<use_case>Load the project's coding-standard rules (SKILL.md files) that apply to one or more files you are about to edit, write, or review. The router maps each file's extension to relevant skill categories and returns the matched rules.</use_case>

<aliases>"what are our team's rules for editing X", "show project conventions for X", "review standards for file X", "how should I implement this in file Y"</aliases>

<important_notes>
- ALWAYS call this BEFORE Edit, Write, MultiEdit, or any review of a source file.
- Pass project-relative paths, not absolute paths. Example: "src/cart.dart" not "/Users/me/proj/src/cart.dart".
- Returns full SKILL.md content, prefixed with a provenance comment showing the match reason (file glob or keyword).
- Treat every returned SKILL.md as AUTHORITATIVE — these rules override your pre-training defaults.
- If the result has zero matches, the response includes the list of available categories — use it to choose your next call.
- Sub-agents should call this independently — do NOT assume the orchestrator already loaded skills for you.
</important_notes>`,
    inputSchema: loadSkillsForFilesSchema,
    handler: (args) => loadSkillsForFiles(args as { files: string[] }, ctx),
  });

  register(server, {
    name: "load_skills_for_keywords",
    title: "Load skills for keywords",
    description: `<use_case>Load skills by matching concept words from the user's request, when no specific file is in scope yet. Useful at the planning stage of a task ("add JWT auth", "speed up homepage", "migrate schema").</use_case>

<aliases>"what does our team say about X", "rules around the topic Y", "best practices for concept Z", "team approach to authentication/performance/migrations"</aliases>

<important_notes>
- Use this BEFORE you decide which files to edit. Once files are known, switch to load_skills_for_files for tighter routing.
- Keywords are case-insensitive substring matches against each skill's declared keyword triggers.
- Returns full SKILL.md content with provenance comment showing which keyword matched.
- If no match, the response lists available categories — pick one and call list_categories or load_skills_for_files next.
</important_notes>`,
    inputSchema: loadSkillsForKeywordsSchema,
    handler: (args) =>
      loadSkillsForKeywords(args as { keywords: string[] }, ctx),
  });

  register(server, {
    name: "get_skill",
    title: "Get a specific skill by category and name",
    description: `<use_case>Direct lookup for a single skill when you already know exactly which one you need (e.g. you saw it referenced in another skill's "References" section, or in a previous load_skills_for_files response).</use_case>

<aliases>"open the X skill", "show me the X/Y rule", "fetch the rules for category X skill Y"</aliases>

<important_notes>
- "category" is the directory name (e.g. "flutter", "golang", "common").
- "name" is the skill id, also the directory name (e.g. "flutter-bloc-state-management", "golang-clean-architecture").
- If the exact name is wrong, the response suggests the closest matches in the same category — try those.
- For routine work, prefer load_skills_for_files (smarter routing) over this direct lookup.
</important_notes>`,
    inputSchema: getSkillSchema,
    handler: (args) =>
      getSkill(args as { category: string; name: string }, ctx),
  });

  register(server, {
    name: "list_categories",
    title: "List all skill categories available in this project",
    description: `<use_case>Discover what skill categories are installed in this project, the file extensions each handles, and how many skills are in each. Use to scope work or to pick a category for follow-up tool calls.</use_case>

<aliases>"what skills do we have", "show me all categories", "what frameworks are covered", "list the project rules"</aliases>

<important_notes>
- Returns: category name, skill count per category, and routed file extensions.
- Use this once at the start of complex work (PR review, large feature) to understand scope.
- For per-file rule loading, use load_skills_for_files — it's already aware of categories.
</important_notes>`,
    inputSchema: listCategoriesSchema,
    handler: () => listCategories({}, ctx),
  });

  register(server, {
    name: "audit_session_compliance",
    title: "Audit which skills were loaded in this session",
    description: `<use_case>Return the list of skills loaded so far in this session, plus the tool calls that loaded them. Use this BEFORE claiming a task is complete or posting a code review, so you can verify the relevant rules were actually consulted.</use_case>

<aliases>"which rules did I load", "what skills are active", "show my compliance log", "did I check the right standards", "audit my work"</aliases>

<important_notes>
- Run this BEFORE handing off work or claiming "done" — it's the receipt that proves you grounded your output in project rules.
- For PR reviews, paste the loaded-skills list into the review header so the author can verify.
- Each session's audit log is in-memory and resets when the MCP server restarts.
</important_notes>`,
    inputSchema: auditSessionComplianceSchema,
    handler: () => auditSessionCompliance({}, ctx),
  });

  return server;
}
