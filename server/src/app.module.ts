import { Module } from '@nestjs/common';
import { ConfigModule } from '@nestjs/config';
import { APP_GUARD } from '@nestjs/core';
import { ThrottlerGuard, ThrottlerModule } from '@nestjs/throttler';
import { CoreModule } from './core/core.module';
import { FeedbackModule } from './feedback/feedback.module';
import { HealthModule } from './health/health.module';

@Module({
  imports: [
    ConfigModule.forRoot({
      isGlobal: true,
    }),
    ThrottlerModule.forRoot([
      {
        name: 'global',
        ttl: 60000,
        limit: 10,
      },
      {
        name: 'feedback',
        ttl: 60000,
        limit: 3,
      },
    ]),
    CoreModule,
    HealthModule,
    FeedbackModule,
  ],
  providers: [
    {
      provide: APP_GUARD,
      useClass: ThrottlerGuard,
    },
  ],
})
/**
 * The root application module for the agent-skills-standard server.
 * Orchestrates configuration, rate limiting, and core domain modules.
 */
export class AppModule {}
