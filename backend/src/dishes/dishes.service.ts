import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { FeedbackRating, MealType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDishDto } from './dto/create-dish.dto';
import { ListDishesQueryDto } from './dto/list-dishes-query.dto';
import { UpdateDishDto } from './dto/update-dish.dto';

const DEFAULT_MEAL_TYPES = [MealType.LUNCH, MealType.DINNER];
const FEEDBACK_SCORE: Record<FeedbackRating, number> = {
  [FeedbackRating.GOOD]: 5,
  [FeedbackRating.OK]: 3,
  [FeedbackRating.BAD]: 1,
};
const dishInclude = (workspaceId: string) => ({
  images: {
    where: { isCover: true },
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
    take: 1,
  },
  mealRecords: {
    where: { workspaceId },
    select: {
      feedbacks: {
        where: { workspaceId },
        select: { rating: true },
      },
    },
  },
});

type DishWithStats = Prisma.DishGetPayload<{ include: ReturnType<typeof dishInclude> }>;

@Injectable()
export class DishesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, query: ListDishesQueryDto) {
    const workspaceId = await this.getWorkspaceId(userId);
    const where: Prisma.DishWhereInput = {
      workspaceId,
    };

    if (query.mealType) {
      where.mealTypes = { has: query.mealType };
    }

    if (query.isActive !== undefined) {
      where.isActive = query.isActive;
    }

    const dishes = await this.prisma.dish.findMany({
      where,
      include: dishInclude(workspaceId),
    });

    return dishes.map((dish) => this.withCoverImage(dish));
  }

  async create(userId: string, body: CreateDishDto) {
    const workspaceId = await this.getWorkspaceId(userId);

    try {
      const dish = await this.prisma.dish.create({
        data: {
          workspaceId,
          name: body.name,
          description: body.description,
          mealTypes: body.mealTypes ?? DEFAULT_MEAL_TYPES,
          isActive: body.isActive ?? true,
        },
        include: dishInclude(workspaceId),
      });

      return this.withCoverImage(dish);
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async get(userId: string, id: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    const dish = await this.prisma.dish.findFirst({
      where: {
        id,
        workspaceId,
      },
      include: dishInclude(workspaceId),
    });

    if (!dish) {
      throw new NotFoundException();
    }

    return this.withCoverImage(dish);
  }

  async update(userId: string, id: string, body: UpdateDishDto) {
    const workspaceId = await this.getWorkspaceId(userId);
    const dish = await this.prisma.dish.findFirst({
      where: {
        id,
        workspaceId,
      },
      select: { id: true },
    });

    if (!dish) {
      throw new NotFoundException();
    }

    try {
      const updated = await this.prisma.dish.update({
        where: { id },
        data: {
          name: body.name,
          description: body.description,
          mealTypes: body.mealTypes,
          isActive: body.isActive,
        },
        include: dishInclude(workspaceId),
      });

      return this.withCoverImage(updated);
    } catch (error) {
      this.handlePrismaError(error);
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

  private withCoverImage(dish: DishWithStats) {
    const { images, mealRecords, ...data } = dish;
    const dishImages = images ?? [];
    const records = mealRecords ?? [];
    const coverImage = dishImages[0] ?? null;
    const feedbackScores = records.flatMap((mealRecord) =>
      mealRecord.feedbacks.map((feedback) => FEEDBACK_SCORE[feedback.rating]),
    );
    const feedbackRatingAverage = feedbackScores.length
      ? feedbackScores.reduce((sum, score) => sum + score, 0) / feedbackScores.length
      : null;

    return {
      ...data,
      coverImage: coverImage
        ? {
            ...coverImage,
            fileUrl: `/api/dish-images/${coverImage.id}/file`,
          }
        : null,
      mealRecordCount: records.length,
      feedbackRatingAverage,
    };
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException();
    }

    throw error;
  }
}
