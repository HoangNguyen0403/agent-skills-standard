import assert from 'node:assert/strict';
import fs from 'node:fs';
import os from 'node:os';
import path from 'node:path';
import { runStage, deriveAllowlist, classifyAllowlistedPath } from './prepare-exports.mjs';
const root = process.cwd();
const temp = fs.mkdtempSync(path.join(os.tmpdir(), 'ags-export-guards-'));
try {
  fs.writeFileSync(path.join(temp, 'sentinel'), 'preserve');
  const link = `${temp}-link`;
  fs.symlinkSync(temp, link);
  const dangling = `${temp}-dangling`;
  const alias = `${temp}-alias`;
  fs.symlinkSync(path.join(temp, 'missing'), dangling);
  fs.symlinkSync(root, alias);
  try {
    for (const [name, stageDir] of [['same-root', root], ['inside-root', path.join(root, 'artifacts', 'unsafe-stage')], ['nonempty', temp], ['symlink', link], ['dangling', dangling], ['ancestor-alias', path.join(alias, 'artifacts', 'unsafe-stage')]]) {
      await assert.rejects(runStage({ repoRoot: root, stageDir, snapshotOutPath: path.join(temp, 'unexpected-snapshot'), logsDir: path.join(temp, 'unexpected-logs') }), /GUARD FAILURE/, name);
      assert.equal(fs.existsSync(path.join(temp, 'unexpected-snapshot')), false);
      console.log(`${name}: rejected before snapshot/generator execution`);
    }
    assert.equal(fs.readFileSync(path.join(temp, 'sentinel'), 'utf8'), 'preserve');
    const allowed = deriveAllowlist({ agents: ['copilot', 'antigravity', 'codex', 'claude'] });
    for (const candidate of ['../escape', '/tmp/escape', '.agents/workflows/test-loop.md', '.claude/skills/common/common-tdd/evals/evals.json', '.claude/skills/common/common-tdd/references//bad.md', 'docs/ai-test-assurance.md']) {
      assert.throws(() => classifyAllowlistedPath(candidate, allowed));
      console.log(`copy authority refused: ${candidate}`);
    }
    for (const candidate of ['.claude/skills/common/common-tdd/references/quality-contract.md', '.github/prompts/test-loop.prompt.md']) {
      assert.equal(classifyAllowlistedPath(candidate, allowed).relPath, candidate);
    }
  } finally { fs.unlinkSync(link); fs.unlinkSync(dangling); fs.unlinkSync(alias); }
} finally { fs.rmSync(temp, { recursive: true, force: true }); }
