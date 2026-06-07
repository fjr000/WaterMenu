import { Body, Controller, Get, Param, Patch, Post, Req, UseGuards } from '@nestjs/common';
import type { Request } from 'express';
import { AuthGuard } from '../auth/auth.guard';
import { CreateMealRecordDto } from './dto/create-meal-record.dto';
import { UpdateMealRecordDto } from './dto/update-meal-record.dto';
import { MealRecordsService } from './meal-records.service';

type SessionRequest = Request & {
  session: Request['session'] & {
    userId: string;
  };
};

@Controller('meal-records')
@UseGuards(AuthGuard)
export class MealRecordsController {
  constructor(private readonly mealRecordsService: MealRecordsService) {}

  @Get()
  list(@Req() request: SessionRequest) {
    return this.mealRecordsService.list(request.session.userId);
  }

  @Post()
  create(@Req() request: SessionRequest, @Body() body: CreateMealRecordDto) {
    return this.mealRecordsService.create(request.session.userId, body);
  }

  @Get(':id')
  get(@Req() request: SessionRequest, @Param('id') id: string) {
    return this.mealRecordsService.get(request.session.userId, id);
  }

  @Patch(':id')
  update(@Req() request: SessionRequest, @Param('id') id: string, @Body() body: UpdateMealRecordDto) {
    return this.mealRecordsService.update(request.session.userId, id, body);
  }
}
