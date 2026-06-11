import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { DishVariantsController } from './dish-variants.controller';
import { DishVariantsService } from './dish-variants.service';

@Module({
  controllers: [DishVariantsController],
  providers: [DishVariantsService, AuthGuard],
})
export class DishVariantsModule {}
