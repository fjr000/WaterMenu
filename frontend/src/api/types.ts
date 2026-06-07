export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

export type FeedbackRating = "GOOD" | "OK" | "BAD";

export interface User {
  id: string;
  email: string;
  name: string;
}

export interface Workspace {
  id: string;
  name: string;
}

export interface MeResponse {
  user: User;
  workspace: Workspace;
}

export interface LoginRequest {
  email: string;
  password: string;
}

export interface Dish {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  mealTypes: MealType[];
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface Feedback {
  id: string;
  workspaceId?: string;
  mealRecordId?: string;
  userId: string;
  rating: FeedbackRating;
  note: string | null;
  createdAt: string;
  updatedAt: string;
}

export interface MealRecord {
  id: string;
  workspaceId: string;
  dishId: string | null;
  title: string;
  mealType: MealType;
  eatenAt: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  feedbacks: Feedback[];
}

export interface CreateDishRequest {
  name: string;
  description?: string;
  mealTypes?: MealType[];
  isActive?: boolean;
}

export interface CreateMealRecordRequest {
  dishId?: string;
  title: string;
  mealType: MealType;
  eatenAt: string;
  note?: string;
}

export interface UpsertFeedbackRequest {
  mealRecordId: string;
  rating: FeedbackRating;
  note?: string;
}

export interface RecommendationCandidate {
  dish: Dish;
  score: number;
  weight: number;
  reasons: string[];
}

export interface RecommendationResponse {
  items: RecommendationCandidate[];
}

export interface BlindBoxResponse {
  item: RecommendationCandidate | null;
}

export interface RecommendationRequest {
  mealType?: MealType;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
