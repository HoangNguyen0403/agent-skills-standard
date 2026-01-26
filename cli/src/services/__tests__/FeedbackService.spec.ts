import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedbackService } from '../FeedbackService';

global.fetch = vi.fn();

describe('FeedbackService', () => {
  let feedbackService: FeedbackService;
  const TEST_API_URL = 'https://test-api.com/feedback';

  beforeEach(() => {
    vi.clearAllMocks();
    feedbackService = new FeedbackService();
    // Ensure the environment variable is set for the tests
    process.env.FEEDBACK_API_URL = TEST_API_URL;
  });

  describe('submit', () => {
    it('should submit feedback successfully', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
      } as Response);

      const result = await feedbackService.submit({
        skill: 'react/hooks',
        issue: 'Test issue',
        context: 'React 18',
        model: 'Test Model',
        suggestion: 'Test suggestion',
      });

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        TEST_API_URL,
        expect.objectContaining({
          method: 'POST',
          headers: expect.objectContaining({
            'Content-Type': 'application/json',
            'User-Agent': 'agent-skills-standard-cli',
          }),
          body: JSON.stringify({
            skill: 'react/hooks',
            issue: 'Test issue',
            context: 'React 18',
            model: 'Test Model',
            suggestion: 'Test suggestion',
          }),
        }),
      );
    });

    it('should handle submission failure (non-ok response)', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: false,
        status: 500,
      } as Response);

      const result = await feedbackService.submit({
        skill: 'react/hooks',
        issue: 'Test issue',
      });

      expect(result).toBe(false);
    });

    it('should return false if FEEDBACK_API_URL is missing', async () => {
      const original = process.env.FEEDBACK_API_URL;
      delete process.env.FEEDBACK_API_URL;

      const result = await feedbackService.submit({
        skill: 'react/hooks',
        issue: 'Test issue',
      });

      expect(result).toBe(false);
      expect(fetch).not.toHaveBeenCalled();

      process.env.FEEDBACK_API_URL = original;
    });

    it('should handle network errors', async () => {
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const result = await feedbackService.submit({
        skill: 'react/hooks',
        issue: 'Test issue',
      });

      expect(result).toBe(false);
    });

    it('should include optional fields when provided', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
      } as Response);

      await feedbackService.submit({
        skill: 'flutter/bloc',
        issue: 'BuildContext issue',
        context: 'Flutter 3.16',
        model: 'Claude 3.5 Sonnet',
        suggestion: 'Add SafeBuildContext pattern',
      });

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body).toEqual({
        skill: 'flutter/bloc',
        issue: 'BuildContext issue',
        context: 'Flutter 3.16',
        model: 'Claude 3.5 Sonnet',
        suggestion: 'Add SafeBuildContext pattern',
      });
    });

    it('should work with minimal required fields', async () => {
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
      } as Response);

      const result = await feedbackService.submit({
        skill: 'react/hooks',
        issue: 'Minimal issue',
      });

      expect(result).toBe(true);

      const callArgs = vi.mocked(fetch).mock.calls[0];
      const body = JSON.parse(callArgs[1]?.body as string);

      expect(body.skill).toBe('react/hooks');
      expect(body.issue).toBe('Minimal issue');
      expect(body.context).toBeUndefined();
      expect(body.model).toBeUndefined();
      expect(body.suggestion).toBeUndefined();
    });
  });
});
