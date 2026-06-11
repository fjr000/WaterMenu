import { Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateMealRecordDto } from './dto/create-meal-record.dto';
import { ListMealRecordsQueryDto } from './dto/list-meal-records-query.dto';
import { UpdateMealRecordDto } from './dto/update-meal-record.dto';

function getMealRecordInclude(workspaceId: string): Prisma.MealRecordInclude {
  return {
    dish: {
      select: {
        id: true,
        name: true,
      },
    },
    variant: {
      select: {
        id: true,
        workspaceId: true,
        dishId: true,
        name: true,
        type: true,
        isActive: true,
        createdAt: true,
        updatedAt: true,
      },
    },
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

  async list(userId: string, query: ListMealRecordsQueryDto = {}) {
    const workspaceId = await this.getWorkspaceId(userId);
    const page = query.page ?? 1;
    const pageSize = query.pageSize ?? 20;
    const where: Prisma.MealRecordWhereInput = { workspaceId };

    if (query.mealType) {
      where.mealType = query.mealType;
    }

    if (query.dishId) {
      where.dishId = query.dishId;
    }

    if (query.rating) {
      where.feedbacks = {
        some: {
          workspaceId,
          rating: query.rating,
          ...(query.ratingScope === 'workspace' ? {} : { userId }),
        },
      };
    }

    const eatenAt: Prisma.DateTimeFilter = {};
    if (query.from) {
      eatenAt.gte = new Date(query.from);
    }
    if (query.to) {
      eatenAt.lte = new Date(query.to);
    }
    if (Object.keys(eatenAt).length > 0) {
      where.eatenAt = eatenAt;
    }

    if (query.q) {
      where.OR = [
        { title: { contains: query.q, mode: 'insensitive' } },
        { note: { contains: query.q, mode: 'insensitive' } },
      ];
    }

    const [items, total] = await this.prisma.$transaction([
      this.prisma.mealRecord.findMany({
        where,
        include: getMealRecordInclude(workspaceId),
        orderBy: [{ eatenAt: 'desc' }, { createdAt: 'desc' }, { id: 'desc' }],
        skip: (page - 1) * pageSize,
        take: pageSize,
      }),
      this.prisma.mealRecord.count({ where }),
    ]);

    return { items, total, page, pageSize };
  }

  async create(userId: string, body: CreateMealRecordDto) {
    const workspaceId = await this.getWorkspaceId(userId);
    await this.assertDishInWorkspace(workspaceId, body.dishId);
    await this.assertVariantInWorkspace(workspaceId, body.dishId, body.variantId);

    return this.prisma.mealRecord.create({
      data: {
        workspaceId,
        dishId: body.dishId ?? null,
        variantId: body.variantId ?? null,
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

    return this.prisma.mealRecord.update({
      where: { id },
      data: {
        title: body.title,
        mealType: body.mealType,
        eatenAt: body.eatenAt ? new Date(body.eatenAt) : undefined,
        note: body.note === undefined ? undefined : body.note,
      },
      include: getMealRecordInclude(workspaceId),
    });
  }

  async delete(userId: string, id: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    const mealRecord = await this.prisma.mealRecord.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });

    if (!mealRecord) {
      throw new NotFoundException();
    }

    await this.prisma.mealRecord.delete({ where: { id } });

    return { ok: true };
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

  private async assertVariantInWorkspace(workspaceId: string, dishId?: string | null, variantId?: string | null) {
    if (!variantId) {
      return;
    }

    if (!dishId) {
      throw new NotFoundException();
    }

    const variant = await this.prisma.dishVariant.findFirst({
      where: { id: variantId, dishId, workspaceId, isActive: true },
      select: { id: true },
    });

    if (!variant) {
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
