import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { MealRecordsController } from './meal-records.controller';
import { MealRecordsService } from './meal-records.service';

@Module({
  controllers: [MealRecordsController],
  providers: [MealRecordsService, AuthGuard],
})
export class MealRecordsModule {}
