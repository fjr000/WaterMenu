import { Body, Controller, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { UpsertFeedbackDto } from './dto/upsert-feedback.dto';
import { FeedbackService } from './feedback.service';

type SessionRequest = Request & {
  session: Request['session'] & {
    userId: string;
  };
};

@Controller('feedback')
@UseGuards(AuthGuard)
export class FeedbackController {
  constructor(private readonly feedbackService: FeedbackService) {}

  @Post()
  upsert(@Req() request: SessionRequest, @Body() body: UpsertFeedbackDto) {
    return this.feedbackService.upsert(request.session.userId, body);
  }
}
