import { Module } from '@nestjs/common';
import { AuthGuard } from '../auth/auth.guard';
import { RecipesController } from './recipes.controller';
import { RecipesService } from './recipes.service';

@Module({
  controllers: [RecipesController],
  providers: [RecipesService, AuthGuard],
})
export class RecipesModule {}
