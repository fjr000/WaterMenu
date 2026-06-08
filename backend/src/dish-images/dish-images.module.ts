import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { DishImagesController } from './dish-images.controller';
import { DishImagesService } from './dish-images.service';

@Module({
  controllers: [DishImagesController],
  providers: [DishImagesService, AuthGuard],
})
export class DishImagesModule {}
