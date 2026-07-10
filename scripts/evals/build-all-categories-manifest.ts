#!/usr/bin/env node
import fs from 'fs-extra';
import * as path from 'path';
import { RUNS_DIR, ROOT_DIR, SKILLS_DIR, MANIFEST_FILENAME } from './constants';
import { isGuardrailApplicable } from '../benchmark/utils';

function triggerPromptBody(skillName: string, prompt: string): string {
  return [
    `# Trigger-precision check for \`${skillName}\``,
    '',
    "Below is a task prompt. Based ONLY on the skill's name and one-line description (as shown by your skill router / `list_categories` / `SKILL.md` frontmatter — do NOT open the full skill body), decide whether this specific skill should activate for this prompt.",
    '',
    '> ' + prompt,
    '',
    "Answer with exactly one line in the form `TRIGGER: yes` or `TRIGGER: no`, followed by a one-sentence justification on the next line.",
  ].join('\n');
}

function evalPromptBody(prompt: string): string {
  return prompt;
}

function pressurePromptBody(prompt: string): string {
  return prompt;
}

function slugRunId(version: string, label = 'all'): string {
  const date = new Date().toISOString().slice(0, 10);
  return `${label}-v${version}-${date}`;
}

async function main() {
  const pkg = fs.readJSONSync(path.join(ROOT_DIR, 'package.json'));
  const version = pkg.version || '0.0.0';
  const argRunId = process.argv[2];
  const runId = argRunId || slugRunId(version, 'all');

  const runDir = path.join(RUNS_DIR, runId);
  const promptsDir = path.join(runDir, 'prompts');
  const answersDir = path.join(runDir, 'answers');
  fs.ensureDirSync(promptsDir);
  fs.ensureDirSync(answersDir);

  const metadata = fs.readJSONSync(path.join(SKILLS_DIR, 'metadata.json'));
  const categories: string[] = Object.keys(metadata.categories || {}).filter((c) => c !== 'specialists');

  const manifestSkills: any[] = [];

  for (const category of categories) {
    const categoryDir = path.join(SKILLS_DIR, category);
    if (!fs.existsSync(categoryDir)) continue;
    const skillDirs = fs.readdirSync(categoryDir, { withFileTypes: true }).filter((e) => e.isDirectory());

    for (const entry of skillDirs) {
      const skillName = entry.name;
      const skillMdPath = path.join(categoryDir, skillName, 'SKILL.md');
      const evalsPath = path.join(categoryDir, skillName, 'evals', 'evals.json');
      if (!fs.existsSync(skillMdPath) || !fs.existsSync(evalsPath)) continue;

      const skillMdContent = fs.readFileSync(skillMdPath, 'utf-8');
      const evalsData: any = fs.readJSONSync(evalsPath);
      const guardrailApplicable = isGuardrailApplicable(category, skillName, skillMdContent);

      const cases: any[] = [];
      const skillPromptDir = path.join(promptsDir, category, skillName);
      fs.ensureDirSync(skillPromptDir);
      const skillAnswerDir = path.join(answersDir, category, skillName);
      fs.ensureDirSync(skillAnswerDir);

      for (const ev of evalsData.evals || []) {
        const id = `eval-${ev.id}`;
        fs.writeFileSync(path.join(skillPromptDir, `${id}.md`), evalPromptBody(ev.prompt));
        cases.push({ id, kind: 'eval', arms: { baseline: 'pending', 'with-skill': 'pending' } });
      }

      (evalsData.should_not_trigger || []).forEach((prompt: string, i: number) => {
        const id = `trigger-${i + 1}`;
        fs.writeFileSync(path.join(skillPromptDir, `${id}.md`), triggerPromptBody(skillName, prompt));
        cases.push({ id, kind: 'trigger', arms: { 'with-skill': 'pending' } });
      });

      if (guardrailApplicable) {
        (evalsData.pressure_scenarios || []).forEach((scenario: any, i: number) => {
          if (!scenario.prompt) return;
          const id = `pressure-${i + 1}`;
          fs.writeFileSync(path.join(skillPromptDir, `${id}.md`), pressurePromptBody(scenario.prompt));
          cases.push({ id, kind: 'pressure', arms: { baseline: 'pending', 'with-skill': 'pending' } });
        });
      }

      if (cases.length === 0) continue;

      manifestSkills.push({
        category,
        skillName,
        skillPath: `skills/${category}/${skillName}/SKILL.md`,
        guardrailApplicable,
        cases,
      });
    }
  }

  const manifest = {
    runId,
    category: 'all',
    version,
    createdAt: new Date().toISOString(),
    metadata: {},
    skills: manifestSkills,
  };

  fs.writeJSONSync(path.join(runDir, MANIFEST_FILENAME), manifest, { spaces: 2 });

  console.log(`✅ Combined manifest built: ${runDir}`);
  console.log(`   ${manifest.skills.length} skills, ${manifest.skills.reduce((s: number, sk: any) => s + sk.cases.length, 0)} cases`);
  console.log(`\nNext: answer prompts under ${path.relative(ROOT_DIR, runDir)}/prompts/ then run: pnpm evals:score -- --run ${runId}`);
}

main().catch((err) => {
  console.error('❌ build-all-manifests failed:', err);
  process.exit(1);
});
