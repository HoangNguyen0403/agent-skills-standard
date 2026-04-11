/**
 * Structure of the feedback data payload submitted to the backend.
 * Contains both required issue details and optional context gathered by the AI.
 */
export interface FeedbackData {
  /** The specific skill ID that had the issue */
  skill: string;
  /** Detailed description of the problem */
  issue: string;

  /** Multi-line context about where the error occurred */
  context?: string;
  /** The AI model used when the issue was detected */
  model?: string;
  /** Proposed fix or improvement */
  suggestion?: string;

  /** Exact instruction from the skill that was misinterpreted */
  skillInstruction?: string;
  /** What the AI actually did instead of following the skill */
  actualAction?: string;
  /** Rationale for choosing the incorrect path */
  decisionReason?: string;

  /** List of other active skills at the time of the error */
  loadedSkills?: string;

  /** Why the violation happened: AMBIGUOUS_RULE | MISSING_COVERAGE | OUTDATED_GUIDANCE | COMPETING_RULES | PATTERN_MISMATCH */
  rootCause?: string;
  /** One sentence: what the user was trying to achieve */
  userIntent?: string;
  /** What change to the SKILL.md would prevent this violation next time */
  skillGap?: string;
}

/**
 * Service to handle automated feedback reporting via Proxy Backend.
 * Follows SOLID & KISS: Strictly handles API communication.
 */
export class FeedbackService {
  /**
   * Allowed origin prefix for the feedback API to prevent SSRF.
   * Only requests to this domain (or its subdomains) are permitted.
   */
  private static readonly ALLOWED_ORIGIN =
    'https://agent-skills-feedback.vercel.app';

  /**
   * Resolves the API URL from environment variables.
   */
  getApiUrl(): string | undefined {
    return process.env.FEEDBACK_API_URL;
  }

  /**
   * Validates if the given URL is safe and points to the allowed feedback origin.
   * @param url The URL to validate
   * @returns boolean
   */
  private isSafeUrl(url: string): boolean {
    try {
      const parsed = new URL(url);
      const isHttps = parsed.protocol === 'https:';
      const isVercelHostname =
        parsed.hostname === 'agent-skills-feedback.vercel.app' ||
        parsed.hostname.endsWith('.agent-skills-feedback.vercel.app');

      return isHttps && isVercelHostname;
    } catch {
      return false;
    }
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

    // Validate origin to prevent SSRF/Data Exfiltration (Finding Security-NIT)
    if (!this.isSafeUrl(apiUrl)) {
      if (process.env.DEBUG) {
        console.warn(`[FeedbackService] Disallowed API URL origin: ${apiUrl}`);
      }
      return false;
    }

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
