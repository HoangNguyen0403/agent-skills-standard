import test from "node:test";
import assert from "node:assert/strict";
import fs from "fs-extra";
import path from "path";
import os from "os";
import { spawn } from "child_process";
import {
  buildGenerationPlan,
  copySourceToStage,
  linkDependencies,
  parseCategoryIndexRows,
  runInStage,
  runIsolatedGeneration,
  type IsolatedStageResult,
} from "./isolated-stage";
import { sha256 } from "../../cli/src/services/LockfileService";
import { Agent } from "../../cli/src/constants";
import type { SkillConfig } from "../../cli/src/models/config";
import type { CollectedSkill } from "../../cli/src/models/types";
import { SyncService } from "../../cli/src/services/SyncService";

const REPOSITORY_ROOT = path.resolve(__dirname, "..", "..");

function orderedFixtureJson(value: unknown): unknown {
  if (Array.isArray(value)) return value.map(orderedFixtureJson);
  if (value === null || typeof value !== "object") return value;
  return Object.fromEntries(
    Object.entries(value)
      .sort(([left], [right]) => (left < right ? -1 : left > right ? 1 : 0))
      .map(([key, nested]) => [key, orderedFixtureJson(nested)]),
  );
}

function tokenMetricsDigest(metadata: {
  categories: Record<string, Record<string, unknown>>;
}): string {
  const projection: Record<string, unknown> = {};
  for (const category of Object.keys(metadata.categories).sort()) {
    const details = metadata.categories[category];
    projection[category] = Object.prototype.hasOwnProperty.call(
      details,
      "token_metrics",
    )
      ? {
          present: true,
          value: orderedFixtureJson(details.token_metrics),
        }
      : { present: false };
  }
  return sha256(JSON.stringify(projection));
}
interface FixtureOptions {
  /** Install a generate-indices wrapper that mutates after the real producer. */
  mutateDuringIndices?: boolean;
  /** Mutate a canonical input from the staged child during generation. */
  driftSourceDuringIndices?: boolean;
  /** Fail the real child phase after its producer completes. */
  failAfterIndices?: boolean;
  /** Remove the baseline capabilities doc (docs/ directory stays). */
  omitBaselineCapabilitiesDoc?: boolean;
  /** Skip all baseline mirror files for this skill. */
  omitMirrorSkill?: string;
  inheritedRootResource?: string;
  includeMetricsReadme?: boolean;
  mutateMetadataNonMetric?: boolean;
}

const SKILL_ALPHA =
  '---\nname: common-alpha\ndescription: "Alpha skill (triggers: *.alpha)"\nmetadata:\n  triggers:\n    files:\n      - "*.alpha"\n---\n# Alpha\n';
const SKILL_BETA =
  '---\nname: common-beta\ndescription: "Beta skill (triggers: *.beta)"\nmetadata:\n  triggers:\n    keywords:\n      - beta\n---\n# Beta\n';
const SPECIALIST_ARCH =
  "---\nname: specialist-arch\ndescription: Architecture specialist\nallowed-tools: [read]\n---\nSpecialist body\n";
const LICENSE_TEXT = "Fixture License\n\nAll rights reserved.\n";

const EXCLUSION_CONFIG = [
  "registry: https://example.invalid/registry",
  "agents:",
  "  - copilot",
  "skills:",
  "  common:",
  "    ref: common-v1",
  "    exclude:",
  "      - common-beta",
  "workflows:",
  "  - demo",
  "",
].join("\n");

const GENERATE_INDICES_WRAPPER = [
  "const { spawnSync, execFileSync } = require('child_process');",
  "const path = require('path');",
  "const fs = require('fs');",
  "const impl = path.join(__dirname, 'generate-indices.impl.ts');",
  "const result = spawnSync(process.execPath, [",
  "  '--import',",
  "  'tsx',",
  "  impl,",
  "], { cwd: process.cwd(), stdio: 'inherit', env: process.env });",
  "const hookLog = process.env.FIXTURE_HOOK_LOG;",
  "const recordHook = (hook, detail) => {",
  "  if (hookLog) {",
  '    fs.appendFileSync(hookLog, JSON.stringify({ hook: hook, detail: detail }) + "\\n");',
  "  }",
  "};",
  "if (process.env.FIXTURE_DRIFT_PATH) {",
  "  fs.appendFileSync(process.env.FIXTURE_DRIFT_PATH, '\\nDRIFT\\n');",
  "}",
  "if (process.env.FIXTURE_CREATE_PATH) {",
  "  fs.writeFileSync(process.env.FIXTURE_CREATE_PATH, 'created\\n');",
  '  recordHook("create-path", { path: process.env.FIXTURE_CREATE_PATH, producerExitCode: result.status });',
  "}",
  "if (process.env.FIXTURE_STRIP_REL && process.env.FIXTURE_STRIP_TOKEN) {",
  "  const stripPath = path.join(process.cwd(), process.env.FIXTURE_STRIP_REL);",
  "  const token = process.env.FIXTURE_STRIP_TOKEN;",
  "  const stripped = fs.readFileSync(stripPath, 'utf8').split('\\n').filter((line) => {",
  "    if (!line.trim().startsWith('|')) return true;",
  "    const first = line.split('|')[1].trim().replace(/^\\*\\*|\\*\\*$/g, '');",
  "    return first !== token;",
  "  });",
  "  fs.writeFileSync(stripPath, stripped.join('\\n'));",
  '  recordHook("strip-row", { token: token });',
  "}",
  "if (process.env.FIXTURE_ROW_FROM && process.env.FIXTURE_ROW_TO && process.env.FIXTURE_ROW_TOKEN) {",
  "  const fromPath = path.join(process.cwd(), process.env.FIXTURE_ROW_FROM);",
  "  const toPath = path.join(process.cwd(), process.env.FIXTURE_ROW_TO);",
  "  const token = process.env.FIXTURE_ROW_TOKEN;",
  "  const row = fs.readFileSync(fromPath, 'utf8').split('\\n').find((line) => {",
  "    return line.trim().startsWith('|') && line.indexOf(token) !== -1;",
  "  });",
  "  if (!row) throw new Error('fixture row injection found no producer row for ' + token);",
  "  const target = fs.readFileSync(toPath, 'utf8').replace(/\\n*$/, '\\n');",
  '  fs.writeFileSync(toPath, target + row + "\\n");',
  '  recordHook("inject-row", { token: token });',
  "}",
  "if (process.env.FIXTURE_TOUCH_PATH) {",
  "  fs.appendFileSync(process.env.FIXTURE_TOUCH_PATH, '\\n// fixture producer dependency drift\\n');",
  '  recordHook("touch-source", { path: process.env.FIXTURE_TOUCH_PATH });',
  "}",
  "if (process.env.FIXTURE_OBSERVE_REL) {",
  '  const observed = fs.readFileSync(path.join(process.cwd(), process.env.FIXTURE_OBSERVE_REL), "utf8");',
  '  recordHook("observe-output", {',
  "    path: process.env.FIXTURE_OBSERVE_REL,",
  "    hasToken: process.env.FIXTURE_OBSERVE_TOKEN ? observed.indexOf(process.env.FIXTURE_OBSERVE_TOKEN) !== -1 : null,",
  "    sha256: require('crypto').createHash('sha256').update(observed).digest('hex'),",
  "  });",
  "}",
  "if (process.env.FIXTURE_APPEND_REL && process.env.FIXTURE_APPEND_TEXT) {",
  "  fs.appendFileSync(path.join(process.cwd(), process.env.FIXTURE_APPEND_REL), process.env.FIXTURE_APPEND_TEXT);",
  '  recordHook("append-output", { path: process.env.FIXTURE_APPEND_REL });',
  "}",
  "if (process.env.FIXTURE_POISON_LOCK_REL) {",
  "  const lockPath = path.join(process.cwd(), '.skills-lock.json');",
  "  const lock = JSON.parse(fs.readFileSync(lockPath, 'utf8'));",
  "  const rel = process.env.FIXTURE_POISON_LOCK_REL;",
  "  const staged = fs.readFileSync(path.join(process.cwd(), rel));",
  "  lock.entries[rel] = {",
  '    owner: "specialist",',
  '    source: "specialist:wrong-arch",',
  '    agent: "copilot",',
  "    sha256: require('crypto').createHash('sha256').update(staged).digest('hex'),",
  "  };",
  "  fs.writeFileSync(lockPath, JSON.stringify(lock, null, 2) + '\\n');",
  '  recordHook("poison-lock", { path: rel });',
  "}",
  "if (process.env.FIXTURE_GIT_REPO && process.env.FIXTURE_GIT_INDEX_PATH) {",
  "  const altFile = path.join(process.cwd(), '.fixture-index-only-blob');",
  "  fs.writeFileSync(altFile, 'fixture index-only alternate blob\\n');",
  "  const sha = execFileSync('git', [",
  "    '-C', process.env.FIXTURE_GIT_REPO,",
  "    'hash-object', '-w', altFile,",
  "  ]).toString().trim();",
  "  execFileSync('git', [",
  "    '-C', process.env.FIXTURE_GIT_REPO,",
  "    'update-index', '--cacheinfo',",
  "    '100644,' + sha + ',' + process.env.FIXTURE_GIT_INDEX_PATH,",
  "  ]);",
  '  recordHook("stage-index-only", { path: process.env.FIXTURE_GIT_INDEX_PATH, sha: sha });',
  "}",
  "if (process.env.FIXTURE_GIT_MUTATION && process.env.FIXTURE_GIT_REPO) {",
  "  const repo = process.env.FIXTURE_GIT_REPO;",
  "  const rel = process.env.FIXTURE_GIT_INDEX_PATH;",
  "  const mutation = process.env.FIXTURE_GIT_MUTATION;",
  "  const gitInRepo = (args, options) => execFileSync('git', ['-C', repo, ...args], options || {}).toString();",
  "  const writeBlob = (name, content) => {",
  "    const blobPath = path.join(process.cwd(), name);",
  "    fs.writeFileSync(blobPath, content);",
  "    return gitInRepo(['hash-object', '-w', blobPath]).trim();",
  "  };",
  "  if (mutation === 'mode-executable') {",
  "    gitInRepo(['update-index', '--chmod=+x', '--', rel]);",
  "  } else if (mutation === 'index-delete') {",
  "    gitInRepo(['update-index', '--force-remove', '--', rel]);",
  "  } else if (mutation === 'index-symlink') {",
  "    const sha = writeBlob('.fixture-symlink-blob', 'fixture-symlink-target\\n');",
  "    gitInRepo(['update-index', '--cacheinfo', '120000,' + sha + ',' + rel]);",
  "  } else if (mutation === 'unmerged') {",
  "    gitInRepo(['update-index', '--force-remove', '--', rel]);",
  "    const stages = [1, 2, 3].map((stage) => {",
  "      const sha = writeBlob('.fixture-unmerged-' + stage, 'fixture unmerged stage ' + stage + '\\n');",
  "      return '100644 ' + sha + ' ' + stage + '\\t' + rel;",
  "    }).join('\\n') + '\\n';",
  "    execFileSync('git', ['-C', repo, 'update-index', '--index-info'], { input: stages });",
  "  } else if (mutation === 'unrelated-add') {",
  "    const sha = writeBlob('.fixture-unrelated-blob', 'fixture unrelated row\\n');",
  "    gitInRepo(['update-index', '--add', '--cacheinfo', '100644,' + sha + ',' + process.env.FIXTURE_GIT_UNRELATED_PATH]);",
  "  } else if (mutation === 'unrelated-delete') {",
  "    gitInRepo(['update-index', '--force-remove', '--', process.env.FIXTURE_GIT_UNRELATED_PATH]);",
  "  }",
  "  if (process.env.FIXTURE_GIT_HEAD_DRIFT === '1') {",
  "    execFileSync('git', ['-C', repo, 'commit', '--quiet', '--allow-empty', '-m', 'fixture head drift']);",
  "  }",
  "  recordHook('git-mutation', { mutation: mutation, path: rel || null, unrelated: process.env.FIXTURE_GIT_UNRELATED_PATH || null });",
  "}",
  "if (process.env.FIXTURE_FORCE_INDICES_EXIT) process.exit(Number(process.env.FIXTURE_FORCE_INDICES_EXIT));",
  'process.exit(typeof result.status === "number" ? result.status : 1);',
  "",
].join("\n");

const CALCULATE_TOKENS_WRAPPER = [
  "const { spawnSync } = require('child_process');",
  "const path = require('path');",
  "const fs = require('fs');",
  "const impl = path.join(__dirname, 'calculate-tokens.impl.ts');",
  "const result = spawnSync(process.execPath, [",
  "  '--import',",
  "  'tsx',",
  "  impl,",
  "], { cwd: process.cwd(), stdio: 'inherit', env: process.env });",
  "if (result.status === 0 && process.env.FIXTURE_METADATA_NONMETRIC) {",
  "  const metadataPath = path.join(process.cwd(), 'skills/metadata.json');",
  "  const metadata = JSON.parse(fs.readFileSync(metadataPath, 'utf8'));",
  "  metadata.categories.common.version = 'authored-version-after-token-producer';",
  "  fs.writeFileSync(metadataPath, JSON.stringify(metadata, null, 2) + '\\n');",
  "  if (process.env.FIXTURE_HOOK_LOG) {",
  "    fs.appendFileSync(process.env.FIXTURE_HOOK_LOG, JSON.stringify({ hook: 'metadata-nonmetric-mutation' }) + '\\n');",
  "  }",
  "}",
  'process.exit(typeof result.status === "number" ? result.status : 1);',
  "",
].join("\n");

