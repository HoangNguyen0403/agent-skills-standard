import { describe, it, expect, vi } from 'vitest';
import { SpecialistTransformer } from '../SpecialistTransformer';
import { Agent } from '../../../constants';
import * as constants from '../../../constants';

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

  describe('SpecialistTransformer branch coverage', () => {
    it('returns null if agentDef is not found', () => {
      const result = SpecialistTransformer.transform(source, 'nonexistent-agent' as any);
      expect(result).toBeNull();
    });

    it('uses fallback default description if metadata.description is missing', () => {
      const sourceWithoutDesc = {
        name: 'specialist-security-reviewer',
        content: `---
name: specialist-security-reviewer
---
Check OWASP.`,
      };
      const result = SpecialistTransformer.transform(sourceWithoutDesc, Agent.Claude);
      expect(result).not.toBeNull();
      expect(result!.content).toContain('description: "Specialist persona for security-reviewer"');
    });

    it('uses fallback extension (.md) if agentDef.ruleExtension is missing in default switch case', () => {
      const spy = vi.spyOn(constants, 'getAgentDefinition').mockReturnValue({
        id: 'mock-agent' as any,
        name: 'Mock Agent',
        // ruleExtension is missing
      } as any);

      const result = SpecialistTransformer.transform(source, 'mock-agent' as any);
      expect(result).not.toBeNull();
      expect(result!.name).toBe('security-reviewer.md');

      spy.mockRestore();
    });
  });
});
