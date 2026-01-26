import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedbackService } from '../FeedbackService';

global.fetch = vi.fn();

describe('FeedbackService', () => {
  let feedbackService: FeedbackService;
  const TEST_API_URL = 'https://test-api.com/feedback';

  beforeEach(() => {
    vi.clearAllMocks();
    feedbackService = new FeedbackService();
    // Ensure the environment variable is cleared for fallback tests
    delete process.env.FEEDBACK_API_URL;
  });

  describe('getApiUrl', () => {
    it('should return API URL from environment variable', () => {
      process.env.FEEDBACK_API_URL = TEST_API_URL;
      const url = feedbackService.getApiUrl();
      expect(url).toBe(TEST_API_URL);
    });

    it('should return undefined if env is missing', () => {
      const url = feedbackService.getApiUrl();
      expect(url).toBeUndefined();
    });
  });

  describe('submit', () => {
    it('should submit feedback successfully using resolved URL', async () => {
      process.env.FEEDBACK_API_URL = TEST_API_URL;
      vi.mocked(fetch).mockResolvedValue({
        ok: true,
      } as Response);

      const result = await feedbackService.submit({
        skill: 'react/hooks',
        issue: 'Test issue',
      });

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        TEST_API_URL,
        expect.objectContaining({
          method: 'POST',
          body: expect.stringContaining('react/hooks'),
        }),
      );
    });

    it('should return false if API URL is missing', async () => {
      const result = await feedbackService.submit({
        skill: 'react/hooks',
        issue: 'Test issue',
      });
      expect(result).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should handle submission failure (non-ok response)', async () => {
      process.env.FEEDBACK_API_URL = TEST_API_URL;
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
      process.env.FEEDBACK_API_URL = TEST_API_URL;
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const result = await feedbackService.submit({
        skill: 'react/hooks',
        issue: 'Test issue',
      });

      expect(result).toBe(false);
    });
  });
});
