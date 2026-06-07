import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { FeedbackController } from './feedback.controller';
import { FeedbackService } from './feedback.service';

@Module({
  controllers: [FeedbackController],
  providers: [FeedbackService, AuthGuard],
})
export class FeedbackModule {}