async function writeMinimalProducerTree(root: string): Promise<void> {
  await fs.copy(
    path.join(REPOSITORY_ROOT, "cli", "src"),
    path.join(root, "cli", "src"),
    {
      filter: (src: string) => !src.includes(`${path.sep}__tests__`),
    },
  );
  for (const script of [
    "calculate-tokens.ts",
    "generate-indices.ts",
    "generate-capabilities-doc.ts",
  ]) {
    await fs.copy(
      path.join(REPOSITORY_ROOT, "scripts", script),
      path.join(root, "scripts", script),
    );
  }
  await fs.copy(
    path.join(REPOSITORY_ROOT, "scripts", "generation"),
    path.join(root, "scripts", "generation"),
    {
      filter: (src: string) => !src.endsWith(".test.ts"),
    },
  );
  await fs.copy(
    path.join(REPOSITORY_ROOT, "package.json"),
    path.join(root, "package.json"),
  );
  for (const relativePath of [
    "cli/package.json",
    "tsconfig.json",
    "cli/tsconfig.json",
  ]) {
    const sourcePath = path.join(REPOSITORY_ROOT, relativePath);
    if (!(await fs.pathExists(sourcePath))) continue;
    await fs.copy(sourcePath, path.join(root, relativePath));
  }
}

async function installIndicesWrapper(root: string): Promise<void> {
  await fs.move(
    path.join(root, "scripts", "generate-indices.ts"),
    path.join(root, "scripts", "generate-indices.impl.ts"),
  );
  await fs.outputFile(
    path.join(root, "scripts", "generate-indices.ts"),
    GENERATE_INDICES_WRAPPER,
  );
}

async function installCalculateTokensWrapper(root: string): Promise<void> {
  await fs.move(
    path.join(root, "scripts", "calculate-tokens.ts"),
    path.join(root, "scripts", "calculate-tokens.impl.ts"),
  );
  await fs.outputFile(
    path.join(root, "scripts", "calculate-tokens.ts"),
    CALCULATE_TOKENS_WRAPPER,
  );
}

async function createFixtureRepo(
  options: FixtureOptions = {},
): Promise<string> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), "ags-stage-fixture-"));
  try {
    await populateFixtureRepo(root, options);
    return root;
  } catch (error) {
    await fs.remove(root);
    throw error;
  }
}

async function populateFixtureRepo(
  root: string,
  options: FixtureOptions,
): Promise<void> {
  await writeMinimalProducerTree(root);
  await fs.outputFile(
    path.join(root, ".skillsrc"),
    [
      "registry: https://example.invalid/registry",
      "agents:",
      "  - copilot",
      "skills:",
      "  common:",
      "    ref: common-v1",
      "workflows:",
      "  - demo",
      "",
    ].join("\n"),
  );
  await fs.outputFile(
    path.join(root, options.inheritedRootResource ?? "LICENSE.TXT"),
    LICENSE_TEXT,
  );
  await fs.outputJson(path.join(root, "skills", "metadata.json"), {
    authoredBy: "fixture-maintainer",
    authoredAt: "2026-10-28",
    categories: {
      common: {
        version: "1.2.3",
        owners: ["fixture-team"],
        routing: { tier: "manual-review" },
      },
    },
  });
  await fs.outputFile(
    path.join(root, "skills", "common", "common-alpha", "SKILL.md"),
    SKILL_ALPHA,
  );
  await fs.outputFile(
    path.join(
      root,
      "skills",
      "common",
      "common-alpha",
      "references",
      "details.md",
    ),
    "alpha details\n",
  );
  await fs.outputFile(
    path.join(root, "skills", "common", "common-beta", "SKILL.md"),
    SKILL_BETA,
  );
  await fs.outputFile(
    path.join(root, "skills", "specialists", "specialist-arch", "SKILL.md"),
    SPECIALIST_ARCH,
  );
  await fs.outputFile(
    path.join(root, ".agents", "workflows", "demo.md"),
    "---\ndescription: Demo workflow\n---\n# Demo\n",
  );
  await fs.outputFile(
    path.join(root, "AGENTS.md"),
    "# Agents\n\n<!-- SKILLS_INDEX_START -->\nold router\n<!-- SKILLS_INDEX_END -->\n",
  );
  await fs.outputFile(
    path.join(root, "skills", "README.md"),
    "# Skills\n\n<!-- SKILLS_INDEX_START -->\nold index\n<!-- SKILLS_INDEX_END -->\n",
  );
  if (options.includeMetricsReadme) {
    await fs.outputFile(
      path.join(root, "README.md"),
      "| **Common Patterns** | Modules | Saving | old | old | old | old | old |\n",
    );
  }
  if (!options.omitBaselineCapabilitiesDoc) {
    await fs.outputFile(
      path.join(root, "docs", "agent-capabilities.md"),
      "# Agent Capabilities\n\nold\n",
    );
  } else {
    await fs.ensureDir(path.join(root, "docs"));
  }
  await fs.outputFile(
    path.join(
      root,
      ".github",
      "instructions",
      "agent-skill-standard-rule.instructions.md",
    ),
    "---\ndescription: rule\n---\nRead AGENTS.md\n",
  );
  await fs.symlink(
    path.join(REPOSITORY_ROOT, "node_modules"),
    path.join(root, "node_modules"),
    "junction",
  );
  await linkDependencies(REPOSITORY_ROOT, root);

  for (const script of [
    "scripts/calculate-tokens.ts",
    "scripts/generate-indices.ts",
    "scripts/generate-capabilities-doc.ts",
  ]) {
    const result = await runInStage(
      "node",
      ["--import", "tsx", path.join(root, script)],
      root,
    );
    if (result.exitCode !== 0) {
      throw new Error(
        `Fixture baseline producer ${script} failed: ${result.stderr || result.stdout}`,
      );
    }
  }
  const plan = await buildGenerationPlan(root);

  if (options.omitMirrorSkill) {
    await fs.remove(
      path.join(root, ".github", "skills", "common", options.omitMirrorSkill),
    );
  }
  if (options.omitBaselineCapabilitiesDoc) {
    await fs.remove(path.join(root, "docs", "agent-capabilities.md"));
  }

  const cliManaged = new Set([
    ...plan.mirrorFiles.map((item) => item.relPath),
    ...plan.workflowOutputs.map((item) => item.relPath),
    ...plan.specialistOutputs.map((item) => item.relPath),
    ...plan.ruleFiles,
    ...plan.hostCategoryIndexes.map((item) => item.relPath),
  ]);
  const generationEntries: Record<
    string,
    {
      source: string;
      sha256: string;
      scope?: { kind: "category-token-metrics"; sha256: string };
    }
  > = {};
  for (const relPath of plan.declaredFiles) {
    if (cliManaged.has(relPath)) continue;
    const outputPath = path.join(root, relPath);
    const stat = await fs.lstat(outputPath).catch(() => null);
    if (!stat) continue;
    if (!stat.isFile() || stat.isSymbolicLink()) {
      throw new Error(
        `Fixture baseline output "${relPath}" is not a regular file.`,
      );
    }
    const bytes = await fs.readFile(outputPath);
    const metadataScope =
      relPath === "skills/metadata.json"
        ? {
            kind: "category-token-metrics" as const,
            sha256: tokenMetricsDigest(JSON.parse(bytes.toString("utf8"))),
          }
        : undefined;
    generationEntries[relPath] = {
      source: "fixture:real-producer-baseline",
      sha256: sha256(bytes),
      ...(metadataScope ? { scope: metadataScope } : {}),
    };
  }
  const lockPath = path.join(root, ".skills-lock.json");
  const lock = await fs.readJson(lockPath);
  lock.generation = { version: 1, entries: generationEntries };
  await fs.writeJson(lockPath, lock, { spaces: 2 });

  if (
    options.mutateDuringIndices ||
    options.failAfterIndices ||
    options.driftSourceDuringIndices
  ) {
    await installIndicesWrapper(root);
  }
  if (options.mutateMetadataNonMetric) {
    await installCalculateTokensWrapper(root);
  }
}

async function withFixture(
  options: FixtureOptions,
  body: (root: string) => Promise<void>,
): Promise<void> {
  const root = await createFixtureRepo(options);
  const previousCwd = process.cwd();
  process.chdir(root);
  try {
    await body(root);
  } finally {
    process.chdir(previousCwd);
    await fs.remove(root);
  }
}

async function withEnv<T>(
  values: Record<string, string>,
  body: () => Promise<T>,
): Promise<T> {
  for (const [key, value] of Object.entries(values)) {
    process.env[key] = value;
  }
  try {
    return await body();
  } finally {
    for (const key of Object.keys(values)) delete process.env[key];
  }
}

async function git(cwd: string, args: string[]): Promise<string> {
  return new Promise((resolve, reject) => {
    const child = spawn("git", args, { cwd, shell: false });
    let stdout = "";
    let stderr = "";
    child.stdout?.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr?.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    child.on("error", reject);
    child.on("close", (code) => {
      if (code !== 0)
        reject(new Error(`git ${args.join(" ")} failed: ${stderr}`));
      else resolve(stdout.trim());
    });
  });
}
async function commitFixtureBase(root: string): Promise<string> {
  await git(root, ["init", "--quiet"]);
  await git(root, ["config", "user.name", "Fixture"]);
  await git(root, ["config", "user.email", "fixture@example.invalid"]);
  const pathspecs = [
    ".skillsrc",
    "AGENTS.md",
    "LICENSE.TXT",
    ".agents",
    ".github",
    "docs",
    "skills",
    "scripts",
    "cli",
  ];
  const readmePath = path.join(root, "README.md");
  if (
    (await fs.pathExists(readmePath)) &&
    (await fs.lstat(readmePath)).isFile()
  ) {
    pathspecs.push("README.md");
  }
  await git(root, [
    "add",
    "--all",
    "--",
    ...pathspecs,
    // Dependency links stay in the execution environment only: the archived
    // source topology must contain regular files, and the proof stage re-links
    // dependencies after its own symlink check.
    ":(exclude,glob)**/node_modules",
    ":(exclude,glob)**/node_modules/**",
  ]);
  await git(root, ["commit", "--quiet", "-m", "generated baseline"]);
  return git(root, ["rev-parse", "HEAD"]);
}

interface HookRecord {
  hook: string;
  detail: Record<string, unknown>;
}

/** Reads the fixture wrapper's own hook journal, proving an injection fired. */
async function readHookJournal(root: string): Promise<HookRecord[]> {
  const journalPath = path.join(root, "artifacts", "fixture-hooks.jsonl");
  if (!(await fs.pathExists(journalPath))) return [];
  const lines = (await fs.readFile(journalPath, "utf8"))
    .split("\n")
    .filter((line) => line.trim().length > 0);
  return lines.map((line) => JSON.parse(line) as HookRecord);
}

async function prepareHookJournal(root: string): Promise<string> {
  const journalPath = path.join(root, "artifacts", "fixture-hooks.jsonl");
  await fs.ensureDir(path.dirname(journalPath));
  return journalPath;
}

/**
 * Asserts an operation was refused and produced no approved effects: no
 * renamed destination, and a receipt that reports FAILED with no applied file.
 */
async function assertRefusedWithoutEffects(
  result: IsolatedStageResult,
): Promise<void> {
  assert.equal(result.success, false, "expected the operation to be refused");
  assert.deepEqual(result.copiedBackFiles, []);
  assert.deepEqual(result.verifiedFiles, []);
  const receipt = await fs.readJson(result.receiptPath);
  assert.equal(receipt.status, "FAILED");
  assert.deepEqual(receipt.appliedFiles ?? [], []);
  assert.deepEqual(receipt.verifiedFiles ?? [], []);
}

test("unchanged unowned outputs pass check without creating an ownership manifest", async () => {
  await withFixture({}, async (root) => {
    const applied = await runIsolatedGeneration({ repoRoot: root });
    assert.equal(applied.success, true, applied.error ?? "");
    await fs.remove(path.join(root, ".skills-lock.json"));

    const checked = await runIsolatedGeneration({
      repoRoot: root,
      checkOnly: true,
    });

    assert.equal(checked.success, true, checked.error ?? "");
    assert.equal(
      await fs.pathExists(path.join(root, ".skills-lock.json")),
      false,
    );
  });
});

test("explicit base adoption proves producer bytes and records generation authority", async () => {
  await withFixture({}, async (root) => {
    const applied = await runIsolatedGeneration({ repoRoot: root });
    assert.equal(applied.success, true, applied.error ?? "");
    const base = await commitFixtureBase(root);
    await fs.remove(path.join(root, ".skills-lock.json"));

    // Adoption must be justified by a real changed generated output: edit the
    // workflow source (not the canonical skill) after the base commit so the
    // archived base keeps the pristine prompt and the candidate regenerates it.
    const promptPath = path.join(root, ".github", "prompts", "demo.prompt.md");
    const promptBefore = await fs.readFile(promptPath);
    const workflowSourcePath = path.join(
      root,
      ".agents",
      "workflows",
      "demo.md",
    );
    await fs.writeFile(
      workflowSourcePath,
      "---\ndescription: Revised demo workflow\n---\n# Demo\n",
    );

    const adopted = await runIsolatedGeneration({
      repoRoot: root,
      adoptBase: base,
    });

    assert.equal(adopted.success, true, adopted.error ?? "");
    assert.ok(
      adopted.copiedBackFiles.includes(".github/prompts/demo.prompt.md"),
    );
    assert.ok(adopted.copiedBackFiles.includes(".skills-lock.json"));
    const promptAfter = await fs.readFile(promptPath);
    assert.notDeepEqual(promptAfter, promptBefore);
    assert.match(promptAfter.toString("utf8"), /Revised demo workflow/);
    const lock = await fs.readJson(path.join(root, ".skills-lock.json"));
    assert.deepEqual(lock.entries[".github/prompts/demo.prompt.md"], {
      owner: "workflow",
      source: "workflow:demo",
      agent: "copilot",
      sha256: sha256(promptAfter),
    });
    const proofPath = path.join(
      adopted.logPath,
      "..",
      "adoption",
      "proof.json",
    );
    const proof = await fs.readJson(proofPath);
    const promptProof = proof.adopted.find(
      (record: { path: string }) =>
        record.path === ".github/prompts/demo.prompt.md",
    );
    assert.equal(proof.base, base);
    assert.equal(promptProof?.sha256, sha256(promptBefore));
    assert.deepEqual(
      await fs.readFile(
        path.join(
          adopted.logPath,
          "..",
          "adoption",
          "before",
          ".github",
          "prompts",
          "demo.prompt.md",
        ),
      ),
      promptBefore,
    );
  });
});

