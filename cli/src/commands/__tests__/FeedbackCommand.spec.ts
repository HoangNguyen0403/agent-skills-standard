import inquirer from 'inquirer';
import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedbackService } from '../../services/FeedbackService';
import { FeedbackCommand } from '../feedback';

vi.mock('inquirer');
vi.mock('picocolors', () => ({
  default: {
    bold: vi.fn((text) => text),
    blue: vi.fn((text) => text),
    gray: vi.fn((text) => text),
    green: vi.fn((text) => text),
    red: vi.fn((text) => text),
    yellow: vi.fn((text) => text),
    cyan: vi.fn((text) => text),
  },
}));

describe('FeedbackCommand', () => {
  let feedbackCommand: FeedbackCommand;
  let mockFeedbackService: FeedbackService;
  const TEST_API_URL = 'https://test-api.com/feedback';

  beforeEach(() => {
    vi.clearAllMocks();

    mockFeedbackService = {
      submit: vi.fn().mockResolvedValue(true),
      getApiUrl: vi.fn().mockReturnValue(TEST_API_URL),
    } as unknown as FeedbackService;

    // Explicitly pass undefined to cover constructor 13
    feedbackCommand = new FeedbackCommand(undefined);
    (feedbackCommand as any).feedbackService = mockFeedbackService;

    vi.spyOn(console, 'log').mockImplementation(() => {});
  });

  describe('run - non-interactive mode', () => {
    it('should show configuration guidance if API URL is missing', async () => {
      vi.mocked(mockFeedbackService.getApiUrl).mockReturnValue(undefined);

      await feedbackCommand.run({
        skill: 'react/hooks',
        issue: 'Test issue',
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Feedback API not configured'),
      );
    });

    it('should submit feedback when all required flags are provided', async () => {
      await feedbackCommand.run({
        skill: 'react/hooks',
        issue: 'Test issue',
        model: 'Test Model',
        context: 'Test context',
        suggestion: 'Test suggestion',
      });

      expect(mockFeedbackService.submit).toHaveBeenCalledWith({
        skill: 'react/hooks',
        issue: 'Test issue',
        model: 'Test Model',
        context: 'Test context',
        suggestion: 'Test suggestion',
      });
    });

    it('should handle submission success', async () => {
      await feedbackCommand.run({
        skill: 'react/hooks',
        issue: 'Test issue',
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Feedback has been sent successfully'),
      );
    });

    it('should handle submission failure', async () => {
      vi.mocked(mockFeedbackService.submit).mockResolvedValue(false);

      await feedbackCommand.run({
        skill: 'react/hooks',
        issue: 'Test issue',
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Failed to send feedback'),
      );
    });
  });

  describe('run - interactive mode', () => {
    it('should prompt for missing required fields', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        skill: 'flutter/bloc',
        issue: 'Interactive issue',
      });

      await feedbackCommand.run({});
      expect(inquirer.prompt).toHaveBeenCalled();
    });

    it('should validate skill input', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        skill: 'flutter/bloc',
        issue: 'Interactive issue',
      });

      await feedbackCommand.run({});

      const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0] as any[];
      const skillPrompt = promptCall.find((q: any) => q.name === 'skill');

      expect(skillPrompt?.validate('')).toBe('Skill ID is required');
      expect(skillPrompt?.validate('valid')).toBe(true);
    });

    it('should validate issue input', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        skill: 'flutter/bloc',
        issue: 'Interactive issue',
      });

      await feedbackCommand.run({});

      const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0] as any[];
      const issuePrompt = promptCall.find((q: any) => q.name === 'issue');

      expect(issuePrompt?.validate('  ')).toBe('Issue description is required');
      expect(issuePrompt?.validate('valid')).toBe(true);
    });
  });
});
