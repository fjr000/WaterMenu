import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CreateRecipeDto } from './dto/create-recipe.dto';
import { UpdateRecipeDto } from './dto/update-recipe.dto';
import { RecipesService } from './recipes.service';

type SessionRequest = Request & {
  session: Request['session'] & {
    userId: string;
    workspaceId: string;
  };
};

@Controller()
@UseGuards(AuthGuard)
export class RecipesController {
  constructor(private readonly recipesService: RecipesService) {}

  @Get('dishes/:dishId/recipes')
  list(@Req() request: SessionRequest, @Param('dishId') dishId: string) {
    return this.recipesService.list(request.session.userId, request.session.workspaceId, dishId);
  }

  @Post('dishes/:dishId/recipes')
  create(@Req() request: SessionRequest, @Param('dishId') dishId: string, @Body() body: CreateRecipeDto) {
    return this.recipesService.create(request.session.userId, request.session.workspaceId, dishId, body);
  }

  @Patch('recipes/:id')
  update(@Req() request: SessionRequest, @Param('id') id: string, @Body() body: UpdateRecipeDto) {
    return this.recipesService.update(request.session.userId, request.session.workspaceId, id, body);
  }
}