test("base adoption proves a README metrics row by forcing the prior producer to rewrite it", async () => {
  await withFixture({ includeMetricsReadme: true }, async (root) => {
    const base = await commitFixtureBase(root);
    await fs.remove(path.join(root, ".skills-lock.json"));
    const sourcePath = path.join(
      root,
      "skills",
      "common",
      "common-alpha",
      "SKILL.md",
    );
    await fs.appendFile(
      sourcePath,
      "\nChanged candidate source for metrics.\n",
    );

    const result = await runIsolatedGeneration({
      repoRoot: root,
      adoptBase: base,
    });

    assert.equal(result.success, true, result.error ?? "");
    assert.ok(result.copiedBackFiles.includes("README.md"));
    const readme = await fs.readFile(path.join(root, "README.md"), "utf8");
    assert.doesNotMatch(readme, /AGS-BASE-PROOF/);
    const lock = await fs.readJson(path.join(root, ".skills-lock.json"));
    assert.equal(
      lock.generation.entries["README.md"].sha256,
      sha256(await fs.readFile(path.join(root, "README.md"))),
    );
  });
});

test("base adoption ignores unchanged unmarked AGENTS while adopting a changed mirror", async () => {
  await withFixture({}, async (root) => {
    const agentsPath = path.join(root, "AGENTS.md");
    const agentsBytes = Buffer.from(
      "# Authored agents context\n\nNo generated index markers.\n",
    );
    await fs.writeFile(agentsPath, agentsBytes);
    const base = await commitFixtureBase(root);
    await fs.remove(path.join(root, ".skills-lock.json"));
    const sourcePath = path.join(
      root,
      "skills",
      "common",
      "common-alpha",
      "SKILL.md",
    );
    await fs.appendFile(
      sourcePath,
      "\nChanged candidate source for adoption.\n",
    );

    const result = await runIsolatedGeneration({
      repoRoot: root,
      adoptBase: base,
    });

    assert.equal(result.success, true, result.error ?? "");
    const mirrorPath = ".github/skills/common/common-alpha/SKILL.md";
    assert.ok(result.copiedBackFiles.includes(mirrorPath));
    assert.deepEqual(await fs.readFile(agentsPath), agentsBytes);
    const lock = await fs.readJson(path.join(root, ".skills-lock.json"));
    assert.equal(lock.entries["AGENTS.md"], undefined);
    assert.equal(lock.generation.entries["AGENTS.md"], undefined);
    assert.equal(lock.generation.entries[mirrorPath], undefined);
    assert.deepEqual(lock.entries[mirrorPath], {
      owner: "skill",
      source: "skill:common/common-alpha@common-v1",
      agent: "copilot",
      sha256: sha256(await fs.readFile(path.join(root, mirrorPath))),
    });
    const proof = await fs.readJson(
      path.join(result.logPath, "..", "adoption", "proof.json"),
    );
    assert.ok(
      proof.adopted.some(
        (record: { path: string }) => record.path === mirrorPath,
      ),
    );
    assert.ok(
      !proof.adopted.some(
        (record: { path: string }) => record.path === "AGENTS.md",
      ),
    );
  });
});

test("base adoption rejects a changed mixed AGENTS output the prior producer cannot rewrite", async () => {
  await withFixture({}, async (root) => {
    const agentsPath = path.join(root, "AGENTS.md");
    const base = await commitFixtureBase(root);
    // The wrapper exists only in the current fixture, after the pinned base, so
    // the archived prior producer stays the genuine generator.
    await installIndicesWrapper(root);
    const hookLog = await prepareHookJournal(root);
    await fs.remove(path.join(root, ".skills-lock.json"));
    await fs.appendFile(
      agentsPath,
      "\nAuthored bytes after the pinned base.\n",
    );
    const editedAgents = await fs.readFile(agentsPath);
    const mirrorPath = path.join(
      root,
      ".github",
      "skills",
      "common",
      "common-alpha",
      "SKILL.md",
    );
    const mirrorBefore = await fs.readFile(mirrorPath);
    // A real router determinant: `assembleRouterIndex` renders its extension rows
    // from `skills/metadata.json.file_routing`, so the regenerated AGENTS region
    // differs from the active mixed file while the authored suffix is preserved.
    const metadataPath = path.join(root, "skills", "metadata.json");
    const metadata = await fs.readJson(metadataPath);
    await fs.outputFile(
      metadataPath,
      `${JSON.stringify(
        {
          ...metadata,
          file_routing: {
            ...(metadata.file_routing ?? {}),
            fixture_router: ["common"],
          },
        },
        null,
        2,
      )}\n`,
    );

    const result = await withEnv(
      {
        FIXTURE_HOOK_LOG: hookLog,
        FIXTURE_OBSERVE_REL: "AGENTS.md",
        FIXTURE_OBSERVE_TOKEN: "fixture_router",
      },
      () => runIsolatedGeneration({ repoRoot: root, adoptBase: base }),
    );

    // Injection evidence first: the refusal must be conditioned on a real producer
    // candidate that actually requests a different generated region.
    const observation = (await readHookJournal(root)).find(
      (entry) => entry.hook === "observe-output",
    );
    assert.ok(
      observation,
      "the child must observe the staged router candidate",
    );
    assert.equal(observation.detail.path, "AGENTS.md");
    assert.equal(
      observation.detail.hasToken,
      true,
      "the real staged candidate must render the new router row",
    );
    assert.notEqual(observation.detail.sha256, sha256(editedAgents));

    await assertRefusedWithoutEffects(result);
    assert.deepEqual(await fs.readFile(agentsPath), editedAgents);
    assert.deepEqual(await fs.readFile(mirrorPath), mirrorBefore);
    assert.equal(
      await fs.pathExists(path.join(root, ".skills-lock.json")),
      false,
    );
  });
});

test("base adoption refuses an output absent from the tracked base", async () => {
  await withFixture({}, async (root) => {
    const applied = await runIsolatedGeneration({ repoRoot: root });
    assert.equal(applied.success, true, applied.error ?? "");
    await commitFixtureBase(root);
    await git(root, [
      "rm",
      "--cached",
      "--quiet",
      "docs/agent-capabilities.md",
    ]);
    await git(root, [
      "commit",
      "--quiet",
      "-m",
      "remove generated capabilities output",
    ]);
    const base = await git(root, ["rev-parse", "HEAD"]);
    await fs.remove(path.join(root, ".skills-lock.json"));
    const capabilitiesPath = path.join(root, "docs", "agent-capabilities.md");
    // The active document must genuinely differ from the real generated candidate,
    // otherwise the invocation requests no replacement and needs no base proof.
    await fs.writeFile(
      capabilitiesPath,
      "# Agent Capabilities\n\nstale local copy\n",
    );
    const stale = await fs.readFile(capabilitiesPath);

    const result = await runIsolatedGeneration({
      repoRoot: root,
      adoptBase: base,
    });

    await assertRefusedWithoutEffects(result);
    assert.deepEqual(await fs.readFile(capabilitiesPath), stale);
    assert.equal(
      await fs.pathExists(path.join(root, ".skills-lock.json")),
      false,
    );
  });
});
test("base adoption rejects changed tracked output bytes before publication", async () => {
  await withFixture({}, async (root) => {
    const applied = await runIsolatedGeneration({ repoRoot: root });
    assert.equal(applied.success, true, applied.error ?? "");
    const base = await commitFixtureBase(root);
    await fs.remove(path.join(root, ".skills-lock.json"));
    const promptPath = path.join(root, ".github", "prompts", "demo.prompt.md");
    await fs.appendFile(promptPath, "\nlocal edit\n");
    const edited = await fs.readFile(promptPath, "utf8");

    const result = await runIsolatedGeneration({
      repoRoot: root,
      adoptBase: base,
    });

    await assertRefusedWithoutEffects(result);
    assert.equal(await fs.readFile(promptPath, "utf8"), edited);
    assert.equal(
      await fs.pathExists(path.join(root, ".skills-lock.json")),
      false,
    );
  });
});
test("base adoption rejects a base-tracked output made untracked in the current index", async () => {
  await withFixture({}, async (root) => {
    const base = await commitFixtureBase(root);
    const relPath = ".github/skills/common/common-alpha/SKILL.md";
    const outputPath = path.join(root, relPath);
    const original = await fs.readFile(outputPath, "utf8");
    await git(root, ["rm", "--cached", "--quiet", relPath]);
    await fs.remove(path.join(root, ".skills-lock.json"));
    // The mirror must actually need replacement, otherwise the missing index entry
    // is never reached and no base authority is requested for it.
    await fs.appendFile(
      path.join(root, "skills", "common", "common-alpha", "SKILL.md"),
      "\nChanged candidate source requiring mirror replacement.\n",
    );

    const result = await runIsolatedGeneration({
      repoRoot: root,
      adoptBase: base,
    });

    await assertRefusedWithoutEffects(result);
    assert.equal(await fs.readFile(outputPath, "utf8"), original);
    assert.equal(
      await fs.pathExists(path.join(root, ".skills-lock.json")),
      false,
    );
    assert.equal(
      (await git(root, ["ls-files", "--", relPath])).trim(),
      "",
      "the fixture index deletion must be preserved, not silently reset",
    );
  });
});
test("base adoption updates outputs from changed canonical skill inputs", async () => {
  await withFixture({}, async (root) => {
    const applied = await runIsolatedGeneration({ repoRoot: root });
    assert.equal(applied.success, true, applied.error ?? "");
    const base = await commitFixtureBase(root);
    await fs.remove(path.join(root, ".skills-lock.json"));
    const sourcePath = path.join(
      root,
      "skills",
      "common",
      "common-alpha",
      "SKILL.md",
    );
    const edited = SKILL_ALPHA.replace("Alpha skill", "Revised Alpha skill");
    await fs.writeFile(sourcePath, edited);

    const result = await runIsolatedGeneration({
      repoRoot: root,
      adoptBase: base,
    });

    assert.equal(result.success, true, result.error ?? "");
    assert.ok(
      result.copiedBackFiles.includes(
        ".github/skills/common/common-alpha/SKILL.md",
      ),
    );
    const lock = await fs.readJson(path.join(root, ".skills-lock.json"));
    assert.ok(lock.generation.entries["skills/metadata.json"]);
    assert.ok(
      await fs.pathExists(
        path.join(result.logPath, "..", "adoption", "proof.json"),
      ),
    );
  });
});
test("scoped base adoption compares token metrics across nonmetric worktree and index edits", async () => {
  await withFixture({}, async (root) => {
    const base = await commitFixtureBase(root);
    await fs.remove(path.join(root, ".skills-lock.json"));
    const metadataPath = path.join(root, "skills", "metadata.json");
    const metadata = await fs.readJson(metadataPath);
    metadata.authoredBy = "staged-owner-edit";
    metadata.categories.common.version = "7.6.5";
    await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
    await git(root, ["add", "--", "skills/metadata.json"]);
    const sourcePath = path.join(
      root,
      "skills",
      "common",
      "common-alpha",
      "SKILL.md",
    );
    await fs.appendFile(sourcePath, `\n${"metric change ".repeat(80)}\n`);

    const result = await runIsolatedGeneration({
      repoRoot: root,
      adoptBase: base,
    });

    assert.equal(result.success, true, result.error ?? "");
    const adopted = await fs.readJson(metadataPath);
    assert.equal(adopted.authoredBy, "staged-owner-edit");
    assert.equal(adopted.categories.common.version, "7.6.5");
    const lock = await fs.readJson(path.join(root, ".skills-lock.json"));
    assert.deepEqual(lock.generation.entries["skills/metadata.json"].scope, {
      kind: "category-token-metrics",
      sha256: tokenMetricsDigest(adopted),
    });
    assert.ok(result.copiedBackFiles.includes("skills/metadata.json"));
  });
});

test("base adoption rejects a tracked output poisoned before the recorded base", async () => {
  await withFixture({}, async (root) => {
    const poisonedPath = path.join(
      root,
      ".github",
      "skills",
      "common",
      "common-alpha",
      "SKILL.md",
    );
    await fs.appendFile(poisonedPath, "\npoisoned historical output\n");
    const poisoned = await fs.readFile(poisonedPath, "utf8");
    const base = await commitFixtureBase(root);
    await fs.remove(path.join(root, ".skills-lock.json"));

    const result = await runIsolatedGeneration({
      repoRoot: root,
      adoptBase: base,
    });

    await assertRefusedWithoutEffects(result);
    assert.equal(await fs.readFile(poisonedPath, "utf8"), poisoned);
    assert.equal(
      await fs.pathExists(path.join(root, ".skills-lock.json")),
      false,
    );
  });
});
test("base adoption reconstructs generated metadata instead of trusting its retained bytes", async () => {
  await withFixture({}, async (root) => {
    const metadataPath = path.join(root, "skills", "metadata.json");
    const metadata = await fs.readJson(metadataPath);
    metadata.categories.common.token_metrics = {
      poisoned: "historical-output",
    };
    await fs.writeJson(metadataPath, metadata, { spaces: 2 });
    const poisoned = await fs.readFile(metadataPath);
    const base = await commitFixtureBase(root);
    await fs.remove(path.join(root, ".skills-lock.json"));

    const result = await runIsolatedGeneration({
      repoRoot: root,
      adoptBase: base,
    });

    await assertRefusedWithoutEffects(result);
    assert.deepEqual(await fs.readFile(metadataPath), poisoned);
    assert.equal(
      await fs.pathExists(path.join(root, ".skills-lock.json")),
      false,
    );
  });
});

