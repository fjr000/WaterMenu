import { DishVariantType } from '@prisma/client';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class CreateDishVariantDto {
  @IsString()
  @IsNotEmpty()
  name!: string;

  @IsEnum(DishVariantType)
  type!: DishVariantType;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
