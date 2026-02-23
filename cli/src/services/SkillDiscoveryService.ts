import fs from 'fs-extra';
import path from 'path';
import { GitService } from './GitService';

/**
 * Service for discovering skill files within the repository.
 * Handles recursive directory scanning and integration with Git for change detection.
 */
export class SkillDiscoveryService {
  private gitService = new GitService();

  /**
   * Finds all SKILL.md files in the repository.
   * @param skillsDir The directory to search within
   * @returns Array of absolute paths to skill files
   */
  async findAllSkills(skillsDir: string): Promise<string[]> {
    const skillFiles: string[] = [];

    const findRecursive = async (dir: string) => {
      try {
        const items = await fs.readdir(dir);

        for (const item of items) {
          const fullPath = path.join(dir, item);
          try {
            const stat = await fs.stat(fullPath);

            if (stat.isDirectory()) {
              await findRecursive(fullPath);
            } else if (item === 'SKILL.md') {
              skillFiles.push(fullPath);
            }
          } catch (error) {
            if (process.env.DEBUG) {
              console.warn(`Failed to stat path: ${fullPath}`, error);
            }
          }
        }
      } catch (error) {
        if (process.env.DEBUG) {
          console.warn(`Failed to read directory: ${dir}`, error);
        }
      }
    };

    if (await fs.pathExists(skillsDir)) {
      await findRecursive(skillsDir);
    }

    return skillFiles;
  }

  /**
   * Finds skills that have been changed or are untracked in Git.
   * @returns Array of absolute paths to changed skill files
   */
  async findChangedSkills(): Promise<string[]> {
    const rootDir = this.gitService.findProjectRoot();
    const changedRelative = this.gitService.getChangedFiles(rootDir);
    const untrackedRelative = this.gitService.getUntrackedFiles(rootDir);

    const isSkillFile = (file: string) =>
      file.startsWith('skills/') && file.endsWith('SKILL.md');

    const allChangedAbsolute = [...changedRelative, ...untrackedRelative]
      .filter(isSkillFile)
      .map((file) => path.join(rootDir, file));

    // Simple deduplication
    return Array.from(new Set(allChangedAbsolute));
  }
}
