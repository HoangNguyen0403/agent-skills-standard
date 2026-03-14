import { Controller, Get, Res } from '@nestjs/common';
import { ApiExcludeController } from '@nestjs/swagger';
import type { Response } from 'express';
import { LandingService } from './landing.service';

@ApiExcludeController()
@Controller()
/**
 * Controller responsible for the public landing page.
 */
export class LandingController {
  constructor(private readonly landingService: LandingService) {}

  @Get()
  /**
   * Returns the rendered HTML landing page for the root route.
   * Uses the raw response object so HTML is not wrapped by the global API interceptor.
   */
  getLandingPage(@Res() response: Response) {
    response.type('html').send(this.landingService.renderLandingPage());
  }
}
