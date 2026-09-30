import fs from 'fs-extra';
import path from 'path';

/**
 * Asserts that a target file path resides inside rootDir and that NO intermediate
 * directory or terminal file under rootDir is a symbolic link.
 *
 * Requirements:
 * - rootDir may itself be a symlink (or inside one); components under rootDir must NOT be.
 * - Both existing files and dangling symlinks must be detected via lstat.
 * - Fails closed if lexical containment is breached or if any component under rootDir is a symlink.
 *
 * @param rootDir The trusted root directory
 * @param targetPath The destination file/directory path to check
 */
export async function assertNoSymlinksUnderRoot(
  rootDir: string,
  targetPath: string,
): Promise<void> {
  const resolvedRoot = path.resolve(rootDir);
  const resolvedTarget = path.resolve(targetPath);

  // Lexical containment check
  const relative = path.relative(resolvedRoot, resolvedTarget);
  const isEscaping =
    relative === '..' ||
    relative.startsWith(`..${path.sep}`) ||
    path.isAbsolute(relative);
  if (isEscaping) {
    throw new Error(
      `Path traversal or outside target detected: "${targetPath}" is outside "${rootDir}"`,
    );
  }

  // Walk all path components strictly under rootDir
  const segments = relative.split(path.sep).filter(Boolean);
  let current = resolvedRoot;

  for (const segment of segments) {
    current = path.join(current, segment);
    try {
      const stats = await fs.lstat(current);
      if (stats.isSymbolicLink()) {
        throw new Error(
          `Symlink path component not permitted: "${current}" is a symbolic link under "${rootDir}"`,
        );
      }
    } catch (err: unknown) {
      // If error is our own symlink rejection, rethrow
      if (
        err instanceof Error &&
        err.message.includes('Symlink path component')
      ) {
        throw err;
      }
      // If the file/dir does not exist, subsequent non-existent children also won't exist.
      // Dangling symlink produces stats via lstat (lstat does not follow symlink),
      // so if ENOENT is caught, it is genuinely non-existent and not a symlink.
      if (
        err &&
        typeof err === 'object' &&
        'code' in err &&
        err.code === 'ENOENT'
      ) {
        break;
      }
      throw err;
    }
  }
}
