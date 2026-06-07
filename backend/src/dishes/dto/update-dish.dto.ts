import { MealType } from '@prisma/client';
import { ArrayNotEmpty, IsArray, IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateDishDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string;

  @IsArray()
  @ArrayNotEmpty()
  @IsEnum(MealType, { each: true })
  @IsOptional()
  mealTypes?: MealType[];

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
