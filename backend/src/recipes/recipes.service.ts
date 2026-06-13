import { BadRequestException, Injectable, NotFoundException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, workspaceId: string, dishId: string) {
    await this.assertDishInWorkspace(workspaceId, dishId);

    return this.prisma.recipe.findMany({
      where: { workspaceId, dishId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(userId: string, workspaceId: string, dishId: string, body: CreateRecipeDto) {
    await this.assertDishInWorkspace(workspaceId, dishId);

    const instructions = this.trimRequired(body.instructions);

    return this.prisma.recipe.create({
      data: {
        workspaceId,
        dishId,
        instructions,
      },
    });
  }

  async update(userId: string, workspaceId: string, id: string, body: UpdateRecipeDto) {
    const recipe = await this.prisma.recipe.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });

    if (!recipe) {
      throw new NotFoundException();
    }

    const instructions = body.instructions !== undefined
      ? this.trimRequired(body.instructions)
      : undefined;

    return this.prisma.recipe.update({
      where: { id },
      data: { instructions },
    });
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

  private trimRequired(value: string) {
    const trimmed = value.trim();
    if (!trimmed) {
      throw new BadRequestException();
    }
    return trimmed;
  }
}
