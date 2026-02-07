import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';

@Module({
  imports: [ConfigModule],
  controllers: [FeedbackController],
  providers: [FeedbackService],
})
/**
 * Module responsible for handling AI skill feedback.
 */
export class FeedbackModule {}
