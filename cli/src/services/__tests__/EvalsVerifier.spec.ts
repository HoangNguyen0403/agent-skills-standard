import fs from 'fs-extra';
import os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  listEvalRuns,
  readEvalsReport,
  verifyEvalRun,
} from '../EvalsVerifier';

const RUN_ID = 'dart-v9.9.9-2099-01-01';

async function fixture(): Promise<{ root: string; cleanup: () => Promise<void> }> {
  const root = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-cli-evals-fixture-'));
  const skillDir = path.join(root, 'skills', 'dart', 'dart-tooling');
  await fs.ensureDir(path.join(skillDir, 'evals'));
  await fs.writeJson(path.join(skillDir, 'evals', 'evals.json'), {
    skill_name: 'dart-tooling',
    evals: [
      {
        id: 1,
        prompt: 'some prompt',
        assertions: [{ type: 'contains', value: 'dart format' }],
      },
    ],
  });

  const runDir = path.join(root, 'benchmarks', 'evals', 'runs', RUN_ID);
  await fs.ensureDir(path.join(runDir, 'answers', 'dart-tooling'));
  await fs.writeJson(path.join(runDir, 'manifest.json'), {
    runId: RUN_ID,
    category: 'dart',
    version: '9.9.9',
    metadata: {},
    skills: [
      {
        category: 'dart',
        skillName: 'dart-tooling',
        cases: [
          {
            id: 'eval-1',
            kind: 'eval',
            arms: { baseline: 'done', 'with-skill': 'done' },
          },
        ],
      },
    ],
  });
  await fs.writeFile(
    path.join(runDir, 'answers', 'dart-tooling', 'eval-1.baseline.md'),
    'just run the formatter somehow',
  );
  await fs.writeFile(
    path.join(runDir, 'answers', 'dart-tooling', 'eval-1.with-skill.md'),
    'run dart format . --line-length 80',
  );
  await fs.writeJson(path.join(runDir, 'results.json'), {
    runId: RUN_ID,
    category: 'dart',
    version: '9.9.9',
    scoredAt: new Date().toISOString(),
    metadata: {},
    skills: [
      {
        category: 'dart',
        skillName: 'dart-tooling',
        guardrailApplicable: false,
        totalEvalCases: 1,
        baselinePassRate: 0,
        withSkillPassRate: 1,
        delta: 1,
        triggerPrecision: null,
        scores: [],
        incompleteArms: [],
      },
    ],
  });

  return { root, cleanup: () => fs.remove(root) };
}

describe('EvalsVerifier', () => {
  let root: string;
  let cleanup: () => Promise<void>;

  beforeEach(async () => {
    const f = await fixture();
    root = f.root;
    cleanup = f.cleanup;
  });

  afterEach(async () => {
    await cleanup();
  });

  it('listEvalRuns finds committed runs', () => {
    expect(listEvalRuns(root)).toEqual([RUN_ID]);
  });

  it('listEvalRuns returns [] when no runs dir exists', async () => {
    const empty = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-cli-empty-'));
    expect(listEvalRuns(empty)).toEqual([]);
    await fs.remove(empty);
  });

  it('verifyEvalRun passes when recomputed scores match committed results.json', () => {
    expect(verifyEvalRun(root, RUN_ID).ok).toBe(true);
  });

  it('verifyEvalRun fails when a transcript is tampered with after scoring', async () => {
    const runDir = path.join(root, 'benchmarks', 'evals', 'runs', RUN_ID);
    await fs.writeFile(
      path.join(runDir, 'answers', 'dart-tooling', 'eval-1.baseline.md'),
      'actually mentions dart format now',
    );
    const outcome = verifyEvalRun(root, RUN_ID);
    expect(outcome.ok).toBe(false);
    expect(outcome.diffs?.[0]).toContain('dart-tooling');
  });

  it('verifyEvalRun fails cleanly for an unknown run id', () => {
    const outcome = verifyEvalRun(root, 'does-not-exist');
    expect(outcome.ok).toBe(false);
    expect(outcome.reason).toMatch(/not found/);
  });

  it('readEvalsReport returns null when evals-report.md is absent', () => {
    expect(readEvalsReport(root)).toBeNull();
  });

  it('readEvalsReport returns file contents when present', async () => {
    await fs.writeFile(path.join(root, 'evals-report.md'), '# Live Evals\n');
    expect(readEvalsReport(root)).toContain('# Live Evals');
  });
});
