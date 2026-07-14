import fs from 'fs-extra';
import yaml from 'js-yaml';
import path from 'path';
import pc from 'picocolors';

interface SkillFrontmatter {
  name?: string;
  metadata?: {
    triggers?: {
      files?: string[];
      keywords?: string[];
    };
  };
}

async function main() {
  const strict = process.argv.includes('--strict');
  const skillsDir = path.join(__dirname, '../skills');

  if (!(await fs.pathExists(skillsDir))) {
    console.error(pc.red(`Skills directory not found at ${skillsDir}`));
    process.exit(1);
  }

  let collisionCount = 0;

  for (const category of await fs.readdir(skillsDir)) {
    const categoryDir = path.join(skillsDir, category);
    if (!(await fs.stat(categoryDir)).isDirectory()) continue;

    const keywordOwners = new Map<string, string[]>();
    const globOwners = new Map<string, string[]>();

    for (const skillId of await fs.readdir(categoryDir)) {
      const skillFile = path.join(categoryDir, skillId, 'SKILL.md');
      if (!(await fs.pathExists(skillFile))) continue;

      const content = await fs.readFile(skillFile, 'utf8');
      const frontmatterMatch = content.match(/^---\n([\s\S]*?)\n---\n/);
      if (!frontmatterMatch) continue;

      let parsed: SkillFrontmatter;
      try {
        parsed = yaml.load(frontmatterMatch[1]) as SkillFrontmatter;
      } catch {
        continue;
      }

      const keywords = parsed?.metadata?.triggers?.keywords ?? [];
      const files = parsed?.metadata?.triggers?.files ?? [];

      for (const keyword of keywords) {
        const key = keyword.toLowerCase();
        const owners = keywordOwners.get(key) ?? [];
        owners.push(skillId);
        keywordOwners.set(key, owners);
      }

      for (const glob of files) {
        const owners = globOwners.get(glob) ?? [];
        owners.push(skillId);
        globOwners.set(glob, owners);
      }
    }

    const keywordCollisions = [...keywordOwners.entries()].filter(
      ([, owners]) => owners.length > 1,
    );
    const globCollisions = [...globOwners.entries()].filter(
      ([, owners]) => owners.length > 1,
    );

    if (keywordCollisions.length === 0 && globCollisions.length === 0) {
      continue;
    }

    console.log(pc.yellow(`\n${category}:`));
    for (const [keyword, owners] of keywordCollisions) {
      console.log(
        pc.yellow(`  keyword "${keyword}" → ${owners.join(', ')}`),
      );
      collisionCount++;
    }
    for (const [glob, owners] of globCollisions) {
      console.log(pc.yellow(`  glob "${glob}" → ${owners.join(', ')}`));
      collisionCount++;
    }
  }

  if (collisionCount === 0) {
    console.log(pc.green('✅ No keyword or glob collisions within any category.'));
    return;
  }

  console.log(
    pc.blue(
      `\n${collisionCount} collision(s) found across categories. These are warnings — multiple skills matching one keyword is often intentional (e.g. variant skills); review for accidental overlap.`,
    ),
  );

  if (strict) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(pc.red(error instanceof Error ? error.stack : error));
  process.exit(1);
});
