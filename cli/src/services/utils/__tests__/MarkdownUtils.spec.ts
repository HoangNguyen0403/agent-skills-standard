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
      const updated = await MarkdownUtils.injectIndex(
        '/root',
        ['AGENTS.md'],
        'index content',
      );
      expect(fs.outputFile).toHaveBeenCalledWith(
        expect.stringContaining('AGENTS.md'),
        expect.stringContaining('# Project Context for AI Agents'),
      );
      expect(updated).toEqual(['AGENTS.md']);
    });

    it('should replace content between markers if they exist', async () => {
      (fs.pathExists as any).mockResolvedValue(true);
      (fs.readFile as any).mockResolvedValue(
        'pre\n<!-- SKILLS_INDEX_START -->\nold\n<!-- SKILLS_INDEX_END -->\npost',
      );
      const updated = await MarkdownUtils.injectIndex(
        '/root',
        ['AGENTS.md'],
        'new content',
      );
      const call = vi.mocked(fs.outputFile).mock.calls[0];
      expect(call[1]).toContain('new content');
      expect(call[1]).not.toContain('old');
      expect(call[1]).toContain('pre');
      expect(call[1]).toContain('post');
      expect(updated).toEqual(['AGENTS.md']);
    });

    it('should NOT inject if markers do not exist', async () => {
      (fs.pathExists as any).mockResolvedValue(true);
      (fs.readFile as any).mockResolvedValue('existing text');
      const updated = await MarkdownUtils.injectIndex(
        '/root',
        ['AGENTS.md'],
        'index content',
      );
      expect(fs.outputFile).not.toHaveBeenCalled();
      expect(updated).toEqual([]);
    });

    it('should NOT inject if markers are incomplete', async () => {
      (fs.pathExists as any).mockResolvedValue(true);
      (fs.readFile as any).mockResolvedValue(
        'pre <!-- SKILLS_INDEX_START --> mid',
      );
      const updated = await MarkdownUtils.injectIndex(
        '/root',
        ['AGENTS.md'],
        'new content',
      );
      expect(fs.outputFile).not.toHaveBeenCalled();
      expect(updated).toEqual([]);
    });

    it('should NOT inject if markers are out of order', async () => {
      (fs.pathExists as any).mockResolvedValue(true);
      (fs.readFile as any).mockResolvedValue(
        '<!-- SKILLS_INDEX_END -->\ncontent\n<!-- SKILLS_INDEX_START -->',
      );
      const updated = await MarkdownUtils.injectIndex(
        '/root',
        ['AGENTS.md'],
        'new content',
      );
      expect(fs.outputFile).not.toHaveBeenCalled();
      expect(updated).toEqual([]);
    });
  });
});

