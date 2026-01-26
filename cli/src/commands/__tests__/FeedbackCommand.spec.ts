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
  },
}));

describe('FeedbackCommand', () => {
  let feedbackCommand: FeedbackCommand;
  let mockFeedbackService: FeedbackService;

  beforeEach(() => {
    vi.clearAllMocks();

    mockFeedbackService = {
      submit: vi.fn().mockResolvedValue(true),
    } as unknown as FeedbackService;

    feedbackCommand = new FeedbackCommand(mockFeedbackService);

    vi.spyOn(console, 'log').mockImplementation(() => {});

    // Ensure env var is set by default for other tests
    process.env.FEEDBACK_API_URL = 'https://test-api.com/feedback';
  });

  describe('run - non-interactive mode', () => {
    it('should show configuration guidance if FEEDBACK_API_URL is missing', async () => {
      const originalEnv = process.env.FEEDBACK_API_URL;
      delete process.env.FEEDBACK_API_URL;

      await feedbackCommand.run({
        skill: 'react/hooks',
        issue: 'Test issue',
      });

      expect(console.log).toHaveBeenCalledWith(
        expect.stringContaining('Feedback API not configured'),
      );
      expect(mockFeedbackService.submit).not.toHaveBeenCalled();

      // Restore env
      process.env.FEEDBACK_API_URL = originalEnv;
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
        model: 'Interactive Model',
        context: 'Interactive context',
        suggestion: 'Interactive suggestion',
      });

      await feedbackCommand.run({});

      expect(inquirer.prompt).toHaveBeenCalled();
      expect(mockFeedbackService.submit).toHaveBeenCalledWith({
        skill: 'flutter/bloc',
        issue: 'Interactive issue',
        model: 'Interactive Model',
        context: 'Interactive context',
        suggestion: 'Interactive suggestion',
      });
    });

    it('should only prompt for missing fields', async () => {
      vi.mocked(inquirer.prompt).mockResolvedValue({
        issue: 'Prompted issue',
      });

      await feedbackCommand.run({
        skill: 'react/hooks',
      });

      const promptCall = vi.mocked(inquirer.prompt).mock.calls[0][0] as any[];
      const skillPrompt = promptCall.find((q: any) => q.name === 'skill');

      expect(skillPrompt?.when).toBe(false);
    });
  });
});