test("normal CLI refresh preserves generation-owned files and ledger after adoption", async () => {
  await withFixture({}, async (root) => {
    const base = await commitFixtureBase(root);
    await fs.remove(path.join(root, ".skills-lock.json"));
    const canonicalSkillPath = path.join(
      root,
      "skills",
      "common",
      "common-alpha",
      "SKILL.md",
    );
    const adoptedSkill = SKILL_ALPHA.replace(
      "Alpha skill",
      "Adopted Alpha skill",
    );
    await fs.writeFile(canonicalSkillPath, adoptedSkill);

    const adopted = await runIsolatedGeneration({
      repoRoot: root,
      adoptBase: base,
    });
    assert.equal(adopted.success, true, adopted.error ?? "");

    const generatedPaths = [
      "AGENTS.md",
      "skills/README.md",
      "skills/metadata.json",
      "skills/common/_INDEX.md",
      "docs/agent-capabilities.md",
    ];
    const generatedBefore = new Map(
      await Promise.all(
        generatedPaths.map(
          async (relPath) =>
            [relPath, await fs.readFile(path.join(root, relPath))] as const,
        ),
      ),
    );
    const lockBefore = await fs.readJson(path.join(root, ".skills-lock.json"));
    assert.ok(lockBefore.generation.entries["skills/metadata.json"]);

    const refreshedSkill = adoptedSkill.replace(
      "Adopted Alpha skill",
      "CLI refreshed Alpha skill",
    );
    await fs.writeFile(canonicalSkillPath, refreshedSkill);
    const config = {
      registry: "https://example.invalid/registry",
      agents: [Agent.Copilot],
      skills: { common: { ref: "common-v1" } },
      workflows: [],
      custom_overrides: [],
    } as SkillConfig;
    const skills: CollectedSkill[] = [
      {
        category: "common",
        skill: "common-alpha",
        files: [
          { name: "SKILL.md", content: refreshedSkill },
          { name: "references/details.md", content: "alpha details\n" },
          { name: "LICENSE.TXT", content: LICENSE_TEXT },
        ],
      },
      {
        category: "common",
        skill: "common-beta",
        files: [
          { name: "SKILL.md", content: SKILL_BETA },
          { name: "LICENSE.TXT", content: LICENSE_TEXT },
        ],
      },
    ];
    const sync = new SyncService();
    await sync.beginInstall(config, { dryRun: false, force: [] });
    await sync.writeSkills(skills, config);
    await sync.completeInstall(config, {
      skills,
      workflows: [],
      specialistsOk: true,
    });

    assert.equal(
      await fs.readFile(
        path.join(
          root,
          ".github",
          "skills",
          "common",
          "common-alpha",
          "SKILL.md",
        ),
        "utf8",
      ),
      refreshedSkill,
    );
    for (const [relPath, bytes] of generatedBefore) {
      assert.deepEqual(await fs.readFile(path.join(root, relPath)), bytes);
    }
    const lockAfter = await fs.readJson(path.join(root, ".skills-lock.json"));
    assert.deepEqual(lockAfter.generation, lockBefore.generation);
    assert.ok(lockAfter.entries[".github/skills/common/common-alpha/SKILL.md"]);
  });
});
test("base adoption rejects changed source/custom-overrides configuration", async () => {
  await withFixture({}, async (root) => {
    const applied = await runIsolatedGeneration({ repoRoot: root });
    assert.equal(applied.success, true, applied.error ?? "");
    const base = await commitFixtureBase(root);
    await fs.remove(path.join(root, ".skills-lock.json"));
    await fs.appendFile(
      path.join(root, ".skillsrc"),
      "\noverrides:\n  - .github/skills/common/common-alpha/SKILL.md\n",
    );
    const overriddenMirror = path.join(
      root,
      ".github",
      "skills",
      "common",
      "common-alpha",
      "SKILL.md",
    );
    const overriddenBefore = await fs.readFile(overriddenMirror);
    const selectedMirror = path.join(
      root,
      ".github",
      "skills",
      "common",
      "common-beta",
      "SKILL.md",
    );
    const selectedBefore = await fs.readFile(selectedMirror);
    // A still-selected, non-overridden output must really change so adoption proof
    // is requested; otherwise the configuration needs no base comparison at all.
    await fs.appendFile(
      path.join(root, "skills", "common", "common-beta", "SKILL.md"),
      "\nChanged candidate source requiring adoption proof.\n",
    );

    const configBefore = await fs.readFile(path.join(root, ".skillsrc"));
    const result = await runIsolatedGeneration({
      repoRoot: root,
      adoptBase: base,
    });

    await assertRefusedWithoutEffects(result);
    assert.deepEqual(
      await fs.readFile(path.join(root, ".skillsrc")),
      configBefore,
    );
    assert.deepEqual(await fs.readFile(overriddenMirror), overriddenBefore);
    assert.deepEqual(await fs.readFile(selectedMirror), selectedBefore);
    assert.equal(
      await fs.pathExists(path.join(root, ".skills-lock.json")),
      false,
    );
  });
});

test("edited owned specialist output is preserved and blocks publication", async () => {
  await withFixture({}, async (root) => {
    const applied = await runIsolatedGeneration({ repoRoot: root });
    assert.equal(applied.success, true, applied.error ?? "");
    const specialistPath = path.join(
      root,
      ".github",
      "agents",
      "arch.agent.md",
    );
    await fs.appendFile(specialistPath, "\nlocal edit\n");
    const edited = await fs.readFile(specialistPath, "utf8");

    const result = await runIsolatedGeneration({ repoRoot: root });

    await assertRefusedWithoutEffects(result);
    assert.equal(await fs.readFile(specialistPath, "utf8"), edited);
  });
});

test("a changed specialist with present but inconsistent staged ownership is refused", async () => {
  await withFixture({ mutateDuringIndices: true }, async (root) => {
    const specialistRel = ".github/agents/arch.agent.md";
    const specialistPath = path.join(root, specialistRel);
    const before = await fs.readFile(specialistPath);
    const hookLog = await prepareHookJournal(root);
    await fs.appendFile(
      path.join(root, "skills", "specialists", "specialist-arch", "SKILL.md"),
      "\nChanged specialist body requiring republish.\n",
    );

    const result = await withEnv(
      {
        FIXTURE_HOOK_LOG: hookLog,
        FIXTURE_POISON_LOCK_REL: specialistRel,
      },
      () => runIsolatedGeneration({ repoRoot: root }),
    );

    // Injection evidence first: the staged entry must exist with the exact
    // candidate digest but an untrusted identity, so the refusal can only come
    // from the identity check rather than a digest mismatch.
    const poison = (await readHookJournal(root)).find(
      (entry) => entry.hook === "poison-lock",
    );
    assert.ok(poison, "the child must record the staged ownership poisoning");
    assert.equal(poison.detail.path, specialistRel);

    await assertRefusedWithoutEffects(result);
    assert.deepEqual(await fs.readFile(specialistPath), before);
  });
});

test("a specialist export differing from the exact transformer output is refused", async () => {
  await withFixture({ mutateDuringIndices: true }, async (root) => {
    const specialistRel = ".github/agents/arch.agent.md";
    const specialistPath = path.join(root, specialistRel);
    const before = await fs.readFile(specialistPath);
    const hookLog = await prepareHookJournal(root);

    const result = await withEnv(
      {
        FIXTURE_HOOK_LOG: hookLog,
        FIXTURE_APPEND_REL: specialistRel,
        FIXTURE_APPEND_TEXT: "\nbytes that no transformer produces\n",
      },
      () => runIsolatedGeneration({ repoRoot: root }),
    );

    const append = (await readHookJournal(root)).find(
      (entry) => entry.hook === "append-output",
    );
    assert.ok(
      append,
      "the child hook must record the staged candidate corruption",
    );
    assert.equal(append.detail.path, specialistRel);

    await assertRefusedWithoutEffects(result);
    assert.deepEqual(await fs.readFile(specialistPath), before);
  });
});

test("differing unowned output blocks publication without adoption", async () => {
  await withFixture({}, async (root) => {
    const applied = await runIsolatedGeneration({ repoRoot: root });
    assert.equal(applied.success, true, applied.error ?? "");
    await fs.remove(path.join(root, ".skills-lock.json"));
    const promptPath = path.join(root, ".github", "prompts", "demo.prompt.md");
    await fs.appendFile(promptPath, "\nlocal edit\n");
    const edited = await fs.readFile(promptPath, "utf8");

    const result = await runIsolatedGeneration({ repoRoot: root });

    await assertRefusedWithoutEffects(result);
    assert.equal(await fs.readFile(promptPath, "utf8"), edited);
  });
});
test("edited owned bridge and category index outputs are preserved", async () => {
  for (const relPath of [
    ".github/instructions/agent-skill-standard-rule.instructions.md",
    ".github/skills/common/_INDEX.md",
  ]) {
    await withFixture({}, async (root) => {
      const applied = await runIsolatedGeneration({ repoRoot: root });
      assert.equal(applied.success, true, applied.error ?? "");
      const destination = path.join(root, relPath);
      await fs.appendFile(destination, "\nlocal edit\n");
      const edited = await fs.readFile(destination, "utf8");

      const result = await runIsolatedGeneration({ repoRoot: root });

      await assertRefusedWithoutEffects(result);
      assert.equal(await fs.readFile(destination, "utf8"), edited);
    });
  }
});

test("a real generator child that exits nonzero blocks all copy-back", async () => {
  await withFixture({ failAfterIndices: true }, async (root) => {
    const metadataBefore = await fs.readFile(
      path.join(root, "skills", "metadata.json"),
      "utf8",
    );
    const result = await withEnv({ FIXTURE_FORCE_INDICES_EXIT: "23" }, () =>
      runIsolatedGeneration({ repoRoot: root }),
    );

    assert.equal(result.success, false);
    assert.deepEqual(result.copiedBackFiles, []);
    assert.equal((await fs.readJson(result.receiptPath)).status, "FAILED");
    assert.equal(
      await fs.readFile(path.join(root, "skills", "metadata.json"), "utf8"),
      metadataBefore,
    );
  });
});
test("candidate canonical source drift blocks publication after staged generation", async () => {
  await withFixture({ driftSourceDuringIndices: true }, async (root) => {
    const sourcePath = path.join(
      root,
      "skills",
      "common",
      "common-alpha",
      "SKILL.md",
    );
    const sourceBefore = await fs.readFile(sourcePath, "utf8");
    const metadataPath = path.join(root, "skills", "metadata.json");
    const metadataBefore = await fs.readFile(metadataPath, "utf8");

    const result = await withEnv({ FIXTURE_DRIFT_PATH: sourcePath }, () =>
      runIsolatedGeneration({ repoRoot: root }),
    );

    assert.equal(result.success, false);
    assert.deepEqual(result.copiedBackFiles, []);
    assert.equal((await fs.readJson(result.receiptPath)).status, "FAILED");
    assert.equal(
      await fs.readFile(sourcePath, "utf8"),
      `${sourceBefore}\nDRIFT\n`,
    );
    assert.equal(await fs.readFile(metadataPath, "utf8"), metadataBefore);
  });
});

test("apply publishes the changed consumer outputs with real producer formats and preserves unrelated bytes", async () => {
  await withFixture({}, async (root) => {
    const unchangedOutputs = [
      ".github/prompts/demo.prompt.md",
      ".github/agents/arch.agent.md",
      ".github/skills/common/common-alpha/LICENSE.TXT",
      ".github/skills/common/common-beta/SKILL.md",
    ];
    const unchangedBefore = new Map<string, Buffer>();
    for (const relPath of unchangedOutputs) {
      unchangedBefore.set(relPath, await fs.readFile(path.join(root, relPath)));
    }

    const sourcePath = path.join(
      root,
      "skills",
      "common",
      "common-alpha",
      "SKILL.md",
    );
    await fs.writeFile(
      sourcePath,
      SKILL_ALPHA.replace("Alpha skill", "Revised Alpha skill"),
    );
    const result = await runIsolatedGeneration({ repoRoot: root });

    assert.equal(result.success, true, result.error ?? "");
    assert.ok(
      result.copiedBackFiles.includes(
        ".github/skills/common/common-alpha/SKILL.md",
      ),
    );
    assert.deepEqual(result.verifiedFiles, result.copiedBackFiles);

    for (const relPath of unchangedOutputs) {
      assert.ok(
        !result.copiedBackFiles.includes(relPath),
        `unchanged output "${relPath}" must not be republished`,
      );
      assert.deepEqual(
        await fs.readFile(path.join(root, relPath)),
        unchangedBefore.get(relPath),
        `unchanged output "${relPath}" bytes must survive`,
      );
    }

    assert.match(
      await fs.readFile(
        path.join(
          root,
          ".github",
          "skills",
          "common",
          "common-alpha",
          "SKILL.md",
        ),
        "utf8",
      ),
      /Revised Alpha skill/,
    );

    const hostIndex = await fs.readFile(
      path.join(root, ".github", "skills", "common", "_INDEX.md"),
      "utf8",
    );
    const rows = parseCategoryIndexRows(hostIndex);
    assert.deepEqual(rows.malformed, []);
    assert.deepEqual(rows.duplicates, []);
    assert.deepEqual(rows.ids.sort(), ["common-alpha", "common-beta"]);

    const canonicalIndex = parseCategoryIndexRows(
      await fs.readFile(
        path.join(root, "skills", "common", "_INDEX.md"),
        "utf8",
      ),
    );
    assert.deepEqual(canonicalIndex.ids.sort(), [
      "common-alpha",
      "common-beta",
    ]);

    const receipt = await fs.readJson(result.receiptPath);
    assert.equal(receipt.status, "APPLIED");
    assert.deepEqual(receipt.copiedBackFiles, result.copiedBackFiles);
  });
});
test("a wholly absent configured Copilot host is planned before apply and passes check", async () => {
  await withFixture({}, async (root) => {
    const hostRoot = path.join(root, ".github");
    await fs.remove(hostRoot);
    const plan = await buildGenerationPlan(root);
    const expectedHostOutputs = [
      ".github/instructions/agent-skill-standard-rule.instructions.md",
      ".github/prompts/demo.prompt.md",
      ".github/agents/arch.agent.md",
      ".github/skills/common/_INDEX.md",
      ".github/skills/common/common-alpha/SKILL.md",
      ".github/skills/common/common-alpha/LICENSE.TXT",
      ".github/skills/common/common-beta/SKILL.md",
    ];
    for (const relPath of expectedHostOutputs) {
      assert.ok(
        plan.declaredFiles.includes(relPath),
        `${relPath} is declared before staging`,
      );
      assert.equal(await fs.pathExists(path.join(root, relPath)), false);
    }
    assert.equal(await fs.pathExists(hostRoot), false);

    const applied = await runIsolatedGeneration({ repoRoot: root });

    assert.equal(applied.success, true, applied.error ?? "");
    const receipt = await fs.readJson(applied.receiptPath);
    for (const relPath of expectedHostOutputs) {
      assert.ok(receipt.declaredFiles.includes(relPath));
      assert.ok(
        await fs.pathExists(path.join(root, relPath)),
        `${relPath} was published`,
      );
    }
    const specialistRel = ".github/agents/arch.agent.md";
    const lock = await fs.readJson(path.join(root, ".skills-lock.json"));
    assert.equal(lock.generation.entries[specialistRel], undefined);
    assert.deepEqual(lock.entries[specialistRel], {
      owner: "specialist",
      source: "specialist:specialist-arch",
      agent: "copilot",
      sha256: sha256(await fs.readFile(path.join(root, specialistRel))),
    });
    const checked = await runIsolatedGeneration({
      repoRoot: root,
      checkOnly: true,
    });
    assert.equal(checked.success, true, checked.error ?? "");
  });
});

