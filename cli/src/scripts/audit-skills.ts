import fs from 'fs-extra';
import path from 'path';
import pc from 'picocolors';

async function main() {
  // Adjusted for running from 'cli' directory
  const skillsDir = path.join(process.cwd(), '..', 'skills');

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

    const checkpoints = lines.filter((l: string) =>
      l.match(/^###\s+.*(Checkpoint|Step).*/i),
    );

    if (checkpoints.length > 5) {
      console.log(
        pc.yellow(
          `⚠️  ${path.relative(path.join(process.cwd(), '..'), filePath)} has ${checkpoints.length} explicit checkpoint/step headers. Check for redundancy.`,
        ),
      );
      failedCount++;
    }
  }

  console.log(pc.blue('🔍 Auditing skills for redundant checkpoints...'));
  await scanDir(skillsDir);

  if (failedCount === 0) {
    console.log(pc.green('✅ No obvious redundancy found.'));
  } else {
    console.log(
      pc.yellow(`⚠️  Found ${failedCount} potentially redundant skills.`),
    );
    // process.exit(1); // Optional: fail build if redundancy found?
  }
}

main().catch(console.error);
