import path from 'path';
import { describe, expect, it } from 'vitest';
import { isOverriddenRel, toPosixRel } from '../pathMatch';

describe('pathMatch', () => {
  it('toPosixRel uses forward slashes relative to root', () => {
    expect(
      toPosixRel('/r', path.join('/r', '.claude', 'skills', 'a', 'SKILL.md')),
    ).toBe('.claude/skills/a/SKILL.md');
  });
  it.each([
    ['.claude/skills/common/x/SKILL.md', ['.claude/skills/common/x'], true],
    ['.claude/skills/common/x/SKILL.md', ['common/x'], true],
    ['.claude/skills/common/x/SKILL.md', ['x/SKILL.md'], true],
    [
      '.claude/skills/common/x/SKILL.md',
      ['.claude/skills/common/x/SKILL.md'],
      true,
    ],
    ['.claude/skills/common/xy/SKILL.md', ['common/x'], false],
    ['.claude/skills/common/x/SKILL.md', [], false],
  ])('isOverriddenRel(%s, %j) = %s', (rel, overrides, expected) => {
    expect(isOverriddenRel(rel, overrides)).toBe(expected);
  });
});
