import fs from 'fs-extra';
import path from 'path';
import pc from 'picocolors';

const CANONICAL_LABELS: Record<string, string> = {
  P0: 'CRITICAL',
  P1: 'HIGH',
  P2: 'MEDIUM',
  P3: 'LOW',
};

const PRIORITY_LINE = /^## \*\*Priority:\s*(P\d)(?:\s*\(([^)]*)\))?([^\n]*)\*\*$/m;

async function main() {
  const dryRun = process.argv.includes('--dry-run');
  const skillsDir = path.join(__dirname, '../skills');

  if (!(await fs.pathExists(skillsDir))) {
    console.error(pc.red(`Skills directory not found at ${skillsDir}`));
    process.exit(1);
  }

  let changedCount = 0;
  let unknownTierCount = 0;

  async function scanDir(dir: string) {
    const items = await fs.readdir(dir);
    for (const item of items) {
      const fullPath = path.join(dir, item);
      const stat = await fs.stat(fullPath);
      if (stat.isDirectory()) {
        await scanDir(fullPath);
      } else if (item === 'SKILL.md') {
        await migrateFile(fullPath);
      }
    }
  }

  async function migrateFile(filePath: string) {
    const content = await fs.readFile(filePath, 'utf8');
    const match = content.match(PRIORITY_LINE);
    const relPath = path.relative(skillsDir, filePath);

    if (!match) return;

    const [fullMatch, tier, label, trailing] = match;
    const canonicalLabel = CANONICAL_LABELS[tier];

    if (!canonicalLabel) {
      console.log(pc.red(`❌ ${relPath}: unknown priority tier "${tier}", skipping`));
      unknownTierCount++;
      return;
    }

    const isCanonical = label === canonicalLabel && !trailing?.trim();
    if (isCanonical) return;

    const canonicalLine = `## **Priority: ${tier} (${canonicalLabel})**`;
    const droppedSuffix = trailing?.trim();

    console.log(
      pc.yellow(`${relPath}:`) +
        `\n  - ${fullMatch}\n  + ${canonicalLine}` +
        (droppedSuffix
          ? pc.cyan(
              `\n  (dropped freeform suffix "${droppedSuffix}" — verify it's stated in the body)`,
            )
          : ''),
    );
    changedCount++;

    if (!dryRun) {
      const updated = content.replace(PRIORITY_LINE, canonicalLine);
      await fs.writeFile(filePath, updated, 'utf8');
    }
  }

  console.log(
    pc.blue(
      `🔍 Scanning skills for priority label drift${dryRun ? ' (dry run)' : ''}...\n`,
    ),
  );
  await scanDir(skillsDir);

  console.log(
    '\n' +
      pc.blue(
        `${changedCount} label(s) ${dryRun ? 'would be' : 'were'} normalized. ${unknownTierCount} unknown tier(s) skipped.`,
      ),
  );

  if (unknownTierCount > 0) {
    process.exit(1);
  }
}

main().catch((error) => {
  console.error(pc.red(error instanceof Error ? error.stack : error));
  process.exit(1);
});
