# Review package: 92d06c420f6a41f08e11579423e4e3eacdb7880d..WORKSPACE (cumulative uncommitted snapshot)

## Scope
- mcp/test/SkillIndex.spec.ts
- skills/database/database-mongodb/SKILL.md
- skills/laravel/laravel-eloquent/SKILL.md

## Files changed
mcp/test/SkillIndex.spec.ts               | 73 +++++++++++++++++++++++++++++++
 skills/database/database-mongodb/SKILL.md |  3 +-
 skills/laravel/laravel-eloquent/SKILL.md  |  3 +-
 3 files changed, 77 insertions(+), 2 deletions(-)

## Diff
diff --git a/mcp/test/SkillIndex.spec.ts b/mcp/test/SkillIndex.spec.ts
index ba504f8d..8d5c93a2 100644
--- a/mcp/test/SkillIndex.spec.ts
+++ b/mcp/test/SkillIndex.spec.ts
@@ -548,20 +548,93 @@ describe("SkillIndex — repository trigger routing", () => {
     expect(formIds).toContain("angular-forms");
     expect(formIds).toContain("common-accessibility");
 
     const viewIds = registryIndex
       .matchKeywords(["ViewBinding"])
       .map((match) => match.skill.id);
     expect(viewIds).toContain("android-xml-views");
     expect(viewIds).toContain("common-accessibility");
     expect(viewIds).toContain("common-mobile-ux-core");
   });
+
+  // LLM routing language and database data-model skills must not share a bare
+  // `model` trigger. Domain discovery survives through qualified phrases.
+
+  it("does not route LLM model intent to MongoDB or Eloquent", () => {
+    const cases = [
+      "model routing",
+      "Model Routing",
+      "LLM model selection",
+      "llm Model Selection",
+      "thinking level",
+      "Thinking Level",
+      "model routing and thinking level",
+    ];
+
+    for (const query of cases) {
+      const ids = registryIndex
+        .matchKeywords([query])
+        .map((match) => match.skill.id);
+
+      expect(ids, query).not.toContain("database-mongodb");
+      expect(ids, query).not.toContain("laravel-eloquent");
+    }
+  });
+
+  it("keeps explicit MongoDB and Mongoose model requests on the MongoDB skill", () => {
+    const cases = [
+      "MongoDB model design",
+      "mongodb MODEL indexing",
+      "Mongoose model",
+    ];
+
+    for (const query of cases) {
+      const ids = registryIndex
+        .matchKeywords([query])
+        .map((match) => match.skill.id);
+
+      expect(ids, query).toContain("database-mongodb");
+    }
+  });
+
+  it("keeps explicit Laravel and Eloquent model requests on the Eloquent skill", () => {
+    const cases = [
+      "Laravel model relationships",
+      "laravel MODEL casting",
+      "Eloquent model scopes",
+    ];
+
+    for (const query of cases) {
+      const ids = registryIndex
+        .matchKeywords([query])
+        .map((match) => match.skill.id);
+
+      expect(ids, query).toContain("laravel-eloquent");
+    }
+  });
+
+  it("keeps a model-tier request on the task complexity standard", () => {
+    const ids = registryIndex
+      .matchKeywords(["model tier"])
+      .map((match) => match.skill.id);
+
+    expect(ids).toContain("common-task-complexity-routing");
+  });
+
+  it("preserves explicit MongoDB model discovery inside a mixed LLM routing request", () => {
+    const ids = registryIndex
+      .matchKeywords(["LLM model selection for MongoDB model design"])
+      .map((match) => match.skill.id);
+
+    expect(ids).toContain("database-mongodb");
+    expect(ids).not.toContain("laravel-eloquent");
+  });
 });
 
 // ---------- composite-trigger expansion ----------
 
 async function makeCompositeFixture(): Promise<{
   root: string;
   cleanup: () => Promise<void>;
 }> {
   const root = await fs.mkdtemp(path.join(os.tmpdir(), "ags-mcp-composite-"));
   const skills = path.join(root, "skills");
diff --git a/skills/database/database-mongodb/SKILL.md b/skills/database/database-mongodb/SKILL.md
index 2eb75e37..eede6299 100644
--- a/skills/database/database-mongodb/SKILL.md
+++ b/skills/database/database-mongodb/SKILL.md
@@ -3,23 +3,24 @@ name: database-mongodb
 description: Apply MongoDB data-modeling, indexing, and query rules from access patterns. Use when designing schemas, choosing embed vs reference, or tuning MongoDB query behavior.
 metadata:
   triggers:
     files:
     - '**/*.ts'
     - '**/*.js'
     - '**/*.json'
     keywords:
     - mongo
     - mongoose
+    - mongoose model
+    - mongodb model
     - objectid
     - schema
-    - model
   upstream:
     - name: mongodb
       source: github
       repo: mongodb/mongo
       pinned: "8.0.0"
       tag_pattern: "^r(\\d+\\.\\d+\\.\\d+)$"
       reviewed: "2026-06-17"
 ---
 # MongoDB Best Practices
 
diff --git a/skills/laravel/laravel-eloquent/SKILL.md b/skills/laravel/laravel-eloquent/SKILL.md
index 27c2a02e..9bcfe437 100644
--- a/skills/laravel/laravel-eloquent/SKILL.md
+++ b/skills/laravel/laravel-eloquent/SKILL.md
@@ -3,21 +3,22 @@ name: laravel-eloquent
 description: Write performant Eloquent queries with eager loading, reusable scopes, and strict lazy-loading prevention in Laravel. Use when defining model relationships, creating query scopes, or processing large datasets with chunk/cursor.
 metadata:
   triggers:
     files:
     - 'app/Models/**/*.php'
     keywords:
     - scope
     - with
     - eager
     - chunk
-    - model
+    - eloquent model
+    - laravel model
 ---
 # Laravel Eloquent
 
 ## **Priority: P0 (CRITICAL)**
 
 ## Workflow: Add Model with Safe Queries
 
 1. **Define model** — Set `$fillable`, `$casts`, and relationships.
 2. **Enable strict loading** — Call `Model::preventLazyLoading(!app()->isProduction())` in AppServiceProvider.
 3. **Add scopes** — Create `scopeActive()`, `scopeVerified()` for reusable filters.
