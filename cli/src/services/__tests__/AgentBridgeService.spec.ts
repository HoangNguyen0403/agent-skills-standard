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

      // Cursor
      const cursorCall = findCall(
        '.cursor/rules/agent-skill-standard-rule.mdc',
      );
      expect(cursorCall).toBeDefined();
      expect(cursorCall![1]).toContain('globs: ["**/*"]');

      const copilotCall = findCall(
        '.github/instructions/agent-skill-standard-rule.instructions.md',
      );
      expect(copilotCall).toBeDefined();

      // ... match others implicitly via the fact that we passed all agents and forced them
      // We can check a few representative ones
      expect(findCall('.windsurf/rules')).toBeDefined();
      expect(findCall('.trae/rules')).toBeDefined();
      expect(findCall('.roo/rules')).toBeDefined();
      expect(findCall('CLAUDE.md')).toBeDefined();
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
