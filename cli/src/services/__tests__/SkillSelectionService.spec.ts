import { describe, expect, it, vi } from 'vitest';
import { GitHubTreeItem } from '../../models/types';
import { defaultCategorySelection } from '../CategoryDefaults';
import {
  isSkillSelected,
  resolveSkillFolders,
  setSkillSelection,
  skillSelectionFingerprint,
} from '../SkillSelectionService';

function tree(...paths: string[]): GitHubTreeItem[] {
  return paths.map((path) => ({
    path,
    type: 'blob',
    sha: 'sha',
    url: `https://api.github.com/repos/test/repo/git/blobs/sha`,
  }));
}

describe('resolveSkillFolders', () => {
  it('treats an explicit empty include list as no selected skills', () => {
    const files = tree(
      'skills/react/hooks/SKILL.md',
      'skills/react/state/SKILL.md',
    );

    expect(resolveSkillFolders('react', { include: [] }, files)).toEqual([]);
  });

  it('returns every local skill for a category-wide selection', () => {
    const files = tree(
      'skills/react/hooks/SKILL.md',
      'skills/react/state/SKILL.md',
      'skills/react/references/guide.md',
    );

    expect(resolveSkillFolders('react', { ref: 'v1' }, files)).toEqual([
      'hooks',
      'state',
    ]);
  });

  it('preserves loose discovery for legacy folders without SKILL.md', () => {
    const files = tree(
      'skills/react/legacy-folder/README.md',
      'skills/react/legacy-folder/references/guide.md',
      'skills/react/references/guide.md',
      'skills/react/references',
      'skills/react/_INDEX.md',
    );

    expect(resolveSkillFolders('react', { ref: 'v1' }, files)).toEqual([
      'legacy-folder',
    ]);
    expect(resolveSkillFolders('react', { ref: 'v1' }, files, true)).toEqual(
      [],
    );
  });

  it('applies an unqualified exclusion to the declaring category only', () => {
    const files = tree(
      'skills/react/common-tdd/SKILL.md',
      'skills/react/hooks/SKILL.md',
    );

    expect(
      resolveSkillFolders('react', { exclude: ['common-tdd'] }, files),
    ).toEqual(['hooks']);
  });

  it('applies a qualified exclusion after imported wildcard expansion', () => {
    const files = tree(
      'skills/react/hooks/SKILL.md',
      'skills/common/common-tdd/SKILL.md',
      'skills/common/api-design/SKILL.md',
    );

    const folders = resolveSkillFolders(
      'react',
      { include: ['common/*'], exclude: ['common/common-tdd'] },
      files,
    );

    expect(folders).toEqual(['common/api-design']);
  });

  it('does not let a qualified imported exclusion remove a local skill with the same name', () => {
    const files = tree(
      'skills/react/common-tdd/SKILL.md',
      'skills/react/hooks/SKILL.md',
    );

    expect(
      resolveSkillFolders('react', { exclude: ['common/common-tdd'] }, files),
    ).toEqual(['common-tdd', 'hooks']);
  });

  it('keeps allowlisted imports in order and deduplicates repeats', () => {
    const files = tree(
      'skills/react/hooks/SKILL.md',
      'skills/react/state/SKILL.md',
      'skills/common/api-design/SKILL.md',
    );

    expect(
      resolveSkillFolders(
        'react',
        { include: ['state', 'common/*', 'common/api-design'] },
        files,
      ),
    ).toEqual(['state', 'common/api-design']);
  });

  it('warns and skips a qualified include that is absent from the repository', () => {
    const log = vi.spyOn(console, 'log').mockImplementation(() => {});
    const files = tree('skills/react/hooks/SKILL.md');

    expect(
      resolveSkillFolders(
        'react',
        { include: ['missing/skill', 'hooks'] },
        files,
      ),
    ).toEqual(['hooks']);
    expect(log).toHaveBeenCalledWith(
      expect.stringContaining('missing/skill not found'),
    );

    log.mockRestore();
  });

  it('selects exactly the Product Management foundation skills by default', () => {
    const files = tree(
      'skills/product-management/product-business-requirements/SKILL.md',
      'skills/product-management/product-requirements/SKILL.md',
      'skills/product-management/product-optional-research/SKILL.md',
    );

    const entry = defaultCategorySelection(
      'product-management',
      'product-management-v1.0.0',
    );

    expect(entry.ref).toBe('product-management-v1.0.0');
    expect(resolveSkillFolders('product-management', entry, files)).toEqual([
      'product-business-requirements',
      'product-requirements',
    ]);
  });

  it('keeps other categories category-wide by default', () => {
    expect(defaultCategorySelection('react', 'react-v2.0.0')).toEqual({
      ref: 'react-v2.0.0',
    });
  });
});

