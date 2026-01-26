import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from 'octokit';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
export class FeedbackService {
  private readonly logger = new Logger(FeedbackService.name);
  private readonly octokit: Octokit;
  private readonly owner: string;
  private readonly repo: string;

  constructor(private configService: ConfigService) {
    this.octokit = new Octokit({
      auth: this.configService.get<string>('GITHUB_TOKEN'),
    });
    this.owner = this.configService.get<string>(
      'GITHUB_OWNER',
      'HoangNguyen0403',
    );
    this.repo = this.configService.get<string>(
      'GITHUB_REPO',
      'agent-skills-standard',
    );
  }

  async createIssue(dto: CreateFeedbackDto) {
    try {
      const body = this.formatIssueBody(dto);
      const title = `[AI Feedback] [${dto.skill}] ${dto.issue.substring(0, 50)}${dto.issue.length > 50 ? '...' : ''}`;

      const response = await this.octokit.rest.issues.create({
        owner: this.owner,
        repo: this.repo,
        title,
        body,
        labels: ['ai-feedback'],
      });

      this.logger.log(`Issue created: ${response.data.html_url}`);
      return { url: response.data.html_url };
    } catch (error: unknown) {
      const errorMessage =
        error instanceof Error ? error.message : String(error);
      this.logger.error(`Failed to create issue: ${errorMessage}`);
      throw new InternalServerErrorException(
        `Failed to create GitHub issue: ${errorMessage}`,
      );
    }
  }

  private formatIssueBody(dto: CreateFeedbackDto): string {
    return `### 🤖 AI Self-Learning Feedback

**Skill:** \`${dto.skill}\`

**Issue:** 
${dto.issue}

**Context:** 
${dto.context || 'N/A'}

**AI Model:** 
${dto.model || 'N/A'}

**Suggested Improvement:** 
${dto.suggestion || 'N/A'}

---
*Submitted via Agent Skills Feedback Proxy*`;
  }
}
