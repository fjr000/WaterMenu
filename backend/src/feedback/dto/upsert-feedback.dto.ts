import { FeedbackRating } from '@prisma/client';
import { IsEnum, IsNotEmpty, IsOptional, IsString } from 'class-validator';

export class UpsertFeedbackDto {
  @IsString()
  @IsNotEmpty()
  mealRecordId!: string;

  @IsEnum(FeedbackRating)
  rating!: FeedbackRating;

  @IsString()
  @IsOptional()
  note?: string | null;
}
