import { MealType } from '@prisma/client';
import { IsDateString, IsEnum, IsOptional, IsString } from 'class-validator';

export class UpdateMealRecordDto {
  @IsEnum(MealType)
  @IsOptional()
  mealType?: MealType;

  @IsDateString()
  @IsOptional()
  eatenAt?: string;

  @IsString()
  @IsOptional()
  note?: string | null;
}
