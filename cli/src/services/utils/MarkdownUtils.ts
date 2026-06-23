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
   * @returns Array of target files that were successfully updated/created
   */
  static async injectIndex(
    rootDir: string,
    targets: string[],
    indexContent: string,
  ): Promise<string[]> {
    const updated: string[] = [];

    for (const target of targets) {
      const targetPath = path.join(rootDir, target);
      let content = '';
      const markerStart = '<!-- SKILLS_INDEX_START -->';
      const markerEnd = '<!-- SKILLS_INDEX_END -->';

      if (await fs.pathExists(targetPath)) {
        content = await fs.readFile(targetPath, 'utf8');

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
        } else {
          // No complete marker pair found - respect user file and DO NOT inject.
          // This prevents overwriting or appending to a customized AGENTS.md
          // unless the user explicitly opts in by adding markers.
          continue;
        }
      } else {
        // File does not exist - create a new one with a standard header
        content = [
          '# Project Context for AI Agents',
          '',
          'This file provides context and instructions for AI agents working in this repository.',
          '',
          markerStart,
          indexContent,
          markerEnd,
          '',
        ].join('\n');
      }

      await fs.outputFile(targetPath, content);
      updated.push(target);
    }

    return updated;
  }
}
