import pc from 'picocolors';
import { ConfigService } from '../services/ConfigService';
import { LockfileService } from '../services/LockfileService';

/**
 * Prints the skill inventory recorded in .skills-lock.json — the AST09
 * "skill inventory" governance control: what's installed, from which ref,
 * and how many files each skill carries.
 */
export class AuditCommand {
  private configService: ConfigService;
  private lockfileService: LockfileService;

  constructor(
    configService?: ConfigService,
    lockfileService?: LockfileService,
  ) {
    this.configService = configService || new ConfigService();
    this.lockfileService = lockfileService || new LockfileService();
  }

  async run(): Promise<void> {
    const config = await this.configService.loadConfig();
    const agents = config?.agents ?? [];
    const { lock } = await this.lockfileService.load(process.cwd(), agents);
    if (!lock) {
      console.log(
        pc.yellow(
          'No .skills-lock.json found. Run `ags sync` first to generate one.',
        ),
      );
      process.exitCode = 1;
      return;
    }

    console.log(pc.cyan(`📋 Skill inventory (${lock.registry})`));
    console.log(pc.gray(`   Generated: ${lock.generatedAt}\n`));

    console.log(pc.bold('Sources:'));
    for (const [sourceKey, sourceVal] of Object.entries(lock.sources)) {
      console.log(`  ${sourceKey}: ${sourceVal.ref}`);
    }
    console.log('');

    const bySource: Record<
      string,
      { owner: string; agents: Set<string>; fileCount: number }
    > = {};
    for (const entry of Object.values(lock.entries)) {
      if (!bySource[entry.source]) {
        bySource[entry.source] = {
          owner: entry.owner,
          agents: new Set<string>(),
          fileCount: 0,
        };
      }
      bySource[entry.source].agents.add(entry.agent);
      bySource[entry.source].fileCount++;
    }

    const sourceEntries = Object.entries(bySource).sort(([a], [b]) =>
      a.localeCompare(b),
    );

    if (sourceEntries.length === 0) {
      console.log(pc.gray('  (no entries recorded)'));
      return;
    }

    console.log(pc.bold('Entries:'));
    for (const [src, info] of sourceEntries) {
      const agentList = Array.from(info.agents).sort().join(', ');
      console.log(
        `  ${pc.bold(src.padEnd(45))} ${pc.gray(info.owner.padEnd(12))} ${info.fileCount} file(s) [${agentList}]`,
      );
    }

    console.log(pc.gray(`\n  ${sourceEntries.length} item(s) total`));
  }
}
