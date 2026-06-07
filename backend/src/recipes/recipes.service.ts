import { BadRequestException, Injectable, NotFoundException, UnauthorizedException } from '@nestjs/common';
import { PrismaService } from '../prisma/prisma.service';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';

@Injectable()
export class RecipesService {
  constructor(private readonly prisma: PrismaService) {}

  async list(userId: string, dishId: string) {
    const workspaceId = await this.getWorkspaceId(userId);
    await this.assertDishInWorkspace(workspaceId, dishId);

    return this.prisma.recipe.findMany({
      where: { workspaceId, dishId },
      orderBy: { createdAt: 'asc' },
    });
  }

  async create(userId: string, dishId: string, body: CreateRecipeDto) {
    const workspaceId = await this.getWorkspaceId(userId);
    await this.assertDishInWorkspace(workspaceId, dishId);

    const title = this.trimRequired(body.title);
    const content = this.trimRequired(body.content);

    return this.prisma.recipe.create({
      data: {
        workspaceId,
        dishId,
        title,
        content,
      },
    });
  }

  async update(userId: string, id: string, body: UpdateRecipeDto) {
    const workspaceId = await this.getWorkspaceId(userId);
    const recipe = await this.prisma.recipe.findFirst({
      where: { id, workspaceId },
      select: { id: true },
    });

    if (!recipe) {
      throw new NotFoundException();
    }

    return this.prisma.recipe.update({
      where: { id },
      data: {
        title: body.title === undefined ? undefined : this.trimRequired(body.title),
        content: body.content === undefined ? undefined : this.trimRequired(body.content),
      },
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
}
