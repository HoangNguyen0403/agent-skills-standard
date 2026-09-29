import path from 'node:path';
import { Agent } from '../../cli/src/constants';
import { SpecialistSyncService } from '../../cli/src/services/SpecialistSyncService';

/**
 * Emit specialist sub-agents for OpenCode into targetDir.
 */
export async function emitSpecialists(
  targetDir: string,
  repoRoot: string,
): Promise<number> {
  const specialistsDir = path.join(repoRoot, 'skills', 'specialists');
  const service = new SpecialistSyncService();
  return service.syncSpecialists(targetDir, [Agent.OpenCode], specialistsDir);
}

async function main() {
  const targetDir = process.argv[2];
  if (!targetDir) {
    console.error('Usage: emit-specialists.ts <target-dir>');
    process.exit(1);
  }
  const repoRoot = path.resolve(__dirname, '../..');
  await emitSpecialists(targetDir, repoRoot);
}

if (process.argv[1] && process.argv[1].endsWith('emit-specialists.ts')) {
  main().catch((err) => {
    console.error(err);
    process.exit(1);
  });
}
