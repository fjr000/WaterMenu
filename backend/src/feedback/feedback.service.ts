import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { UpsertFeedbackDto } from './dto/upsert-feedback.dto';

@Injectable()
export class FeedbackService {
  constructor(private readonly prisma: PrismaService) {}

  async upsert(userId: string, body: UpsertFeedbackDto) {
    const workspaceId = await this.getWorkspaceId(userId);
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

  private async getWorkspaceId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { workspaceId: true },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return user.workspaceId;
  }
}
