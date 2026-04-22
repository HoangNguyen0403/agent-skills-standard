#!/usr/bin/env node
"use strict";
var __create = Object.create;
var __defProp = Object.defineProperty;
var __getOwnPropDesc = Object.getOwnPropertyDescriptor;
var __getOwnPropNames = Object.getOwnPropertyNames;
var __getProtoOf = Object.getPrototypeOf;
var __hasOwnProp = Object.prototype.hasOwnProperty;
var __copyProps = (to, from, except, desc) => {
  if (from && typeof from === "object" || typeof from === "function") {
    for (let key of __getOwnPropNames(from))
      if (!__hasOwnProp.call(to, key) && key !== except)
        __defProp(to, key, { get: () => from[key], enumerable: !(desc = __getOwnPropDesc(from, key)) || desc.enumerable });
  }
  return to;
};
var __toESM = (mod, isNodeMode, target) => (target = mod != null ? __create(__getProtoOf(mod)) : {}, __copyProps(
  // If the importer is in node compatibility mode or this is not an ESM
  // file that has been converted to a CommonJS file using a Babel-
  // compatible transform (i.e. "__esModule" has not been set), then set
  // "default" to the CommonJS "module.exports" for node compatibility.
  isNodeMode || !mod || !mod.__esModule ? __defProp(target, "default", { value: mod, enumerable: true }) : target,
  mod
));

// src/index.ts
var import_stdio = require("@modelcontextprotocol/sdk/server/stdio.js");

// src/server.ts
var import_mcp = require("@modelcontextprotocol/sdk/server/mcp.js");

// src/services/SkillIndex.ts
var import_fs_extra2 = __toESM(require("fs-extra"));
var import_path = __toESM(require("path"));
var import_minimatch = require("minimatch");

// src/services/SkillParser.ts
var import_fs_extra = __toESM(require("fs-extra"));
var import_js_yaml = __toESM(require("js-yaml"));
var FRONTMATTER_RE = /^---\r?\n([\s\S]*?)\r?\n---\r?\n([\s\S]*)$/;
async function parseSkill(skillPath, category, id) {
  const content = await import_fs_extra.default.readFile(skillPath, "utf8");
  const fm = FRONTMATTER_RE.exec(content);
  if (!fm) return null;
  let parsed;
  try {
    parsed = import_js_yaml.default.load(fm[1]) ?? {};
  } catch {
    return null;
  }
  const meta = parsed.metadata ?? {};
  const rawTriggers = meta.triggers ?? {};
  const triggers = {
    files: toStringArray(rawTriggers.files),
    keywords: toStringArray(rawTriggers.keywords),
    composite: toStringArray(rawTriggers.composite),
    exclude: toStringArray(rawTriggers.exclude)
  };
  return {
    id,
    category,
    path: skillPath,
    name: typeof parsed.name === "string" ? parsed.name : id,
    description: typeof parsed.description === "string" ? parsed.description : "",
    triggers
  };
}
function toStringArray(value) {
  return Array.isArray(value) ? value.filter((v) => typeof v === "string") : [];
}

