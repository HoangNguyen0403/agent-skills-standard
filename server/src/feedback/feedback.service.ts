import {
  Injectable,
  InternalServerErrorException,
  Logger,
} from '@nestjs/common';
import { ConfigService } from '@nestjs/config';
import { Octokit } from 'octokit';
import { CreateFeedbackDto } from './dto/create-feedback.dto';

@Injectable()
/**
 * Service for managing AI skill feedback in the backend.
 * Handles issue creation in the designated GitHub repository.
 */
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

  /**
   * Formats and submits a new feedback issue to GitHub.
   * @param dto The feedback data
   * @returns The URL of the created issue
   */
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
    let body = `### 🤖 AI Self-Learning Feedback

**Skill:** \`${dto.skill}\`

**Issue:** 
${dto.issue}`;

    // AI Auto-Report Fields (if provided)
    if (dto.skillInstruction) {
      body += `\n\n**Skill Instruction (What skill said):**
> ${dto.skillInstruction}`;
    }

    if (dto.actualAction) {
      body += `\n\n**Actual Action (What AI did):**
${dto.actualAction}`;
    }

    if (dto.decisionReason) {
      body += `\n\n**Decision Reason (Why):**
${dto.decisionReason}`;
    }

    // Optional Context Fields
    if (dto.context) {
      body += `\n\n**Context:** 
${dto.context}`;
    }

    if (dto.model) {
      body += `\n\n**AI Model:** 
${dto.model}`;
    }

    if (dto.suggestion) {
      body += `\n\n**Suggested Improvement:** 
${dto.suggestion}`;
    }

    if (dto.loadedSkills) {
      body += `\n\n**Loaded Skills:** 
${dto.loadedSkills}`;
    }

    body += `\n\n---
*Submitted via Agent Skills Feedback Proxy*`;

    return body;
  }
}
