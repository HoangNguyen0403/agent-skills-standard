import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';

interface SkillMetadata {
  name: string;
  description: string;
  priority: string;
  triggers: {
    files?: string[];
    keywords?: string[];
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
  // Look for skills directory in the workspace root
  const skillsDir = path.join(process.cwd(), '..', 'skills');

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
        ].join(',');
        const prefix = metadata.priority.startsWith('P0') ? '🚨 ' : '';
        entries.push(
          `| ${id} | \`${triggers}\` | ${prefix}${metadata.description} |`,
        );
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
}

generate().catch(console.error);
