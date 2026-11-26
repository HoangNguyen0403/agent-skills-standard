import assert from "node:assert/strict";
import fs from "node:fs";
import os from "node:os";
import path from "node:path";
import test from "node:test";
import { UNIVERSAL_SKILL_LOADER_JS } from "../../cli/src/services/HookService";
import { prepareCliReleaseVersion } from "./prepare-cli-release";
import {
  GENERATED_HOOK_PATHS,
  renderHookTemplate,
  syncGeneratedHooks,
} from "./sync-generated-hooks";

const PRE_BUMP_VERSION = "1.2.3";
const NEXT_VERSION = "9.9.9";

/** Compares path sets without pinning report order. */
function assertSamePathSet(
  actual: readonly string[],
  expected: readonly string[],
): void {
  assert.deepEqual([...actual].sort(), [...expected].sort());
}

function withTempRepo(fn: (root: string) => Promise<void>): Promise<void> {
  const root = fs.mkdtempSync(path.join(os.tmpdir(), "prepare-cli-release-"));
  return fn(root).finally(() => {
    fs.rmSync(root, { recursive: true, force: true });
  });
}

/** Seeds a minimal CLI checkout whose hook copies match the pre-bump version. */
function seedRepo(root: string): string {
  fs.mkdirSync(path.join(root, "cli/src"), { recursive: true });
  fs.writeFileSync(
    path.join(root, "cli/package.json"),
    `${JSON.stringify(
      { name: "agent-skills-standard", version: PRE_BUMP_VERSION },
      null,
      2,
    )}\n`,
  );
  fs.writeFileSync(
    path.join(root, "cli/src/index.ts"),
    `program.version('${PRE_BUMP_VERSION}').name('ags');\n`,
  );

  const installed = renderHookTemplate(
    UNIVERSAL_SKILL_LOADER_JS,
    PRE_BUMP_VERSION,
  );
  for (const relPath of GENERATED_HOOK_PATHS) {
    const absPath = path.join(root, relPath);
    fs.mkdirSync(path.dirname(absPath), { recursive: true });
    fs.writeFileSync(absPath, installed);
  }
  return installed;
}

test("preparing a version bump rewrites every generated hook copy from the canonical template", async () => {
  await withTempRepo(async (root) => {
    const previousBytes = seedRepo(root);

    const result = await prepareCliReleaseVersion(root, NEXT_VERSION);

    assertSamePathSet(result.written, GENERATED_HOOK_PATHS);
    assert.deepEqual(result.unchanged, []);

    const expectedBytes = renderHookTemplate(
      UNIVERSAL_SKILL_LOADER_JS,
      NEXT_VERSION,
    );
    assert.notEqual(expectedBytes, previousBytes);
    for (const relPath of GENERATED_HOOK_PATHS) {
      const installed = fs.readFileSync(path.join(root, relPath), "utf8");
      assert.equal(installed, expectedBytes, `${relPath} must carry the new version`);
      assert.match(installed, /^\/\/ ags-hook-version: 9\.9\.9$/m);
    }

    const pkg = JSON.parse(
      fs.readFileSync(path.join(root, "cli/package.json"), "utf8"),
    ) as { version: string };
    assert.equal(pkg.version, NEXT_VERSION);
  });
});

test("preparation replaces drifted hook bodies, not only the version marker", async () => {
  await withTempRepo(async (root) => {
    seedRepo(root);
    const driftedPath = path.join(root, GENERATED_HOOK_PATHS[1]);
    fs.appendFileSync(driftedPath, "\n// stale body drift\n");

    await prepareCliReleaseVersion(root, NEXT_VERSION);

    assert.equal(
      fs.readFileSync(driftedPath, "utf8"),
      renderHookTemplate(UNIVERSAL_SKILL_LOADER_JS, NEXT_VERSION),
    );
  });
});

test("repeat preparation of the same version leaves hook bytes untouched", async () => {
  await withTempRepo(async (root) => {
    seedRepo(root);
    await prepareCliReleaseVersion(root, NEXT_VERSION);
    const firstPass = GENERATED_HOOK_PATHS.map((relPath) =>
      fs.readFileSync(path.join(root, relPath), "utf8"),
    );

    const secondPass = await prepareCliReleaseVersion(root, NEXT_VERSION);

    assert.deepEqual(secondPass.written, []);
    assertSamePathSet(secondPass.unchanged, GENERATED_HOOK_PATHS);
    assert.deepEqual(
      GENERATED_HOOK_PATHS.map((relPath) =>
        fs.readFileSync(path.join(root, relPath), "utf8"),
      ),
      firstPass,
    );
  });
});

test("a template without a version marker is rejected without writing hooks", async () => {
  await withTempRepo(async (root) => {
    const previousBytes = seedRepo(root);

    await assert.rejects(
      syncGeneratedHooks({
        rootDir: root,
        version: NEXT_VERSION,
        template: "#!/usr/bin/env node\n// no version marker\n",
      }),
      /ags-hook-version marker/,
    );

    for (const relPath of GENERATED_HOOK_PATHS) {
      assert.equal(
        fs.readFileSync(path.join(root, relPath), "utf8"),
        previousBytes,
      );
    }
  });
});