test("root LICENSE and NOTICE resource variants inherit through real producers", async () => {
  for (const resource of [
    "LICENSE",
    "license",
    "LICENSE.md",
    "license.txt",
    "NOTICE",
    "notice.md",
    "NOTICE.txt",
    "notice.TXT",
  ]) {
    await withFixture({ inheritedRootResource: resource }, async (root) => {
      const result = await runIsolatedGeneration({ repoRoot: root });

      assert.equal(result.success, true, result.error ?? "");
      assert.equal(
        await fs.readFile(
          path.join(
            root,
            ".github",
            "skills",
            "common",
            "common-alpha",
            resource,
          ),
          "utf8",
        ),
        LICENSE_TEXT,
      );
    });
  }
});

test("a missing selected mirror inventory is seeded before index bootstrap and published", async () => {
  await withFixture({ omitMirrorSkill: "common-beta" }, async (root) => {
    assert.equal(
      await fs.pathExists(
        path.join(root, ".github", "skills", "common", "common-beta"),
      ),
      false,
    );

    const result = await runIsolatedGeneration({ repoRoot: root });

    assert.equal(result.success, true, result.error ?? "");
    assert.equal(
      await fs.readFile(
        path.join(
          root,
          ".github",
          "skills",
          "common",
          "common-beta",
          "SKILL.md",
        ),
        "utf8",
      ),
      SKILL_BETA,
    );
    assert.equal(
      await fs.readFile(
        path.join(
          root,
          ".github",
          "skills",
          "common",
          "common-beta",
          "LICENSE.TXT",
        ),
        "utf8",
      ),
      LICENSE_TEXT,
    );
    const hostRows = parseCategoryIndexRows(
      await fs.readFile(
        path.join(root, ".github", "skills", "common", "_INDEX.md"),
        "utf8",
      ),
    );
    assert.deepEqual(hostRows.ids.sort(), ["common-alpha", "common-beta"]);
  });
});

test("check mode passes after apply and copies nothing", async () => {
  await withFixture({}, async (root) => {
    const applied = await runIsolatedGeneration({ repoRoot: root });
    assert.equal(applied.success, true, applied.error ?? "");

    const checked = await runIsolatedGeneration({
      repoRoot: root,
      checkOnly: true,
    });
    assert.equal(checked.success, true, checked.error ?? "");
    assert.deepEqual(checked.copiedBackFiles, []);
    assert.equal((await fs.readJson(checked.receiptPath)).status, "PASS");
  });
});

test("check mode writes evidence outside the repository and leaves no repo artifacts path", async () => {
  await withFixture({}, async (root) => {
    const applied = await runIsolatedGeneration({ repoRoot: root });
    assert.equal(applied.success, true, applied.error ?? "");
    const generationLogs = path.join(root, "artifacts", "generation-logs");
    const loggedAttemptsBefore = (await fs.readdir(generationLogs)).sort();

    const checked = await runIsolatedGeneration({
      repoRoot: root,
      checkOnly: true,
    });

    assert.equal(checked.success, true, checked.error ?? "");
    const evidenceDir = path.dirname(path.resolve(checked.logPath));
    assert.equal(
      path.dirname(evidenceDir),
      path.resolve(await fs.realpath(os.tmpdir())),
    );
    assert.equal(
      path.basename(evidenceDir).startsWith("ags-generation-check-"),
      true,
    );
    assert.equal(await fs.pathExists(checked.logPath), true);
    assert.equal((await fs.readJson(checked.receiptPath)).status, "PASS");
    assert.deepEqual(
      (await fs.readdir(generationLogs)).sort(),
      loggedAttemptsBefore,
      "check mode must not create a new evidence directory inside the repository",
    );
    await fs.remove(path.dirname(checked.logPath));
  });
});

test("check mode fails closed on stale prepared outputs and leaves destinations untouched", async () => {
  await withFixture({}, async (root) => {
    const metadataPath = path.join(root, "skills", "metadata.json");
    const sourcePath = path.join(
      root,
      "skills",
      "common",
      "common-alpha",
      "SKILL.md",
    );
    const before = await fs.readFile(metadataPath, "utf8");
    await fs.appendFile(sourcePath, "\nChanged canonical content\n");

    const result = await runIsolatedGeneration({
      repoRoot: root,
      checkOnly: true,
    });

    assert.equal(result.success, false);
    assert.deepEqual(result.copiedBackFiles, []);
    assert.equal(await fs.readFile(metadataPath, "utf8"), before);
    assert.equal((await fs.readJson(result.receiptPath)).status, "FAILED");
  });
});

test("metric refresh preserves authored metadata and binds the exact scoped projection", async () => {
  await withFixture({}, async (root) => {
    const metadataPath = path.join(root, "skills", "metadata.json");
    const metadataBefore = await fs.readJson(metadataPath);
    const lockBefore = await fs.readJson(path.join(root, ".skills-lock.json"));
    const skillPath = path.join(
      root,
      "skills",
      "common",
      "common-alpha",
      "SKILL.md",
    );
    await fs.appendFile(
      skillPath,
      `\nAdditional metric-bearing words ${"generated authority ".repeat(80)}\n`,
    );

    const result = await runIsolatedGeneration({ repoRoot: root });

    assert.equal(result.success, true, result.error ?? "");
    const metadataBytes = await fs.readFile(metadataPath);
    const metadataAfter = JSON.parse(metadataBytes.toString("utf8"));
    assert.equal(metadataAfter.authoredBy, metadataBefore.authoredBy);
    assert.equal(metadataAfter.authoredAt, metadataBefore.authoredAt);
    assert.equal(
      metadataAfter.categories.common.version,
      metadataBefore.categories.common.version,
    );
    assert.deepEqual(
      metadataAfter.categories.common.owners,
      metadataBefore.categories.common.owners,
    );
    assert.deepEqual(
      metadataAfter.categories.common.routing,
      metadataBefore.categories.common.routing,
    );
    assert.notDeepEqual(
      metadataAfter.categories.common.token_metrics,
      metadataBefore.categories.common.token_metrics,
    );
    assert.equal(
      metadataBytes.toString("utf8"),
      `${JSON.stringify(metadataAfter, null, 2)}\n`,
    );
    const lock = await fs.readJson(path.join(root, ".skills-lock.json"));
    const entry = lock.generation.entries["skills/metadata.json"];
    assert.equal(entry.sha256, sha256(metadataBytes));
    assert.deepEqual(entry.scope, {
      kind: "category-token-metrics",
      sha256: tokenMetricsDigest(metadataAfter),
    });
    assert.notEqual(
      entry.scope.sha256,
      lockBefore.generation.entries["skills/metadata.json"].scope.sha256,
    );
  });
});

test("scoped metadata authority permits authored nonmetric edits without rewriting bytes", async () => {
  await withFixture({}, async (root) => {
    const metadataPath = path.join(root, "skills", "metadata.json");
    const lockPath = path.join(root, ".skills-lock.json");
    const metadata = await fs.readJson(metadataPath);
    metadata.authoredBy = "edited-owner";
    metadata.categories.common.version = "9.8.7";
    const authoredBytes = Buffer.from(`${JSON.stringify(metadata, null, 2)}\n`);
    await fs.writeFile(metadataPath, authoredBytes);
    const lockBefore = await fs.readFile(lockPath);

    const result = await runIsolatedGeneration({
      repoRoot: root,
      checkOnly: true,
    });

    assert.equal(result.success, true, result.error ?? "");
    assert.deepEqual(result.copiedBackFiles, []);
    assert.deepEqual(await fs.readFile(metadataPath), authoredBytes);
    assert.deepEqual(await fs.readFile(lockPath), lockBefore);
    assert.equal((await fs.readJson(result.receiptPath)).status, "PASS");
  });
});

test("token producer nonmetric metadata mutation is refused before publication", async () => {
  await withFixture({ mutateMetadataNonMetric: true }, async (root) => {
    const metadataPath = path.join(root, "skills", "metadata.json");
    const metadataBefore = await fs.readFile(metadataPath);
    const lockPath = path.join(root, ".skills-lock.json");
    const lockBefore = await fs.readFile(lockPath);
    const sourcePath = path.join(
      root,
      "skills",
      "common",
      "common-alpha",
      "SKILL.md",
    );
    const hookPath = path.join(root, "fixture-hooks.jsonl");
    await fs.appendFile(sourcePath, `\n${"metric change ".repeat(80)}\n`);

    const result = await withEnv(
      {
        FIXTURE_METADATA_NONMETRIC: "1",
        FIXTURE_HOOK_LOG: hookPath,
      },
      () => runIsolatedGeneration({ repoRoot: root }),
    );

    await assertRefusedWithoutEffects(result);
    assert.match(result.error ?? "", /non-metric/i);
    assert.match(
      await fs.readFile(hookPath, "utf8"),
      /metadata-nonmetric-mutation/,
    );
    assert.deepEqual(await fs.readFile(metadataPath), metadataBefore);
    assert.deepEqual(await fs.readFile(lockPath), lockBefore);
  });
});

test("tampered scoped token metrics refuse before invoking the producer", async () => {
  await withFixture({}, async (root) => {
    const metadataPath = path.join(root, "skills", "metadata.json");
    const metadata = await fs.readJson(metadataPath);
    metadata.categories.common.token_metrics.poisoned = "owned-byte-edit";
    await fs.writeFile(metadataPath, `${JSON.stringify(metadata, null, 2)}\n`);
    const tamperedBytes = await fs.readFile(metadataPath);

    const result = await runIsolatedGeneration({ repoRoot: root });

    await assertRefusedWithoutEffects(result);
    assert.deepEqual(await fs.readFile(metadataPath), tamperedBytes);
    assert.ok(
      !(await fs.readFile(result.logPath, "utf8")).includes(
        "[calculate-tokens]",
      ),
    );
  });
});

test("metric refresh refuses unsupported metadata serialization without publication", async () => {
  await withFixture({}, async (root) => {
    const metadataPath = path.join(root, "skills", "metadata.json");
    const metadata = await fs.readJson(metadataPath);
    const unsupportedBytes = Buffer.from(JSON.stringify(metadata, null, 4));
    await fs.writeFile(metadataPath, unsupportedBytes);
    const lockPath = path.join(root, ".skills-lock.json");
    const lockBefore = await fs.readFile(lockPath);
    const sourcePath = path.join(
      root,
      "skills",
      "common",
      "common-alpha",
      "SKILL.md",
    );
    await fs.appendFile(sourcePath, `\n${"metric change ".repeat(80)}\n`);

    const result = await runIsolatedGeneration({ repoRoot: root });

    await assertRefusedWithoutEffects(result);
    assert.match(result.error ?? "", /not canonical two-space JSON/i);
    assert.deepEqual(await fs.readFile(metadataPath), unsupportedBytes);
    assert.deepEqual(await fs.readFile(lockPath), lockBefore);
  });
});

test("an edited owned mirror is preserved and reported as a conflict, not overwritten", async () => {
  await withFixture({}, async (root) => {
    const mirrorPath = path.join(
      root,
      ".github",
      "skills",
      "common",
      "common-beta",
      "SKILL.md",
    );
    const editedBytes =
      "---\nname: common-beta\ndescription: locally edited\n---\n# Beta\n";
    await fs.outputFile(mirrorPath, editedBytes);
    const metadataPath = path.join(root, "skills", "metadata.json");
    const metadataBefore = await fs.readFile(metadataPath, "utf8");

    const result = await runIsolatedGeneration({ repoRoot: root });

    await assertRefusedWithoutEffects(result);
    assert.equal(await fs.readFile(mirrorPath, "utf8"), editedBytes);
    assert.equal(await fs.readFile(metadataPath, "utf8"), metadataBefore);
  });
});

