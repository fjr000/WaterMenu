import { ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { MealType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDishDto } from './dto/create-dish.dto';
import { ListDishesQueryDto } from './dto/list-dishes-query.dto';
import { UpdateDishDto } from './dto/update-dish.dto';

const DEFAULT_MEAL_TYPES = [MealType.LUNCH, MealType.DINNER];
const coverImageInclude = {
  images: {
    where: { isCover: true },
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
    take: 1,
  },
};

type DishWithCoverImage = Prisma.DishGetPayload<{ include: typeof coverImageInclude }>;

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
      include: coverImageInclude,
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
        include: coverImageInclude,
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
      include: coverImageInclude,
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
        include: coverImageInclude,
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

  private withCoverImage(dish: DishWithCoverImage) {
    const { images, ...data } = dish;
    const coverImage = images?.[0] ?? null;

    return {
      ...data,
      coverImage: coverImage
        ? {
            ...coverImage,
            fileUrl: `/api/dish-images/${coverImage.id}/file`,
          }
        : null,
    };
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException();
    }

    throw error;
  }
}
