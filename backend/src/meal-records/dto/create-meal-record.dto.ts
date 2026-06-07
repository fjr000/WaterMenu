import { MealType } from '@prisma/client';
import { IsDateString, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateMealRecordDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  dishId?: string | null;

  @IsString()
  @IsNotEmpty()
  title!: string;

  @IsEnum(MealType)
  mealType!: MealType;

  @IsDateString()
  eatenAt!: string;

  @IsString()
  @IsOptional()
  note?: string | null;
}