test("an exclusion selection change regenerates the host surface without the excluded skill", async () => {
  await withFixture({}, async (root) => {
    await fs.outputFile(path.join(root, ".skillsrc"), EXCLUSION_CONFIG);

    const result = await runIsolatedGeneration({ repoRoot: root });

    assert.equal(result.success, true, result.error ?? "");
    const hostRows = parseCategoryIndexRows(
      await fs.readFile(
        path.join(root, ".github", "skills", "common", "_INDEX.md"),
        "utf8",
      ),
    );
    assert.deepEqual(hostRows.malformed, []);
    assert.deepEqual(hostRows.duplicates, []);
    assert.deepEqual(hostRows.ids.sort(), ["common-alpha"]);
    assert.equal(
      await fs.readFile(
        path.join(
          root,
          ".github",
          "skills",
          "common",
          "common-alpha",
          "SKILL.md",
        ),
        "utf8",
      ),
      SKILL_ALPHA,
    );
  });
});

test("a post-generation excluded row injected in real producer format is refused without publication", async () => {
  await withFixture({ mutateDuringIndices: true }, async (root) => {
    await fs.outputFile(path.join(root, ".skillsrc"), EXCLUSION_CONFIG);
    const hookLog = await prepareHookJournal(root);
    const hostIndexPath = path.join(
      root,
      ".github",
      "skills",
      "common",
      "_INDEX.md",
    );
    const hostIndexBefore = await fs.readFile(hostIndexPath);

    const result = await withEnv(
      {
        FIXTURE_HOOK_LOG: hookLog,
        FIXTURE_ROW_FROM: path.join("skills", "common", "_INDEX.md"),
        FIXTURE_ROW_TO: path.join(".github", "skills", "common", "_INDEX.md"),
        FIXTURE_ROW_TOKEN: "common-beta",
      },
      () => runIsolatedGeneration({ repoRoot: root }),
    );

    const journal = await readHookJournal(root);
    assert.equal(
      journal.filter((entry) => entry.hook === "inject-row").length,
      1,
      "the fixture must have appended one real producer row before validation",
    );
    await assertRefusedWithoutEffects(result);
    assert.deepEqual(await fs.readFile(hostIndexPath), hostIndexBefore);
  });
});

test("a configured workflow whose source is absent is rejected before staging", async () => {
  await withFixture({}, async (root) => {
    await fs.outputFile(
      path.join(root, ".skillsrc"),
      [
        "registry: https://example.invalid/registry",
        "agents:",
        "  - copilot",
        "skills:",
        "  common:",
        "    ref: common-v1",
        "workflows:",
        "  - demo",
        "  - ghost",
        "",
      ].join("\n"),
    );

    const result = await runIsolatedGeneration({ repoRoot: root });

    await assertRefusedWithoutEffects(result);
    assert.ok(
      !(await fs.readFile(result.logPath, "utf8")).includes(
        "[calculate-tokens]",
      ),
    );
  });
});

test("a canonical index row removed after generation is reported as an omission", async () => {
  await withFixture({ mutateDuringIndices: true }, async (root) => {
    const metadataBefore = await fs.readFile(
      path.join(root, "skills", "metadata.json"),
      "utf8",
    );
    const result = await withEnv(
      {
        FIXTURE_STRIP_REL: path.join("skills", "common", "_INDEX.md"),
        FIXTURE_STRIP_TOKEN: "common-beta",
      },
      () => runIsolatedGeneration({ repoRoot: root }),
    );

    await assertRefusedWithoutEffects(result);
    assert.equal(
      await fs.readFile(path.join(root, "skills", "metadata.json"), "utf8"),
      metadataBefore,
    );
  });
});

test("destination drift during generation aborts the whole copy-back", async () => {
  await withFixture({ mutateDuringIndices: true }, async (root) => {
    const agentsPath = path.join(root, "AGENTS.md");
    const metadataPath = path.join(root, "skills", "metadata.json");
    const metadataBefore = await fs.readFile(metadataPath, "utf8");

    const result = await withEnv({ FIXTURE_DRIFT_PATH: agentsPath }, () =>
      runIsolatedGeneration({ repoRoot: root }),
    );

    assert.equal(result.success, false);
    assert.deepEqual(result.copiedBackFiles, []);
    assert.equal(await fs.readFile(metadataPath, "utf8"), metadataBefore);
    assert.equal(
      (await fs.readFile(agentsPath, "utf8")).endsWith("DRIFT\n"),
      true,
    );
  });
});

test("an absent declared destination that appears during generation aborts", async () => {
  await withFixture(
    { mutateDuringIndices: true, omitBaselineCapabilitiesDoc: true },
    async (root) => {
      const capabilitiesPath = path.join(root, "docs", "agent-capabilities.md");
      assert.equal(await fs.pathExists(capabilitiesPath), false);

      const result = await withEnv(
        { FIXTURE_CREATE_PATH: capabilitiesPath },
        () => runIsolatedGeneration({ repoRoot: root }),
      );

      assert.equal(result.success, false);
      assert.deepEqual(result.copiedBackFiles, []);
      assert.equal(await fs.readFile(capabilitiesPath, "utf8"), "created\n");
      assert.equal((await fs.readJson(result.receiptPath)).status, "FAILED");
    },
  );
});

test("a post-rename verification failure reports the applied but unverified destination", async (t) => {
  await withFixture({}, async (root) => {
    await fs.writeFile(
      path.join(root, "skills", "common", "common-alpha", "SKILL.md"),
      SKILL_ALPHA.replace("Alpha skill", "Rename verification Alpha"),
    );
    const realRename = fs.rename;
    const renameMock = t.mock.method(
      fs,
      "rename",
      async (from: string, to: string) => {
        await realRename(from, to);
        await fs.appendFile(to, "CORRUPT\n");
      },
    );
    try {
      const result = await runIsolatedGeneration({ repoRoot: root });

      assert.equal(result.success, false);
      assert.equal(
        result.copiedBackFiles.length,
        1,
        "the corrupted first rename must be the only applied file",
      );
      const renamed = result.copiedBackFiles[0];
      assert.deepEqual(result.verifiedFiles, []);
      assert.match(
        await fs.readFile(path.join(root, renamed), "utf8"),
        /CORRUPT\n$/,
      );

      const receipt = await fs.readJson(result.receiptPath);
      assert.equal(receipt.status, "FAILED");
      assert.deepEqual(receipt.appliedFiles, result.copiedBackFiles);
      assert.deepEqual(receipt.verifiedFiles, []);
    } finally {
      renameMock.mock.restore();
    }
  });
});
test("a post-rename ownership-manifest failure reports the ledger as applied but unverified", async (t) => {
  await withFixture({}, async (root) => {
    await fs.writeFile(
      path.join(root, "skills", "common", "common-alpha", "SKILL.md"),
      SKILL_ALPHA.replace("Alpha skill", "Ledger verification Alpha"),
    );
    const physicalLockPath = path.join(
      await fs.realpath(root),
      ".skills-lock.json",
    );
    const realRename = fs.rename;
    const renameMock = t.mock.method(
      fs,
      "rename",
      async (from: string, to: string) => {
        await realRename(from, to);
        if (path.resolve(to) === physicalLockPath) {
          await fs.appendFile(to, "\nCORRUPT\n");
        }
      },
    );
    try {
      const result = await runIsolatedGeneration({ repoRoot: root });

      assert.equal(result.success, false);
      assert.ok(result.copiedBackFiles.includes(".skills-lock.json"));
      assert.ok(!result.verifiedFiles.includes(".skills-lock.json"));
      const receipt = await fs.readJson(result.receiptPath);
      assert.equal(receipt.status, "FAILED");
      assert.ok(receipt.appliedFiles.includes(".skills-lock.json"));
      assert.ok(!receipt.verifiedFiles.includes(".skills-lock.json"));
      assert.equal(
        (await fs.readFile(physicalLockPath, "utf8")).endsWith("CORRUPT\n"),
        true,
        "the corrupted ledger bytes must be the observable applied effect",
      );
    } finally {
      renameMock.mock.restore();
    }
  });
});

test("a repeated attempt id never overwrites or reuses prior evidence", async () => {
  await withFixture({}, async (root) => {
    const first = await runIsolatedGeneration({
      repoRoot: root,
      attemptId: "fixed-attempt",
    });
    assert.equal(first.success, true, first.error ?? "");

    const logBefore = await fs.readFile(first.logPath, "utf8");
    const receiptBefore = await fs.readFile(first.receiptPath, "utf8");

    await assert.rejects(() =>
      runIsolatedGeneration({ repoRoot: root, attemptId: "fixed-attempt" }),
    );

    assert.equal(await fs.readFile(first.logPath, "utf8"), logBefore);
    assert.equal(await fs.readFile(first.receiptPath, "utf8"), receiptBefore);
  });
});

test("a pre-existing attempt directory without a log is still refused", async () => {
  await withFixture({}, async (root) => {
    const logDir = path.join(root, "artifacts", "generation-logs", "taken");
    await fs.outputJson(path.join(logDir, "receipt.json"), { status: "OLD" });

    await assert.rejects(() =>
      runIsolatedGeneration({ repoRoot: root, attemptId: "taken" }),
    );
    assert.deepEqual(await fs.readJson(path.join(logDir, "receipt.json")), {
      status: "OLD",
    });
  });
});

test("evidence directory overlap is rejected before creating a run log", async () => {
  await withFixture({}, async (root) => {
    const logDir = path.join(root, "skills", "common");
    await assert.rejects(
      () => runIsolatedGeneration({ repoRoot: root, logDir }),
      /Evidence directory/,
    );
    assert.equal(
      await fs.pathExists(path.join(logDir, "generation.log")),
      false,
    );
  });
});

test("the generator entrypoint refuses a foreign working directory before writing", async () => {
  await withFixture({}, async (root) => {
    const child = spawn(
      process.execPath,
      [
        "--import",
        "tsx",
        path.join(REPOSITORY_ROOT, "scripts", "generation", "index.ts"),
        "--check",
      ],
      { cwd: root, env: { ...process.env, CI: "true" } },
    );
    let stderr = "";
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    const exitCode = await new Promise<number>((resolve) => {
      child.on("close", (code) => resolve(code ?? 1));
    });

    assert.equal(exitCode, 1, stderr);
    assert.equal(
      await fs.pathExists(path.join(root, "artifacts", "generation-logs")),
      false,
    );
  });
});

test("the public entrypoint check leaves a no-change real-producer fixture and its manifest untouched", async () => {
  await withFixture({}, async (root) => {
    const watched = [
      "AGENTS.md",
      ".github/skills/common/common-alpha/SKILL.md",
      ".skills-lock.json",
    ];
    const before = new Map<string, Buffer>();
    for (const relPath of watched) {
      before.set(relPath, await fs.readFile(path.join(root, relPath)));
    }

    const child = spawn(
      process.execPath,
      [
        "--import",
        "tsx",
        path.join(root, "scripts", "generation", "index.ts"),
        "--check",
      ],
      { cwd: root, env: { ...process.env, CI: "true" } },
    );
    let stdout = "";
    let stderr = "";
    child.stdout.on("data", (chunk: Buffer) => {
      stdout += chunk.toString();
    });
    child.stderr.on("data", (chunk: Buffer) => {
      stderr += chunk.toString();
    });
    const exitCode = await new Promise<number>((resolve) => {
      child.on("close", (code) => resolve(code ?? 1));
    });

    assert.equal(exitCode, 0, `${stdout}\n${stderr}`);

    for (const relPath of watched) {
      const expected = before.get(relPath);
      assert.ok(expected, `missing baseline bytes for ${relPath}`);
      assert.ok(
        (await fs.readFile(path.join(root, relPath))).equals(expected),
        `${relPath} changed under --check`,
      );
    }

    const receiptMatch = /Receipt: (.+)$/m.exec(stdout);
    assert.ok(receiptMatch, `no receipt path in output: ${stdout}`);
    const receipt = await fs.readJson(receiptMatch[1].trim());
    assert.equal(receipt.status, "PASS");
    assert.equal(receipt.checkOnly, true);
  });
});

test("public pnpm command forwards stale-check, apply, and passing-check with receipts", async () => {
  await withFixture({}, async (root) => {
    const betaPath = ".github/skills/common/common-beta/SKILL.md";
    const betaBefore = await fs.readFile(path.join(root, betaPath));
    const lockPath = path.join(root, ".skills-lock.json");
    const lock = await fs.readJson(lockPath);
    delete lock.entries[betaPath];
    await fs.writeJson(lockPath, lock, { spaces: 2 });
    const lockBeforeCheck = await fs.readFile(lockPath);
    const alphaPath = path.join(
      root,
      "skills",
      "common",
      "common-alpha",
      "SKILL.md",
    );
    await fs.appendFile(alphaPath, `\n${"public route refresh ".repeat(80)}\n`);
    const beforeOutputs = new Map<string, Buffer | null>();
    for (const relPath of (await buildGenerationPlan(root)).declaredFiles) {
      const outputPath = path.join(root, relPath);
      beforeOutputs.set(
        relPath,
        (await fs.pathExists(outputPath))
          ? await fs.readFile(outputPath)
          : null,
      );
    }

    const invoke = async (args: string[]) => {
      const child = spawn("pnpm", ["generate-indices", ...args], {
        cwd: root,
        env: { ...process.env, CI: "true" },
        shell: false,
      });
      let stdout = "";
      let stderr = "";
      child.stdout.on("data", (chunk: Buffer) => {
        stdout += chunk.toString();
      });
      child.stderr.on("data", (chunk: Buffer) => {
        stderr += chunk.toString();
      });
      const exitCode = await new Promise<number>((resolve, reject) => {
        child.on("error", reject);
        child.on("close", (code) => resolve(code ?? 1));
      });
      return { exitCode, stdout, stderr };
    };

    const stale = await invoke(["--check"]);
    assert.notEqual(stale.exitCode, 0, `${stale.stdout}\n${stale.stderr}`);
    const staleLogMatch = /See log at: (.+)$/m.exec(stale.stderr);
    assert.ok(staleLogMatch, stale.stderr);
    const staleReceipt = await fs.readJson(
      path.join(path.dirname(staleLogMatch[1].trim()), "receipt.json"),
    );
    assert.equal(staleReceipt.status, "FAILED");
    assert.equal(staleReceipt.checkOnly, true);
    assert.deepEqual(await fs.readFile(lockPath), lockBeforeCheck);
    assert.deepEqual(await fs.readFile(path.join(root, betaPath)), betaBefore);
    for (const [relPath, expected] of beforeOutputs) {
      const outputPath = path.join(root, relPath);
      if (expected === null) {
        assert.equal(
          await fs.pathExists(outputPath),
          false,
          `${relPath} appeared`,
        );
      } else {
        assert.deepEqual(
          await fs.readFile(outputPath),
          expected,
          `${relPath} changed`,
        );
      }
    }

    const applied = await invoke([]);
    assert.equal(applied.exitCode, 0, `${applied.stdout}\n${applied.stderr}`);
    const applyReceiptMatch = /Receipt: (.+)$/m.exec(applied.stdout);
    assert.ok(applyReceiptMatch, applied.stdout);
    const applyReceipt = await fs.readJson(applyReceiptMatch[1].trim());
    assert.equal(applyReceipt.status, "APPLIED");
    assert.deepEqual(
      await fs.readFile(
        path.join(root, ".github/skills/common/common-alpha/SKILL.md"),
      ),
      await fs.readFile(alphaPath),
    );
    assert.deepEqual(await fs.readFile(path.join(root, betaPath)), betaBefore);
    const appliedLock = await fs.readJson(lockPath);
    assert.equal(appliedLock.entries[betaPath], undefined);
    assert.equal(
      appliedLock.generation.entries[betaPath],
      undefined,
      "the unchanged unknown output must not be claimed as generation-owned",
    );

    const checked = await invoke(["--check"]);
    assert.equal(checked.exitCode, 0, `${checked.stdout}\n${checked.stderr}`);
    const checkReceiptMatch = /Receipt: (.+)$/m.exec(checked.stdout);
    assert.ok(checkReceiptMatch, checked.stdout);
    const checkReceipt = await fs.readJson(checkReceiptMatch[1].trim());
    assert.equal(checkReceipt.status, "PASS");
    assert.equal(checkReceipt.checkOnly, true);
    assert.deepEqual(await fs.readFile(path.join(root, betaPath)), betaBefore);
  });
});