// src/services/SkillIndex.ts
var SkillIndex = class {
  skillsDir;
  metadataPath;
  skills = [];
  metadata = {
    file_routing: {},
    broad_globs: [],
    base_language_skills: {},
    foundational_composite_rules: {}
  };
  loaded = false;
  constructor(skillsDir, metadataPath) {
    this.skillsDir = skillsDir;
    this.metadataPath = metadataPath;
  }
  async load() {
    if (this.skillsDir === null) {
      this.loaded = true;
      return;
    }
    this.metadata = await this.loadMetadata();
    this.skills = await this.scanSkills();
    this.loaded = true;
  }
  /** True when no skills directory was found at startup. */
  isEmpty() {
    return this.skillsDir === null || this.skills.length === 0;
  }
  ensureLoaded() {
    if (!this.loaded) {
      throw new Error("SkillIndex.load() must be called before querying.");
    }
  }
  /** All categories present on disk (one subdirectory per category). */
  listCategories() {
    this.ensureLoaded();
    return Array.from(new Set(this.skills.map((s) => s.category))).sort();
  }
  /** All skills in a category. */
  listSkillsInCategory(category) {
    this.ensureLoaded();
    return this.skills.filter((s) => s.category === category);
  }
  /** Direct lookup. */
  findSkill(category, id) {
    this.ensureLoaded();
    return this.skills.find((s) => s.category === category && s.id === id);
  }
  /**
   * Match files against the index. Implements the tier model:
   *   - File extension routes to N candidate categories via file_routing
   *   - Within each category, only skills whose `triggers.files` glob matches
   *     the file path are returned
   *   - Skills with broad globs (e.g. `**\/*.ts`) are demoted: they match only
   *     if they are the registered `base_language_skills` for that category
   *   - `exclude` patterns in a skill suppress matches
   */
  matchFiles(files) {
    this.ensureLoaded();
    const results = [];
    const seen = /* @__PURE__ */ new Set();
    for (const file of files) {
      const ext = import_path.default.extname(file).replace(/^\./, "");
      const categories = this.metadata.file_routing[ext] ?? [];
      for (const category of categories) {
        const categorySkills = this.listSkillsInCategory(category);
        const baseSkillId = this.metadata.base_language_skills[category];
        for (const skill of categorySkills) {
          if (this.isExcluded(skill, file)) continue;
          for (const glob of skill.triggers.files) {
            if (!(0, import_minimatch.minimatch)(file, glob, { matchBase: true })) continue;
            const isBroad = this.metadata.broad_globs.includes(glob);
            const isBaseLanguage = skill.id === baseSkillId;
            if (isBroad && !isBaseLanguage) continue;
            const key = `${skill.category}/${skill.id}`;
            if (seen.has(key)) break;
            seen.add(key);
            results.push({ skill, matchedBy: "file", reason: glob });
            break;
          }
        }
      }
    }
    return [...results, ...this.expandComposites(results)];
  }
  /**
   * Match keyword phrases against every skill's `triggers.keywords`.
   * Case-insensitive substring match — same semantics as IndexGeneratorService.
   */
  matchKeywords(keywords) {
    this.ensureLoaded();
    const results = [];
    const seen = /* @__PURE__ */ new Set();
    const lowered = keywords.map((k) => k.toLowerCase());
    for (const skill of this.skills) {
      for (const trigger of skill.triggers.keywords) {
        const triggerLc = trigger.toLowerCase();
        const hit = lowered.find((k) => k.includes(triggerLc) || triggerLc.includes(k));
        if (!hit) continue;
        const key = `${skill.category}/${skill.id}`;
        if (seen.has(key)) break;
        seen.add(key);
        results.push({ skill, matchedBy: "keyword", reason: trigger });
        break;
      }
    }
    return [...results, ...this.expandComposites(results)];
  }
  /** Returns the file_routing map so the agent can discover which categories handle which extensions. */
  getRouting() {
    this.ensureLoaded();
    return this.metadata.file_routing;
  }
  /**
   * Expand a set of direct match results with composite-triggered foundational
   * skills. Mirrors the same `String.includes` semantics that the CLI's
   * IndexGeneratorService uses when baking composites into static `_INDEX.md`.
   *
   * For each rule `"<category>/<id>": [pattern, ...]`, if any direct match's
   * skill id contains any pattern, the foundational skill is appended.
   *
   * Composite-triggered results are deduped against the seed set and against
   * other composites — each (category, id) appears at most once.
   *
   * Composites are NOT recursive — a composite-triggered skill cannot trigger
   * further composites. This matches the static index generator's behaviour
   * and prevents infinite loops if rules are configured carelessly.
   */
  expandComposites(seeds) {
    this.ensureLoaded();
    const seenKeys = new Set(seeds.map((r) => `${r.skill.category}/${r.skill.id}`));
    const out = [];
    for (const [foundationalRef, patterns] of Object.entries(
      this.metadata.foundational_composite_rules
    )) {
      const slash = foundationalRef.indexOf("/");
      if (slash < 0) continue;
      const cat = foundationalRef.slice(0, slash);
      const idStub = foundationalRef.slice(slash + 1);
      const skill = this.findSkill(cat, `${cat}-${idStub}`) ?? this.findSkill(cat, idStub);
      if (!skill) continue;
      const skillKey = `${skill.category}/${skill.id}`;
      if (seenKeys.has(skillKey)) continue;
      const trigger = seeds.find(
        (s) => patterns.some((p) => s.skill.id.includes(p))
      );
      if (!trigger) continue;
      seenKeys.add(skillKey);
      out.push({
        skill,
        matchedBy: "composite",
        reason: `via ${trigger.skill.category}/${trigger.skill.id}`
      });
    }
    return out;
  }
  isExcluded(skill, file) {
    return skill.triggers.exclude.some(
      (glob) => (0, import_minimatch.minimatch)(file, glob, { matchBase: true })
    );
  }
  async loadMetadata() {
    if (!this.metadataPath || !await import_fs_extra2.default.pathExists(this.metadataPath)) {
      return {
        file_routing: {},
        broad_globs: [],
        base_language_skills: {},
        foundational_composite_rules: {}
      };
    }
    const raw = await import_fs_extra2.default.readFile(this.metadataPath, "utf8");
    const parsed = JSON.parse(raw);
    const baseSkills = { ...parsed.base_language_skills ?? {} };
    delete baseSkills._comment;
    const fileRouting = { ...parsed.file_routing ?? {} };
    delete fileRouting._comment;
    const composites = { ...parsed.foundational_composite_rules ?? {} };
    delete composites._comment;
    return {
      file_routing: fileRouting,
      broad_globs: parsed.broad_globs ?? [],
      base_language_skills: baseSkills,
      foundational_composite_rules: composites
    };
  }
  async scanSkills() {
    if (this.skillsDir === null) return [];
    const out = [];
    const categories = await import_fs_extra2.default.readdir(this.skillsDir);
    for (const category of categories) {
      const categoryDir = import_path.default.join(this.skillsDir, category);
      const stat = await import_fs_extra2.default.stat(categoryDir).catch(() => null);
      if (!stat?.isDirectory()) continue;
      const skillDirs = await import_fs_extra2.default.readdir(categoryDir);
      for (const skillId of skillDirs) {
        const skillPath = import_path.default.join(categoryDir, skillId, "SKILL.md");
        if (!await import_fs_extra2.default.pathExists(skillPath)) continue;
        const parsed = await parseSkill(skillPath, category, skillId);
        if (parsed) out.push(parsed);
      }
    }
    return out;
  }
};

