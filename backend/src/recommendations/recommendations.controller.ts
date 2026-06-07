import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { RecommendationQueryDto } from './dto/recommendation-query.dto';
import { RecommendationsService } from './recommendations.service';

type SessionRequest = Request & {
  session: Request['session'] & {
    userId: string;
  };
};

@Controller()
@UseGuards(AuthGuard)
export class RecommendationsController {
  constructor(private readonly recommendationsService: RecommendationsService) {}

  @Post('recommendations')
  recommend(@Req() request: SessionRequest, @Body() body: RecommendationQueryDto) {
    return this.recommendationsService.recommend(request.session.userId, body);
  }

  @Post('blind-box')
  pickBlindBox(@Req() request: SessionRequest, @Body() body: RecommendationQueryDto) {
    return this.recommendationsService.pickBlindBox(request.session.userId, body);
  }
}
