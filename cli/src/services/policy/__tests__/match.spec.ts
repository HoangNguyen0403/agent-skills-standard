import { describe, expect, it } from 'vitest';
import { matchesPattern, normalizePath } from '../match';

describe('policy match', () => {
  describe('normalizePath', () => {
    it('converts Windows backslashes to forward slashes', () => {
      expect(normalizePath('a\\b\\c.ts')).toBe('a/b/c.ts');
    });

    it('strips leading ./', () => {
      expect(normalizePath('./src/index.ts')).toBe('src/index.ts');
      expect(normalizePath('././src/index.ts')).toBe('src/index.ts');
    });

    it('handles mixed Windows separators and leading .\\', () => {
      expect(normalizePath('.\\src\\index.ts')).toBe('src/index.ts');
    });
  });

  describe('matchesPattern', () => {
    describe('Review Focus cases', () => {
      it('matches pattern without slash in nested directories', () => {
        expect(matchesPattern('.env*', 'a/b/.env.local')).toBe(true);
        expect(matchesPattern('.env*', '.env')).toBe(true);
        expect(matchesPattern('.env*', 'config/.env.production')).toBe(true);
        expect(matchesPattern('.env*', 'a/b/not-env')).toBe(false);
      });

      it('src/*.ts does not match src/a/b.ts', () => {
        expect(matchesPattern('src/*.ts', 'src/a/b.ts')).toBe(false);
        expect(matchesPattern('src/*.ts', 'src/b.ts')).toBe(true);
      });

      it('src/**/*.ts matches src/b.ts and src/a/b.ts', () => {
        expect(matchesPattern('src/**/*.ts', 'src/b.ts')).toBe(true);
        expect(matchesPattern('src/**/*.ts', 'src/a/b.ts')).toBe(true);
        expect(matchesPattern('src/**/*.ts', 'src/a/x/b.ts')).toBe(true);
        expect(matchesPattern('src/**/*.ts', 'other/b.ts')).toBe(false);
      });
    });

    describe('wildcards and edge cases', () => {
      it('** alone matches everything', () => {
        expect(matchesPattern('**', 'a/b/c.ts')).toBe(true);
        expect(matchesPattern('**', 'index.ts')).toBe(true);
        expect(matchesPattern('**', '')).toBe(true);
      });

      it('? matches a single char within a segment', () => {
        expect(matchesPattern('a/?.ts', 'a/b.ts')).toBe(true);
        expect(matchesPattern('a/?.ts', 'a/1.ts')).toBe(true);
        expect(matchesPattern('a/?.ts', 'a/bb.ts')).toBe(false);
        expect(matchesPattern('a/?.ts', 'a/.ts')).toBe(false);
        expect(matchesPattern('a/?.ts', 'a/b/c.ts')).toBe(false);
      });

      it('is case-sensitive', () => {
        expect(matchesPattern('src/A.ts', 'src/a.ts')).toBe(false);
        expect(matchesPattern('src/A.ts', 'src/A.ts')).toBe(true);
        expect(matchesPattern('src/*.TS', 'src/file.ts')).toBe(false);
      });

      it('handles ./ prefix in pattern and path', () => {
        expect(matchesPattern('./src/*.ts', 'src/b.ts')).toBe(true);
        expect(matchesPattern('src/*.ts', './src/b.ts')).toBe(true);
        expect(matchesPattern('./src/*.ts', './src/b.ts')).toBe(true);
      });

      it('handles Windows separators in pattern and path', () => {
        expect(matchesPattern('src\\*.ts', 'src/b.ts')).toBe(true);
        expect(matchesPattern('src/*.ts', 'src\\b.ts')).toBe(true);
        expect(matchesPattern('src\\**\\*.ts', 'src\\a\\b.ts')).toBe(true);
      });

      it('handles trailing **', () => {
        expect(matchesPattern('internal/gen/**', 'internal/gen/x.go')).toBe(
          true,
        );
        expect(matchesPattern('internal/gen/**', 'internal/gen/a/b/c.go')).toBe(
          true,
        );
        expect(matchesPattern('internal/gen/**', 'internal/gen')).toBe(true);
        expect(matchesPattern('internal/gen/**', 'internal/gen_other')).toBe(
          false,
        );
      });

      it('handles leading **', () => {
        expect(matchesPattern('**/*.ts', 'b.ts')).toBe(true);
        expect(matchesPattern('**/*.ts', 'a/b.ts')).toBe(true);
        expect(matchesPattern('**/*.ts', 'a/b/c.ts')).toBe(true);
        expect(matchesPattern('**/*.ts', 'b.js')).toBe(false);
      });
    });
  });
});
