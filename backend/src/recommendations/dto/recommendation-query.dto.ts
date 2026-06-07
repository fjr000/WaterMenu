import { MealType } from '@prisma/client';
import { IsEnum, IsOptional } from 'class-validator';

export class RecommendationQueryDto {
  @IsEnum(MealType)
  @IsOptional()
  mealType?: MealType;
}
