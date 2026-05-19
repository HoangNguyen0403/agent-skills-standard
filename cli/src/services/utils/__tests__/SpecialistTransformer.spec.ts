import { describe, it, expect } from 'vitest';
import { SpecialistTransformer } from '../SpecialistTransformer';
import { Agent } from '../../../constants';

describe('SpecialistTransformer', () => {
  const source = {
    name: 'specialist-security-reviewer',
    content: `---
name: specialist-security-reviewer
description: "Review security"
---
# Rules
Check OWASP.`,
  };

  it('should transform for Claude (persona style)', () => {
    const result = SpecialistTransformer.transform(source, Agent.Claude);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('security-reviewer.md');
    expect(result!.content).toContain('name: security-reviewer');
    expect(result!.content).toContain('description: "Review security"');
    expect(result!.content).toContain('# Rules');
  });

  it('should transform for Cursor (rule style)', () => {
    const result = SpecialistTransformer.transform(source, Agent.Cursor);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('specialist-security-reviewer.mdc');
    expect(result!.content).toContain('description: Review security');
    expect(result!.content).toContain('globs: ["**/*"]');
    expect(result!.content).toContain('# Specialist: security-reviewer');
  });

  it('should transform for Copilot (instruction style)', () => {
    const result = SpecialistTransformer.transform(source, Agent.Copilot);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('specialist-security-reviewer.instructions.md');
    expect(result!.content).toContain('description: "Review security"');
    expect(result!.content).toContain('applyTo: "**/*"');
  });

  it('should return null for invalid content', () => {
    const result = SpecialistTransformer.transform(
      { name: 'test', content: 'no frontmatter' },
      Agent.Claude,
    );
    expect(result).toBeNull();
  });

  it('should fallback to default transformation for unknown/simple agents', () => {
    const result = SpecialistTransformer.transform(source, Agent.Roo);
    expect(result).not.toBeNull();
    expect(result!.name).toBe('security-reviewer.md');
    expect(result!.content).toContain('Check OWASP.');
  });
});
