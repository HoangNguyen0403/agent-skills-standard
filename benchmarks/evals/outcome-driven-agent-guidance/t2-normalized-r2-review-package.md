# Review package: c679e0032fbebf4eed90db0f2fc4f52541a3f23d..WORKSPACE (cumulative uncommitted snapshot)

## Scope
- cli/src/services/IndexContentBuilder.ts
- mcp/src/server.ts
- mcp/src/tools/index.ts
- mcp/test/SkillIndex.spec.ts
- skills/flutter/flutter-cicd/SKILL.md

## Files changed
cli/src/services/IndexContentBuilder.ts |  5 +--
 mcp/src/server.ts                       |  8 ++--
 mcp/src/tools/index.ts                  |  2 +-
 mcp/test/SkillIndex.spec.ts             | 71 +++++++++++++++++++++++++++++++++
 skills/flutter/flutter-cicd/SKILL.md    |  9 +----
 5 files changed, 80 insertions(+), 15 deletions(-)

## Diff
diff --git a/cli/src/services/IndexContentBuilder.ts b/cli/src/services/IndexContentBuilder.ts
index f9ad0dac..41ccdb8f 100644
--- a/cli/src/services/IndexContentBuilder.ts
+++ b/cli/src/services/IndexContentBuilder.ts
@@ -89,24 +89,23 @@ export class IndexContentBuilder {
       '## ⚡ How to Find and Use This Index',
       '',
       '> [!IMPORTANT] PATH RESOLUTION (Cross-Platform)',
       '> Skill IDs in the list below (e.g., `[category/skill-name]`) represent the relative folder path.',
       '> Because this project supports multiple AI agents, skills may reside in a base directory like `.gemini/skills/`, `.agents/skills/`, or `.cursor/skills/`.',
       '> **Action:** You must prepend the correct base directory to the ID. (Example: If ID is `[flutter/cicd]`, the file is at `<BASE_DIR>/flutter/cicd/SKILL.md`). Use your file search tools (e.g., `list_directory` or `find`) if you are unsure of the base directory.',
       '',
       '| Trigger Type | What to match | Required Action |',
       '| --- | --- | --- |',
       '| **File glob** (e.g. `**/*.ts`) | Files you are currently editing match the pattern | Call `view_file` on `<BASE_DIR>/[Skill ID]/SKILL.md` |',
-      "| **Keyword** (e.g. `auth`, `refactor`) | These words appear in the user\\'s request | Call `view_file` on `<BASE_DIR>/[Skill ID]/SKILL.md` |",
+      '| **Keyword** (e.g. `auth`, `refactor`) | Normalized concepts associated with requested work; keep each multiword concept atomic (Flutter CI/CD → `keywords: ["flutter cicd"]`) | Call `view_file` on `<BASE_DIR>/[Skill ID]/SKILL.md`; separate entries are not combined |',
       '| **Composite** (e.g. `+other/skill`) | Another listed skill is already active | Also load this skill via `view_file` |',
       '',
       '> [!TIP]',
-      '> **Indirect phrasing still counts.** Match keywords by intent, not just exact words.',
-      '> Examples: "make it faster" → `performance`, "broken query" → `database`, "login flow" → `auth`, "clean up this file" → `refactor`.',
+      '> The caller associates concepts with requested work; the registry matches declared phrases and does not infer relationships between separate terms. Pass a multiword concept intact, for example `keywords: ["flutter cicd"]`.',
       '',
       '### List of Available Skills',
       '',
     ].join('\n');
 
     return `${header}\n${entries.join('\n')}\n`;
   }
 }
