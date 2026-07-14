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

  it('verifies v2 aggregate answer paths and immutable input definitions', async () => {
    const v2Root = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-cli-evals-v2-'));
    const skillDir = path.join(v2Root, 'skills', 'dart', 'dart-tooling');
    const runId = 'all-v2-9.9.9-2099-01-01-test';
    const runDir = path.join(v2Root, 'benchmarks', 'evals', 'runs', runId);
    await fs.ensureDir(path.join(skillDir, 'evals'));
    await fs.writeJson(path.join(skillDir, 'evals', 'evals.json'), {
      evals: [{ id: 1, prompt: 'changed', assertions: [{ type: 'contains', value: 'changed' }] }],
    });
    await fs.ensureDir(path.join(runDir, 'answers', 'dart', 'dart-tooling'));
    await fs.writeJson(path.join(runDir, 'manifest.json'), {
      schemaVersion: 2,
      runId,
      category: 'all',
      version: '9.9.9',
      metadata: {},
      scope: { kind: 'all', categories: ['dart'] },
      protocol: {
        isolation: 'worker-per-arm',
        baseline: 'prompt-only',
        withSkill: 'prompt-plus-skill',
        trigger: 'name-description-only',
      },
      sourceHashes: { 'dart/dart-tooling': { skill: 'old', evals: 'old' } },
      compromisedSkills: [],
      skills: [{
        category: 'dart',
        skillName: 'dart-tooling',
        skillPath: 'skills/dart/dart-tooling/SKILL.md',
        guardrailApplicable: false,
        cases: [{ id: 'eval-1', kind: 'eval', arms: { baseline: 'done', 'with-skill': 'done' } }],
      }],
    });
    await fs.writeJson(path.join(runDir, 'inputs.json'), {
      schemaVersion: 2,
      runId,
      capturedAt: '2099-01-01T00:00:00.000Z',
      sources: {
        'dart/dart-tooling': {
          category: 'dart',
          skillName: 'dart-tooling',
          skillPath: 'skills/dart/dart-tooling/SKILL.md',
          evalsPath: 'skills/dart/dart-tooling/evals/evals.json',
          hashes: { skill: 'old', evals: 'old' },
          skillMarkdown: 'old skill',
          evals: { evals: [{ id: 1, assertions: [{ type: 'contains', value: 'answer' }] }] },
        },
      },
    });
    await fs.writeFile(path.join(runDir, 'answers', 'dart', 'dart-tooling', 'eval-1.baseline.md'), 'generic formatter guidance');
    await fs.writeFile(path.join(runDir, 'answers', 'dart', 'dart-tooling', 'eval-1.with-skill.md'), 'answer with formatter guidance');
    await fs.writeJson(path.join(runDir, 'results.json'), {
      schemaVersion: 2,
      runId,
      category: 'all',
      version: '9.9.9',
      scoredAt: '2099-01-01T00:00:00.000Z',
      metadata: {},
      scope: { kind: 'all', categories: ['dart'] },
      skills: [{
        category: 'dart',
        skillName: 'dart-tooling',
        baselinePassRate: 0,
        withSkillPassRate: 1,
        delta: 1,
        casePassRate: { baseline: 0, withSkill: 1 },
        assertionPassRate: { baseline: 0, withSkill: 1 },
        triggerRecall: null,
        triggerSpecificity: null,
        balancedTriggerAccuracy: null,
      }],
    });

    expect(verifyEvalRun(v2Root, runId).ok).toBe(true);
    await fs.remove(v2Root);
  });
});
