import { MealType } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMealRecordDto {
  @IsString()
  @IsNotEmpty()
  dishId!: string;

  @IsString()
  @IsNotEmpty()
  @IsOptional()
  variantId?: string | null;

  @IsEnum(MealType)
  mealType!: MealType;

  @IsDateString()
  eatenAt!: string;

  @IsString()
  @IsOptional()
  note?: string | null;
}
