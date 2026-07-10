import fs from 'fs-extra';
import os from 'os';
import * as path from 'path';
import { afterEach, beforeEach, describe, expect, it, vi } from 'vitest';
import { EvalsCommand } from '../evals';

describe('EvalsCommand', () => {
  let root: string;
  let exitMock: any;
  let logSpy: any;

  beforeEach(async () => {
    root = await fs.mkdtemp(path.join(os.tmpdir(), 'ags-evals-cmd-'));
    exitMock = vi.spyOn(process, 'exit').mockImplementation((() => {}) as any);
    logSpy = vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  afterEach(async () => {
    exitMock.mockRestore();
    logSpy.mockRestore();
    await fs.remove(root);
  });

  it('rejects an unknown action', async () => {
    const errorSpy = vi.spyOn(console, 'error').mockImplementation(() => {});
    const cmd = new EvalsCommand();
    await cmd.run('bogus', {}, root);
    expect(errorSpy).toHaveBeenCalledWith(
      expect.stringContaining('Unknown evals action'),
    );
    expect(exitMock).toHaveBeenCalledWith(1);
    errorSpy.mockRestore();
  });

  describe('verify', () => {
    it('reports guidance and does not fail when no runs exist', async () => {
      const cmd = new EvalsCommand();
      await cmd.run('verify', {}, root);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('No eval runs found'),
      );
      expect(exitMock).not.toHaveBeenCalled();
    });

    it('verifies a committed run and does not exit on success', async () => {
      const runId = 'dart-v9.9.9-2099-01-01';
      const skillDir = path.join(root, 'skills', 'dart', 'dart-tooling');
      await fs.ensureDir(path.join(skillDir, 'evals'));
      await fs.writeJson(path.join(skillDir, 'evals', 'evals.json'), {
        skill_name: 'dart-tooling',
        evals: [
          {
            id: 1,
            prompt: 'p',
            assertions: [{ type: 'contains', value: 'dart format' }],
          },
        ],
      });
      const runDir = path.join(root, 'benchmarks', 'evals', 'runs', runId);
      await fs.ensureDir(path.join(runDir, 'answers', 'dart-tooling'));
      await fs.writeJson(path.join(runDir, 'manifest.json'), {
        runId,
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
        'no mention',
      );
      await fs.writeFile(
        path.join(runDir, 'answers', 'dart-tooling', 'eval-1.with-skill.md'),
        'run dart format now',
      );
      await fs.writeJson(path.join(runDir, 'results.json'), {
        runId,
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

      const cmd = new EvalsCommand();
      await cmd.run('verify', { run: runId }, root);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('verified'));
      expect(exitMock).not.toHaveBeenCalled();
    });
  });

  describe('report', () => {
    it('guides the user when no report exists yet', async () => {
      const cmd = new EvalsCommand();
      await cmd.run('report', {}, root);
      expect(logSpy).toHaveBeenCalledWith(
        expect.stringContaining('No evals-report.md found'),
      );
    });

    it('prints the report when present', async () => {
      await fs.writeFile(path.join(root, 'evals-report.md'), '# Live Evals\n');
      const cmd = new EvalsCommand();
      await cmd.run('report', {}, root);
      expect(logSpy).toHaveBeenCalledWith(expect.stringContaining('# Live Evals'));
    });
  });
});
