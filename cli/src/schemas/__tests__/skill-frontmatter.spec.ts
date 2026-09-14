import { describe, expect, it } from 'vitest';
import { optionalSkillFieldsSchema, upstreamEntrySchema } from '../skill-frontmatter';

const github = {
  name: 'next',
  source: 'github',
  repo: 'vercel/next.js',
  pinned: '15.3.0',
  tag_pattern: '^v(\\d+\\.\\d+\\.\\d+)$',
  reviewed: '2026-06-17',
};

describe('upstreamEntrySchema', () => {
  it('accepts a github entry and a manual entry', () => {
    expect(upstreamEntrySchema.safeParse(github).success).toBe(true);
    expect(
      upstreamEntrySchema.safeParse({ name: 'ios', source: 'manual', pinned: '17', reviewed: '2026-07-09' }).success,
    ).toBe(true);
  });

  it('requires repo when source is github', () => {
    const result = upstreamEntrySchema.safeParse({ ...github, repo: undefined });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path).toEqual(['repo']);
  });

  it('accepts an optional acknowledged version string', () => {
    expect(upstreamEntrySchema.safeParse({ ...github, acknowledged: '17.2.0' }).success).toBe(true);
    expect(upstreamEntrySchema.safeParse({ ...github, acknowledged: 17 }).success).toBe(false);
  });

  it('rejects malformed reviewed dates and unknown keys', () => {
    expect(upstreamEntrySchema.safeParse({ ...github, reviewed: '17 June' }).success).toBe(false);
    expect(upstreamEntrySchema.safeParse({ ...github, extra: 1 }).success).toBe(false);
  });
});

describe('optionalSkillFieldsSchema.metadata', () => {
  it('validates upstream and passes triggers through untouched', () => {
    const fm = { metadata: { triggers: { keywords: ['x'] }, upstream: [github] } };
    const result = optionalSkillFieldsSchema.safeParse(fm);
    expect(result.success).toBe(true);
    if (result.success) {
      expect((result.data.metadata as { triggers: unknown }).triggers).toEqual({ keywords: ['x'] });
    }
  });

  it('reports the path of a bad upstream entry', () => {
    const result = optionalSkillFieldsSchema.safeParse({ metadata: { upstream: [{ ...github, source: 'npm' }] } });
    expect(result.success).toBe(false);
    if (!result.success) expect(result.error.issues[0].path.join('.')).toBe('metadata.upstream.0.source');
  });

  it('still accepts skills with no metadata block', () => {
    expect(optionalSkillFieldsSchema.safeParse({ version: '1.0.0' }).success).toBe(true);
  });
});
