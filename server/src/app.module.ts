import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { ThrottlerModule } from '@nestjs/throttler';
import { CoreModule } from './core/core.module';
import { FeedbackModule } from './feedback/feedback.module';
import { HealthModule } from './health/health.module';
import { LandingModule } from './landing/landing.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        ttl: 60000,
        limit: 10,
      },
    ]),
    CoreModule,
    HealthModule,
    FeedbackModule,
    LandingModule,
  ],
})
/**
 * The root application module for the agent-skills-standard server.
 * Orchestrates configuration, rate limiting, and core domain modules.
 */
export class AppModule {}
