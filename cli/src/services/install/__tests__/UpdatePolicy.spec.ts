import { describe, expect, it } from 'vitest';
import { isAutomaticUpgrade } from '../UpdatePolicy';

describe('isAutomaticUpgrade', () => {
  describe('same prefix and stable refs', () => {
    it('offers a newer major release', () => {
      expect(
        isAutomaticUpgrade(
          'typescript-v1.9.9',
          'typescript-v2.0.0',
          'typescript-v',
        ),
      ).toBe(true);
    });

    it('offers a newer minor release', () => {
      expect(
        isAutomaticUpgrade('react-v1.9.9', 'react-v1.10.0', 'react-v'),
      ).toBe(true);
    });

    it('offers a newer patch release', () => {
      expect(
        isAutomaticUpgrade('common-v2.9.0', 'common-v2.9.4', 'common-v'),
      ).toBe(true);
    });

    it('compares each numeric component numerically, not lexicographically', () => {
      expect(isAutomaticUpgrade('v9.0.0', 'v10.0.0', 'v')).toBe(true);
      expect(isAutomaticUpgrade('v1.9.0', 'v1.10.0', 'v')).toBe(true);
      expect(isAutomaticUpgrade('v1.0.9', 'v1.0.10', 'v')).toBe(true);
    });

    it('supports an empty tag prefix for bare semantic versions', () => {
      expect(isAutomaticUpgrade('1.0.0', '1.0.1', '')).toBe(true);
    });

    it('reuses the same rule for workflow and specialist release refs', () => {
      expect(
        isAutomaticUpgrade(
          'workflows-v1.0.0',
          'workflows-v1.1.0',
          'workflows-v',
        ),
      ).toBe(true);
      expect(
        isAutomaticUpgrade(
          'specialists-v0.9.9',
          'specialists-v1.0.0',
          'specialists-v',
        ),
      ).toBe(true);
    });

    it('compares components larger than Number.MAX_SAFE_INTEGER exactly', () => {
      expect(
        isAutomaticUpgrade(
          'common-v90071992547409998.0.0',
          'common-v90071992547409999.0.0',
          'common-v',
        ),
      ).toBe(true);
      expect(
        isAutomaticUpgrade(
          'common-v90071992547409999.0.0',
          'common-v90071992547409998.0.0',
          'common-v',
        ),
      ).toBe(false);
    });
  });

  describe('never downgrades or repeats', () => {
    it('rejects an equal ref', () => {
      expect(
        isAutomaticUpgrade('common-v2.9.4', 'common-v2.9.4', 'common-v'),
      ).toBe(false);
    });

    it('rejects a lower patch, minor, and major release', () => {
      expect(
        isAutomaticUpgrade('common-v2.9.4', 'common-v2.9.3', 'common-v'),
      ).toBe(false);
      expect(
        isAutomaticUpgrade('common-v2.9.4', 'common-v2.8.9', 'common-v'),
      ).toBe(false);
      expect(
        isAutomaticUpgrade('common-v2.9.4', 'common-v1.99.99', 'common-v'),
      ).toBe(false);
    });
  });

  describe('incomparable pins', () => {
    it('leaves undefined initial pins to the initial-pin path', () => {
      expect(isAutomaticUpgrade(undefined, 'common-v2.9.4', 'common-v')).toBe(
        false,
      );
    });

    it('rejects prerelease candidates and prerelease current pins', () => {
      expect(
        isAutomaticUpgrade('common-v2.9.4', 'common-v2.10.0-rc.1', 'common-v'),
      ).toBe(false);
      expect(
        isAutomaticUpgrade('common-v2.9.4-rc.1', 'common-v2.9.4', 'common-v'),
      ).toBe(false);
    });

    it('rejects branch, commit, and custom ref pins', () => {
      expect(isAutomaticUpgrade('main', 'common-v2.9.4', 'common-v')).toBe(
        false,
      );
      expect(
        isAutomaticUpgrade(
          'a1b2c3d4e5f60718293a4b5c6d7e8f9012345678',
          'common-v2.9.4',
          'common-v',
        ),
      ).toBe(false);
      expect(
        isAutomaticUpgrade('common-v2.9.4', 'release-candidate', 'common-v'),
      ).toBe(false);
      expect(isAutomaticUpgrade('main', 'main', '')).toBe(false);
    });

    it('rejects refs from a different tag prefix', () => {
      expect(
        isAutomaticUpgrade('typescript-v1.0.0', 'common-v2.0.0', 'common-v'),
      ).toBe(false);
      expect(isAutomaticUpgrade('common-v2.9.4', '2.10.0', 'common-v')).toBe(
        false,
      );
      expect(isAutomaticUpgrade('2.9.4', 'common-v2.10.0', 'common-v')).toBe(
        false,
      );
      expect(
        isAutomaticUpgrade(
          'common-extra-v1.0.0',
          'common-extra-v2.0.0',
          'common-v',
        ),
      ).toBe(false);
    });

    it('rejects malformed or non-canonical semantic version refs', () => {
      const prefix = 'common-v';
      expect(isAutomaticUpgrade('common-v2.9', 'common-v2.10.0', prefix)).toBe(
        false,
      );
      expect(isAutomaticUpgrade('common-v2', 'common-v2.10.0', prefix)).toBe(
        false,
      );
      expect(
        isAutomaticUpgrade('common-v2.9.0.1', 'common-v2.10.0', prefix),
      ).toBe(false);
      expect(
        isAutomaticUpgrade('common-v2.9.0', 'common-v2.09.0', prefix),
      ).toBe(false);
      expect(
        isAutomaticUpgrade('common-v2.9.0', 'common-v2.10.0-', prefix),
      ).toBe(false);
      expect(isAutomaticUpgrade('common-v2.9.0', 'common-v', prefix)).toBe(
        false,
      );
      expect(
        isAutomaticUpgrade('common-v2.9.0', 'common-v 2.10.0', prefix),
      ).toBe(false);
      expect(
        isAutomaticUpgrade('common-v2.9.0', ' common-v2.10.0', prefix),
      ).toBe(false);
      expect(isAutomaticUpgrade('common-v2.9.0', '', prefix)).toBe(false);
    });

    it('rejects refs with trailing line terminators', () => {
      const prefix = 'common-v';
      expect(
        isAutomaticUpgrade('common-v2.9.0', 'common-v2.10.0\n', prefix),
      ).toBe(false);
      expect(
        isAutomaticUpgrade('common-v2.9.0', 'common-v2.10.0\r\n', prefix),
      ).toBe(false);
      expect(
        isAutomaticUpgrade('common-v2.9.0\n', 'common-v2.10.0', prefix),
      ).toBe(false);
    });

    it('ignores build metadata for precedence but still upgrades the core', () => {
      const prefix = 'common-v';
      expect(
        isAutomaticUpgrade(
          'common-v2.9.0+build.1',
          'common-v2.9.0+build.2',
          prefix,
        ),
      ).toBe(false);
      expect(
        isAutomaticUpgrade('common-v2.9.0', 'common-v2.9.1+build.7', prefix),
      ).toBe(true);
      expect(
        isAutomaticUpgrade('common-v2.9.0+build.7', 'common-v2.10.0', prefix),
      ).toBe(true);
    });
  });
});
