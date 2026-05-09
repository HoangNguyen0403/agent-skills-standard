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
      // Mock pathExists:
      // 1. True for detection files (so agents are "detected")
      // 2. False for CLAUDE.md (so it's created via outputFile)
      (fs.pathExists as any).mockImplementation(async (p: string) => {
        if (p.endsWith('CLAUDE.md')) return false;
        return true;
      });

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
      expect(cursorCall![1]).toContain("globs: ['**/*']");
      expect(cursorCall![1]).toContain(
        '../skills/common/common-session-retrospective/SKILL.md',
      );

      // Claude (Path: .claude/skills, Rule: .)
      // We need to ensure outputFile is called for CLAUDE.md.
      // In the current implementation, bridge first checks detectionFiles.
      // Then it enters the loop and checks pathExists(claudePath).
      const claudeOutputCall = vi
        .mocked(fs.outputFile)
        .mock.calls.find((call) => (call[0] as string).endsWith('CLAUDE.md'));
      expect(claudeOutputCall).toBeDefined();
      expect(claudeOutputCall![1]).toContain('## Agent Protocol');

      // Copilot (Path: .github/skills, Rule: .github/instructions) -> ../skills/
      const copilotCall = findCall(
        '.github/instructions/agent-skill-standard-rule.instructions.md',
      );
      expect(copilotCall).toBeDefined();
      expect(copilotCall![1]).toContain('## Self-Learning Protocol');
      expect(copilotCall![1]).toContain(
        '../skills/common/common-session-retrospective/SKILL.md',
      );
      // Ensure proper newlines (not literal \n strings) for readability
      expect(copilotCall![1]).toMatch(/\n## Self-Learning Protocol/);
      expect(copilotCall![1]).toMatch(/\n## 🔄 The Mandatory State Machine/);
      expect(copilotCall![1]).toContain(
        'Your first action in ANY session MUST be a tool call',
      );
      expect(copilotCall![1]).toContain(
        'State 1: Discovery (Tool Call Required)',
      );
      expect(copilotCall![1]).toContain('State 4: Execution & Audit Log');

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

    it('should APPEND to CLAUDE.md if it exists', async () => {
      const rootDir = '/root';
      const agents = [Agent.Claude];

      (fs.pathExists as any).mockImplementation(async (p: string) => {
        if (p.endsWith('.claude')) return true;
        if (p.endsWith('CLAUDE.md')) return true;
        return false;
      });
      (fs.readFile as any).mockResolvedValue('# Existing Claude Content\n');

      await service.bridge(rootDir, agents);

      expect(fs.appendFile).toHaveBeenCalledWith(
        expect.stringContaining('CLAUDE.md'),
        expect.stringContaining('## Agent Protocol'),
      );
      expect(fs.outputFile).not.toHaveBeenCalledWith(
        expect.stringContaining('CLAUDE.md'),
        expect.any(String),
      );
    });

    it('should NOT append to CLAUDE.md if protocol already exists', async () => {
      const rootDir = '/root';
      const agents = [Agent.Claude];

      (fs.pathExists as any).mockImplementation(async (p: string) => {
        if (p.endsWith('.claude')) return true;
        if (p.endsWith('CLAUDE.md')) return true;
        return false;
      });
      (fs.readFile as any).mockResolvedValue(
        '# Existing\n## Agent Protocol\nSee AGENTS.md',
      );

      await service.bridge(rootDir, agents);

      expect(fs.appendFile).not.toHaveBeenCalled();
    });
  });
});
