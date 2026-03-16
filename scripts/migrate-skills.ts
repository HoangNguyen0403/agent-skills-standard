import fs from 'fs-extra';
import path from 'path';
import yaml from 'js-yaml';

async function migrate() {
  const skillsDir = path.join(__dirname, '../skills');
  const categories = (await fs.readdir(skillsDir)).filter(
    (f) =>
      !f.startsWith('.') &&
      fs.statSync(path.join(skillsDir, f)).isDirectory()
  );

  let updatedCount = 0;

  for (const category of categories) {
    const categoryPath = path.join(skillsDir, category);
    const skills = await fs.readdir(categoryPath);

    for (const skill of skills) {
      const skillPath = path.join(categoryPath, skill);
      if (!fs.statSync(skillPath).isDirectory()) continue;

      const skillMdPath = path.join(skillPath, 'SKILL.md');
      if (!fs.existsSync(skillMdPath)) continue;

      let content = await fs.readFile(skillMdPath, 'utf8');
      const match = content.match(/^---\n([\s\S]*?)\n---\n([\s\S]*)$/);
      if (!match) continue;

      let fmString = match[1];
      // Fix invalid unquoted YAML keywords starting with @
      fmString = fmString.replace(/\[(.*?)\]/g, (match, inner) => {
         const parts = inner.split(',').map((p: string) => p.trim());
         const fixedParts = parts.map((p: string) => {
            if (p.startsWith('@') && !p.startsWith("'@") && !p.startsWith('"@')) {
               return `'${p}'`;
            }
            return p;
         });
         return `[${fixedParts.join(', ')}]`;
      });

      let frontmatter;
      try {
         frontmatter = yaml.load(fmString) as any;
      } catch (e) {
         console.error(`Failed to parse YAML for ${skillMdPath}`, e);
         continue;
      }
      const body = match[2];

      // 1. Skill Naming Convention
      let newSkillName = skill.toLowerCase().replace(/[^a-z0-9]+/g, '-');
      if (!newSkillName.startsWith(category + '-')) {
        // Some skills might be named `best-practices`, so they become `category-best-practices`
        if (category === 'common') {
          // keep as is or prefix? "common" prefix might be noisy, but ensures uniqueness.
          // Let's prefix to be safe and match the folder structure
          newSkillName = `${category}-${newSkillName}`;
        } else {
          newSkillName = `${category}-${newSkillName}`;
        }
      }

      // Handle duplicate hyphens
      newSkillName = newSkillName.replace(/-+/g, '-').replace(/(^-|-$)/g, '');

      // 2. Extraneous Frontmatter & Trigger Visibility
      let newDescription = frontmatter.description || '';
      // Remove any existing (triggers: ...) from description to avoid duplication
      newDescription = newDescription.replace(/\s*\(triggers:.*?\)\s*$/, '');

      if (frontmatter.metadata && frontmatter.metadata.triggers) {
        const triggers: string[] = [];
        if (frontmatter.metadata.triggers.files) {
          triggers.push(...frontmatter.metadata.triggers.files);
        }
        if (frontmatter.metadata.triggers.keywords) {
          triggers.push(...frontmatter.metadata.triggers.keywords);
        }
        if (frontmatter.metadata.triggers.composite) {
          triggers.push(
            ...frontmatter.metadata.triggers.composite.map((c: string) => `+${c}`)
          );
        }
        if (frontmatter.metadata.triggers.exclude) {
          triggers.push(
            ...frontmatter.metadata.triggers.exclude.map((e: string) => `!${e}`)
          );
        }

        if (triggers.length > 0) {
          newDescription = `${newDescription} (triggers: ${triggers.join(', ')})`;
        }
      }

      const newFm = {
        name: newSkillName,
        description: newDescription,
      };

      const newFmString = yaml.dump(newFm, { lineWidth: -1 }).trim();
      const newContent = `---\n${newFmString}\n---\n${body}`;

      await fs.writeFile(skillMdPath, newContent);
      updatedCount++;

      // 3. Folder Naming
      if (skill !== newSkillName) {
        let newSkillPath = path.join(categoryPath, newSkillName);
        if (await fs.pathExists(newSkillPath)) {
           newSkillName = `${newSkillName}-1`;
           newSkillPath = path.join(categoryPath, newSkillName);
           
           // Update name in frontmatter again
           newFm.name = newSkillName;
           const updatedFmString = yaml.dump(newFm, { lineWidth: -1 }).trim();
           const updatedContent = `---\n${updatedFmString}\n---\n${body}`;
           await fs.writeFile(skillMdPath, updatedContent);
        }
        await fs.rename(skillPath, newSkillPath);
      }
    }
  }

  console.log(`✅ Migrated ${updatedCount} skills.`);
}

migrate().catch(console.error);
