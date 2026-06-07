import { MealType } from '@prisma/client';
import { Transform } from 'class-transformer';
import { IsBoolean, IsEnum, IsOptional } from 'class-validator';

export class ListDishesQueryDto {
  @IsEnum(MealType)
  @IsOptional()
  mealType?: MealType;

  @Transform(({ value }) => {
    if (value === 'true') {
      return true;
    }
    if (value === 'false') {
      return false;
    }
    return value;
  })
  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
