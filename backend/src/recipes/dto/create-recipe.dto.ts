import { IsNotEmpty, IsString, MaxLength } from 'class-validator';

export class CreateRecipeDto {
  @IsString()
  @IsNotEmpty()
  @MaxLength(10000)
  instructions!: string;
}
