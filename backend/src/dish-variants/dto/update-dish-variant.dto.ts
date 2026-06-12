import { DishVariantType } from '@prisma/client';
import { IsBoolean, IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpdateDishVariantDto {
  @IsString()
  @IsNotEmpty()
  @IsOptional()
  name?: string;

  @IsString()
  @IsOptional()
  description?: string | null;

  @IsEnum(DishVariantType)
  @IsOptional()
  type?: DishVariantType;

  @IsBoolean()
  @IsOptional()
  isActive?: boolean;
}