describe('isSkillSelected', () => {
  it('selects local members for a category-wide policy and never foreign ones', () => {
    expect(isSkillSelected('react', { ref: 'v1' }, 'react/hooks')).toBe(true);
    expect(isSkillSelected('react', { ref: 'v1' }, 'common/hooks')).toBe(false);
  });

  it('matches allowlisted local folders by identity, not display name', () => {
    const entry = { include: ['hooks'] };

    expect(isSkillSelected('react', entry, 'react/hooks')).toBe(true);
    expect(isSkillSelected('react', entry, 'hooks')).toBe(true);
    expect(isSkillSelected('react', entry, 'react/React Hooks')).toBe(false);
  });

  it('matches exact qualified imports and wildcard expressions', () => {
    expect(
      isSkillSelected(
        'react',
        { include: ['common/api-design'] },
        'common/api-design',
      ),
    ).toBe(true);
    expect(
      isSkillSelected('react', { include: ['common/*'] }, 'common/api-design'),
    ).toBe(true);
    expect(
      isSkillSelected('react', { include: ['common/*'] }, 'react/hooks'),
    ).toBe(false);
  });

  it('applies an unqualified exclusion only within the declaring category', () => {
    expect(
      isSkillSelected('react', { exclude: ['common-tdd'] }, 'react/common-tdd'),
    ).toBe(false);
    expect(
      isSkillSelected(
        'react',
        { exclude: ['common/common-tdd'] },
        'react/common-tdd',
      ),
    ).toBe(true);
  });

  it('applies a qualified exclusion to an imported wildcard member only', () => {
    const entry = {
      include: ['common/*'],
      exclude: ['common/common-tdd'],
    };

    expect(isSkillSelected('react', entry, 'common/common-tdd')).toBe(false);
    expect(isSkillSelected('react', entry, 'common/api-design')).toBe(true);
  });

  it('reports exact imported exclusion and re-enable from stored intent', () => {
    const excluded = setSkillSelection(
      'react',
      { include: ['common/api-design'] },
      'common/api-design',
      false,
    );
    expect(isSkillSelected('react', excluded, 'common/api-design')).toBe(false);

    const reenabled = setSkillSelection(
      'react',
      { include: ['common/*'], exclude: ['common/common-tdd'] },
      'common/common-tdd',
      true,
    );
    expect(isSkillSelected('react', reenabled, 'common/common-tdd')).toBe(true);
  });
});

describe('setSkillSelection', () => {
  it('adds an exact exclusion without introducing an include allowlist', () => {
    const next = setSkillSelection(
      'react',
      { ref: 'v1' },
      'react/hooks',
      false,
    );
    expect(next).toEqual({ ref: 'v1', exclude: ['hooks'] });
    expect(next.include).toBeUndefined();
  });

  it('treats reordered filters and qualified local aliases as the same policy', () => {
    expect(
      skillSelectionFingerprint({
        react: { include: ['state', 'signals'], exclude: [] },
      }),
    ).toBe(
      skillSelectionFingerprint({
        react: { include: ['react/signals', 'state'] },
      }),
    );
  });

  it('preserves empty allowlists and category-wide policy distinctions', () => {
    expect(skillSelectionFingerprint({ react: { include: [] } })).not.toBe(
      skillSelectionFingerprint({ react: {} }),
    );
    expect(
      skillSelectionFingerprint({ react: { include: ['hooks'] } }),
    ).not.toBe(skillSelectionFingerprint({ react: {} }));
  });

  it('does not add a redundant exact member when re-enabling a wildcard member', () => {
    const reenabled = setSkillSelection(
      'react',
      { include: ['react/*'], exclude: ['react/signals'] },
      'react/signals',
      true,
    );
    expect(reenabled).toEqual({ include: ['react/*'] });
  });

  it('preserves unrelated exclusions when re-enabling one included member', () => {
    const next = setSkillSelection(
      'react',
      {
        include: ['hooks', 'signals'],
        exclude: ['hooks', 'signals'],
      },
      'react/hooks',
      true,
    );

    expect(next).toEqual({
      include: ['hooks', 'signals'],
      exclude: ['signals'],
    });
  });

  it('keeps existing exclusions when another nested skill is disabled', () => {
    const next = setSkillSelection(
      'react',
      { ref: 'v1', exclude: ['hooks'] },
      'state',
      false,
    );

    expect(next.exclude).toEqual(['hooks', 'state']);
  });

  it('removes only the disabled skill from an explicit allowlist', () => {
    const next = setSkillSelection(
      'react',
      { include: ['hooks', 'state'] },
      'hooks',
      false,
    );

    expect(next.include).toEqual(['state']);
    expect(next.exclude).toBeUndefined();
  });

  it('preserves an explicit empty include list after disabling the last skill', () => {
    const next = setSkillSelection(
      'react',
      { include: ['hooks'] },
      'hooks',
      false,
    );

    expect(next.include).toEqual([]);
  });

  it('keeps a wildcard expression and records a qualified exclusion for a disabled member', () => {
    const next = setSkillSelection(
      'react',
      { include: ['common/*'] },
      'common/common-tdd',
      false,
    );

    expect(next.include).toEqual(['common/*']);
    expect(next.exclude).toEqual(['common/common-tdd']);
  });

  it('adds a selected allowlisted skill and removes its conflicting exclusion', () => {
    const next = setSkillSelection(
      'react',
      { include: ['hooks'], exclude: ['state'] },
      'state',
      true,
    );

    expect(next.include).toEqual(['hooks', 'state']);
    expect(next.exclude).toBeUndefined();
  });

  it('fills an explicit empty include list when a skill is selected', () => {
    const next = setSkillSelection('react', { include: [] }, 'hooks', true);

    expect(next.include).toEqual(['hooks']);
  });

  it('does not narrow a category-wide policy to include an imported skill', () => {
    const entry = { ref: 'v1' };

    expect(
      setSkillSelection('react', entry, 'common/api-design', true),
    ).toEqual(entry);
  });

  it('does not mutate the original entry', () => {
    const entry = { exclude: ['hooks'] };

    setSkillSelection('react', entry, 'state', false);

    expect(entry).toEqual({ exclude: ['hooks'] });
  });
});
