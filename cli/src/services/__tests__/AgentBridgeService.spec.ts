import fs from 'fs-extra';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { Agent } from '../../constants';
import { AgentBridgeService } from '../AgentBridgeService';

vi.mock('fs-extra');

describe('AgentBridgeService', () => {
  let service: AgentBridgeService;

  beforeEach(() => {
    vi.clearAllMocks();
    service = new AgentBridgeService();
  });

  describe('bridge', () => {
    it('should create correct rule files for all supported agents', async () => {
      const rootDir = '/root';
      const agents = [
        Agent.Cursor,
        Agent.Windsurf,
        Agent.Trae,
        Agent.Roo,
        Agent.Kiro,
        Agent.Antigravity,
        Agent.Claude,
        Agent.Copilot,
      ];

      (fs.ensureDir as any).mockResolvedValue(undefined);
      // Mock pathExists to return TRUE to simulate detected agents
      (fs.pathExists as any).mockResolvedValue(true);

      await service.bridge(rootDir, agents);

      // Helper to find call for a specific path
      const findCall = (pathPart: string) =>
        vi
          .mocked(fs.outputFile)
          .mock.calls.find((call) => (call[0] as string).includes(pathPart));

      // Cursor (Path: .cursor/skills, Rule: .cursor/rules) -> ../skills/
      const cursorCall = findCall(
        '.cursor/rules/agent-skill-standard-rule.mdc',
      );
      expect(cursorCall).toBeDefined();
      expect(cursorCall![1]).toContain('globs: ["**/*"]');
      expect(cursorCall![1]).toContain(
        '(../skills/common/session-retrospective/SKILL.md)',
      );

      // Claude (Path: .claude/skills, Rule: .) -> .claude/skills/
      const claudeCall = findCall('CLAUDE.md');
      expect(claudeCall).toBeDefined();
      expect(claudeCall![1]).toContain(
        '(.claude/skills/common/session-retrospective/SKILL.md)',
      );

      // Copilot (Path: .github/skills, Rule: .github/instructions) -> ../skills/
      const copilotCall = findCall(
        '.github/instructions/agent-skill-standard-rule.instructions.md',
      );
      expect(copilotCall).toBeDefined();
      expect(copilotCall![1]).toContain('## Self-Learning Protocol');
      expect(copilotCall![1]).toContain(
        '(../skills/common/session-retrospective/SKILL.md)',
      );
      // Ensure proper newlines (not literal \n strings) for readability
      expect(copilotCall![1]).toMatch(/\n## Self-Learning Protocol/);
      expect(copilotCall![1]).toMatch(/\n## Skill Activation Protocol/);
      expect(copilotCall![1]).toContain('MANDATORY: At the start of EVERY session');

      // Check remaining
      expect(findCall('.windsurf/rules')).toBeDefined();
      expect(findCall('.trae/rules')).toBeDefined();
      expect(findCall('.roo/rules')).toBeDefined();
    });

    it('should SKIP agents if their detection files do not exist', async () => {
      const rootDir = '/root';
      const agents = [Agent.Cursor, Agent.Roo];

      // Mock pathExists to return FALSE
      (fs.pathExists as any).mockResolvedValue(false);

      await service.bridge(rootDir, agents);

      expect(fs.outputFile).not.toHaveBeenCalled();
    });

    it('should WRITE agents if their detection files exist', async () => {
      const rootDir = '/root';
      const agents = [Agent.Cursor];

      // Mock pathExists to return TRUE for .cursor detection
      (fs.pathExists as any).mockImplementation(async (p: string) => {
        if (p.endsWith('.cursor') || p.endsWith('.cursorrules')) return true;
        return false;
      });

      await service.bridge(rootDir, agents);

      expect(fs.outputFile).toHaveBeenCalledWith(
        expect.stringContaining('.cursor/rules/agent-skill-standard-rule.mdc'),
        expect.any(String),
      );
    });

    it('should ignore unknown agents', async () => {
      const rootDir = '/root';
      await service.bridge(rootDir, ['unknown-agent' as Agent]);
      expect(fs.outputFile).not.toHaveBeenCalled();
    });
  });
});
