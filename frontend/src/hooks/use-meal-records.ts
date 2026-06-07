import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { apiFetch } from "../api/client.ts";
import type {
  CreateMealRecordRequest,
  Feedback,
  MealRecord,
  UpsertFeedbackRequest,
} from "../api/types.ts";

export const mealRecordsKey: QueryKey = ["meal-records"];

export function useMealRecords() {
  return useQuery({
    queryKey: mealRecordsKey,
    queryFn: () => apiFetch<MealRecord[]>("/meal-records"),
  });
}

export function useCreateMealRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateMealRecordRequest) =>
      apiFetch<MealRecord>("/meal-records", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mealRecordsKey });
      void queryClient.invalidateQueries({ queryKey: ["dishes"] });
    },
  });
}

export function useUpsertFeedback() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: UpsertFeedbackRequest) =>
      apiFetch<Feedback>("/feedback", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: mealRecordsKey });
    },
  });
}