diff --git a/mcp/src/server.ts b/mcp/src/server.ts
index 37c9e64a..2ccb9e72 100644
--- a/mcp/src/server.ts
+++ b/mcp/src/server.ts
@@ -239,28 +239,30 @@ export async function buildServer(
 - If the result has zero matches, the response includes the list of available categories — use it to choose your next call.
 - Sub-agents should call this independently — do NOT assume the orchestrator already loaded skills for you.
 </important_notes>`,
     inputSchema: loadSkillsForFilesSchema,
     handler: (args) => loadSkillsForFiles(args as { files: string[] }, ctx),
   });
 
   register(server, {
     name: "load_skills_for_keywords",
     title: "Load skills for keywords",
-    description: `<use_case>Load skills by matching concept words from the user's request, when no specific file is in scope yet. Useful at the planning stage of a task ("add JWT auth", "speed up homepage", "migrate schema").</use_case>
+    description: `<use_case>Load skills by matching normalized concepts associated with the user's requested work, when no specific file is in scope yet. Useful at the planning stage of a task ("add JWT auth", "speed up homepage", "migrate schema").</use_case>
 
 <aliases>"what does our team say about X", "rules around the topic Y", "best practices for concept Z", "team approach to authentication/performance/migrations"</aliases>
 
 <important_notes>
 - Use this BEFORE you decide which files to edit. Once files are known, switch to load_skills_for_files for tighter routing.
-- Keywords are case-insensitive substring matches against each skill's declared keyword triggers.
-- Returns full SKILL.md content with provenance comment showing which keyword matched.
+- Choose concepts that are associated with the requested work. Keep each multiword concept atomic (for Flutter CI/CD, pass \`keywords: ["flutter cicd"]\`), rather than splitting it into separate tokens.
+- Keyword matching checks declared trigger phrases case-insensitively, exactly or at word boundaries; separate entries are not combined and the registry does not infer semantic associations.
+- Quoted or background mentions alone do not establish that work is requested.
+- Returns full SKILL.md content with provenance comment showing which keyword trigger matched.
 - If no match, the response lists available categories — pick one and call list_categories or load_skills_for_files next.
 </important_notes>`,
     inputSchema: loadSkillsForKeywordsSchema,
     handler: (args) =>
       loadSkillsForKeywords(args as { keywords: string[] }, ctx),
   });
 
   register(server, {
     name: "get_skill",
     title: "Get a specific skill by category and name",
diff --git a/mcp/src/tools/index.ts b/mcp/src/tools/index.ts
index 68f3e896..3c8f17b8 100644
--- a/mcp/src/tools/index.ts
+++ b/mcp/src/tools/index.ts
@@ -208,21 +208,21 @@ export async function loadSkillsForFiles(
   return result;
 }
 
 // ---------- load_skills_for_keywords ----------
 
 export const loadSkillsForKeywordsSchema = z.object({
   keywords: z
     .array(z.string().min(1))
     .min(1)
     .describe(
-      'Concept words from the user request (e.g. ["auth", "performance", "migration"]). Matched against each skill\'s keyword triggers.',
+      'Normalized concepts associated with requested work (e.g. ["flutter cicd"]). Keep each multiword concept atomic; do not split it into separate tokens. Matched against declared keyword trigger phrases.',
     ),
 });
 
 export async function loadSkillsForKeywords(
   args: { keywords: string[] },
   ctx: ToolContext,
 ): Promise<ToolResult> {
   const empty = maybeEmptyState(ctx);
   if (empty) return empty;
 
diff --git a/mcp/test/SkillIndex.spec.ts b/mcp/test/SkillIndex.spec.ts
index 5b07430a..726839d5 100644
--- a/mcp/test/SkillIndex.spec.ts
+++ b/mcp/test/SkillIndex.spec.ts
@@ -673,20 +673,91 @@ describe("SkillIndex — repository trigger routing", () => {
   });
 
   it("preserves additive co-matching on mixed broad and narrow architecture inputs", () => {
     const ids = registryIndex
       .matchKeywords(["system architect component design"])
       .map((match) => match.skill.id);
 
     expect(ids).toContain("system-design-methodology");
     expect(ids).toContain("specialist-system-architect");
   });
+
+  it("does not route the observed authoring query to Flutter CI/CD", () => {
+    const ids = registryIndex
+      .matchKeywords([
+        "prompt engineering",
+        "agent autonomy",
+        "workflow",
+        "skill authoring",
+      ])
+      .map((match) => match.skill.id);
+
+    expect(ids).not.toContain("flutter-cicd");
+    expect(ids).not.toContain("common-tdd");
+  });
+
+  it("does not route authoring paraphrases with generic pipeline vocabulary to Flutter CI/CD", () => {
+    const cases = [
+      ["workflow", "prompt design", "skill authoring"],
+      ["agent autonomy", "authoring workflow"],
+      ["build an agent workflow guidance"],
+      ["delivery pipeline for skill authoring"],
+      ["prompt engineering", "release and workflow docs"],
+    ];
+
+    for (const query of cases) {
+      const ids = registryIndex
+        .matchKeywords(query)
+        .map((match) => match.skill.id);
+
+      expect(ids, query.join(" | ")).not.toContain("flutter-cicd");
+    }
+  });
+
+  it("routes the atomic Flutter CI/CD concept to its skill and composite", () => {
+    const ids = registryIndex
+      .matchKeywords(["flutter cicd"])
+      .map((match) => match.skill.id);
+
+    expect(ids).toContain("flutter-cicd");
+    expect(ids).toContain("common-tdd");
+  });
+
+  it("does not join split Flutter CI/CD tokens or unrelated concepts", () => {
+    for (const concepts of [
+      ["flutter", "cicd"],
+      ["flutter navigation", "workflow authoring"],
+      ["prompt engineering", "skill authoring"],
+    ]) {
+      const ids = registryIndex
+        .matchKeywords(concepts)
+        .map((match) => match.skill.id);
+
+      expect(ids, concepts.join(" | ")).not.toContain("flutter-cicd");
+      expect(ids, concepts.join(" | ")).not.toContain("common-tdd");
+    }
+  });
+
+
+  it("keeps the Flutter workflow file route discoverable", async () => {
+    const derivedIndex = new SkillIndex(
+      repositorySkillsDir,
+      path.join(repositorySkillsDir, "absent-derived-routing-metadata.json"),
+    );
+    await derivedIndex.load();
+
+    const ids = derivedIndex
+      .matchFiles([".github/workflows/flutter-release.yml"])
+      .map((match) => match.skill.id);
+
+    expect(ids).toContain("flutter-cicd");
+  });
 });
 
 // ---------- composite-trigger expansion ----------
 
 async function makeCompositeFixture(): Promise<{
   root: string;
   cleanup: () => Promise<void>;
 }> {
   const root = await fs.mkdtemp(path.join(os.tmpdir(), "ags-mcp-composite-"));
   const skills = path.join(root, "skills");
diff --git a/skills/flutter/flutter-cicd/SKILL.md b/skills/flutter/flutter-cicd/SKILL.md
index 1fcbae85..89c7966d 100644
--- a/skills/flutter/flutter-cicd/SKILL.md
+++ b/skills/flutter/flutter-cicd/SKILL.md
@@ -2,28 +2,21 @@
 name: flutter-cicd
 description: Set up CI/CD pipelines for Flutter apps. Use when configuring automated testing, build, or deployment workflows with GitHub Actions or Fastlane.
 metadata:
   triggers:
     files:
     - '.github/workflows/**.yml'
     - 'fastlane/**'
     - 'android/fastlane/**'
     - 'ios/fastlane/**'
     keywords:
-    - ci
-    - cd
-    - pipeline
-    - build
-    - deploy
-    - release
-    - action
-    - workflow
+    - flutter cicd
 ---
 # CI/CD Standards
 
 ## **Priority: P1 (HIGH)**
 
 
 ## Core Pipeline Steps
 
 1. **Environment Setup**: Use stable Flutter channel. Cache dependencies (pub, gradle, cocoapods).
 2. **Static Analysis**: Enforce `flutter analyze` and `dart format`. Fail on any warning in strict mode.
