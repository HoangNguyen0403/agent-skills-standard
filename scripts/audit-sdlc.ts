import fs from 'fs-extra';
import path from 'path';
import pc from 'picocolors';

const ROOT = path.join(__dirname, '..');
const WORKFLOWS_DIR = path.join(ROOT, '.agents', 'workflows');
const CODEX_SKILLS_DIR = path.join(ROOT, '.codex', 'skills');
const CODEX_AGENTS_DIR = path.join(ROOT, '.codex', 'agents');
const PROMPTS_DIR = path.join(ROOT, '.github', 'prompts');

const REQUIRED_WORKFLOWS = [
  'sdlc',
  'brainstorm-feature',
  'plan-feature',
  'design-solution',
  'implementation-readiness',
  'implement-feature',
  'review-ticket',
  'verify-work',
];

const REQUIRED_SPECIALISTS = [
  'specialist-ac-verifier',
  'specialist-ado-pr-reviewer',
  'specialist-architecture-guard',
  'specialist-codebase-scout',
  'specialist-confluence-searcher',
  'specialist-integration-test-generator',
  'specialist-jira-analyst',
  'specialist-pr-commenter-batch',
  'specialist-security-reviewer',
  'specialist-tc-creator',
  'specialist-tdd-implementer',
  'specialist-test-gap-finder',
  'specialist-zephyr-scanner',
];

const REQUIRED_RUNTIME_REFERENCES = [
  'skills/common/common-security-audit/references/vibe-security-scan.md',
];

const PORTABILITY_PATTERNS = [
  { pattern: '../../skills/', label: 'repo-local skills path' },
  { pattern: 'file://', label: 'absolute file URI' },
  { pattern: '/Users/', label: 'machine-local absolute path' },
  { pattern: 'alignment tokens:', label: 'alignment-token placeholder' },
];

function fail(message: string, failures: string[]) {
  failures.push(message);
  console.log(pc.red(`  ✗ ${message}`));
}

function pass(message: string) {
  console.log(pc.green(`  ✓ ${message}`));
}

function checkPortableContent(
  relPath: string,
  content: string,
  failures: string[],
) {
  for (const { pattern, label } of PORTABILITY_PATTERNS) {
    if (content.includes(pattern)) {
      fail(`${relPath} contains non-portable ${label}: ${pattern}`, failures);
    }
  }

  const docsLinkPattern = /\]\((?:\.\.\/)*docs\//;
  if (docsLinkPattern.test(content)) {
    fail(`${relPath} links to unsynced docs/ runtime material`, failures);
  }
}

async function main() {
  console.log(pc.blue('🔍 Auditing SDLC workflow surface...\n'));

  const failures: string[] = [];

  for (const workflow of REQUIRED_WORKFLOWS) {
    const file = path.join(WORKFLOWS_DIR, `${workflow}.md`);
    if (!(await fs.pathExists(file))) {
      fail(`Missing workflow: ${workflow}`, failures);
      continue;
    }

    const content = await fs.readFile(file, 'utf8');
    checkPortableContent(path.relative(ROOT, file), content, failures);
    const lines = content.trimEnd().split(/\r?\n/).length;
    if (lines > 80) {
      fail(`${workflow}.md exceeds 80 lines (${lines})`, failures);
    } else {
      pass(`${workflow}.md present (${lines} lines)`);
    }

    if (!content.includes('Goal:')) {
      fail(`${workflow}.md missing Goal section`, failures);
    }
    if (!content.includes('## Output Template')) {
      fail(`${workflow}.md missing Output Template`, failures);
    }
  }

  for (const relPath of REQUIRED_RUNTIME_REFERENCES) {
    if (await fs.pathExists(path.join(ROOT, relPath))) {
      pass(`${relPath} present`);
    } else {
      fail(`Missing required reference: ${relPath}`, failures);
    }
  }

  for (const specialist of REQUIRED_SPECIALISTS) {
    const skillFile = path.join(
      ROOT,
      'skills',
      'specialists',
      specialist,
      'SKILL.md',
    );
    const evalFile = path.join(
      ROOT,
      'skills',
      'specialists',
      specialist,
      'evals',
      'evals.json',
    );
    if (await fs.pathExists(skillFile)) {
      pass(`${specialist} specialist present`);
    } else {
      fail(`Missing specialist: ${specialist}`, failures);
    }
    if (await fs.pathExists(evalFile)) {
      pass(`${specialist} eval present`);
    } else {
      fail(`Missing specialist eval: ${specialist}`, failures);
    }
  }

  if (await fs.pathExists(CODEX_SKILLS_DIR)) {
    const entries = await fs.readdir(CODEX_SKILLS_DIR, { withFileTypes: true });
    for (const entry of entries.filter((item) => item.isDirectory())) {
      const skillFile = path.join(CODEX_SKILLS_DIR, entry.name, 'SKILL.md');
      if (!(await fs.pathExists(skillFile))) continue;
      const content = await fs.readFile(skillFile, 'utf8');
      checkPortableContent(path.relative(ROOT, skillFile), content, failures);
      if (!content.startsWith('---\n')) {
        fail(`Generated Codex skill missing frontmatter: ${entry.name}`, failures);
      }
      if (content.includes('.agents/workflows/')) {
        fail(`Generated Codex skill has source-path trigger/reference: ${entry.name}`, failures);
      }
    }
  }

  if (await fs.pathExists(PROMPTS_DIR)) {
    const entries = await fs.readdir(PROMPTS_DIR);
    for (const entry of entries.filter((name) => name.endsWith('.prompt.md'))) {
      const promptFile = path.join(PROMPTS_DIR, entry);
      const content = await fs.readFile(promptFile, 'utf8');
      checkPortableContent(path.relative(ROOT, promptFile), content, failures);
    }
  }

  if (await fs.pathExists(CODEX_AGENTS_DIR)) {
    const entries = await fs.readdir(CODEX_AGENTS_DIR);
    for (const specialist of REQUIRED_SPECIALISTS) {
      const agentName = `${specialist.replace(/^specialist-/, '')}.toml`;
      if (entries.includes(agentName)) {
        pass(`Generated Codex agent present: ${agentName}`);
      } else {
        fail(`Missing generated Codex agent: ${agentName}`, failures);
      }
    }
    if (await fs.pathExists(path.join(CODEX_SKILLS_DIR, 'specialists'))) {
      fail('Specialists exported under .codex/skills; expected native agents only', failures);
    }
  }

  if (failures.length > 0) {
    console.log(pc.red(`\n❌ SDLC audit failed with ${failures.length} issue(s).`));
    process.exit(1);
  }

  console.log(pc.green('\n✅ SDLC audit passed.'));
}

main().catch((error) => {
  console.error(error);
  process.exit(1);
});
