import { Body, Controller, HttpCode, HttpStatus, Post } from '@nestjs/common';
import { ApiOperation, ApiResponse, ApiTags } from '@nestjs/swagger';
import { Throttle } from '@nestjs/throttler';
import { CreateFeedbackDto } from './dto/create-feedback.dto';
import { FeedbackService } from './feedback.service';

@ApiTags('feedback')
@Controller('feedback')
/**
 * Controller for handling AI skill feedback submissions.
 */
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  @Throttle({ feedback: { limit: 3, ttl: 60000 } })
  @ApiOperation({ summary: 'Submit AI skill feedback' })
  @ApiResponse({ status: 201, description: 'Feedback received successfully' })
  @ApiResponse({ status: 429, description: 'Too many requests' })
  @ApiResponse({ status: 500, description: 'GitHub Issue creation failed' })
  @HttpCode(HttpStatus.CREATED)
  /**
   * Receives feedback from the CLI and delegates to FeedbackService for issue creation.
   * @param createFeedbackDto The validated feedback payload
   */
  async create(@Body() createFeedbackDto: CreateFeedbackDto) {
    return this.feedbackService.createIssue(createFeedbackDto);
  }
}
