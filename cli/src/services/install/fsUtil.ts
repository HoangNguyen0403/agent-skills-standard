import fs from 'fs-extra';
import path from 'path';
import { toPosixRel } from './pathMatch';

/**
 * Removes empty directories upward, never the project root or a top-level dir like `.claude`.
 * Follows the depth >= 3 rule (relative path segments).
 */
export async function removeEmptyParents(rootDir: string, dir: string): Promise<void> {
  let current = dir;
  while (toPosixRel(rootDir, current).split('/').length >= 3) {
    if (!(await fs.pathExists(current))) {
      current = path.dirname(current);
      continue;
    }
    const entries = await fs.readdir(current);
    if (entries.length > 0) return;
    await fs.remove(current);
    current = path.dirname(current);
  }
}
