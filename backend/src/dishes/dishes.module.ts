import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { DishesController } from './dishes.controller';
import { DishesService } from './dishes.service';

@Module({
  controllers: [DishesController],
  providers: [DishesService, AuthGuard],
})
export class DishesModule {}
