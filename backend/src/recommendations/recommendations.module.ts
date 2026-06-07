import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RecommendationsController } from './recommendations.controller';
import { RecommendationsService } from './recommendations.service';

@Module({
  controllers: [RecommendationsController],
  providers: [RecommendationsService, AuthGuard],
})
export class RecommendationsModule {}