// src/services/SessionTracker.ts
var SessionTracker = class {
  events = [];
  startedAt = (/* @__PURE__ */ new Date()).toISOString();
  record(event) {
    this.events.push({ at: (/* @__PURE__ */ new Date()).toISOString(), ...event });
  }
  /** Unique skills loaded so far, formatted as `category/id`. */
  loadedSkills() {
    const set = /* @__PURE__ */ new Set();
    for (const e of this.events) for (const s of e.loaded) set.add(s);
    return Array.from(set).sort();
  }
  events_() {
    return [...this.events];
  }
  startedAt_() {
    return this.startedAt;
  }
};

// src/tools/index.ts
var import_fs_extra3 = __toESM(require("fs-extra"));
var import_zod = require("zod");
function setupGuidance(setup) {
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
        "  4. Restart this MCP server"
      ].join("\n");
    case "no-skills-dir":
      return [
        "No skills are installed in this project yet.",
        "",
        "To install skills:",
        "  Run `npx agent-skills-standard@latest sync` from the project root.",
        "",
        "After running `sync`, restart this MCP server (or reload your AI tool) so it can pick up the new skills."
      ].join("\n");
    case "ready":
      return "";
  }
}
function maybeEmptyState(ctx) {
  if (ctx.setup.kind !== "ready" || ctx.index.isEmpty()) {
    const guidance = setupGuidance(ctx.setup);
    if (guidance) {
      return { content: [{ type: "text", text: guidance }] };
    }
    return {
      content: [
        {
          type: "text",
          text: "No skills are loaded in this project. Run `npx agent-skills-standard@latest sync` to install standard skills, then restart the MCP server."
        }
      ]
    };
  }
  return null;
}
var loadSkillsForFilesSchema = {
  files: import_zod.z.array(import_zod.z.string().min(1)).min(1).describe(
    'Project-relative file paths the agent is about to read or modify (e.g. ["src/cart.dart", "internal/auth.go"]).'
  )
};
async function loadSkillsForFiles(args, ctx) {
  const empty = maybeEmptyState(ctx);
  if (empty) return empty;
  const matches = ctx.index.matchFiles(args.files);
  return await finalize("load_skills_for_files", args.files, matches, ctx);
}
var loadSkillsForKeywordsSchema = {
  keywords: import_zod.z.array(import_zod.z.string().min(1)).min(1).describe(
    `Concept words from the user request (e.g. ["auth", "performance", "migration"]). Matched against each skill's keyword triggers.`
  )
};
async function loadSkillsForKeywords(args, ctx) {
  const empty = maybeEmptyState(ctx);
  if (empty) return empty;
  const matches = ctx.index.matchKeywords(args.keywords);
  return await finalize("load_skills_for_keywords", args.keywords, matches, ctx);
}
var getSkillSchema = {
  category: import_zod.z.string().min(1).describe('Skill category (e.g. "flutter", "golang").'),
  name: import_zod.z.string().min(1).describe("Skill id \u2014 the directory name under the category.")
};
async function getSkill(args, ctx) {
  const empty = maybeEmptyState(ctx);
  if (empty) return empty;
  const skill = ctx.index.findSkill(args.category, args.name);
  if (!skill) {
    return alternativeSkillSuggestion(args, ctx);
  }
  const body = await import_fs_extra3.default.readFile(skill.path, "utf8").catch(() => null);
  if (!body) {
    return {
      content: [
        {
          type: "text",
          text: [
            `The skill index references "${args.category}/${args.name}" but its SKILL.md is missing.`,
            "This usually means the skill was deleted or moved after the server started.",
            "Restart the MCP server, or run `npx agent-skills-standard@latest sync` to reinstall skills."
          ].join("\n")
        }
      ]
    };
  }
  ctx.tracker.record({
    via: "get_skill",
    input: [`${args.category}/${args.name}`],
    loaded: [`${skill.category}/${skill.id}`]
  });
  return {
    content: [
      {
        type: "text",
        text: renderSkill(skill.category, skill.id, body, "direct")
      }
    ]
  };
}
var listCategoriesSchema = {};
async function listCategories(_args, ctx) {
  const empty = maybeEmptyState(ctx);
  if (empty) return empty;
  const categories = ctx.index.listCategories();
  const routing = ctx.index.getRouting();
  const lines = ["# Skill categories", ""];
  for (const cat of categories) {
    const skills = ctx.index.listSkillsInCategory(cat);
    const exts = Object.entries(routing).filter(([, cats]) => cats.includes(cat)).map(([ext]) => `.${ext}`);
    lines.push(`- **${cat}** \u2014 ${skills.length} skill(s)${exts.length ? ` \u2014 files: ${exts.join(", ")}` : ""}`);
  }
  return { content: [{ type: "text", text: lines.join("\n") }] };
}
var auditSessionComplianceSchema = {};
async function auditSessionCompliance(_args, ctx) {
  const loaded = ctx.tracker.loadedSkills();
  const events = ctx.tracker.events_();
  const lines = [
    "# Session compliance",
    "",
    `Session started: ${ctx.tracker.startedAt_()}`,
    `Skills loaded: ${loaded.length}`,
    "",
    "## Loaded skills",
    ...loaded.length ? loaded.map((s) => `- ${s}`) : ["_(none yet)_"],
    "",
    "## Tool calls",
    ...events.length ? events.map(
      (e) => `- ${e.at} \u2014 ${e.via}(${e.input.join(", ")}) \u2192 ${e.loaded.join(", ") || "(no match)"}`
    ) : ["_(none yet)_"]
  ];
  return { content: [{ type: "text", text: lines.join("\n") }] };
}
async function finalize(via, input, matches, ctx) {
  if (matches.length === 0) {
    ctx.tracker.record({ via, input, loaded: [] });
    return noMatchGuidance(via, input, ctx);
  }
  const blocks = [];
  const loaded = [];
  for (const match of matches) {
    const body = await import_fs_extra3.default.readFile(match.skill.path, "utf8");
    blocks.push(
      renderSkill(match.skill.category, match.skill.id, body, `${match.matchedBy}:${match.reason}`)
    );
    loaded.push(`${match.skill.category}/${match.skill.id}`);
  }
  ctx.tracker.record({ via, input, loaded });
  return { content: [{ type: "text", text: blocks.join("\n\n---\n\n") }] };
}
function noMatchGuidance(via, input, ctx) {
  const categories = ctx.index.listCategories();
  const routing = ctx.index.getRouting();
  const lines = [];
  if (via === "load_skills_for_files") {
    const exts = Array.from(
      new Set(
        input.map((f) => {
          const m = /\.([a-zA-Z0-9]+)$/.exec(f);
          return m ? m[1] : "";
        }).filter(Boolean)
      )
    );
    if (exts.length) {
      const routed = exts.filter((e) => Boolean(routing[e]));
      const unrouted = exts.filter((e) => !routing[e]);
      if (unrouted.length) {
        lines.push(
          `No skills are routed to file extensions: ${unrouted.map((e) => "." + e).join(", ")}.`
        );
      }
      if (routed.length) {
        lines.push(
          `Files with extensions ${routed.map((e) => "." + e).join(", ")} did not match any tier-eligible skill (broad-glob skills are demoted unless they are the registered base-language skill for the category).`
        );
      }
    } else {
      lines.push("Files have no extensions, so no router rules apply.");
    }
  } else {
    lines.push(
      `No skill keyword triggers matched: ${input.join(", ")}. Keyword matches are case-insensitive substring matches against each skill's declared triggers.`
    );
  }
  lines.push("");
  lines.push(
    `**Available categories** (${categories.length}): ${categories.join(", ")}`
  );
  lines.push("");
  lines.push(
    "Try `load_skills_for_keywords` with concept words from the user request, or `list_categories` to see which categories cover what."
  );
  return { content: [{ type: "text", text: lines.join("\n") }] };
}
function alternativeSkillSuggestion(args, ctx) {
  const categories = ctx.index.listCategories();
  const categoryHit = categories.find((c) => c.toLowerCase() === args.category.toLowerCase());
  const lines = [];
  if (categoryHit) {
    const sibs = ctx.index.listSkillsInCategory(categoryHit).map((s) => s.id);
    const close = sibs.map((id) => ({ id, score: similarity(id, args.name) })).sort((a, b) => b.score - a.score).slice(0, 5).map((s) => `${categoryHit}/${s.id}`);
    lines.push(
      `Category "${categoryHit}" exists, but it does not contain a skill named "${args.name}".`
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
      "Use `list_categories` for a fuller view, or call `load_skills_for_files` / `load_skills_for_keywords` to let the router pick."
    );
  }
  return { content: [{ type: "text", text: lines.join("\n") }] };
}
function similarity(a, b) {
  const al = a.toLowerCase();
  const bl = b.toLowerCase();
  if (al === bl) return 1;
  if (al.includes(bl) || bl.includes(al)) return 0.7;
  const at = new Set(al.split(/[-_/]/));
  const bt = new Set(bl.split(/[-_/]/));
  const overlap = [...at].filter((t) => bt.has(t)).length;
  return overlap / Math.max(at.size, bt.size, 1);
}
function renderSkill(category, id, body, why) {
  return `<!-- skill: ${category}/${id} | matched: ${why} -->
${body}`;
}

