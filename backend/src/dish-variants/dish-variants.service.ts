import { BadRequestException, ConflictException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { CreateDishVariantDto } from './dto/create-dish-variant.dto';
import { UpdateDishVariantDto } from './dto/update-dish-variant.dto';

@Injectable()
export class DishVariantsService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, dishId: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    await this.assertDishInWorkspace(workspaceId, dishId);

    return this.prisma.dishVariant.findMany({
      where: { workspaceId, dishId },
      orderBy: [{ isActive: 'desc' }, { createdAt: 'asc' }, { id: 'asc' }],
    });
  }

  async create(userId: string, dishId: string, body: CreateDishVariantDto) {
    const workspaceId = await this.getWorkspaceId(userId);
    await this.assertDishInWorkspace(workspaceId, dishId);

    try {
      return await this.prisma.dishVariant.create({
        data: {
          workspaceId,
          dishId,
          name: this.trimRequired(body.name),
          type: body.type,
          isActive: body.isActive ?? true,
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  async update(userId: string, id: string, body: UpdateDishVariantDto) {
    const workspaceId = await this.getWorkspaceId(userId);
    const variant = await this.prisma.dishVariant.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });

    if (!variant) {
      throw new NotFoundException();
    }

    try {
      return await this.prisma.dishVariant.update({
        where: { id },
        data: {
          name: body.name === undefined ? undefined : this.trimRequired(body.name),
          type: body.type,
          isActive: body.isActive,
        },
      });
    } catch (error) {
      this.handlePrismaError(error);
    }
  }

  private async assertDishInWorkspace(workspaceId: string, dishId: string) {
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

  private trimRequired(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException();
    }
    return trimmed;
  }

  private handlePrismaError(error: unknown): never {
    if (error instanceof Prisma.PrismaClientKnownRequestError && error.code === 'P2002') {
      throw new ConflictException();
    }

    throw error;
  }
}
