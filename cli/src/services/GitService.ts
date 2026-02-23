import { execSync } from 'child_process';
import fs from 'fs-extra';
import path from 'path';

/**
 * Service for handling Git operations within the project.
 * Provides a clean interface for querying changed and untracked files.
 */
export class GitService {
  /**
   * Finds the root of the project by looking for .git or pnpm-workspace.yaml.
   */
  findProjectRoot(startDir: string = process.cwd()): string {
    let currentDir = startDir;
    while (currentDir !== path.parse(currentDir).root) {
      if (
        fs.existsSync(path.join(currentDir, 'pnpm-workspace.yaml')) ||
        fs.existsSync(path.join(currentDir, '.git'))
      ) {
        return currentDir;
      }
      currentDir = path.dirname(currentDir);
    }
    return startDir;
  }

  /**
   * Retrieves a list of files that have changed compared to the base branch or HEAD.
   * Handles both CI (GitHub Actions) and local development environments.
   * @param rootDir The root directory of the repository
   * @returns Array of relative file paths
   */
  getChangedFiles(rootDir: string): string[] {
    try {
      let gitCommand: string;

      if (process.env.GITHUB_BASE_REF) {
        // CI environment: Compare against the base branch
        try {
          execSync(
            `git fetch origin ${process.env.GITHUB_BASE_REF} --depth=1`,
            {
              cwd: rootDir,
              stdio: 'ignore',
            },
          );
        } catch {
          // Ignore fetch failures
        }
        gitCommand = `git diff --name-only origin/${process.env.GITHUB_BASE_REF}...HEAD`;
      } else {
        // Local environment: Compare against HEAD
        gitCommand = 'git diff --name-only HEAD';
      }

      const output = execSync(gitCommand, { cwd: rootDir, encoding: 'utf8' });
      return output
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f !== '' && fs.existsSync(path.join(rootDir, f)));
    } catch (error) {
      if (process.env.DEBUG) {
        console.warn('Git failure while getting changed files:', error);
      }
      return [];
    }
  }

  /**
   * Retrieves a list of untracked files in the repository.
   * @param rootDir The root directory of the repository
   * @returns Array of relative file paths
   */
  getUntrackedFiles(rootDir: string): string[] {
    try {
      const output = execSync('git ls-files --others --exclude-standard', {
        cwd: rootDir,
        encoding: 'utf8',
      });
      return output
        .split('\n')
        .map((f) => f.trim())
        .filter((f) => f !== '' && fs.existsSync(path.join(rootDir, f)));
    } catch (error) {
      if (process.env.DEBUG) {
        console.warn('Git failure while getting untracked files:', error);
      }
      return [];
    }
  }
}
