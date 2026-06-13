import { Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertFeedbackDto } from './dto/upsert-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(userId: string, workspaceId: string, body: UpsertFeedbackDto) {
    const mealRecord = await this.prisma.mealRecord.findFirst({
      where: { id: body.mealRecordId, workspaceId },
      select: { id: true },
    });

    if (!mealRecord) {
      throw new NotFoundException();
    }

    return this.prisma.feedback.upsert({
      where: {
        mealRecordId_userId: {
          mealRecordId: body.mealRecordId,
          userId,
        },
      },
      create: {
        workspaceId,
        mealRecordId: body.mealRecordId,
        userId,
        rating: body.rating,
        note: body.note ?? null,
      },
      update: {
        rating: body.rating,
        note: body.note ?? null,
      },
    });
  }
}