test("an unconfigured symlinked category is rejected before any generator runs", async () => {
  await withFixture({}, async (root) => {
    const external = await fs.mkdtemp(path.join(os.tmpdir(), "ags-external-"));
    try {
      await fs.outputFile(
        path.join(external, "rogue-skill", "SKILL.md"),
        "---\nname: rogue-skill\ndescription: external\n---\n# Rogue\n",
      );
      await fs.symlink(
        external,
        path.join(root, "skills", "extra-category"),
        "junction",
      );

      const result = await runIsolatedGeneration({ repoRoot: root });

      await assertRefusedWithoutEffects(result);
      assert.ok(
        !(await fs.readFile(result.logPath, "utf8")).includes(
          "[calculate-tokens]",
        ),
      );
      assert.equal(
        await fs.readFile(
          path.join(external, "rogue-skill", "SKILL.md"),
          "utf8",
        ),
        "---\nname: rogue-skill\ndescription: external\n---\n# Rogue\n",
      );
      assert.deepEqual((await fs.readdir(external)).sort(), ["rogue-skill"]);
    } finally {
      await fs.remove(external);
    }
  });
});

test("copySourceToStage keeps mirrors while excluding .git, .agent, artifacts and dependencies", async () => {
  const source = await fs.mkdtemp(path.join(os.tmpdir(), "stage-copy-src-"));
  const destination = await fs.mkdtemp(
    path.join(os.tmpdir(), "stage-copy-dest-"),
  );
  const stage = path.join(destination, "isolated-stage");

  try {
    await fs.outputFile(path.join(source, "AGENTS.md"), "# root\n");
    await fs.outputFile(
      path.join(source, ".agents", "skills", "common", "_INDEX.md"),
      "mirror\n",
    );
    await fs.outputFile(path.join(source, ".git", "HEAD"), "ref\n");
    await fs.outputFile(
      path.join(source, ".agent", "sdd", "report.md"),
      "sdd\n",
    );
    await fs.outputFile(path.join(source, "artifacts", "log.txt"), "log\n");
    await fs.outputFile(
      path.join(source, "node_modules", "left-pad", "index.js"),
      "module\n",
    );
    await fs.outputFile(
      path.join(source, "skills", "alpha", "artifacts", "packet.json"),
      '{"nested":true}\n',
    );
    await fs.outputFile(
      path.join(source, "skills", "alpha", ".agent", "notes.md"),
      "nested agent\n",
    );

    await copySourceToStage(source, stage);

    assert.equal(await fs.pathExists(path.join(stage, "AGENTS.md")), true);
    assert.equal(
      await fs.pathExists(
        path.join(stage, ".agents", "skills", "common", "_INDEX.md"),
      ),
      true,
    );
    assert.equal(await fs.pathExists(path.join(stage, ".git")), false);
    assert.equal(await fs.pathExists(path.join(stage, ".agent")), false);
    assert.equal(await fs.pathExists(path.join(stage, "artifacts")), false);
    assert.equal(await fs.pathExists(path.join(stage, "node_modules")), false);
    assert.equal(
      await fs.readFile(
        path.join(stage, "skills", "alpha", "artifacts", "packet.json"),
        "utf8",
      ),
      '{"nested":true}\n',
    );
    assert.equal(
      await fs.pathExists(
        path.join(stage, "skills", "alpha", ".agent", "notes.md"),
      ),
      true,
    );
  } finally {
    await fs.remove(source);
    await fs.remove(destination);
  }
});

test("generation preserves an unrelated agent-owned active file and its ledger provenance", async () => {
  await withFixture({}, async (root) => {
    const applied = await runIsolatedGeneration({ repoRoot: root });
    assert.equal(applied.success, true, applied.error ?? "");

    const cursorRelPath = ".cursor/skills/common/common-alpha/SKILL.md";
    const cursorContent =
      '---\nname: common-alpha\ndescription: "Cursor copy (triggers: *.alpha)"\n---\n# Alpha\n';
    await fs.outputFile(path.join(root, cursorRelPath), cursorContent);

    const lockPath = path.join(root, ".skills-lock.json");
    const lockBefore = await fs.readJson(lockPath);
    lockBefore.entries[cursorRelPath] = {
      owner: "skill",
      source: "skill:common/common-alpha@common-v1",
      agent: "cursor",
      sha256: sha256(Buffer.from(cursorContent)),
    };
    lockBefore.sources = {
      ...lockBefore.sources,
      "common-legacy": { ref: "common-legacy", commit: "c".repeat(40) },
    };
    lockBefore.disclosed = {
      ...(lockBefore.disclosed ?? {}),
      ".cursor/skills/common/common-beta/SKILL.md": [
        "skill:common/common-beta@common-v1",
      ],
    };
    await fs.writeJson(lockPath, lockBefore, { spaces: 2 });
    const cursorEntryBefore: unknown = JSON.parse(
      JSON.stringify(lockBefore.entries[cursorRelPath]),
    );
    const sourcesBefore: unknown = JSON.parse(
      JSON.stringify(lockBefore.sources),
    );
    const disclosedBefore: unknown = JSON.parse(
      JSON.stringify(lockBefore.disclosed),
    );

    await fs.writeFile(
      path.join(root, "skills", "common", "common-alpha", "SKILL.md"),
      SKILL_ALPHA.replace("Alpha skill", "Alpha skill with Cursor retention"),
    );
    const result = await runIsolatedGeneration({ repoRoot: root });

    assert.equal(result.success, true, result.error ?? "");
    assert.ok(
      result.copiedBackFiles.includes(
        ".github/skills/common/common-alpha/SKILL.md",
      ),
    );
    assert.equal(
      await fs.readFile(path.join(root, cursorRelPath), "utf8"),
      cursorContent,
    );
    const lockAfter = await fs.readJson(lockPath);
    assert.deepEqual(lockAfter.entries[cursorRelPath], cursorEntryBefore);
    assert.deepEqual(lockAfter.sources, sourcesBefore);
    assert.deepEqual(lockAfter.disclosed, disclosedBefore);
    assert.ok(lockAfter.entries[".github/skills/common/common-alpha/SKILL.md"]);
  });
});

test("generation does not acquire ownership of an unowned equal-byte configured output", async () => {
  await withFixture({}, async (root) => {
    const applied = await runIsolatedGeneration({ repoRoot: root });
    assert.equal(applied.success, true, applied.error ?? "");

    const unownedRelPath = ".github/skills/common/common-beta/SKILL.md";
    const lockPath = path.join(root, ".skills-lock.json");
    const lock = await fs.readJson(lockPath);
    delete lock.entries[unownedRelPath];
    await fs.writeJson(lockPath, lock, { spaces: 2 });
    const mirrorBefore = await fs.readFile(path.join(root, unownedRelPath));

    await fs.writeFile(
      path.join(root, "skills", "common", "common-alpha", "SKILL.md"),
      SKILL_ALPHA.replace("Alpha skill", "Alpha skill with ownership change"),
    );
    const result = await runIsolatedGeneration({ repoRoot: root });

    assert.equal(result.success, true, result.error ?? "");
    assert.ok(
      result.copiedBackFiles.includes(
        ".github/skills/common/common-alpha/SKILL.md",
      ),
    );
    assert.ok(
      !result.copiedBackFiles.includes(unownedRelPath),
      "an equal-byte unowned output must not be published",
    );
    const lockAfter = await fs.readJson(lockPath);
    assert.equal(lockAfter.entries[unownedRelPath], undefined);
    assert.equal(lockAfter.generation?.entries?.[unownedRelPath], undefined);
    assert.deepEqual(
      await fs.readFile(path.join(root, unownedRelPath)),
      mirrorBefore,
    );
  });
});

test("a producer dependency changed after candidate capture blocks all publication", async () => {
  await withFixture({ mutateDuringIndices: true }, async (root) => {
    const dependencyPath = path.join(
      root,
      "cli",
      "src",
      "capabilities",
      "agentCapabilities.ts",
    );
    const dependencyBefore = await fs.readFile(dependencyPath, "utf8");
    const destinationPath = path.join(
      root,
      ".github",
      "skills",
      "common",
      "common-alpha",
      "SKILL.md",
    );
    const destinationBefore = await fs.readFile(destinationPath);
    await fs.writeFile(
      path.join(root, "skills", "common", "common-alpha", "SKILL.md"),
      SKILL_ALPHA.replace("Alpha skill", "Alpha skill dependency drift"),
    );

    const result = await withEnv({ FIXTURE_TOUCH_PATH: dependencyPath }, () =>
      runIsolatedGeneration({ repoRoot: root }),
    );

    // Injection evidence first: the intentional decision failure below must be
    // conditioned on an observed real producer-dependency drift.
    assert.equal(
      await fs.readFile(dependencyPath, "utf8"),
      `${dependencyBefore}\n// fixture producer dependency drift\n`,
      "the producer dependency drift must have reached the active checkout",
    );
    await assertRefusedWithoutEffects(result);
    assert.deepEqual(await fs.readFile(destinationPath), destinationBefore);
  });
});
test("a foreign temp-looking sibling of a package resource blocks publication and survives", async () => {
  await withFixture({ mutateDuringIndices: true }, async (root) => {
    const canonicalResource = path.join(
      root,
      "skills",
      "common",
      "common-alpha",
      "LICENSE.TXT",
    );
    await fs.writeFile(canonicalResource, "Canonical package resource bytes\n");
    const destinationPath = path.join(
      root,
      ".github",
      "skills",
      "common",
      "common-alpha",
      "LICENSE.TXT",
    );
    const destinationBefore = await fs.readFile(destinationPath);
    const lockPath = path.join(root, ".skills-lock.json");
    const lockBefore = await fs.readFile(lockPath);
    const foreignSibling = `${canonicalResource}.ags-tmp-foreign`;
    const hookLog = await prepareHookJournal(root);
    await fs.writeFile(
      path.join(root, "skills", "common", "common-alpha", "SKILL.md"),
      SKILL_ALPHA.replace("Alpha skill", "Alpha skill requiring publication"),
    );

    const result = await withEnv(
      {
        FIXTURE_CREATE_PATH: foreignSibling,
        FIXTURE_HOOK_LOG: hookLog,
      },
      () => runIsolatedGeneration({ repoRoot: root }),
    );

    const injection = (await readHookJournal(root)).find(
      (entry) => entry.hook === "create-path",
    );
    assert.ok(
      injection,
      "the child hook must record the foreign sibling injection",
    );
    assert.equal(injection.detail.path, foreignSibling);
    assert.equal(injection.detail.producerExitCode, 0);
    await assertRefusedWithoutEffects(result);
    assert.match(result.error ?? "", /source inventory drift/i);
    assert.deepEqual(
      await fs.readFile(foreignSibling),
      Buffer.from("created\n"),
    );
    assert.deepEqual(await fs.readFile(destinationPath), destinationBefore);
    assert.deepEqual(await fs.readFile(lockPath), lockBefore);
  });
});