// src/server.ts
function register(server, tool) {
  server.registerTool(
    tool.name,
    {
      title: tool.title,
      description: tool.description,
      inputSchema: tool.inputSchema
    },
    tool.handler
  );
}
var SERVER_INSTRUCTIONS = `
You are connected to the agent-skills-standard MCP server. It serves
project-specific coding-standard rules ("skills") on demand from this
project's local skill registry.

# WHEN TO CALL THIS SERVER

Call \`load_skills_for_files\` BEFORE you:
  \u2022 Edit, write, or modify any source file
  \u2022 Review a PR diff or critique code
  \u2022 Answer "how should I implement X" / "what's the convention for X"

Call \`load_skills_for_keywords\` BEFORE you:
  \u2022 Plan or design work where files are not yet identified
    (e.g. "add JWT auth", "speed up the homepage", "migrate the schema")

Call \`audit_session_compliance\` BEFORE you:
  \u2022 Claim a task is complete
  \u2022 Post a code review
  \u2022 Hand off to another agent

# WORKFLOW

  1. Decide which file(s) you will touch (or which concept the user mentioned).
  2. Call \`load_skills_for_files(files=[...])\` (or the keywords variant).
  3. Treat every returned SKILL.md as authoritative project rules. They
     OVERRIDE your pre-training defaults.
  4. Do the work \u2014 edit, review, design \u2014 following those rules.
  5. Before declaring done, call \`audit_session_compliance()\` and verify
     the relevant skills appear in the loaded list.

# IMPORTANT

  \u2022 Skills are tier-aware. A broad-glob skill (e.g. \`**/*.dart\`) only
    matches if it is the registered base-language skill for its category.
    All other broad-glob skills are returned ONLY via keyword match.
  \u2022 If a tool returns "no match", it ALSO returns a list of available
    categories \u2014 use that to choose the next call instead of giving up.
  \u2022 If a tool returns setup guidance (e.g. "run agent-skills-standard
    sync"), surface that to the user verbatim \u2014 do not paraphrase or skip.

# SUB-AGENTS

Sub-agents in your runtime inherit this MCP. Every sub-agent should
follow the same workflow above \u2014 load skills first, then act, then audit.
Do not assume the orchestrator has pre-loaded skills for you.
`.trim();
async function buildServer(config) {
  const index = new SkillIndex(config.skillsDir, config.metadataPath);
  await index.load();
  const tracker = new SessionTracker();
  const ctx = { index, tracker, setup: config.setup };
  const server = new import_mcp.McpServer(
    {
      name: "agent-skills-standard-mcp",
      version: "0.1.0"
    },
    {
      instructions: SERVER_INSTRUCTIONS
    }
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
- Treat every returned SKILL.md as AUTHORITATIVE \u2014 these rules override your pre-training defaults.
- If the result has zero matches, the response includes the list of available categories \u2014 use it to choose your next call.
- Sub-agents should call this independently \u2014 do NOT assume the orchestrator already loaded skills for you.
</important_notes>`,
    inputSchema: loadSkillsForFilesSchema,
    handler: (args) => loadSkillsForFiles(args, ctx)
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
- If no match, the response lists available categories \u2014 pick one and call list_categories or load_skills_for_files next.
</important_notes>`,
    inputSchema: loadSkillsForKeywordsSchema,
    handler: (args) => loadSkillsForKeywords(args, ctx)
  });
  register(server, {
    name: "get_skill",
    title: "Get a specific skill by category and name",
    description: `<use_case>Direct lookup for a single skill when you already know exactly which one you need (e.g. you saw it referenced in another skill's "References" section, or in a previous load_skills_for_files response).</use_case>

<aliases>"open the X skill", "show me the X/Y rule", "fetch the rules for category X skill Y"</aliases>

<important_notes>
- "category" is the directory name (e.g. "flutter", "golang", "common").
- "name" is the skill id, also the directory name (e.g. "flutter-bloc-state-management", "golang-clean-architecture").
- If the exact name is wrong, the response suggests the closest matches in the same category \u2014 try those.
- For routine work, prefer load_skills_for_files (smarter routing) over this direct lookup.
</important_notes>`,
    inputSchema: getSkillSchema,
    handler: (args) => getSkill(args, ctx)
  });
  register(server, {
    name: "list_categories",
    title: "List all skill categories available in this project",
    description: `<use_case>Discover what skill categories are installed in this project, the file extensions each handles, and how many skills are in each. Use to scope work or to pick a category for follow-up tool calls.</use_case>

<aliases>"what skills do we have", "show me all categories", "what frameworks are covered", "list the project rules"</aliases>

<important_notes>
- Returns: category name, skill count per category, and routed file extensions.
- Use this once at the start of complex work (PR review, large feature) to understand scope.
- For per-file rule loading, use load_skills_for_files \u2014 it's already aware of categories.
</important_notes>`,
    inputSchema: listCategoriesSchema,
    handler: () => listCategories({}, ctx)
  });
  register(server, {
    name: "audit_session_compliance",
    title: "Audit which skills were loaded in this session",
    description: `<use_case>Return the list of skills loaded so far in this session, plus the tool calls that loaded them. Use this BEFORE claiming a task is complete or posting a code review, so you can verify the relevant rules were actually consulted.</use_case>

<aliases>"which rules did I load", "what skills are active", "show my compliance log", "did I check the right standards", "audit my work"</aliases>

<important_notes>
- Run this BEFORE handing off work or claiming "done" \u2014 it's the receipt that proves you grounded your output in project rules.
- For PR reviews, paste the loaded-skills list into the review header so the author can verify.
- Each session's audit log is in-memory and resets when the MCP server restarts.
</important_notes>`,
    inputSchema: auditSessionComplianceSchema,
    handler: () => auditSessionCompliance({}, ctx)
  });
  return server;
}

