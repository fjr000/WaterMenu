import { Injectable, UnauthorizedException } from '@nestjs/common';
import { FeedbackRating, MealType, Prisma } from '@prisma/client';
import { PrismaService } from '../prisma/prisma.service';
import { RecommendationQueryDto } from './dto/recommendation-query.dto';

const BASE_SCORE = 100;
const GOOD_SCORE = 20;
const BAD_SCORE = -15;
const MIN_WEIGHT = 10;
const RECENT_DAYS = 3;
const RECOMMENDATION_LIMIT = 5;
const FEEDBACK_RATING_SCORE: Record<FeedbackRating, number> = {
  [FeedbackRating.GOOD]: 5,
  [FeedbackRating.OK]: 3,
  [FeedbackRating.BAD]: 1,
};
const coverImageInclude = {
  images: {
    where: { isCover: true },
    orderBy: [{ sortOrder: 'asc' as const }, { createdAt: 'asc' as const }],
    take: 1,
  },
};

type DishWithCoverImage = Prisma.DishGetPayload<{ include: typeof coverImageInclude }>;
type DishCandidate = Omit<DishWithCoverImage, 'images'> & {
  coverImage: (DishWithCoverImage['images'][number] & { fileUrl: string }) | null;
  mealRecordCount: number;
  feedbackRatingAverage: number | null;
};
type MealRecordWithFeedbacks = Prisma.MealRecordGetPayload<{
  include: { feedbacks: { select: { rating: true } } };
}>;

type ScoredCandidate = {
  dish: DishCandidate;
  score: number;
  weight: number;
  reasons: string[];
};

@Injectable()
export class RecommendationsService {
  constructor(private readonly prisma: PrismaService) {}

  async recommend(userId: string, body: RecommendationQueryDto) {
    const candidates = await this.getScoredCandidates(userId, body);

    return {
      items: candidates.slice(0, RECOMMENDATION_LIMIT),
    };
  }

  async pickBlindBox(userId: string, body: RecommendationQueryDto) {
    const candidates = await this.getScoredCandidates(userId, body);

    return {
      item: this.pickWeighted(candidates),
    };
  }

  private async getScoredCandidates(userId: string, body: RecommendationQueryDto) {
    const workspaceId = await this.getWorkspaceId(userId);
    const dishes = await this.findActiveDishes(workspaceId, body.mealType);

    if (dishes.length === 0) {
      return [];
    }

    const mealRecords = await this.findMealRecords(workspaceId, dishes.map((dish) => dish.id));
    const recentDishIds = this.getRecentDishIds(mealRecords);
    const recentFilteredDishes = dishes.filter((dish) => !recentDishIds.has(dish.id));
    const relaxedRecentLimit = recentFilteredDishes.length === 0;
    const candidateDishes = relaxedRecentLimit ? dishes : recentFilteredDishes;

    return candidateDishes
      .map((dish) => this.withDishCardFields(dish, mealRecords))
      .map((dish) => this.scoreDish(dish, mealRecords, recentDishIds, relaxedRecentLimit, body.mealType))
      .sort((left, right) => right.score - left.score || left.dish.name.localeCompare(right.dish.name));
  }

  private findActiveDishes(workspaceId: string, mealType?: MealType) {
    const where: Prisma.DishWhereInput = {
      workspaceId,
      isActive: true,
    };

    if (mealType) {
      where.mealTypes = { has: mealType };
    }

    return this.prisma.dish.findMany({
      where,
      include: coverImageInclude,
    });
  }

  private withDishCardFields(dish: DishWithCoverImage, mealRecords: MealRecordWithFeedbacks[]): DishCandidate {
    const { images, ...data } = dish;
    const coverImage = images?.[0] ?? null;
    const dishMealRecords = mealRecords.filter((mealRecord) => mealRecord.dishId === dish.id);
    const feedbackScores = dishMealRecords.flatMap((mealRecord) =>
      mealRecord.feedbacks.map((feedback) => FEEDBACK_RATING_SCORE[feedback.rating]),
    );
    const feedbackRatingAverage = feedbackScores.length
      ? feedbackScores.reduce((sum, score) => sum + score, 0) / feedbackScores.length
      : null;

    return {
      ...data,
      coverImage: coverImage
        ? {
            ...coverImage,
            fileUrl: `/api/dish-images/${coverImage.id}/file`,
          }
        : null,
      mealRecordCount: dishMealRecords.length,
      feedbackRatingAverage,
    };
  }

