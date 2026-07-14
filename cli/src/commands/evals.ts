import pc from 'picocolors';
import {
  listEvalRuns,
  readEvalsReport,
  verifyEvalRun,
} from '../services/EvalsVerifier';

/**
 * Command for verifying and displaying live skill-eval runs
 * (see docs/EVALS.md and the `evals-run` workflow for how runs are produced).
 */
export class EvalsCommand {
  async run(
    action: string,
    options: { run?: string } = {},
    projectRoot: string = process.cwd(),
  ) {
    switch (action) {
      case 'verify':
        return this.verify(options.run, projectRoot);
      case 'report':
        return this.report(projectRoot);
      default:
        console.error(
          pc.red(`Unknown evals action "${action}". Use: verify | report`),
        );
        process.exit(1);
    }
  }

  private async verify(runId: string | undefined, projectRoot: string) {
    const runIds = runId ? [runId] : listEvalRuns(projectRoot);

    if (runIds.length === 0) {
      console.log(
        pc.yellow(
          'No eval runs found under benchmarks/evals/runs/. Run the `evals-run` workflow first (see docs/EVALS.md).',
        ),
      );
      return;
    }

    let anyFailed = false;
    for (const id of runIds) {
      const outcome = verifyEvalRun(projectRoot, id);
      if (outcome.ok) {
        console.log(pc.green(`✅ ${id}: verified`));
      } else {
        anyFailed = true;
        console.log(pc.red(`❌ ${id}: ${outcome.reason}`));
        for (const d of outcome.diffs || []) {
          console.log(pc.red(`   - ${d}`));
        }
      }
    }

    if (anyFailed) process.exit(1);
  }

  private async report(projectRoot: string) {
    const report = readEvalsReport(projectRoot);
    if (!report) {
      console.log(
        pc.yellow(
          'No evals-report.md found at the project root yet. Run the `evals-run` workflow (see docs/EVALS.md), then `pnpm evals:report`.',
        ),
      );
      return;
    }
    console.log(report);
  }
}
