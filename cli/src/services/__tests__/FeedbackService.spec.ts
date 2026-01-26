import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedbackService } from '../FeedbackService';

describe('FeedbackService', () => {
  let feedbackService: FeedbackService;
  const TEST_URL = 'https://custom.com/api';

  beforeEach(() => {
    feedbackService = new FeedbackService();
    vi.stubGlobal('fetch', vi.fn().mockResolvedValue({ ok: true }));
    // Clear ENV
    delete process.env.FEEDBACK_API_URL;
  });

  describe('getApiUrl', () => {
    it('should return API URL from environment variable', () => {
      process.env.FEEDBACK_API_URL = TEST_URL;
      const url = feedbackService.getApiUrl();
      expect(url).toBe(TEST_URL);
    });

    it('should return undefined if env is missing (build-time injection handles default)', () => {
      const url = feedbackService.getApiUrl();
      expect(url).toBeUndefined();
    });
  });

  describe('submit', () => {
    it('should return false if API URL is missing', async () => {
      const result = await feedbackService.submit({ skill: 't', issue: 'i' });
      expect(result).toBe(false);
      expect(fetch).not.toHaveBeenCalled();
    });

    it('should submit feedback successfully using resolved URL', async () => {
      process.env.FEEDBACK_API_URL = TEST_URL;
      const data = {
        skill: 'react/hooks',
        issue: 'Test issue',
      };

      const result = await feedbackService.submit(data);

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        TEST_URL,
        expect.objectContaining({
          method: 'POST',
          body: JSON.stringify(data),
        }),
      );
    });

    it('should handle submission failure (non-ok response)', async () => {
      process.env.FEEDBACK_API_URL = TEST_URL;
      vi.mocked(fetch).mockResolvedValue({ ok: false } as Response);

      const result = await feedbackService.submit({
        skill: 'test',
        issue: 'fail',
      });

      expect(result).toBe(false);
    });

    it('should handle network errors', async () => {
      process.env.FEEDBACK_API_URL = TEST_URL;
      vi.mocked(fetch).mockRejectedValue(new Error('Network error'));

      const result = await feedbackService.submit({
        skill: 'test',
        issue: 'error',
      });

      expect(result).toBe(false);
    });
  });
});
