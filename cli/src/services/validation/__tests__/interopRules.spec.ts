import fs from 'fs-extra';
import os from 'os';
import path from 'path';
import { afterEach, beforeEach, describe, expect, it } from 'vitest';
import {
  AgentSkillsSpecRule,
  BodySizeRule,
  NameMatchesDirectoryRule,
  parseFrontmatter,
  ReferenceLinksRule,
  TriggerPhraseRule,
} from '../interopRules';

let root: string;
beforeEach(async () => {
  root = await fs.mkdtemp(path.join(os.tmpdir(), 'interop-rules-'));
});
afterEach(async () => {
  await fs.remove(root);
});

async function skill(dir: string, content: string): Promise<string> {
  const file = path.join(root, dir, 'SKILL.md');
  await fs.outputFile(file, content);
  return file;
}

describe('parseFrontmatter', () => {
  it('returns null without frontmatter', () => {
    expect(parseFrontmatter('body only')).toBeNull();
  });
  it('parses block-scalar descriptions', () => {
    const fm = parseFrontmatter('---\nname: a\ndescription: >\n  Use when x.\n---\nbody');
    expect(fm?.description).toBe('Use when x.\n');
  });
});

describe('NameMatchesDirectoryRule', () => {
  it('passes when name equals folder', async () => {
    const f = await skill('common-owasp', '---\nname: common-owasp\ndescription: d\n---\n');
    expect((await new NameMatchesDirectoryRule().validate(await fs.readFile(f, 'utf8'), f)).passed).toBe(true);
  });
  it('fails when name differs from folder', async () => {
    const f = await skill('common-owasp', '---\nname: owasp\ndescription: d\n---\n');
    const r = await new NameMatchesDirectoryRule().validate(await fs.readFile(f, 'utf8'), f);
    expect(r.passed).toBe(false);
    expect(r.errors[0]).toBe('Frontmatter name "owasp" must equal directory name "common-owasp"');
  });
  it('defers to FrontmatterRule when name is missing', async () => {
    const f = await skill('x', '---\ndescription: d\n---\n');
    expect((await new NameMatchesDirectoryRule().validate(await fs.readFile(f, 'utf8'), f)).passed).toBe(true);
  });
});

describe('AgentSkillsSpecRule', () => {
  const run = (name: string) =>
    new AgentSkillsSpecRule().validate(`---\nname: ${name}\ndescription: d\n---\n`, '/x/SKILL.md');
  it('accepts kebab-case', async () => {
    expect((await run('react-hooks-2')).passed).toBe(true);
  });
  it.each(['React-Hooks', 'react_hooks', '-react', 'react--hooks', 'react-'])('rejects %s', async (n) => {
    const r = await run(n);
    expect(r.passed).toBe(false);
    expect(r.errors[0]).toContain('must match ^[a-z0-9]+(-[a-z0-9]+)*$');
  });
  it('rejects names over 64 characters', async () => {
    const r = await run('a'.repeat(65));
    expect(r.passed).toBe(false);
    expect(r.errors[0]).toBe('Skill name is 65 characters (> 64 limit)');
  });
});

describe('TriggerPhraseRule', () => {
  const run = (d: string) =>
    new TriggerPhraseRule().validate(`---\nname: a\ndescription: ${d}\n---\n`, '/a/SKILL.md');
  it.each(['Do X. Use when editing Y.', 'Do X. use for Y.', 'Trigger when Z.', 'Use after deploy.'])(
    'accepts %s', async (d) => {
      const r = await run(d);
      expect(r.warnings).toEqual([]);
    });
  it('warns without a trigger phrase', async () => {
    const r = await run('Standards for Angular structure.');
    expect(r.passed).toBe(true);
    expect(r.warnings).toEqual(['Description has no trigger phrase (e.g. "Use when ...")']);
  });
  it('reads block-scalar descriptions', async () => {
    const r = await new TriggerPhraseRule().validate(
      '---\nname: a\ndescription: >\n  Rules for X.\n  Use when Y.\n---\n', '/a/SKILL.md');
    expect(r.warnings).toEqual([]);
  });
});

describe('ReferenceLinksRule', () => {
  it('passes for existing local, anchored, and sibling links', async () => {
    await fs.outputFile(path.join(root, 'a', 'references', 'x.md'), 'x');
    await fs.outputFile(path.join(root, 'b', 'SKILL.md'), 'b');
    const f = await skill('a',
      '---\nname: a\ndescription: d\n---\n[x](references/x.md) [y](references/x.md#top) [b](../b/SKILL.md) [w](https://e.com) [h](#here)');
    expect((await new ReferenceLinksRule().validate(await fs.readFile(f, 'utf8'), f)).passed).toBe(true);
  });
  it('fails on a dead link', async () => {
    const f = await skill('a', '---\nname: a\ndescription: d\n---\n[gone](references/gone.md)');
    const r = await new ReferenceLinksRule().validate(await fs.readFile(f, 'utf8'), f);
    expect(r.passed).toBe(false);
    expect(r.errors).toEqual(['Dead link: references/gone.md']);
  });
  it('ignores links inside fenced code blocks', async () => {
    const f = await skill('a', '---\nname: a\ndescription: d\n---\n```md\n[gone](references/gone.md)\n```\n');
    expect((await new ReferenceLinksRule().validate(await fs.readFile(f, 'utf8'), f)).passed).toBe(true);
  });
});

describe('BodySizeRule', () => {
  const body = (bytes: number) => '---\nname: a\ndescription: d\n---\n' + 'x'.repeat(bytes);
  it('passes small files', async () => {
    const f = await skill('a', body(100));
    const r = await new BodySizeRule().validate(await fs.readFile(f, 'utf8'), f);
    expect(r).toEqual({ passed: true, errors: [], warnings: [] });
  });
  it('warns above 7168 bytes', async () => {
    const f = await skill('a', body(7300));
    const r = await new BodySizeRule().validate(await fs.readFile(f, 'utf8'), f);
    expect(r.passed).toBe(true);
    expect(r.warnings[0]).toMatch(/> 7168 bytes/);
  });
  it('errors above 8192 bytes without references/', async () => {
    const f = await skill('a', body(8300));
    const r = await new BodySizeRule().validate(await fs.readFile(f, 'utf8'), f);
    expect(r.passed).toBe(false);
    expect(r.errors[0]).toMatch(/> 8192 bytes/);
  });
  it('only warns above 8192 bytes when references/ exists', async () => {
    await fs.outputFile(path.join(root, 'a', 'references', 'r.md'), 'r');
    const f = await skill('a', body(8300));
    const r = await new BodySizeRule().validate(await fs.readFile(f, 'utf8'), f);
    expect(r.passed).toBe(true);
    expect(r.warnings.length).toBe(1);
  });
});
