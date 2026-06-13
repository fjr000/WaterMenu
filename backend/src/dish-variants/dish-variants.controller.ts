import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CreateDishVariantDto } from './dto/create-dish-variant.dto';
import { UpdateDishVariantDto } from './dto/update-dish-variant.dto';
import { DishVariantsService } from './dish-variants.service';

type SessionRequest = Request & {
  session: Request['session'] & {
    userId: string;
    workspaceId: string;
  };
};

@Controller()
@UseGuards(AuthGuard)
export class DishVariantsController {
  constructor(private readonly dishVariantsService: DishVariantsService) {}

  @Get('dishes/:dishId/variants')
  list(@Req() request: SessionRequest, @Param('dishId') dishId: string) {
    return this.dishVariantsService.list(request.session.userId, request.session.workspaceId, dishId);
  }

  @Post('dishes/:dishId/variants')
  create(@Req() request: SessionRequest, @Param('dishId') dishId: string, @Body() body: CreateDishVariantDto) {
    return this.dishVariantsService.create(request.session.userId, request.session.workspaceId, dishId, body);
  }

  @Patch('dish-variants/:id')
  update(@Req() request: SessionRequest, @Param('id') id: string, @Body() body: UpdateDishVariantDto) {
    return this.dishVariantsService.update(request.session.userId, request.session.workspaceId, id, body);
  }
}
