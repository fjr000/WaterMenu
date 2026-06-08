import { FeedbackRating, MealType } from '@prisma/client';
import { Transform, Type } from 'class-transformer';
import { IsDateString, IsEnum, IsIn, IsInt, IsOptional, IsString, Max, Min } from 'class-validator';

export type RatingScope = 'mine' | 'workspace';

export class ListMealRecordsQueryDto {
  @Type(() => Number)
  @IsInt()
  @Min(1)
  @IsOptional()
  page?: number;

  @Type(() => Number)
  @IsInt()
  @Min(1)
  @Max(50)
  @IsOptional()
  pageSize?: number;

  @IsEnum(MealType)
  @IsOptional()
  mealType?: MealType;

  @IsString()
  @IsOptional()
  dishId?: string;

  @IsEnum(FeedbackRating)
  @IsOptional()
  rating?: FeedbackRating;

  @IsIn(['mine', 'workspace'])
  @IsOptional()
  ratingScope?: RatingScope;

  @IsDateString()
  @IsOptional()
  from?: string;

  @IsDateString()
  @IsOptional()
  to?: string;

  @Transform(({ value }) => (typeof value === 'string' ? value.trim() : value))
  @IsString()
  @IsOptional()
  q?: string;
}
