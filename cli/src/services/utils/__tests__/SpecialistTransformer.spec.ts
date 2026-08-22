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

  describe('permission projection', () => {
    const withRiskTier = (riskTier: string, extra = '') =>
      specialistSource(
        `description: "reviews code"\nrisk_tier: ${riskTier}${extra}`,
      );

    it('projects allowed-tools onto Claude tools: when metadata.tools is absent', () => {
      const source = specialistSource(
        `description: "reviews code"\nallowed-tools:\n  - Read\n  - Grep`,
      );
      const result = SpecialistTransformer.transform(source, Agent.Claude);
      const fm = yaml.load(
        result!.content.match(/^---\r?\n([\s\S]*?)\r?\n---/)![1],
      ) as Record<string, unknown>;
      expect(fm.tools).toBe('Read, Grep');
    });

    it('prefers an explicit metadata.tools over allowed-tools on Claude', () => {
      const source = specialistSource(
        `description: "reviews code"\ntools: Bash\nallowed-tools:\n  - Read`,
      );
      const result = SpecialistTransformer.transform(source, Agent.Claude);
      const fm = yaml.load(
        result!.content.match(/^---\r?\n([\s\S]*?)\r?\n---/)![1],
      ) as Record<string, unknown>;
      expect(fm.tools).toBe('Bash');
    });

    it('maps risk_tier L0/L1 to Codex sandbox_mode "read-only"', () => {
      const result = SpecialistTransformer.transform(
        withRiskTier('L1'),
        Agent.Codex,
      );
      expect(result!.content).toContain('sandbox_mode = "read-only"');
    });

    it('maps risk_tier L2/L3 to Codex sandbox_mode "workspace-write", never auto-escalating to danger-full-access', () => {
      const l2 = SpecialistTransformer.transform(
        withRiskTier('L2'),
        Agent.Codex,
      );
      expect(l2!.content).toContain('sandbox_mode = "workspace-write"');
      expect(l2!.content).not.toContain('danger-full-access');

      const l3 = SpecialistTransformer.transform(
        withRiskTier('L3'),
        Agent.Codex,
      );
      expect(l3!.content).toContain('sandbox_mode = "workspace-write"');
      expect(l3!.content).not.toContain('danger-full-access');
    });

    it('flags unenforceable allowed-tools/permissions in a Codex TOML comment', () => {
      const source = specialistSource(
        `description: "reviews code"\nrisk_tier: L2\nallowed-tools:\n  - Bash`,
      );
      const result = SpecialistTransformer.transform(source, Agent.Codex);
      expect(result!.content).toContain('# ags:');
      expect(result!.content).toContain('allowed-tools');
    });

    it('does not add a warning comment for Codex when only risk_tier is declared', () => {
      const result = SpecialistTransformer.transform(
        withRiskTier('L2'),
        Agent.Codex,
      );
      expect(result!.content).not.toContain('# ags:');
    });

    it('prepends a visible warning comment on platforms that cannot express risk_tier/permissions', () => {
      for (const agent of [
        Agent.Cursor,
        Agent.Copilot,
        Agent.OpenCode,
        Agent.Gemini,
        Agent.Kiro,
      ]) {
        const result = SpecialistTransformer.transform(
          withRiskTier('L2'),
          agent,
        );
        expect(result!.content).toContain(
          '<!-- ags: permissions not enforceable on',
        );
        expect(result!.content).toContain('risk_tier: L2');
      }
    });

    it('adds no warning comment on those platforms when nothing risk-relevant is declared', () => {
      const source = specialistSource('description: "reviews code"');
      for (const agent of [Agent.Cursor, Agent.Copilot, Agent.Gemini]) {
        const result = SpecialistTransformer.transform(source, agent);
        expect(result!.content).not.toContain('ags: permissions');
      }
    });
  });
});
