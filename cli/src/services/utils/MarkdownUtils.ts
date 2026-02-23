import fs from 'fs-extra';
import path from 'path';

/**
 * Utility functions for manipulating markdown content
 */
export class MarkdownUtils {
  /**
   * Injects the generated index into target documentation files (e.g., AGENTS.md).
   * It uses HTML comments as markers for safe injection and replacement.
   * @param rootDir Project root directory
   * @param targets Array of target file names
   * @param indexContent The markdown content to inject
   */
  static async injectIndex(
    rootDir: string,
    targets: string[],
    indexContent: string,
  ): Promise<void> {
    for (const target of targets) {
      const targetPath = path.join(rootDir, target);
      let content = '';

      if (await fs.pathExists(targetPath)) {
        content = await fs.readFile(targetPath, 'utf8');
        const markerStart = '<!-- SKILLS_INDEX_START -->';
        const markerEnd = '<!-- SKILLS_INDEX_END -->';

        const startIndex = content.indexOf(markerStart);
        const endIndex = content.indexOf(markerEnd);

        if (startIndex !== -1 && endIndex !== -1 && startIndex < endIndex) {
          // Both markers exist and are in the correct order
          const preMarker = content.substring(
            0,
            startIndex + markerStart.length,
          );
          const postMarker = content.substring(endIndex);
          content = `${preMarker}\n${indexContent}\n${postMarker}`;
        } else if (startIndex !== -1 || endIndex !== -1) {
          // One of the markers is missing or they are out of order
          content = content.replace(markerStart, '').replace(markerEnd, '');
          content =
            content.trimEnd() +
            `\n\n${markerStart}\n${indexContent}\n${markerEnd}\n`;
        } else {
          // No markers found
          content =
            content.trimEnd() +
            `\n\n${markerStart}\n${indexContent}\n${markerEnd}\n`;
        }
      } else {
        content = `<!-- SKILLS_INDEX_START -->\n${indexContent}\n<!-- SKILLS_INDEX_END -->\n`;
      }

      await fs.outputFile(targetPath, content);
    }
  }
}
