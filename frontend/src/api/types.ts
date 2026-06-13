export type MealType = "BREAKFAST" | "LUNCH" | "DINNER" | "SNACK";

export type FeedbackRating = "GOOD" | "OK" | "BAD";

export type DishVariantType = "HOME_RECIPE" | "TAKEOUT" | "DINE_IN" | "OTHER";

export type UserRole = "ADMIN" | "MEMBER";

export interface User {
  id: string;
  email: string;
  name: string;
  role: UserRole;
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

export interface DishImage {
  id: string;
  workspaceId: string;
  dishId: string;
  storageKey: string;
  mimeType: string;
  size: number;
  width: number;
  height: number;
  sortOrder: number;
  isCover: boolean;
  fileUrl: string;
  createdAt: string;
  updatedAt: string;
}

export interface DishesQuery {
  q?: string;
  mealType?: MealType;
  isActive?: boolean;
}

export interface Dish {
  id: string;
  workspaceId: string;
  name: string;
  description: string | null;
  mealTypes: MealType[];
  isActive: boolean;
  coverImage: DishImage | null;
  mealRecordCount: number;
  feedbackRatingAverage: number | null;
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

export interface DishVariant {
  id: string;
  workspaceId: string;
  dishId: string;
  name: string;
  description: string | null;
  type: DishVariantType;
  isActive: boolean;
  createdAt: string;
  updatedAt: string;
}

export interface MealRecordDishRef {
  id: string;
  name: string;
}

export interface MealRecord {
  id: string;
  workspaceId: string;
  dishId: string;
  dish: MealRecordDishRef;
  variantId: string | null;
  variant: DishVariant | null;
  mealType: MealType;
  eatenAt: string;
  note: string | null;
  createdAt: string;
  updatedAt: string;
  feedbacks: Feedback[];
}

export interface MealRecordsQuery {
  page?: number;
  pageSize?: number;
  mealType?: MealType;
  dishId?: string;
  rating?: FeedbackRating;
  ratingScope?: "mine" | "workspace";
  from?: string;
  to?: string;
  q?: string;
}

export interface MealRecordsPage {
  items: MealRecord[];
  total: number;
  page: number;
  pageSize: number;
}

export interface Recipe {
  id: string;
  workspaceId: string;
  dishId: string;
  instructions: string;
  createdAt: string;
  updatedAt: string;
}

export interface CreateDishRequest {
  name: string;
  description?: string;
  mealTypes?: MealType[];
  isActive?: boolean;
}

export interface UpdateDishRequest {
  name?: string;
  description?: string;
  mealTypes?: MealType[];
  isActive?: boolean;
}

export interface CreateMealRecordRequest {
  dishId: string;
  variantId?: string;
  mealType: MealType;
  eatenAt: string;
  note?: string;
}

export interface UpdateMealRecordRequest {
  mealType?: MealType;
  eatenAt?: string;
  note?: string | null;
}

export interface UpsertFeedbackRequest {
  mealRecordId: string;
  rating: FeedbackRating;
  note?: string;
}

export interface CreateRecipeRequest {
  instructions: string;
}

export interface UpdateRecipeRequest {
  instructions?: string;
}

export interface CreateDishVariantRequest {
  name: string;
  description?: string;
  type: DishVariantType;
  isActive?: boolean;
}

export interface UpdateDishVariantRequest {
  name?: string;
  description?: string | null;
  type?: DishVariantType;
  isActive?: boolean;
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

export interface Member {
  id: string;
  email?: string;
  name: string;
  role: UserRole;
  createdAt: string;
}

export interface WorkspaceInvite {
  id: string;
  createdAt: string;
  expiresAt: string;
}

export interface CreateInviteResponse extends WorkspaceInvite {
  inviteLink: string;
}

export type InvitePreviewReason = "EXPIRED" | "USED" | "REVOKED" | "UNAVAILABLE";

export type InvitePreviewResponse =
  | {
      canAccept: true;
      workspaceName: string;
      expiresAt: string;
    }
  | {
      canAccept: false;
      reason: InvitePreviewReason;
    };

export interface AcceptInviteRequest {
  name: string;
  email: string;
  password: string;
}

export class ApiError extends Error {
  status: number;

  constructor(status: number, message: string) {
    super(message);
    this.name = "ApiError";
    this.status = status;
  }
}
