import fs from 'fs-extra';
import path from 'path';
import pc from 'picocolors';

async function main() {
  // Look for skills directory in the repository root
  const skillsDir = path.join(__dirname, '../skills');
  const forbiddenMarkers = ['alignment tokens:'];
  const guardrailSkillPattern =
    /common-(tdd|debugging|code-review|protocol-enforcement|skill-creator)\/SKILL\.md$/i;

  if (!(await fs.pathExists(skillsDir))) {
    console.error(pc.red(`Skills directory not found at ${skillsDir}`));
    process.exit(1);
  }

  let failedCount = 0;

  async function scanDir(dir: string) {
    const items = await fs.readdir(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);

      if (stat.isDirectory()) {
        await scanDir(fullPath);
      } else if (item === 'SKILL.md') {
        await checkFile(fullPath);
      }
    }
  }

  async function checkFile(filePath: string) {
    const content = await fs.readFile(filePath, 'utf8');
    const lines = content.split('\n');
    const relPath = path.relative(process.cwd(), filePath);

    for (const marker of forbiddenMarkers) {
      if (content.toLowerCase().includes(marker)) {
        console.log(pc.red(`❌ ${relPath} contains forbidden marker: ${marker}`));
        failedCount++;
      }
    }

    const checkpoints = lines.filter((l: string) =>
      l.match(/^###\s+.*(Checkpoint|Step).*/i),
    );

    if (checkpoints.length > 5) {
      console.log(
        pc.yellow(
          `⚠️  ${relPath} has ${checkpoints.length} explicit checkpoint/step headers. Check for redundancy.`,
        ),
      );
      failedCount++;
    }

    if (guardrailSkillPattern.test(relPath)) {
      const hasRedFlags = /red flags?/i.test(content);
      const hasRationalization = /rationalization/i.test(content);
      if (!hasRedFlags) {
        console.log(pc.red(`❌ ${relPath} missing guardrail red-flag language`));
        failedCount++;
      }
      if (!hasRationalization) {
        console.log(
          pc.red(`❌ ${relPath} missing rationalization or shortcut guidance`),
        );
        failedCount++;
      }
    }
  }

  console.log(pc.blue('🔍 Auditing skills for redundant checkpoints...'));
  await scanDir(skillsDir);

  if (failedCount === 0) {
    console.log(pc.green('✅ No obvious redundancy found.'));
  } else {
    console.log(pc.red(`❌ Found ${failedCount} skill audit issue(s).`));
    process.exit(1);
  }
}

main().catch(console.error);
