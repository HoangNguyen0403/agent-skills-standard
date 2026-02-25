import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';
import { Agent } from '../cli/src/constants';
import { AgentBridgeService } from '../cli/src/services/AgentBridgeService';
import { IndexGeneratorService } from '../cli/src/services/IndexGeneratorService';
import { MarkdownUtils } from '../cli/src/services/utils/MarkdownUtils';

interface SkillMetadata {
  name: string;
  description: string;
  priority: string;
  triggers: {
    files?: string[];
    keywords?: string[];
    composite?: string[];
    exclude?: string[];
  };
}

async function parseSkill(skillPath: string): Promise<SkillMetadata | null> {
  try {
    const content = await fs.readFile(skillPath, 'utf8');
    const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);

    if (!frontmatterMatch) return null;

    const fm = yaml.load(frontmatterMatch[1]) as unknown as {
      name?: string;
      description?: string;
      metadata?: {
        triggers?: {
          files?: string[];
          keywords?: string[];
          composite?: string[];
          exclude?: string[];
        };
      };
    };
    const body = frontmatterMatch[2];

    const priorityMatch = body.match(/## \*\*Priority:\s*([^*]+)\*\*/);
    const priority = priorityMatch ? priorityMatch[1].trim() : 'P1';

    return {
      name: fm.name || '',
      description: fm.description || '',
      priority,
      triggers: fm.metadata?.triggers || {},
    };
  } catch {
    return null;
  }
}

async function generate() {
  // Look for skills directory in the repository root
  const repoRoot = path.join(__dirname, '..');
  const skillsDir = path.join(repoRoot, 'skills');

  if (!(await fs.pathExists(skillsDir))) {
    throw new Error(`Skills directory not found at ${skillsDir}`);
  }

  const categories = (await fs.readdir(skillsDir)).filter((f) => {
    const p = path.join(skillsDir, f);
    return fs.statSync(p).isDirectory() && !f.startsWith('.');
  });

  const frameworkIndices: Record<string, string> = {};

  for (const category of categories) {
    const categoryPath = path.join(skillsDir, category);
    const skills = await fs.readdir(categoryPath);
    const entries: string[] = [];

    for (const skill of skills) {
      const skillPath = path.join(categoryPath, skill, 'SKILL.md');
      if (!(await fs.pathExists(skillPath))) continue;

      const metadata = await parseSkill(skillPath);
      if (metadata) {
        const id = `${category}/${skill}`;
        const triggers = [
          ...(metadata.triggers.files || []),
          ...(metadata.triggers.keywords || []),
          ...(metadata.triggers.composite
            ? metadata.triggers.composite.map((c) => `+${c}`)
            : []),
          ...(metadata.triggers.exclude
            ? metadata.triggers.exclude.map((e) => `!${e}`)
            : []),
        ].join(', ');

        const triggerText = triggers ? ` (triggers: ${triggers})` : '';
        const prefix = metadata.priority.startsWith('P0') ? '🚨 ' : '';

        // Format: - **[category/skill]**: 🚨 Description (triggers: file.ts, keyword)
        const content = `${prefix}${metadata.description || ''}`.trim();
        entries.push(`- **[${id}]**: ${content}${triggerText}`);
      }
    }

    if (entries.length > 0) {
      frameworkIndices[category] = entries.join('\n');
    }
  }

  const indexPath = path.join(skillsDir, 'index.json');
  await fs.writeJson(indexPath, frameworkIndices, { spaces: 2 });
  console.log(
    `✅ Generated indices for ${Object.keys(frameworkIndices).length} frameworks in skills/index.json`,
  );

  // Also update AGENTS.md
  // Already have repoRoot from above

  // Filter AGENTS.md content based on .skillsrc enabled categories
  let enabledCategories: string[] | null = null;
  const skillsrcPath = path.join(repoRoot, '.skillsrc');
  if (await fs.pathExists(skillsrcPath)) {
    try {
      const skillsrcContent = await fs.readFile(skillsrcPath, 'utf8');
      const skillsrc = yaml.load(skillsrcContent) as {
        skills?: Record<string, unknown>;
      };
      if (skillsrc && skillsrc.skills) {
        enabledCategories = Object.keys(skillsrc.skills);
        console.log(
          `🔍 Filtering AGENTS.md to categories: ${enabledCategories.join(', ')}`,
        );
      }
    } catch {
      console.warn(`⚠️ Failed to parse .skillsrc, including all categories.`);
    }
  }

  const generator = new IndexGeneratorService();
  const allEntries = new Set<string>();

  Object.entries(frameworkIndices)
    .filter(
      ([category]) =>
        !enabledCategories || enabledCategories.includes(category),
    )
    .forEach(([, s]) => {
      s.split('\n').forEach((entry) => allEntries.add(entry));
    });

  const indexContent = generator.assembleIndex(Array.from(allEntries));

  await MarkdownUtils.injectIndex(repoRoot, ['AGENTS.md'], indexContent);

  console.log('✅ Updated AGENTS.md in repo root');

  const agents = [
    Agent.Cursor,
    Agent.Windsurf,
    Agent.Trae,
    Agent.Roo,
    Agent.Kiro,
    Agent.Antigravity,
    Agent.Claude,
    Agent.Copilot,
  ];

  const bridgeService = new AgentBridgeService();
  await bridgeService.bridge(repoRoot, agents);
  console.log('✅ Updated agent rule files');
}

generate().catch(console.error);