  private findMealRecords(workspaceId: string, dishIds: string[]) {
    return this.prisma.mealRecord.findMany({
      where: {
        workspaceId,
        dishId: { in: dishIds },
      },
      include: {
        feedbacks: {
          where: { workspaceId },
          select: { rating: true },
        },
      },
    });
  }

  private getRecentDishIds(mealRecords: MealRecordWithFeedbacks[]) {
    const since = new Date();
    since.setDate(since.getDate() - RECENT_DAYS);

    return new Set(
      mealRecords
        .filter((mealRecord) => mealRecord.dishId && mealRecord.eatenAt >= since)
        .map((mealRecord) => mealRecord.dishId as string),
    );
  }

  private scoreDish(
    dish: DishCandidate,
    mealRecords: MealRecordWithFeedbacks[],
    recentDishIds: Set<string>,
    relaxedRecentLimit: boolean,
    mealType?: MealType,
  ): ScoredCandidate {
    const dishFeedbacks = mealRecords
      .filter((mealRecord) => mealRecord.dishId === dish.id)
      .flatMap((mealRecord) => mealRecord.feedbacks);
    const goodCount = dishFeedbacks.filter((feedback) => feedback.rating === FeedbackRating.GOOD).length;
    const badCount = dishFeedbacks.filter((feedback) => feedback.rating === FeedbackRating.BAD).length;
    const score = BASE_SCORE + goodCount * GOOD_SCORE + badCount * BAD_SCORE;
    const weight = Math.max(score, MIN_WEIGHT);

    return {
      dish,
      score,
      weight,
      reasons: this.buildReasons({ dish, mealType, recentDishIds, relaxedRecentLimit, goodCount, badCount, weight }),
    };
  }

  private buildReasons({
    dish,
    mealType,
    recentDishIds,
    relaxedRecentLimit,
    goodCount,
    badCount,
    weight,
  }: {
    dish: DishCandidate;
    mealType?: MealType;
    recentDishIds: Set<string>;
    relaxedRecentLimit: boolean;
    goodCount: number;
    badCount: number;
    weight: number;
  }) {
    const reasons: string[] = [];

    if (mealType) {
      reasons.push(`适合${mealType}`);
    } else {
      reasons.push('来自当前可用菜品');
    }

    if (!recentDishIds.has(dish.id)) {
      reasons.push(`最近 ${RECENT_DAYS} 天没吃过`);
    } else if (relaxedRecentLimit) {
      reasons.push(`候选不足，已放宽最近 ${RECENT_DAYS} 天限制`);
    }

    if (goodCount > 0) {
      reasons.push(`收到 ${goodCount} 次好吃反馈`);
    }

    if (badCount > 0) {
      reasons.push(`收到 ${badCount} 次不好吃反馈，已降低权重`);
    }

    if (weight === MIN_WEIGHT) {
      reasons.push(`最低权重保留为 ${MIN_WEIGHT}`);
    }

    return reasons;
  }

  private pickWeighted(candidates: ScoredCandidate[]) {
    if (candidates.length === 0) {
      return null;
    }

    const totalWeight = candidates.reduce((sum, candidate) => sum + candidate.weight, 0);
    let cursor = Math.random() * totalWeight;

    for (const candidate of candidates) {
      cursor -= candidate.weight;
      if (cursor < 0) {
        return candidate;
      }
    }

    return candidates[candidates.length - 1];
  }

  private async getWorkspaceId(userId: string) {
    const user = await this.prisma.user.findUnique({
      where: { id: userId },
      select: { workspaceId: true },
    });

    if (!user) {
      throw new UnauthorizedException();
    }

    return user.workspaceId;
  }
}
