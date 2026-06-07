import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMealRecordDto } from './dto/create-meal-record.dto';
import { UpdateMealRecordDto } from './dto/update-meal-record.dto';

function getMealRecordInclude(workspaceId: string): Prisma.MealRecordInclude {
  return {
    feedbacks: {
      where: { workspaceId },
      select: {
        id: true,
        userId: true,
        rating: true,
        note: true,
        createdAt: true,
        updatedAt: true,
      },
      orderBy: { createdAt: 'asc' },
    },
  };
}

@Injectable()
export class MealRecordsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string) {
    const workspaceId = await this.getWorkspaceId(userId);

    return this.prisma.mealRecord.findMany({
      where: { workspaceId },
      include: getMealRecordInclude(workspaceId),
      orderBy: { eatenAt: 'desc' },
    });
  }

  async create(userId: string, body: CreateMealRecordDto) {
    const workspaceId = await this.getWorkspaceId(userId);
    await this.assertDishInWorkspace(workspaceId, body.dishId);

    return this.prisma.mealRecord.create({
      data: {
        workspaceId,
        dishId: body.dishId ?? null,
        title: body.title,
        mealType: body.mealType,
        eatenAt: new Date(body.eatenAt),
        note: body.note ?? null,
      },
      include: getMealRecordInclude(workspaceId),
    });
  }

  async get(userId: string, id: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    const mealRecord = await this.prisma.mealRecord.findFirst({
      where: { id, workspaceId },
      include: getMealRecordInclude(workspaceId),
    });

    if (!mealRecord) {
      throw new NotFoundException();
    }

    return mealRecord;
  }

  async update(userId: string, id: string, body: UpdateMealRecordDto) {
    const workspaceId = await this.getWorkspaceId(userId);
    const mealRecord = await this.prisma.mealRecord.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });

    if (!mealRecord) {
      throw new NotFoundException();
    }

    if (body.dishId !== undefined) {
      await this.assertDishInWorkspace(workspaceId, body.dishId);
    }

    return this.prisma.mealRecord.update({
      where: { id },
      data: {
        dishId: body.dishId === undefined ? undefined : body.dishId,
        title: body.title,
        mealType: body.mealType,
        eatenAt: body.eatenAt ? new Date(body.eatenAt) : undefined,
        note: body.note === undefined ? undefined : body.note,
      },
      include: getMealRecordInclude(workspaceId),
    });
  }

  private async assertDishInWorkspace(workspaceId: string, dishId?: string | null) {
    if (!dishId) {
      return;
    }

    const dish = await this.prisma.dish.findFirst({
      where: { id: dishId, workspaceId },
      select: { id: true },
    });

    if (!dish) {
      throw new NotFoundException();
    }
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
