import fs from 'fs-extra';
import * as path from 'path';

/**
 * Self-contained re-implementation of the live eval-run scorer
 * (scripts/evals/scorer.ts in the agent-skills-standard monorepo) for use
 * from the standalone, separately-published CLI package. It intentionally
 * duplicates the small scoring algorithm rather than importing across the
 * package boundary (the same tradeoff made in
 * mcp/src/services/EvalsIndex.ts), so this package has no dependency on
 * repo-root tooling that isn't distributed with it. Keep all three in sync
 * if the assertion semantics change — see docs/EVALS.md in the source repo.
 *
 * Trigger cases are intentionally excluded here — verification only
 * recomputes eval/pressure pass rates, since that's all committed
 * results.json compares against.
 */

interface Assertion {
  type: 'contains' | 'not_contains' | 'file_reference';
  value: string;
}

interface EvalCaseRef {
  id: string;
  kind: 'eval' | 'trigger' | 'pressure';
  arms: Partial<Record<'baseline' | 'with-skill', 'pending' | 'done'>>;
}

interface ManifestSkill {
  category: string;
  skillName: string;
  cases: EvalCaseRef[];
}

interface Manifest {
  runId: string;
  category: string;
  version: string;
  metadata: Record<string, unknown>;
  skills: ManifestSkill[];
}

interface SkillEvalCase {
  id: number;
  assertions?: Assertion[];
}

interface PressureScenario {
  behavior_assertions?: string[];
}

interface EvalsJson {
  evals?: SkillEvalCase[];
  pressure_scenarios?: PressureScenario[];
}

export interface EvalsVerifyOutcome {
  runId: string;
  ok: boolean;
  reason?: string;
  diffs?: string[];
}

function checkAssertion(assertion: Assertion, transcript: string): boolean {
  const haystack = transcript.toLowerCase();
  const needle = assertion.value.toLowerCase();
  if (assertion.type === 'not_contains') return !haystack.includes(needle);
  if (assertion.type === 'file_reference') {
    const basename = path.basename(assertion.value).toLowerCase();
    return haystack.includes(needle) || haystack.includes(basename);
  }
  return haystack.includes(needle);
}

function readAnswer(
  answersDir: string,
  skillName: string,
  caseId: string,
  arm?: 'baseline' | 'with-skill',
): string | null {
  const filename = arm ? `${caseId}.${arm}.md` : `${caseId}.md`;
  const filePath = path.join(answersDir, skillName, filename);
  return fs.existsSync(filePath) ? fs.readFileSync(filePath, 'utf8') : null;
}

function passRate(results: boolean[]): number {
  return results.length > 0
    ? results.filter(Boolean).length / results.length
    : 0;
}

function recomputeSkillRates(
  runDir: string,
  skillsDir: string,
  skill: ManifestSkill,
): { baselinePassRate: number; withSkillPassRate: number } {
  const answersDir = path.join(runDir, 'answers');
  const evalsPath = path.join(
    skillsDir,
    skill.category,
    skill.skillName,
    'evals',
    'evals.json',
  );
  const evalsData: EvalsJson = fs.existsSync(evalsPath)
    ? fs.readJSONSync(evalsPath)
    : {};
  const evalById = new Map((evalsData.evals || []).map((e) => [e.id, e]));
  const pressureByIndex = evalsData.pressure_scenarios || [];

  const baseline: boolean[] = [];
  const withSkill: boolean[] = [];

  for (const c of skill.cases) {
    if (c.kind === 'trigger') continue;

    const arms: Array<'baseline' | 'with-skill'> = ['baseline', 'with-skill'];
    for (const arm of arms) {
      if (!(arm in c.arms)) continue;
      const text = readAnswer(answersDir, skill.skillName, c.id, arm);
      if (!text) continue;

      let assertions: Assertion[] = [];
      if (c.kind === 'eval') {
        const evalId = parseInt(c.id.replace('eval-', ''), 10);
        assertions = evalById.get(evalId)?.assertions || [];
      } else if (c.kind === 'pressure') {
        const idx = parseInt(c.id.replace('pressure-', ''), 10) - 1;
        assertions = (pressureByIndex[idx]?.behavior_assertions || []).map(
          (v) => ({ type: 'contains' as const, value: v }),
        );
      }
      const passed = assertions.every((a) => checkAssertion(a, text));
      (arm === 'baseline' ? baseline : withSkill).push(passed);
    }
  }

  return {
    baselinePassRate: passRate(baseline),
    withSkillPassRate: passRate(withSkill),
  };
}

export function verifyEvalRun(
  projectRoot: string,
  runId: string,
): EvalsVerifyOutcome {
  const runDir = path.join(projectRoot, 'benchmarks', 'evals', 'runs', runId);
  const resultsPath = path.join(runDir, 'results.json');
  const manifestPath = path.join(runDir, 'manifest.json');
  const skillsDir = path.join(projectRoot, 'skills');

  if (!fs.existsSync(runDir)) {
    return { runId, ok: false, reason: `run directory not found: ${runDir}` };
  }
  if (!fs.existsSync(resultsPath) || !fs.existsSync(manifestPath)) {
    return {
      runId,
      ok: false,
      reason: 'run is missing manifest.json or results.json',
    };
  }

  const manifest: Manifest = fs.readJSONSync(manifestPath);
  const committed = fs.readJSONSync(resultsPath) as {
    skills: Array<{
      skillName: string;
      baselinePassRate: number;
      withSkillPassRate: number;
    }>;
  };

  const diffs: string[] = [];
  for (const skill of manifest.skills) {
    const recomputed = recomputeSkillRates(runDir, skillsDir, skill);
    const committedSkill = committed.skills.find(
      (s) => s.skillName === skill.skillName,
    );
    if (!committedSkill) {
      diffs.push(`${skill.skillName}: missing from committed results.json`);
      continue;
    }
    if (committedSkill.baselinePassRate !== recomputed.baselinePassRate) {
      diffs.push(
        `${skill.skillName}: baselinePassRate committed=${committedSkill.baselinePassRate} recomputed=${recomputed.baselinePassRate}`,
      );
    }
    if (committedSkill.withSkillPassRate !== recomputed.withSkillPassRate) {
      diffs.push(
        `${skill.skillName}: withSkillPassRate committed=${committedSkill.withSkillPassRate} recomputed=${recomputed.withSkillPassRate}`,
      );
    }
  }

  if (diffs.length > 0) {
    return {
      runId,
      ok: false,
      reason: 'recomputed scores differ from committed results.json',
      diffs,
    };
  }
  return { runId, ok: true };
}

export function listEvalRuns(projectRoot: string): string[] {
  const runsDir = path.join(projectRoot, 'benchmarks', 'evals', 'runs');
  if (!fs.existsSync(runsDir)) return [];
  return fs
    .readdirSync(runsDir, { withFileTypes: true })
    .filter((e) => e.isDirectory())
    .map((e) => e.name);
}

export function readEvalsReport(projectRoot: string): string | null {
  const reportPath = path.join(projectRoot, 'evals-report.md');
  return fs.existsSync(reportPath)
    ? fs.readFileSync(reportPath, 'utf8')
    : null;
}
