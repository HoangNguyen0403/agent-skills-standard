import fs from 'fs-extra';
import path from 'path';
import pc from 'picocolors';
import { Agent, SUPPORTED_AGENTS } from '../constants';
import { SpecialistTransformer } from './utils/SpecialistTransformer';

/**
 * Service responsible for syncing specialist skills from the internal registry
 * to native agent configuration directories.
 */
export class SpecialistSyncService {
  /**
   * Syncs all specialists from a source directory to active agents.
   * @param rootDir Project root directory
   * @param agents List of agents to sync for
   * @param sourceDir Optional custom source directory for specialists
   */
  async syncSpecialists(
    rootDir: string,
    agents: Agent[],
    sourceDir?: string,
  ): Promise<void> {
    const specialistsDir =
      sourceDir || path.join(rootDir, 'skills/specialists');
    if (!(await fs.pathExists(specialistsDir))) return;

    const specialistFolders = (await fs.readdir(specialistsDir)).filter((f) => {
      return fs.statSync(path.join(specialistsDir, f)).isDirectory();
    });

    for (const agentId of agents) {
      const agentDef = SUPPORTED_AGENTS.find((a) => a.id === agentId);
      if (!agentDef || !agentDef.agentPath) continue;

      const targetDir = path.join(rootDir, agentDef.agentPath);
      await fs.ensureDir(targetDir);

      let syncedCount = 0;

      for (const folder of specialistFolders) {
        const skillPath = path.join(specialistsDir, folder, 'SKILL.md');
        if (!(await fs.pathExists(skillPath))) continue;

        const content = await fs.readFile(skillPath, 'utf8');
        const transformed = SpecialistTransformer.transform(
          { name: folder, content },
          agentId,
        );

        if (transformed) {
          const targetFile = path.join(targetDir, transformed.name);
          await fs.outputFile(targetFile, transformed.content);
          syncedCount++;
        }
      }

      if (syncedCount > 0) {
        console.log(
          pc.green(
            `  ✅ ${syncedCount} specialists synced to ${agentDef.agentPath}/ (${agentDef.name})`,
          ),
        );
      }
    }
  }
}
