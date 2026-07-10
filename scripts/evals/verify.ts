import fs from 'fs-extra';
import * as path from 'path';
import { RESULTS_FILENAME, RUNS_DIR } from './constants';
import { scoreRun } from './scorer';
import { RunResults } from './types';

export interface VerifyOutcome {
  runId: string;
  ok: boolean;
  reason?: string;
  diffs?: string[];
}

/** Strips fields that legitimately change between scoring passes (timestamps). */
function normalize(results: RunResults): unknown {
  const { scoredAt: _scoredAt, ...rest } = results;
  void _scoredAt;
  return rest;
}

function diffSkillResults(
  committed: RunResults,
  recomputed: RunResults,
): string[] {
  const diffs: string[] = [];
  const a = JSON.stringify(normalize(committed));
  const b = JSON.stringify(normalize(recomputed));
  if (a === b) return diffs;

  const committedBySkill = new Map(
    committed.skills.map((s) => [s.skillName, s]),
  );
  for (const rs of recomputed.skills) {
    const cs = committedBySkill.get(rs.skillName);
    if (!cs) {
      diffs.push(`${rs.skillName}: present in recomputed but not in committed results.json`);
      continue;
    }
    if (cs.baselinePassRate !== rs.baselinePassRate) {
      diffs.push(
        `${rs.skillName}: baselinePassRate committed=${cs.baselinePassRate} recomputed=${rs.baselinePassRate}`,
      );
    }
    if (cs.withSkillPassRate !== rs.withSkillPassRate) {
      diffs.push(
        `${rs.skillName}: withSkillPassRate committed=${cs.withSkillPassRate} recomputed=${rs.withSkillPassRate}`,
      );
    }
    if (cs.triggerPrecision !== rs.triggerPrecision) {
      diffs.push(
        `${rs.skillName}: triggerPrecision committed=${cs.triggerPrecision} recomputed=${rs.triggerPrecision}`,
      );
    }
  }
  if (diffs.length === 0) {
    diffs.push('results differ in a field not covered by per-skill checks above — inspect results.json directly');
  }
  return diffs;
}

export function verifyRun(runId: string): VerifyOutcome {
  const runDir = path.join(RUNS_DIR, runId);
  const resultsPath = path.join(runDir, RESULTS_FILENAME);
  if (!fs.existsSync(runDir)) {
    return { runId, ok: false, reason: `run directory not found: ${runDir}` };
  }
  if (!fs.existsSync(resultsPath)) {
    return { runId, ok: false, reason: `no committed results.json at ${resultsPath}` };
  }

  const committed: RunResults = fs.readJSONSync(resultsPath);
  const recomputed = scoreRun(runDir);

  // scoreRun overwrites results.json as a side effect of manifest bookkeeping;
  // restore the committed file so `verify` is read-only from the caller's POV.
  fs.writeJSONSync(resultsPath, committed, { spaces: 2 });

  const diffs = diffSkillResults(committed, recomputed);
  if (diffs.length > 0) {
    return { runId, ok: false, reason: 'recomputed scores differ from committed results.json', diffs };
  }

  const anySuspicious = recomputed.skills.some((s) =>
    s.scores.some((sc) => sc.suspicious.length > 0),
  );
  if (anySuspicious) {
    const flagged = recomputed.skills
      .flatMap((s) =>
        s.scores
          .filter((sc) => sc.suspicious.length > 0)
          .map((sc) => `${s.skillName}/${sc.id}.${sc.arm}: ${sc.suspicious.join('; ')}`),
      );
    return {
      runId,
      ok: false,
      reason: 'transcripts flagged as suspicious (possible copy-paste from expected_output)',
      diffs: flagged,
    };
  }

  return { runId, ok: true };
}

export function verifyAllRuns(): VerifyOutcome[] {
  if (!fs.existsSync(RUNS_DIR)) return [];
  const runIds = fs
    .readdirSync(RUNS_DIR, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
  return runIds.map(verifyRun);
}
