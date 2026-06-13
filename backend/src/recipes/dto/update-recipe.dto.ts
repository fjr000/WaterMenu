import { IsNotEmpty, IsOptional, IsString, MaxLength } from 'class-validator';

export class UpdateRecipeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  @IsOptional()
  instructions?: string;
}
