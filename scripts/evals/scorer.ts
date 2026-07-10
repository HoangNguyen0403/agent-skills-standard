import fs from 'fs-extra';
import * as path from 'path';
import { SKILLS_DIR, RESULTS_FILENAME, TRIGGER_MARKER_REGEX } from './constants';
import { loadManifest, saveManifest } from './manifest';
import {
  Assertion,
  ArmName,
  CaseScore,
  Manifest,
  RunResults,
  SkillResult,
} from './types';

interface SkillEvalCase {
  id: number;
  prompt: string;
  assertions?: Assertion[];
}

interface PressureScenario {
  prompt?: string;
  behavior_assertions?: string[];
}

interface EvalsJson {
  evals?: SkillEvalCase[];
  should_not_trigger?: string[];
  pressure_scenarios?: PressureScenario[];
}

function readAnswer(
  answersDir: string,
  skillName: string,
  caseId: string,
  arm?: ArmName,
): { text: string | null; filePath: string } {
  const filename = arm ? `${caseId}.${arm}.md` : `${caseId}.md`;
  const filePath = path.join(answersDir, skillName, filename);
  if (!fs.existsSync(filePath)) return { text: null, filePath };
  return { text: fs.readFileSync(filePath, 'utf-8'), filePath };
}

function checkAssertion(assertion: Assertion, transcript: string): boolean {
  const haystack = transcript.toLowerCase();
  const needle = assertion.value.toLowerCase();
  switch (assertion.type) {
    case 'contains':
      return haystack.includes(needle);
    case 'not_contains':
      return !haystack.includes(needle);
    case 'file_reference': {
      const basename = path.basename(assertion.value).toLowerCase();
      return haystack.includes(needle) || haystack.includes(basename);
    }
    default:
      return false;
  }
}

/** Flags transcripts that look copy-pasted from the reference material rather than agent-generated. */
function detectSuspicious(transcript: string, expectedOutput?: string): string[] {
  const flags: string[] = [];
  if (expectedOutput && expectedOutput.length > 30) {
    if (transcript.toLowerCase().includes(expectedOutput.toLowerCase())) {
      flags.push('transcript reproduces expected_output verbatim');
    }
  }
  if (transcript.trim().length < 10) {
    flags.push('transcript is suspiciously short (<10 chars)');
  }
  return flags;
}

function scoreEvalCase(
  transcript: string,
  assertions: Assertion[],
  expectedOutput: string | undefined,
  arm: ArmName,
  id: string,
  kind: 'eval' | 'pressure',
): CaseScore {
  const failedAssertions = assertions
    .filter((a) => !checkAssertion(a, transcript))
    .map((a) => `${a.type}:${a.value}`);
  return {
    id,
    kind,
    arm,
    passed: failedAssertions.length === 0,
    missingAnswer: false,
    suspicious: detectSuspicious(transcript, expectedOutput),
    failedAssertions,
  };
}

function scoreTriggerCase(transcript: string, id: string): CaseScore {
  const match = transcript.match(TRIGGER_MARKER_REGEX);
  const passed = !!match && match[1].toLowerCase() === 'no';
  return {
    id,
    kind: 'trigger',
    arm: 'with-skill',
    passed,
    missingAnswer: false,
    suspicious: match
      ? []
      : ['answer missing required "TRIGGER: yes|no" marker line'],
    failedAssertions: passed ? [] : ['trigger marker did not say "no"'],
  };
}

export function scoreRun(runDir: string): RunResults {
  const manifest: Manifest = loadManifest(runDir);
  const answersDir = path.join(runDir, 'answers');
  const skillResults: SkillResult[] = [];

  for (const manifestSkill of manifest.skills) {
    const evalsPath = path.join(
      SKILLS_DIR,
      manifestSkill.category,
      manifestSkill.skillName,
      'evals',
      'evals.json',
    );
    const evalsData: EvalsJson = fs.existsSync(evalsPath)
      ? fs.readJSONSync(evalsPath)
      : {};
    const evalById = new Map((evalsData.evals || []).map((e) => [e.id, e]));
    const pressureByIndex = evalsData.pressure_scenarios || [];

    const scores: CaseScore[] = [];
    const incompleteArms: string[] = [];

    for (const c of manifestSkill.cases) {
      if (c.kind === 'trigger') {
        const { text, filePath } = readAnswer(
          answersDir,
          manifestSkill.skillName,
          c.id,
        );
        if (!text) {
          incompleteArms.push(`${c.id}`);
          c.arms['with-skill'] = 'pending';
          continue;
        }
        c.arms['with-skill'] = 'done';
        scores.push(scoreTriggerCase(text, c.id));
        void filePath;
        continue;
      }

      const arms: ArmName[] = ['baseline', 'with-skill'];
      for (const arm of arms) {
        if (!(arm in c.arms)) continue;
        const { text } = readAnswer(
          answersDir,
          manifestSkill.skillName,
          c.id,
          arm,
        );
        if (!text) {
          incompleteArms.push(`${c.id}.${arm}`);
          c.arms[arm] = 'pending';
          continue;
        }
        c.arms[arm] = 'done';

        if (c.kind === 'eval') {
          const evalId = parseInt(c.id.replace('eval-', ''), 10);
          const evalCase = evalById.get(evalId);
          scores.push(
            scoreEvalCase(
              text,
              evalCase?.assertions || [],
              (evalCase as { expected_output?: string } | undefined)
                ?.expected_output,
              arm,
              c.id,
              'eval',
            ),
          );
        } else if (c.kind === 'pressure') {
          const idx = parseInt(c.id.replace('pressure-', ''), 10) - 1;
          const scenario = pressureByIndex[idx];
          const behaviorAssertions: Assertion[] = (
            scenario?.behavior_assertions || []
          ).map((v) => ({ type: 'contains', value: v }));
          scores.push(
            scoreEvalCase(text, behaviorAssertions, undefined, arm, c.id, 'pressure'),
          );
        }
      }
    }

    const scorable = scores.filter((s) => s.kind !== 'trigger');
    const baselineScores = scorable.filter((s) => s.arm === 'baseline');
    const withSkillScores = scorable.filter((s) => s.arm === 'with-skill');
    const passRate = (arr: CaseScore[]) =>
      arr.length > 0 ? arr.filter((s) => s.passed).length / arr.length : 0;
    const triggerScores = scores.filter((s) => s.kind === 'trigger');

    skillResults.push({
      category: manifestSkill.category,
      skillName: manifestSkill.skillName,
      guardrailApplicable: manifestSkill.guardrailApplicable,
      totalEvalCases: manifestSkill.cases.length,
      baselinePassRate: passRate(baselineScores),
      withSkillPassRate: passRate(withSkillScores),
      delta: passRate(withSkillScores) - passRate(baselineScores),
      triggerPrecision:
        triggerScores.length > 0 ? passRate(triggerScores) : null,
      scores,
      incompleteArms,
    });
  }

  saveManifest(runDir, manifest);

  const results: RunResults = {
    runId: manifest.runId,
    category: manifest.category,
    version: manifest.version,
    scoredAt: new Date().toISOString(),
    metadata: manifest.metadata,
    skills: skillResults,
  };

  fs.writeJSONSync(path.join(runDir, RESULTS_FILENAME), results, {
    spaces: 2,
  });

  return results;
}
