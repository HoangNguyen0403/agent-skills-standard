import fs from 'fs-extra';
import path from 'path';
import pc from 'picocolors';
import { DEFAULT_WORKFLOWS } from '../cli/src/constants';

const ROOT = path.join(__dirname, '..');
const WORKFLOWS_DIR = path.join(ROOT, '.agents', 'workflows');
const CODEX_SKILLS_DIR = path.join(ROOT, '.codex', 'skills');
const CODEX_AGENTS_DIR = path.join(ROOT, '.codex', 'agents');
const PROMPTS_DIR = path.join(ROOT, '.github', 'prompts');
const QUICK_REFERENCE_FILE = path.join(ROOT, 'docs', 'sdlc-workflow-quick-reference.md');

const REQUIRED_WORKFLOWS = [...new Set(DEFAULT_WORKFLOWS)];
const REQUIRED_REQUIREMENT_TERMS = ['BRD-lite', 'PRD', 'SRS/FRS'];

interface WorkflowRule {
  maxLines?: number;
  requireGoal?: boolean;
  requireOutputTemplate?: boolean;
  notes?: string;
}

/**
 * Explicit per-workflow rule map defining line count limits and structure requirements.
 * Documented Exception Policy:
 * 1. Default limits (80 lines, Goal section, and Output Template section) apply to all standard
 *    step-by-step tasks (STRICT workflows).
 * 2. Exceptions are allowed for complex, multi-artifact lifecycles or orchestrators (e.g., dev-fix,
 *    verify-bug, codebase-review) that generate custom documents/scorecards instead of a single output
 *    template, or require more verbose steps/context.
 */
const WORKFLOW_RULES: Record<string, WorkflowRule> = {
  // Strict standard tasks (<= 80 lines, must have Goal and Output Template)
  'sdlc': { maxLines: 80, requireGoal: true, requireOutputTemplate: true },
  'brainstorm-feature': { maxLines: 80, requireGoal: true, requireOutputTemplate: true },
  'plan-feature': { maxLines: 80, requireGoal: true, requireOutputTemplate: true },
  'design-solution': { maxLines: 80, requireGoal: true, requireOutputTemplate: true },
  'implementation-readiness': { maxLines: 80, requireGoal: true, requireOutputTemplate: true },
  'implement-feature': { maxLines: 80, requireGoal: true, requireOutputTemplate: true },
  'review-ticket': { maxLines: 80, requireGoal: true, requireOutputTemplate: true },
  'verify-work': { maxLines: 80, requireGoal: true, requireOutputTemplate: true },
  'deploy-release': { maxLines: 80, requireGoal: true, requireOutputTemplate: true },
  'traceability-audit': { maxLines: 80, requireGoal: true, requireOutputTemplate: true },
  'session-report': { maxLines: 80, requireGoal: true, requireOutputTemplate: true },
  'publish-notes': { maxLines: 80, requireGoal: true, requireOutputTemplate: true },
  'retro-learn': { maxLines: 80, requireGoal: true, requireOutputTemplate: true },

  // Exceptions / Complex workflows
  'code-review': {
    maxLines: 80,
    requireGoal: true,
    requireOutputTemplate: true,
    notes: 'Standard code review workflow, fits within standard template but uses bold Goal'
  },
  'codebase-review': {
    maxLines: 80,
    requireGoal: true,
    requireOutputTemplate: false,
    notes: 'Codebase-wide audit that produces a custom report format instead of a simple template'
  },
  'skill-benchmark': {
    maxLines: 80,
    requireGoal: true,
    requireOutputTemplate: false,
    notes: 'Benchmarks skill compliance, relies on dynamic scorecards instead of a static output template'
  },
  'pentest': {
    maxLines: 80,
    requireGoal: true,
    requireOutputTemplate: true,
    notes: 'Deep security pentest workflow with structured vulnerability findings'
  },
  'dev-fix': {
    maxLines: 150,
    requireGoal: false,
    requireOutputTemplate: false,
    notes: 'Full developer lifecycle bug-fix manager. Requires custom templates (plan, task, walkthrough) and exceeds 80 lines due to complexity.'
  },
  'verify-bug': {
    maxLines: 100,
    requireGoal: false,
    requireOutputTemplate: false,
    notes: 'Enterprise UAT bug verification flow. Relies on custom Walkthrough templates and exceeds 80 lines due to multi-market/VPN handling.'
  },
  'security-test': {
    maxLines: 90,
    requireGoal: true,
    requireOutputTemplate: true,
    notes: 'High-speed PR security audit check. Has a slightly longer line count limit (90 lines).'
  }
};


const REQUIRED_SPECIALISTS = [
  'specialist-ac-verifier',
  'specialist-architecture-guard',
  'specialist-codebase-scout',
  'specialist-confluence-searcher',
  'specialist-integration-test-generator',
  'specialist-jira-analyst',
  'specialist-pr-commenter-batch',
  'specialist-pr-reviewer',
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
  const workflowEntries = await fs.readdir(WORKFLOWS_DIR, { withFileTypes: true });
  const canonicalWorkflows = new Set(
    workflowEntries
      .filter((entry) => entry.isFile() && entry.name.endsWith('.md'))
      .map((entry) => path.basename(entry.name, '.md')),
  );

  for (const workflow of REQUIRED_WORKFLOWS) {
    if (!canonicalWorkflows.has(workflow)) {
      fail(`Missing workflow: ${workflow}`, failures);
      continue;
    }

    const file = path.join(WORKFLOWS_DIR, `${workflow}.md`);
    const content = await fs.readFile(file, 'utf8');
    checkPortableContent(path.relative(ROOT, file), content, failures);
    const rules = WORKFLOW_RULES[workflow];
    if (rules) {
      const lines = content.trimEnd().split(/\r?\n/).length;
      const maxLines = rules.maxLines ?? 80;
      if (lines > maxLines) {
        fail(`${workflow}.md exceeds ${maxLines} lines (${lines})`, failures);
      } else {
        pass(`${workflow}.md present (${lines} lines)`);
      }

      if (rules.requireGoal) {
        const hasGoal = content.includes('Goal:') || content.includes('Goal**:') || /\*\*Goal\*\*:/i.test(content);
        if (!hasGoal) {
          fail(`${workflow}.md missing Goal section`, failures);
        }
      }

      if (rules.requireOutputTemplate) {
        const hasOutputTemplate = content.toLowerCase().includes('output template');
        if (!hasOutputTemplate) {
          fail(`${workflow}.md missing Output Template`, failures);
        }
      }
    } else {
      fail(`Workflow ${workflow} has no rules defined in audit-sdlc.ts`, failures);
    }
  }

  if (await fs.pathExists(QUICK_REFERENCE_FILE)) {
    const quickRef = await fs.readFile(QUICK_REFERENCE_FILE, 'utf8');
    for (const workflow of REQUIRED_WORKFLOWS) {
      if (quickRef.includes(`\`${workflow}\``)) {
        pass(`quick reference includes ${workflow}`);
      } else {
        fail(`Quick reference missing workflow: ${workflow}`, failures);
      }
    }
    for (const term of REQUIRED_REQUIREMENT_TERMS) {
      if (quickRef.includes(term)) {
        pass(`quick reference includes requirement term: ${term}`);
      } else {
        fail(`Quick reference missing requirement term: ${term}`, failures);
      }
    }
  } else {
    fail('Missing docs/sdlc-workflow-quick-reference.md', failures);
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
      if (!canonicalWorkflows.has(entry.name)) {
        fail(
          `Generated Codex workflow skill has no canonical source: ${entry.name}`,
          failures,
        );
      }
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
