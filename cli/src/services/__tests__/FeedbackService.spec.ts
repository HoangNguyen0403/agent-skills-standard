import { beforeEach, describe, expect, it, vi } from 'vitest';
import { FeedbackService } from '../FeedbackService';

describe('FeedbackService', () => {
  let feedbackService: FeedbackService;
  const TEST_URL = 'https://agent-skills-feedback.vercel.app';

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

    it('should include rootCause, userIntent, and skillGap in the request body when provided', async () => {
      process.env.FEEDBACK_API_URL = TEST_URL;
      const data = {
        skill: 'react/hooks',
        issue: 'Missing cleanup in useEffect',
        rootCause: 'MISSING_COVERAGE',
        userIntent: 'User asked to listen for window resize events',
        skillGap:
          'Add anti-pattern: No addEventListener without cleanup — always return teardown',
      };

      const result = await feedbackService.submit(data);

      expect(result).toBe(true);
      expect(fetch).toHaveBeenCalledWith(
        TEST_URL,
        expect.objectContaining({
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

  describe('isSafeUrl (private)', () => {
    it('should return true for allowlisted origin', async () => {
      process.env.FEEDBACK_API_URL = 'https://agent-skills-feedback.vercel.app';
      const result = await feedbackService.submit({ skill: 't', issue: 'i' });
      expect(result).toBe(true);
    });

    it('should return true for official subdomains', async () => {
      process.env.FEEDBACK_API_URL =
        'https://api.agent-skills-feedback.vercel.app';
      const result = await feedbackService.submit({ skill: 't', issue: 'i' });
      expect(result).toBe(true);
    });

    it('should return false for non-https protocols', async () => {
      process.env.FEEDBACK_API_URL = 'http://agent-skills-feedback.vercel.app';
      const result = await feedbackService.submit({ skill: 't', issue: 'i' });
      expect(result).toBe(false);
    });

    it('should return false for malformed URLs', async () => {
      process.env.FEEDBACK_API_URL = 'not-a-url';
      const result = await feedbackService.submit({ skill: 't', issue: 'i' });
      expect(result).toBe(false);
    });

    it('should return false for domains looking like the allowlisted one', async () => {
      process.env.FEEDBACK_API_URL = 'https://evil-vercel.app';
      const result = await feedbackService.submit({ skill: 't', issue: 'i' });
      expect(result).toBe(false);
    });

    it('should log warning in DEBUG mode for unsafe URLs', async () => {
      process.env.FEEDBACK_API_URL = 'https://evil.com';
      process.env.DEBUG = 'true';
      const warnSpy = vi.spyOn(console, 'warn').mockImplementation(() => {});

      const result = await feedbackService.submit({ skill: 't', issue: 'i' });

      expect(result).toBe(false);
      expect(warnSpy).toHaveBeenCalledWith(
        expect.stringContaining('Disallowed API URL origin'),
      );

      warnSpy.mockRestore();
      delete process.env.DEBUG;
    });
  });
});