// src/config.ts
var import_path2 = __toESM(require("path"));
var import_fs_extra4 = __toESM(require("fs-extra"));
async function resolveConfig() {
  const explicit = process.env.SKILLS_PROJECT_ROOT;
  const startDir = process.cwd();
  let projectRoot;
  let setup = { kind: "ready" };
  if (explicit) {
    projectRoot = import_path2.default.resolve(explicit);
  } else {
    const found = await findProjectRoot(startDir);
    if (found) {
      projectRoot = found;
    } else {
      projectRoot = import_path2.default.resolve(startDir);
      setup = { kind: "no-agents-md", searchedFrom: startDir };
    }
  }
  const skillsDir = await findSkillsDir(projectRoot);
  if (!skillsDir) {
    return {
      projectRoot,
      skillsDir: null,
      setup: setup.kind === "ready" ? { kind: "no-skills-dir", projectRoot, candidates: SKILL_DIR_CANDIDATES } : setup
    };
  }
  const metadataCandidate = import_path2.default.join(skillsDir, "metadata.json");
  const metadataPath = await import_fs_extra4.default.pathExists(metadataCandidate) ? metadataCandidate : void 0;
  return { projectRoot, skillsDir, metadataPath, setup };
}
var SKILL_DIR_CANDIDATES = [
  "skills",
  ".claude/skills",
  ".cursor/skills",
  ".gemini/skills",
  ".kiro/skills",
  ".windsurf/skills",
  ".continue/skills",
  ".antigravity/skills",
  ".trae/skills",
  ".roo/skills"
];
async function findSkillsDir(root) {
  for (const candidate of SKILL_DIR_CANDIDATES) {
    const full = import_path2.default.join(root, candidate);
    if (await import_fs_extra4.default.pathExists(full)) {
      return full;
    }
  }
  return null;
}
async function findProjectRoot(start) {
  let current = import_path2.default.resolve(start);
  while (true) {
    if (await import_fs_extra4.default.pathExists(import_path2.default.join(current, "AGENTS.md"))) {
      return current;
    }
    const parent = import_path2.default.dirname(current);
    if (parent === current) return null;
    current = parent;
  }
}

// src/index.ts
async function main() {
  const config = await resolveConfig();
  if (config.skillsDir) {
    process.stderr.write(
      `[ags-mcp] serving skills from ${config.skillsDir}
`
    );
  } else {
    process.stderr.write(
      `[ags-mcp] no skills installed yet (${config.setup.kind}). Tools will return setup guidance until you run \`agent-skills-standard sync\`.
`
    );
  }
  const server = await buildServer(config);
  const transport = new import_stdio.StdioServerTransport();
  await server.connect(transport);
}
main().catch((err) => {
  process.stderr.write(`[ags-mcp] fatal: ${err instanceof Error ? err.stack : String(err)}
`);
  process.exit(1);
});
