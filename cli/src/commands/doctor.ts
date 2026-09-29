import inquirer from 'inquirer';
import pc from 'picocolors';
import {
  CheckStatus,
  DoctorCheck,
  DoctorService,
} from '../services/DoctorService';

const ICON: Record<CheckStatus, string> = {
  ok: '✓',
  warn: '⚠',
  fail: '✗',
  skip: '◦',
};
const COLOR: Record<CheckStatus, (s: string) => string> = {
  ok: pc.green,
  warn: pc.yellow,
  fail: pc.red,
  skip: pc.gray,
};

export interface DoctorOptions {
  json?: boolean;
  exitOnFail?: boolean;
  fix?: boolean;
  yes?: boolean;
  offline?: boolean;
}

/** `ags doctor` — read-only health report; `--fix` applies confirmed safe repairs. */
export class DoctorCommand {
  constructor(
    private service: DoctorService = new DoctorService(),
    private isTTY: () => boolean = () => Boolean(process.stdin.isTTY),
    private confirm: (message: string) => Promise<boolean> = async (message) =>
      (
        await inquirer.prompt([
          { type: 'confirm', name: 'ok', message, default: true },
        ])
      ).ok,
  ) {}

  async run(options: DoctorOptions = {}): Promise<void> {
    const rootDir = process.cwd();
    let checks = await this.service.runChecks({
      rootDir,
      offline: Boolean(options.offline),
    });

    if (options.fix) {
      const applied = await this.applyFixes(checks, options);
      if (applied > 0)
        checks = await this.service.runChecks({
          rootDir,
          offline: Boolean(options.offline),
        });
    }

    const report = DoctorService.toReport(checks);
    if (options.json) {
      console.log(
        JSON.stringify({
          schema_version: 1,
          kind: 'doctor.report',
          data: report,
        }),
      );
    } else {
      this.printHuman(checks, report.summary);
    }
    if (options.exitOnFail && !report.healthy) process.exitCode = 1;
  }

  private async applyFixes(
    checks: DoctorCheck[],
    options: DoctorOptions,
  ): Promise<number> {
    let applied = 0;
    for (const c of checks) {
      if (!c.fix || (c.status !== 'warn' && c.status !== 'fail')) continue;
      let go = Boolean(options.yes);
      if (!go) {
        if (options.json || !this.isTTY()) {
          if (!options.json)
            console.log(
              pc.gray(
                `  skipped fix for ${c.name} (non-interactive; pass --yes)`,
              ),
            );
          continue;
        }
        go = await this.confirm(`Fix ${c.name}: ${c.fix.description}?`);
      }
      if (!go) continue;
      await c.fix.apply();
      applied++;
      if (!options.json)
        console.log(pc.green(`  applied: ${c.fix.description}`));
    }
    return applied;
  }

  private printHuman(
    checks: DoctorCheck[],
    s: { ok: number; warn: number; fail: number; skip: number },
  ): void {
    console.log(pc.bold('ags doctor'));
    for (const c of checks) {
      const hint = c.fix ? pc.gray(' (fixable: ags doctor --fix)') : '';
      console.log(
        `  ${COLOR[c.status](ICON[c.status])} ${c.name} — ${c.evidence}${hint}`,
      );
    }
    console.log(`Summary: ${s.ok} ✓ ${s.warn} ⚠ ${s.fail} ✗ ${s.skip} ◦`);
  }
}
