import { QueryClient, QueryClientProvider } from "@tanstack/react-query";
import type { ReactNode } from "react";
import type { Dish, MealRecord, Recipe } from "../api/types.ts";

export function createTestQueryClient() {
  return new QueryClient({
    defaultOptions: {
      queries: { retry: false },
      mutations: { retry: false },
    },
  });
}

export function createQueryWrapper() {
  const queryClient = createTestQueryClient();

  function Wrapper({ children }: { children: ReactNode }) {
    return <QueryClientProvider client={queryClient}>{children}</QueryClientProvider>;
  }

  return { queryClient, Wrapper };
}

export const sampleDish: Dish = {
  id: "dish-1",
  workspaceId: "workspace-1",
  name: "番茄炒蛋",
  description: "家常菜",
  mealTypes: ["LUNCH", "DINNER"],
  isActive: true,
  coverImage: null,
  mealRecordCount: 2,
  feedbackRatingAverage: 4.5,
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};

export const sampleMealRecord: MealRecord = {
  id: "record-1",
  workspaceId: "workspace-1",
  dishId: "dish-1",
  dish: { id: "dish-1", name: "番茄炒蛋" },
  variantId: null,
  variant: null,
  mealType: "LUNCH",
  eatenAt: "2026-06-01T12:00:00.000Z",
  note: "不错",
  createdAt: "2026-06-01T12:00:00.000Z",
  updatedAt: "2026-06-01T12:00:00.000Z",
  feedbacks: [],
};

export const sampleRecipe: Recipe = {
  id: "recipe-1",
  workspaceId: "workspace-1",
  dishId: "dish-1",
  title: "快手做法",
  content: "先炒蛋，再炒番茄。",
  createdAt: "2026-06-01T00:00:00.000Z",
  updatedAt: "2026-06-01T00:00:00.000Z",
};
