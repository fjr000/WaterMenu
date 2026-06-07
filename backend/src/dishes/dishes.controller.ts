import { Body, Controller, Get, Param, Patch, Post, Query, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CreateDishDto } from './dto/create-dish.dto';
import { ListDishesQueryDto } from './dto/list-dishes-query.dto';
import { UpdateDishDto } from './dto/update-dish.dto';
import { DishesService } from './dishes.service';

type SessionRequest = Request & {
  session: Request['session'] & {
    userId: string;
  };
};

@Controller('dishes')
@UseGuards(AuthGuard)
export class DishesController {
  constructor(private readonly dishesService: DishesService) {}

  @Get()
  list(@Req() request: SessionRequest, @Query() query: ListDishesQueryDto) {
    return this.dishesService.list(request.session.userId, query);
  }

  @Post()
  create(@Req() request: SessionRequest, @Body() body: CreateDishDto) {
    return this.dishesService.create(request.session.userId, body);
  }

  @Get(':id')
  get(@Req() request: SessionRequest, @Param('id') id: string) {
    return this.dishesService.get(request.session.userId, id);
  }

  @Patch(':id')
  update(@Req() request: SessionRequest, @Param('id') id: string, @Body() body: UpdateDishDto) {
    return this.dishesService.update(request.session.userId, id, body);
  }
}
