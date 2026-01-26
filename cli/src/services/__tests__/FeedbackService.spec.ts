import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FEEDBACK_API_URL } from '../../constants';
import { FeedbackService } from '../FeedbackService';

vi.mock('../../constants', () => ({
  FEEDBACK_API_URL:
    process.env.FEEDBACK_API_URL || 'https://test-api.com/feedback',
}));

global.fetch = vi.fn();

describe('FeedbackService', () => {
  let feedbackService: FeedbackService;

  beforeEach(() => {
    vi.clearAllMocks();
    feedbackService = new FeedbackService();
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
        FEEDBACK_API_URL,
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

      const callArg = vi.mocked(fetch).mock.calls[0][1];
      const body = JSON.parse(callArg?.body as string);

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

      const callArg = vi.mocked(fetch).mock.calls[0][1];
      const body = JSON.parse(callArg?.body as string);

      expect(body.skill).toBe('react/hooks');
      expect(body.issue).toBe('Minimal issue');
      expect(body.context).toBeUndefined();
      expect(body.model).toBeUndefined();
      expect(body.suggestion).toBeUndefined();
    });
  });
});
