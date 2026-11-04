import { describe, expect, it } from 'vitest';
import {
  isBoundedAttributionFileName,
  isBoundedRelativePath,
  validateAttributionCatalog,
} from '../AttributionService';

const SHA256 = 'a'.repeat(64);
const BLOB = 'b'.repeat(40);
const COMMIT = 'c'.repeat(40);

type Json = Record<string, unknown>;

function validCatalog(): Json {
  return {
    version: 1,
    packages: {
      'demo/alpha': {
        registry: 'https://github.com/o/r',
        declaringCategory: 'demo',
        requestedRef: 'demo-v1.0.0',
        resolvedCommit: COMMIT,
        files: [
          {
            name: 'LICENSE',
            sourcePath: 'skills/demo/alpha/LICENSE',
            sourceKind: 'package',
            requestedRef: 'demo-v1.0.0',
            resolvedCommit: COMMIT,
            blobSha1: BLOB,
            sha256: SHA256,
            basis: 'release-manifest',
            destinations: [
              {
                agent: 'claude',
                path: '.claude/skills/demo/alpha/LICENSE',
                sha256: SHA256,
              },
            ],
          },
        ],
      },
    },
  };
}

const pkg = (c: Json) => (c.packages as Json)['demo/alpha'] as Json;
const file = (c: Json) => (pkg(c).files as Json[])[0];
const destination = (c: Json) => (file(c).destinations as Json[])[0];

describe('validateAttributionCatalog', () => {
  it('accepts a well-formed qualified catalog unchanged', () => {
    const catalog = validCatalog();
    expect(validateAttributionCatalog(catalog)).toEqual(catalog);
  });

  it('refuses a catalog that is not an object', () => {
    expect(() => validateAttributionCatalog('not-an-object')).toThrow(
      /must be an object/,
    );
  });

  it.each<[string, (c: Json) => void, RegExp]>([
    [
      'an unexpected root field',
      (c) => {
        c.extra = true;
      },
      /unexpected field 'extra'/,
    ],
    [
      'an unsupported version',
      (c) => {
        c.version = 2;
      },
      /unsupported version 2/,
    ],
    [
      'a non-object packages map',
      (c) => {
        c.packages = [];
      },
      /must be an object/,
    ],
    [
      'an unbounded package key',
      (c) => {
        (c.packages as Json)['../escape'] = (c.packages as Json)['demo/alpha'];
      },
      /not a bounded category\/skill key/,
    ],
    [
      'an unexpected package field',
      (c) => {
        pkg(c).extra = 1;
      },
      /unexpected field 'extra'/,
    ],
    [
      'an invalid declaringCategory',
      (c) => {
        pkg(c).declaringCategory = '../x';
      },
      /invalid declaringCategory/,
    ],
    [
      'a missing declaringCategory',
      (c) => {
        delete pkg(c).declaringCategory;
      },
      /invalid declaringCategory/,
    ],
    [
      'an empty file list',
      (c) => {
        pkg(c).files = [];
      },
      /no attribution files/,
    ],
    [
      'an empty registry',
      (c) => {
        pkg(c).registry = '';
      },
      /invalid registry/,
    ],
    [
      'an unresolved package commit',
      (c) => {
        pkg(c).resolvedCommit = 'main';
      },
      /invalid resolvedCommit/,
    ],
    [
      'an unexpected file field',
      (c) => {
        file(c).extra = 1;
      },
      /unexpected field 'extra'/,
    ],
    [
      'a non-attribution installed filename',
      (c) => {
        file(c).name = 'README.md';
      },
      /invalid installed filename/,
    ],
    [
      'a source path that escapes the repository',
      (c) => {
        file(c).sourcePath = '../LICENSE';
      },
      /unsafe sourcePath/,
    ],
    [
      'an unknown source kind',
      (c) => {
        file(c).sourceKind = 'url';
      },
      /invalid sourceKind/,
    ],
    [
      'an unknown verification basis',
      (c) => {
        file(c).basis = 'trust-me';
      },
      /invalid verification basis/,
    ],
    [
      'a file with no destinations',
      (c) => {
        file(c).destinations = [];
      },
      /no published destinations/,
    ],
    [
      'a blob identity that is not a Git SHA-1',
      (c) => {
        file(c).blobSha1 = 'z'.repeat(40);
      },
      /invalid blobSha1/,
    ],
    [
      'a malformed file digest',
      (c) => {
        file(c).sha256 = 'abc';
      },
      /invalid sha256/,
    ],
    [
      'an unexpected destination field',
      (c) => {
        destination(c).extra = 1;
      },
      /unexpected field 'extra'/,
    ],
    [
      'an empty destination agent',
      (c) => {
        destination(c).agent = '';
      },
      /invalid destination agent/,
    ],
    [
      'an absolute destination path',
      (c) => {
        destination(c).path = '/etc/passwd';
      },
      /unsafe destination path/,
    ],
    [
      'a malformed destination digest',
      (c) => {
        destination(c).sha256 = 'nope';
      },
      /invalid destination sha256/,
    ],
    [
      'a duplicate installed filename that differs only by case',
      (c) => {
        const files = pkg(c).files as Json[];
        files.push({ ...files[0], name: 'license' });
      },
      /duplicate installed filename/,
    ],
  ])('refuses %s', (_label, edit, message) => {
    const catalog = validCatalog();
    edit(catalog);
    expect(() => validateAttributionCatalog(catalog)).toThrow(message);
  });
});

describe('isBoundedRelativePath', () => {
  it.each([
    ['a nested relative path', 'a/b/LICENSE', true],
    ['an empty string', '', false],
    ['a non-string', 42, false],
    ['a NUL byte', 'a\0b', false],
    ['a backslash', 'a\\b', false],
    ['an absolute path', '/a/b', false],
    ['a non-normalized path', 'a//b', false],
    ['a parent traversal segment', 'a/../b', false],
    ['a leading parent traversal', '../a', false],
  ])('classifies %s', (_label, value, expected) => {
    expect(isBoundedRelativePath(value)).toBe(expected);
  });
});

describe('isBoundedAttributionFileName', () => {
  it.each([
    ['LICENSE', true],
    ['license.md', true],
    ['NOTICE.txt', true],
    ['LICENSE.pdf', false],
    ['docs/LICENSE', false],
    [42, false],
  ])('classifies %s', (value, expected) => {
    expect(isBoundedAttributionFileName(value)).toBe(expected);
  });
});
