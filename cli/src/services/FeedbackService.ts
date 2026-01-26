import { ConfigService } from './ConfigService';

export interface FeedbackData {
  skill: string;
  issue: string;
  context?: string;
  model?: string;
  suggestion?: string;
}

/**
 * Service to handle automated feedback reporting via Oracle Cloud Backend.
 * Follows SOLID & KISS: Strictly handles API communication.
 */
export class FeedbackService {
  constructor(private configService: ConfigService = new ConfigService()) {}

  /**
   * Resolves the API URL using Priority: ENV > .skillsrc
   */
  async getApiUrl(): Promise<string | undefined> {
    const envUrl = process.env.FEEDBACK_API_URL;
    if (envUrl) return envUrl;

    const config = await this.configService.loadConfig().catch(() => null);
    return config?.feedback_url;
  }

  /**
   * Submits feedback data to the backend for automatic GitHub Issue creation.
   * Internal proxy handles GitHub tokens, keeping client-side logic tokenless.
   *
   * @param data The feedback payload
   * @returns boolean indicating submission success
   */
  async submit(data: FeedbackData): Promise<boolean> {
    const apiUrl = await this.getApiUrl();
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