test("a Git index-only change to a proved adopted path blocks publication", async () => {
  await withFixture({}, async (root) => {
    const applied = await runIsolatedGeneration({ repoRoot: root });
    assert.equal(applied.success, true, applied.error ?? "");
    // Base keeps the real, unwrapped producer, so the prior-producer proof
    // archives a generator that cannot run the mutation hook.
    const base = await commitFixtureBase(root);
    await fs.remove(path.join(root, ".skills-lock.json"));
    // The wrapper exists only in the current fixture, after the commit and
    // before this generation call: it can only fire during candidate
    // generation, i.e. after the adoption proof already completed.
    await installIndicesWrapper(root);
    const hookLog = await prepareHookJournal(root);

    // Mutation targets the path whose candidate bytes really change.
    const adoptedRelPath = ".github/skills/common/common-alpha/SKILL.md";
    const adoptedPath = path.join(root, adoptedRelPath);
    const adoptedBefore = await fs.readFile(adoptedPath);
    await fs.writeFile(
      path.join(root, "skills", "common", "common-alpha", "SKILL.md"),
      SKILL_ALPHA.replace("Alpha skill", "Alpha skill index drift"),
    );

    const result = await withEnv(
      {
        FIXTURE_HOOK_LOG: hookLog,
        FIXTURE_GIT_REPO: root,
        FIXTURE_GIT_INDEX_PATH: adoptedRelPath,
      },
      () => runIsolatedGeneration({ repoRoot: root, adoptBase: base }),
    );

    const indexHook = (await readHookJournal(root)).find(
      (entry) => entry.hook === "stage-index-only",
    );
    assert.ok(
      indexHook,
      "the candidate wrapper must have staged the index-only change after the proof",
    );
    assert.equal(indexHook.detail.path, adoptedRelPath);

    // Injection evidence first: the intentional decision failure below must be
    // conditioned on an observed index-only change that the fixture staged.
    const baseBlob = (
      await git(root, ["rev-parse", `${base}:${adoptedRelPath}`])
    ).trim();
    const indexBlob = (
      await git(root, ["ls-files", "-s", "--", adoptedRelPath])
    )
      .trim()
      .split(/\s+/)[1];
    assert.equal(typeof indexHook.detail.sha, "string");
    assert.equal(
      indexBlob,
      indexHook.detail.sha,
      "the index must still hold the staged blob the fixture recorded",
    );
    assert.notEqual(indexBlob, baseBlob);
    assert.equal(
      (await git(root, ["cat-file", "-p", indexBlob])).trim(),
      "fixture index-only alternate blob",
      "the preserved staged entry must be the fixture alternate content",
    );

    await assertRefusedWithoutEffects(result);
    assert.deepEqual(await fs.readFile(adoptedPath), adoptedBefore);
    const indexBlobAfterRefusal = (
      await git(root, ["ls-files", "-s", "--", adoptedRelPath])
    )
      .trim()
      .split(/\s+/)[1];
    assert.equal(
      indexBlobAfterRefusal,
      indexBlob,
      "the refusal must preserve the staged index entry",
    );
    assert.equal(
      (await git(root, ["diff", base, "--", adoptedRelPath])).trim(),
      "",
      "no worktree publication may overwrite the pre-change adopted output",
    );
  });
});
test("a Git index-only configuration change blocks publication and preserves the worktree", async () => {
  await withFixture({ mutateDuringIndices: true }, async (root) => {
    await commitFixtureBase(root);
    const configPath = path.join(root, ".skillsrc");
    const configBefore = await fs.readFile(configPath);
    const configWorktreeSha = await git(root, ["hash-object", ".skillsrc"]);
    const mirrorRelPath = ".github/skills/common/common-alpha/SKILL.md";
    const mirrorPath = path.join(root, mirrorRelPath);
    const mirrorBefore = await fs.readFile(mirrorPath);
    const lockPath = path.join(root, ".skills-lock.json");
    const lockBefore = await fs.readFile(lockPath);
    const sourcePath = path.join(
      root,
      "skills",
      "common",
      "common-alpha",
      "SKILL.md",
    );
    await fs.writeFile(
      sourcePath,
      SKILL_ALPHA.replace(
        "Alpha skill",
        "Alpha skill with staged-config drift",
      ),
    );
    const hookLog = await prepareHookJournal(root);

    const result = await withEnv(
      {
        FIXTURE_HOOK_LOG: hookLog,
        FIXTURE_GIT_REPO: root,
        FIXTURE_GIT_INDEX_PATH: ".skillsrc",
      },
      () => runIsolatedGeneration({ repoRoot: root }),
    );

    const indexHook = (await readHookJournal(root)).find(
      (entry) => entry.hook === "stage-index-only",
    );
    assert.ok(
      indexHook,
      "the candidate producer must stage the configuration index change",
    );
    assert.equal(indexHook.detail.path, ".skillsrc");
    const indexBlob = (await git(root, ["ls-files", "-s", "--", ".skillsrc"]))
      .trim()
      .split(/\s+/)[1];
    assert.equal(indexBlob, indexHook.detail.sha);
    assert.notEqual(indexBlob, configWorktreeSha);
    assert.equal(
      (await git(root, ["cat-file", "-p", indexBlob])).trim(),
      "fixture index-only alternate blob",
    );
    await assertRefusedWithoutEffects(result);
    assert.deepEqual(await fs.readFile(configPath), configBefore);
    assert.equal(
      await git(root, ["hash-object", ".skillsrc"]),
      configWorktreeSha,
    );
    assert.deepEqual(await fs.readFile(mirrorPath), mirrorBefore);
    assert.deepEqual(await fs.readFile(lockPath), lockBefore);
    assert.equal(
      (await git(root, ["ls-files", "-s", "--", ".skillsrc"]))
        .trim()
        .split(/\s+/)[1],
      indexBlob,
      "the staged configuration entry survives refusal",
    );
  });
});

const CHANGED_OUTPUT_REL = ".github/skills/common/common-alpha/SKILL.md";
const MUTATED_OUTPUT_REL = ".github/skills/common/common-beta/SKILL.md";

async function prepareIdentityGuardFixture(root: string) {
  const applied = await runIsolatedGeneration({ repoRoot: root });
  assert.equal(applied.success, true, applied.error ?? "");
  const base = await commitFixtureBase(root);
  await fs.remove(path.join(root, ".skills-lock.json"));
  await installIndicesWrapper(root);
  const hookLog = await prepareHookJournal(root);
  await fs.writeFile(
    path.join(root, "skills", "common", "common-alpha", "SKILL.md"),
    SKILL_ALPHA.replace("Alpha skill", "Alpha skill identity boundary"),
  );
  return { base, hookLog };
}

async function stagedIndexLines(root: string, relPath: string) {
  return (await git(root, ["ls-files", "-s", "--", relPath])).trim();
}

test("a Git index mode change on a retained output blocks publication and preserves the staged mode", async () => {
  await withFixture({}, async (root) => {
    const { base, hookLog } = await prepareIdentityGuardFixture(root);

    const result = await withEnv(
      {
        FIXTURE_HOOK_LOG: hookLog,
        FIXTURE_GIT_REPO: root,
        FIXTURE_GIT_INDEX_PATH: MUTATED_OUTPUT_REL,
        FIXTURE_GIT_MUTATION: "mode-executable",
      },
      () => runIsolatedGeneration({ repoRoot: root, adoptBase: base }),
    );

    const mutation = (await readHookJournal(root)).find(
      (entry) => entry.hook === "git-mutation",
    );
    assert.ok(mutation, "the candidate wrapper must record the mode mutation");
    assert.equal(mutation.detail.mutation, "mode-executable");
    assert.equal(mutation.detail.path, MUTATED_OUTPUT_REL);

    await assertRefusedWithoutEffects(result);
    assert.match(result.error ?? "", /identity drifted/);
    const stagedMode = await stagedIndexLines(root, MUTATED_OUTPUT_REL);
    assert.match(
      stagedMode,
      /^100755 /,
      "the staged executable mode must survive refusal",
    );
  });
});

test("a Git index deletion of a retained output blocks publication and preserves the absence", async () => {
  await withFixture({}, async (root) => {
    const { base, hookLog } = await prepareIdentityGuardFixture(root);

    const result = await withEnv(
      {
        FIXTURE_HOOK_LOG: hookLog,
        FIXTURE_GIT_REPO: root,
        FIXTURE_GIT_INDEX_PATH: MUTATED_OUTPUT_REL,
        FIXTURE_GIT_MUTATION: "index-delete",
      },
      () => runIsolatedGeneration({ repoRoot: root, adoptBase: base }),
    );

    const mutation = (await readHookJournal(root)).find(
      (entry) => entry.hook === "git-mutation",
    );
    assert.ok(mutation, "the candidate wrapper must record the deletion");
    assert.equal(mutation.detail.mutation, "index-delete");

    await assertRefusedWithoutEffects(result);
    assert.match(result.error ?? "", /identity drifted/);
    assert.equal(
      (await git(root, ["ls-files", "--", MUTATED_OUTPUT_REL])).trim(),
      "",
      "the index deletion must not be silently reset by the refusal",
    );
  });
});

test("an unsupported symlink index mode on a retained output blocks publication", async () => {
  await withFixture({}, async (root) => {
    const { base, hookLog } = await prepareIdentityGuardFixture(root);

    const result = await withEnv(
      {
        FIXTURE_HOOK_LOG: hookLog,
        FIXTURE_GIT_REPO: root,
        FIXTURE_GIT_INDEX_PATH: MUTATED_OUTPUT_REL,
        FIXTURE_GIT_MUTATION: "index-symlink",
      },
      () => runIsolatedGeneration({ repoRoot: root, adoptBase: base }),
    );

    const mutation = (await readHookJournal(root)).find(
      (entry) => entry.hook === "git-mutation",
    );
    assert.ok(mutation, "the candidate wrapper must record the symlink mode");
    assert.equal(mutation.detail.mutation, "index-symlink");

    await assertRefusedWithoutEffects(result);
    assert.match(result.error ?? "", /identity drifted/);
    const stagedSymlinkMode = await stagedIndexLines(root, MUTATED_OUTPUT_REL);
    assert.match(
      stagedSymlinkMode,
      /^120000 /,
      "the unsupported staged mode must be preserved, not normalized",
    );
  });
});

test("unmerged index stages for a requested path block publication as ambiguous", async () => {
  await withFixture({}, async (root) => {
    const { base, hookLog } = await prepareIdentityGuardFixture(root);

    const result = await withEnv(
      {
        FIXTURE_HOOK_LOG: hookLog,
        FIXTURE_GIT_REPO: root,
        FIXTURE_GIT_INDEX_PATH: MUTATED_OUTPUT_REL,
        FIXTURE_GIT_MUTATION: "unmerged",
      },
      () => runIsolatedGeneration({ repoRoot: root, adoptBase: base }),
    );

    const mutation = (await readHookJournal(root)).find(
      (entry) => entry.hook === "git-mutation",
    );
    assert.ok(
      mutation,
      "the candidate wrapper must record the unmerged stages",
    );
    assert.equal(mutation.detail.mutation, "unmerged");

    await assertRefusedWithoutEffects(result);
    assert.match(result.error ?? "", /ambiguous stages/);
    const unmergedStages = await stagedIndexLines(root, MUTATED_OUTPUT_REL);
    assert.equal(
      unmergedStages.split("\n").length,
      3,
      "all three unmerged stages must survive the refusal",
    );
  });
});

test("an unrelated unusual-name index row changing during generation does not block publication", async () => {
  await withFixture({}, async (root) => {
    const applied = await runIsolatedGeneration({ repoRoot: root });
    assert.equal(applied.success, true, applied.error ?? "");
    const spaceRelPath = ".agents/fixture-unrelated with space.txt";
    const tabRelPath = ".agents/fixture-unrelated\tname.txt";
    await fs.outputFile(path.join(root, spaceRelPath), "unrelated space row\n");
    await fs.outputFile(path.join(root, tabRelPath), "unrelated tab row\n");
    const base = await commitFixtureBase(root);
    await fs.remove(path.join(root, ".skills-lock.json"));
    await installIndicesWrapper(root);
    const hookLog = await prepareHookJournal(root);
    await fs.writeFile(
      path.join(root, "skills", "common", "common-alpha", "SKILL.md"),
      SKILL_ALPHA.replace("Alpha skill", "Alpha skill unrelated row"),
    );

    const result = await withEnv(
      {
        FIXTURE_HOOK_LOG: hookLog,
        FIXTURE_GIT_REPO: root,
        FIXTURE_GIT_UNRELATED_PATH: spaceRelPath,
        FIXTURE_GIT_MUTATION: "unrelated-delete",
      },
      () => runIsolatedGeneration({ repoRoot: root, adoptBase: base }),
    );

    const mutation = (await readHookJournal(root)).find(
      (entry) => entry.hook === "git-mutation",
    );
    assert.ok(
      mutation,
      "the candidate wrapper must record the unrelated change",
    );
    assert.equal(mutation.detail.mutation, "unrelated-delete");
    assert.equal(mutation.detail.unrelated, spaceRelPath);

    assert.equal(result.success, true, result.error ?? "");
    assert.ok(
      result.copiedBackFiles.includes(CHANGED_OUTPUT_REL),
      "the requested output must still publish",
    );
    assert.equal(
      (await git(root, ["ls-files", "--", spaceRelPath])).trim(),
      "",
      "the unrelated index deletion must persist",
    );
    assert.notEqual(
      (await git(root, ["ls-files", "--", tabRelPath])).trim(),
      "",
      "an unrelated tab-containing row must remain parseable and untouched",
    );
  });
});

test("a HEAD change during generation blocks publication", async () => {
  await withFixture({}, async (root) => {
    const { base, hookLog } = await prepareIdentityGuardFixture(root);

    const result = await withEnv(
      {
        FIXTURE_HOOK_LOG: hookLog,
        FIXTURE_GIT_REPO: root,
        FIXTURE_GIT_INDEX_PATH: MUTATED_OUTPUT_REL,
        FIXTURE_GIT_HEAD_DRIFT: "1",
        FIXTURE_GIT_MUTATION: "head-drift",
      },
      () => runIsolatedGeneration({ repoRoot: root, adoptBase: base }),
    );

    const mutation = (await readHookJournal(root)).find(
      (entry) => entry.hook === "git-mutation",
    );
    assert.ok(mutation, "the candidate wrapper must record the HEAD change");
    assert.equal(mutation.detail.mutation, "head-drift");

    await assertRefusedWithoutEffects(result);
    assert.match(result.error ?? "", /HEAD changed during generation/);
    assert.notEqual(
      (await git(root, ["rev-parse", "HEAD"])).trim(),
      base,
      "the fixture HEAD genuinely moved before the refusal",
    );
  });
});
