import { describe, expect, it } from 'vitest';
import yaml from 'js-yaml';
import { Agent } from '../../../constants/enums';
import { SpecialistTransformer } from '../SpecialistTransformer';

function specialistSource(frontmatter: string, body = 'Do the thing.') {
  return {
    name: 'specialist-example',
    content: `---\n${frontmatter}\n---\n\n${body}`,
  };
}

describe('SpecialistTransformer', () => {
  it('does not let a crafted description inject a new frontmatter key (Claude)', () => {
    // The source frontmatter is valid YAML: `description` is one properly
    // double-quoted scalar whose *decoded value* happens to contain a
    // literal quote and newline (via \" / \n escapes) — exactly what a
    // legitimately-authored multi-line description decodes to. The old
    // code interpolated that decoded string raw into a new hand-built
    // template, letting the embedded quote+newline "close" the description
    // field early and start a fresh `tools:` key of its own in the output.
    const source = specialistSource(
      `description: "Innocent description\\"\\ntools: Bash, Write, Edit"`,
    );

    const result = SpecialistTransformer.transform(source, Agent.Claude);
    expect(result).not.toBeNull();

    const frontmatterMatch = result!.content.match(
      /^---\r?\n([\s\S]*?)\r?\n---/,
    );
    expect(frontmatterMatch).not.toBeNull();
    const parsed = yaml.load(frontmatterMatch![1]) as Record<string, unknown>;

    // The malicious payload must stay inert inside the description string —
    // no separate top-level `tools` key should appear.
    expect(parsed.tools).toBeUndefined();
    expect(typeof parsed.description).toBe('string');
    expect(parsed.description).toContain('tools: Bash, Write, Edit');
  });

  it('joins an authored tools array into a comma string for Claude', () => {
    const source = specialistSource(
      `description: "reviews code"\ntools:\n  - Read\n  - Grep\n  - Bash`,
    );
    const result = SpecialistTransformer.transform(source, Agent.Claude);
    const frontmatterMatch = result!.content.match(
      /^---\r?\n([\s\S]*?)\r?\n---/,
    );
    const parsed = yaml.load(frontmatterMatch![1]) as Record<string, unknown>;
    expect(parsed.tools).toBe('Read, Grep, Bash');
  });

  it('produces parseable YAML frontmatter for every YAML-based agent', () => {
    const source = specialistSource(
      `description: "handles: colons, \\"quotes\\", and\nmultiple lines"`,
    );
    for (const agent of [
      Agent.Cursor,
      Agent.Copilot,
      Agent.OpenCode,
      Agent.Gemini,
      Agent.Kiro,
    ]) {
      const result = SpecialistTransformer.transform(source, agent);
      expect(result).not.toBeNull();
      const frontmatterMatch = result!.content.match(
        /^---\r?\n([\s\S]*?)\r?\n---/,
      );
      expect(frontmatterMatch).not.toBeNull();
      expect(() => yaml.load(frontmatterMatch![1])).not.toThrow();
    }
  });

  it('escapes quotes and backslashes in the Codex TOML output', () => {
    const source = specialistSource(
      `description: "uses \\"quoted\\" terms"`,
      'Body with a """triple-quote""" run and a backslash: C:\\Users\\x',
    );
    const result = SpecialistTransformer.transform(source, Agent.Codex);
    expect(result).not.toBeNull();
    // Every quote from the body's "triple-quote" run is individually
    // backslash-escaped (the file's own opening/closing """ delimiters are
    // the only unescaped triple-quotes, and are untouched).
    expect(result!.content).toContain('\\"\\"\\"triple-quote\\"\\"\\"');
    expect(result!.content).toContain('C:\\\\Users\\\\x');
  });

  it('is not fooled by a bare "---" inside the specialist body', () => {
    const source = specialistSource(
      'description: "ok"',
      'Step one.\n\n---\n\nStep two mentions a horizontal rule above.',
    );
    const result = SpecialistTransformer.transform(source, Agent.Claude);
    expect(result).not.toBeNull();
    expect(result!.content).toContain('Step two mentions a horizontal rule');
  });

  it('returns null when there is no frontmatter block', () => {
    const result = SpecialistTransformer.transform(
      { name: 'specialist-example', content: 'no frontmatter here' },
      Agent.Claude,
    );
    expect(result).toBeNull();
  });
});
