import { Module } from '@nestjs/common';
import { LandingController } from './landing.controller';
import { LandingService } from './landing.service';

@Module({
  controllers: [LandingController],
  providers: [LandingService],
})
/**
 * Serves the public landing page for the agent-skills-standard project.
 */
export class LandingModule {}
