import fs from 'fs-extra';
import * as path from 'path';
import { isGuardrailApplicable } from '../benchmark/utils';
import { METADATA_PATH, RUNS_DIR, SKILLS_DIR, MANIFEST_FILENAME } from './constants';
import { EvalCaseRef, Manifest, ManifestSkill } from './types';

interface SkillEvalAssertion {
  type: string;
  value: string;
}

interface SkillEvalCase {
  id: number;
  prompt: string;
  assertions?: SkillEvalAssertion[];
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

function slugRunId(category: string, version: string): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${category}-v${version}-${date}`;
}

function triggerPromptBody(skillName: string, prompt: string): string {
  return [
    `# Trigger-precision check for \`${skillName}\``,
    '',
    'Below is a task prompt. Based ONLY on the skill\'s name and one-line description (as shown by your skill router / `list_categories` / `SKILL.md` frontmatter — do NOT open the full skill body), decide whether this specific skill should activate for this prompt.',
    '',
    '> ' + prompt,
    '',
    'Answer with exactly one line in the form `TRIGGER: yes` or `TRIGGER: no`, followed by a one-sentence justification on the next line.',
  ].join('\n');
}

function evalPromptBody(prompt: string): string {
  return prompt;
}

function pressurePromptBody(prompt: string): string {
  return prompt;
}

export function buildManifest(
  category: string,
  version: string,
): { manifest: Manifest; runDir: string } {
  const categoryDir = path.join(SKILLS_DIR, category);
  if (!fs.existsSync(categoryDir)) {
    throw new Error(`Unknown category: ${category}`);
  }

  const runId = slugRunId(category, version);
  const runDir = path.join(RUNS_DIR, runId);
  const promptsDir = path.join(runDir, 'prompts');
  const answersDir = path.join(runDir, 'answers');
  fs.ensureDirSync(promptsDir);
  fs.ensureDirSync(answersDir);

  const skillDirs = fs
    .readdirSync(categoryDir, { withFileTypes: true })
    .filter((e) => e.isDirectory());

  const manifestSkills: ManifestSkill[] = [];

  for (const entry of skillDirs) {
    const skillName = entry.name;
    const skillMdPath = path.join(categoryDir, skillName, 'SKILL.md');
    const evalsPath = path.join(categoryDir, skillName, 'evals', 'evals.json');
    if (!fs.existsSync(skillMdPath) || !fs.existsSync(evalsPath)) continue;

    const skillMdContent = fs.readFileSync(skillMdPath, 'utf-8');
    const evalsData: EvalsJson = fs.readJSONSync(evalsPath);
    const guardrailApplicable = isGuardrailApplicable(
      category,
      skillName,
      skillMdContent,
    );

    const cases: EvalCaseRef[] = [];
    const skillPromptDir = path.join(promptsDir, skillName);
    fs.ensureDirSync(skillPromptDir);

    for (const ev of evalsData.evals || []) {
      const id = `eval-${ev.id}`;
      fs.writeFileSync(
        path.join(skillPromptDir, `${id}.md`),
        evalPromptBody(ev.prompt),
      );
      cases.push({
        id,
        kind: 'eval',
        arms: { baseline: 'pending', 'with-skill': 'pending' },
      });
    }

    (evalsData.should_not_trigger || []).forEach((prompt, i) => {
      const id = `trigger-${i + 1}`;
      fs.writeFileSync(
        path.join(skillPromptDir, `${id}.md`),
        triggerPromptBody(skillName, prompt),
      );
      cases.push({ id, kind: 'trigger', arms: { 'with-skill': 'pending' } });
    });

    if (guardrailApplicable) {
      (evalsData.pressure_scenarios || []).forEach((scenario, i) => {
        if (!scenario.prompt) return;
        const id = `pressure-${i + 1}`;
        fs.writeFileSync(
          path.join(skillPromptDir, `${id}.md`),
          pressurePromptBody(scenario.prompt),
        );
        cases.push({
          id,
          kind: 'pressure',
          arms: { baseline: 'pending', 'with-skill': 'pending' },
        });
      });
    }

    if (cases.length === 0) continue;

    fs.ensureDirSync(path.join(answersDir, skillName));
    manifestSkills.push({
      category,
      skillName,
      skillPath: `skills/${category}/${skillName}/SKILL.md`,
      guardrailApplicable,
      cases,
    });
  }

  const manifest: Manifest = {
    runId,
    category,
    version,
    createdAt: new Date().toISOString(),
    metadata: {},
    skills: manifestSkills,
  };

  fs.writeJSONSync(path.join(runDir, MANIFEST_FILENAME), manifest, {
    spaces: 2,
  });

  return { manifest, runDir };
}

export function loadManifest(runDir: string): Manifest {
  return fs.readJSONSync(path.join(runDir, MANIFEST_FILENAME));
}

export function saveManifest(runDir: string, manifest: Manifest): void {
  fs.writeJSONSync(path.join(runDir, MANIFEST_FILENAME), manifest, {
    spaces: 2,
  });
}

export function listCategories(): string[] {
  const metadata = fs.readJSONSync(METADATA_PATH);
  return Object.keys(metadata.categories || {}).filter(
    (c) => c !== 'specialists',
  );
}
