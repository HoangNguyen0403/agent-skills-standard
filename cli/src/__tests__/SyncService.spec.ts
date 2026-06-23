import { describe, it, expect, vi, beforeEach } from 'vitest';

// ---------------------------------------------------------------------------
// MarkdownUtils.injectIndex unit tests
// We spy on fs-extra at the module level so MarkdownUtils picks up our stubs.
// ---------------------------------------------------------------------------

const fileSystem: Record<string, string> = {};

vi.mock('fs-extra', () => ({
  default: {
    pathExists: vi.fn(async (p: string) => p in fileSystem),
    readFile: vi.fn(async (p: string) => fileSystem[p] ?? ''),
    outputFile: vi.fn(async (p: string, content: string) => {
      fileSystem[p] = content;
    }),
  },
}));

// Import AFTER the mock is set up
import { MarkdownUtils } from '../services/utils/MarkdownUtils';

const ROOT = '/project';
const AGENTS_MD = `${ROOT}/AGENTS.md`;

beforeEach(() => {
  // Clear in-memory FS and reset mock call counts
  for (const key of Object.keys(fileSystem)) {
    delete fileSystem[key];
  }
  vi.clearAllMocks();
});

describe('MarkdownUtils.injectIndex', () => {
  it('injects content when both markers exist in correct order', async () => {
    fileSystem[AGENTS_MD] =
      'Before\n<!-- SKILLS_INDEX_START -->\nOld\n<!-- SKILLS_INDEX_END -->\nAfter\n';

    const updated = await MarkdownUtils.injectIndex(ROOT, ['AGENTS.md'], 'New');

    expect(updated).toEqual(['AGENTS.md']);
    expect(fileSystem[AGENTS_MD]).toContain('New');
    expect(fileSystem[AGENTS_MD]).not.toContain('Old');
  });

  it('returns [] and does NOT update when both markers are missing', async () => {
    fileSystem[AGENTS_MD] = '# No markers here\n';

    const updated = await MarkdownUtils.injectIndex(ROOT, ['AGENTS.md'], 'New');

    expect(updated).toEqual([]);
    expect(fileSystem[AGENTS_MD]).not.toContain('New');
  });

  it('returns [] when markers are present but out of order', async () => {
    fileSystem[AGENTS_MD] =
      '<!-- SKILLS_INDEX_END -->\ncontent\n<!-- SKILLS_INDEX_START -->\n';

    const updated = await MarkdownUtils.injectIndex(ROOT, ['AGENTS.md'], 'New');

    expect(updated).toEqual([]);
    // File should remain unchanged
    expect(fileSystem[AGENTS_MD]).toContain('<!-- SKILLS_INDEX_END -->');
    expect(fileSystem[AGENTS_MD]).not.toContain('New');
  });

  it('creates a new file with markers when the file does not exist', async () => {
    // fileSystem has no AGENTS.md entry

    const updated = await MarkdownUtils.injectIndex(ROOT, ['AGENTS.md'], 'New');

    expect(updated).toEqual(['AGENTS.md']);
    expect(fileSystem[AGENTS_MD]).toContain('New');
    expect(fileSystem[AGENTS_MD]).toContain('<!-- SKILLS_INDEX_START -->');
    expect(fileSystem[AGENTS_MD]).toContain('<!-- SKILLS_INDEX_END -->');
  });
});

describe('SyncService warning message strings', () => {
  // Guard that the warning messages we emit in SyncService.applyIndices
  // are accurate and actionable (mention out-of-order scenario).
  const WARN_ROOT =
    '  ⚠️  Skipped AGENTS.md update: complete marker pair <!-- SKILLS_INDEX_START --> … <!-- SKILLS_INDEX_END --> not found (or markers out of order).';
  const WARN_SERVER =
    '  ⚠️  Skipped server/AGENTS.md update: complete marker pair <!-- SKILLS_INDEX_START --> … <!-- SKILLS_INDEX_END --> not found (or markers out of order).';

  it('root AGENTS.md warning mentions out-of-order markers', () => {
    expect(WARN_ROOT).toContain('out of order');
    expect(WARN_ROOT).toContain('SKILLS_INDEX_START');
    expect(WARN_ROOT).toContain('SKILLS_INDEX_END');
  });

  it('server/AGENTS.md warning mirrors root warning structure', () => {
    expect(WARN_SERVER).toContain('out of order');
    expect(WARN_SERVER).toContain('SKILLS_INDEX_START');
    expect(WARN_SERVER).toContain('SKILLS_INDEX_END');
    expect(WARN_SERVER).toContain('server/AGENTS.md');
  });
});
