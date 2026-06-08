import { MealType } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateMealRecordDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  title?: string;

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
