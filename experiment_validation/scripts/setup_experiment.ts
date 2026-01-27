import { execSync } from 'child_process';
import fs from 'fs';
import path from 'path';

// --- Interfaces ---
interface ProjectConfig {
  name: string;
  repoUrl: string;
  branch?: string;
  framework: string;
}

interface Scenario {
  title: string;
  prompt: string;
  successCriteria: string[];
}

interface ExperimentConfig {
  project: ProjectConfig;
  scenarios: Scenario[];
}

// --- Helper Functions ---
function run(command: string, cwd: string) {
  try {
    console.log(`> ${command}`);
    // stdio: 'inherit' is crucial for interactive CLI commands like 'init'
    execSync(command, { cwd, stdio: 'inherit', encoding: 'utf-8' });
  } catch (e) {
    console.error(`Error running command: ${command}`);
    process.exit(1);
  }
}

function rmdir(dir: string) {
  if (fs.existsSync(dir)) {
    fs.rmSync(dir, { recursive: true, force: true });
  }
}

// --- Main Script ---
const configPath = process.argv[2];
if (!configPath) {
  console.error('Usage: npx tsx setup_experiment.ts <path-to-config.json>');
  process.exit(1);
}

const configRaw = fs.readFileSync(configPath, 'utf-8');
const config: ExperimentConfig = JSON.parse(configRaw);
const { project, scenarios } = config;

// Use process.cwd() as base or resolve relative to script?
// Using __dirname relative resolution for consistency
const baseDir = path.resolve(__dirname, '..');
const controlDir = path.join(baseDir, 'control', project.name);
const experimentDir = path.join(baseDir, 'experiment', project.name);

console.log(
  `\n🚀 Setting up Experiment: ${project.name} (${project.framework})`,
);
console.log(`   Repo: ${project.repoUrl}`);

// 1. Clean Directories
console.log('\n🧹 Cleaning old directories...');
rmdir(path.join(baseDir, 'control'));
rmdir(path.join(baseDir, 'experiment'));
fs.mkdirSync(path.join(baseDir, 'control'), { recursive: true });
fs.mkdirSync(path.join(baseDir, 'experiment'), { recursive: true });

// 2. Clone Repositories
console.log('\n📦 Cloning repositories...');
run(`git clone ${project.repoUrl} ${controlDir}`, baseDir);
run(`git clone ${project.repoUrl} ${experimentDir}`, baseDir);

if (
  project.branch &&
  project.branch !== 'main' &&
  project.branch !== 'master'
) {
  console.log(`\n🌿 Checking out branch: ${project.branch}`);
  run(`git checkout ${project.branch}`, controlDir);
  run(`git checkout ${project.branch}`, experimentDir);
}

// 3. Setup Experiment Group (Interactive Init)
console.log('\n🔮 Injecting Agent Skills into Experiment Group...');
console.log(
  '👉 You are about to run "init". Please follow the interactive prompts.',
);

// Run Init (Interactive)
// assuming agent-skills-standard is installed globally or we use npx
run('npx agent-skills-standard init', experimentDir);

// Run Sync
run('npx agent-skills-standard sync', experimentDir);

// 4. Clean Control Group (Ensure NO skills)
console.log('\n🛡️  Sanitizing Control Group...');
const agentDirs = ['.cursor', '.agent', '.github/skills'];
agentDirs.forEach((d) => rmdir(path.join(controlDir, d)));

// 5. Generate Scorecard
console.log('\n📝 Generating Scorecard...');
let scorecardContent = `# Experiment Scorecard: ${project.name}\n\n`;
scorecardContent += `Date: ${new Date().toISOString().split('T')[0]}\n`;
scorecardContent += `Framework: ${project.framework}\n\n`;

scorecardContent += `| Task | Control Group (No Skills) | Experiment Group (With Skills) | Winner |\n`;
scorecardContent += `| :--- | :--- | :--- | :---: |\n`;

scenarios.forEach((scenario) => {
  scorecardContent += `| **${scenario.title}**<br>Prompt: *"${scenario.prompt}"* | Status: [ ]<br>Lint Errors: [ ]<br>Corrections: [ ] | Status: [ ]<br>Lint Errors: [ ]<br>Corrections: [ ] | [ ] |\n`;
});

scorecardContent += `\n## Scenarios Detail\n\n`;
scenarios.forEach((scenario) => {
  scorecardContent += `### ${scenario.title}\n`;
  scorecardContent += `**Prompt**: ${scenario.prompt}\n`;
  scorecardContent += `**Success Criteria**:\n`;
  scenario.successCriteria.forEach((c) => (scorecardContent += `- [ ] ${c}\n`));
  scorecardContent += `\n`;
});

fs.writeFileSync(path.join(baseDir, 'SCORECARD.md'), scorecardContent);

console.log('\n✅ Setup Complete!');
console.log(`👉 Control Group:    ${controlDir}`);
console.log(`👉 Experiment Group: ${experimentDir}`);
console.log(`👉 Scorecard:        ${path.join(baseDir, 'SCORECARD.md')}`);
