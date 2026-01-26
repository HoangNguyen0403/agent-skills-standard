export interface FeedbackData {
  // Required fields
  skill: string;
  issue: string;

  // Optional - User/AI provided
  context?: string;
  model?: string;
  suggestion?: string;

  // Optional - AI self-report (for automation)
  skillInstruction?: string; // Exact quote from skill
  actualAction?: string; // What AI did instead
  decisionReason?: string; // Why AI chose this approach

  // Optional - Platform-provided (future)
  loadedSkills?: string; // Comma-separated list of active skills
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
