import fs from 'fs-extra';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { MarkdownUtils } from '../MarkdownUtils';

vi.mock('fs-extra');

describe('MarkdownUtils', () => {
  beforeEach(() => {
    vi.clearAllMocks();
  });

  describe('injectIndex', () => {
    it('should create AGENTS.md if it does not exist', async () => {
      (fs.pathExists as any).mockResolvedValue(false);
      await MarkdownUtils.injectIndex('/root', ['AGENTS.md'], 'index content');
      expect(fs.outputFile).toHaveBeenCalledWith(
        expect.stringContaining('AGENTS.md'),
        expect.stringContaining('index content'),
      );
    });

    it('should replace content between markers if they exist', async () => {
      (fs.pathExists as any).mockResolvedValue(true);
      (fs.readFile as any).mockResolvedValue(
        'pre\n<!-- SKILLS_INDEX_START -->\nold\n<!-- SKILLS_INDEX_END -->\npost',
      );
      await MarkdownUtils.injectIndex('/root', ['AGENTS.md'], 'new content');
      const call = vi.mocked(fs.outputFile).mock.calls[0];
      expect(call[1]).toContain('new content');
      expect(call[1]).not.toContain('old');
      expect(call[1]).toContain('pre');
      expect(call[1]).toContain('post');
    });

    it('should append if markers do not exist', async () => {
      (fs.pathExists as any).mockResolvedValue(true);
      (fs.readFile as any).mockResolvedValue('existing text');
      await MarkdownUtils.injectIndex('/root', ['AGENTS.md'], 'index content');
      const call = vi.mocked(fs.outputFile).mock.calls[0];
      expect(call[1]).toContain('existing text');
      expect(call[1]).toContain('<!-- SKILLS_INDEX_START -->');
      expect(call[1]).toContain('index content');
    });

    it('should handle missing markers by cleaning up and appending', async () => {
      (fs.pathExists as any).mockResolvedValue(true);
      (fs.readFile as any).mockResolvedValue(
        'pre <!-- SKILLS_INDEX_START --> mid',
      );
      await MarkdownUtils.injectIndex('/root', ['AGENTS.md'], 'new content');
      const call = vi.mocked(fs.outputFile).mock.calls[0];
      // It should remove the lone marker and append a new block
      expect(call[1]).not.toContain('pre <!-- SKILLS_INDEX_START --> mid');
      expect(call[1]).toContain('pre  mid');
      expect(call[1]).toContain(
        '<!-- SKILLS_INDEX_START -->\nnew content\n<!-- SKILLS_INDEX_END -->',
      );
    });
  });
});
