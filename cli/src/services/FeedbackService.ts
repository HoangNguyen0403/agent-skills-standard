export interface FeedbackData {
  skill: string;
  issue: string;
  context?: string;
  model?: string;
  suggestion?: string;
}

/**
 * Service to handle automated feedback reporting via Proxy Backend.
 * Follows SOLID & KISS: Strictly handles API communication.
 */
export class FeedbackService {
  /**
   * Resolves the API URL from environment variables.
   */
  getApiUrl(): string | undefined {
    return process.env.FEEDBACK_API_URL;
  }

  /**
   * Submits feedback data to the backend for automatic GitHub Issue creation.
   * Internal proxy handles GitHub tokens, keeping client-side logic tokenless.
   *
   * @param data The feedback payload
   * @returns boolean indicating submission success
   */
  async submit(data: FeedbackData): Promise<boolean> {
    const apiUrl = this.getApiUrl();
    if (!apiUrl) return false;

    try {
      const response = await fetch(apiUrl, {
        method: 'POST',
        headers: {
          'Content-Type': 'application/json',
          'User-Agent': 'agent-skills-standard-cli',
        },
        body: JSON.stringify(data),
      });

      return response.ok;
    } catch {
      return false;
    }
  }
}
