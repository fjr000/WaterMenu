import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { apiFetch } from "../api/client.ts";
import type {
  CreateMealRecordRequest,
  Feedback,
  MealRecord,
  MealRecordsPage,
  MealRecordsQuery,
  UpdateMealRecordRequest,
  UpsertFeedbackRequest,
} from "../api/types.ts";

export const mealRecordsKey: QueryKey = ["meal-records"];

function normalizeQuery(query: MealRecordsQuery = {}) {
  return {
    page: query.page ?? 1,
    pageSize: query.pageSize ?? 20,
    mealType: query.mealType ?? null,
    dishId: query.dishId || null,
    rating: query.rating ?? null,
    ratingScope: query.ratingScope ?? null,
    from: query.from ?? null,
    to: query.to ?? null,
    q: query.q?.trim() || null,
  };
}

function mealRecordsQueryKey(query: MealRecordsQuery = {}): QueryKey {
  return ["meal-records", normalizeQuery(query)];
}

export function invalidateMealRecordDependencies(queryClient: QueryClient) {
  void Promise.all([
    queryClient.invalidateQueries({ queryKey: mealRecordsKey }),
    queryClient.invalidateQueries({ queryKey: ["dishes"] }),
  ]);
}

export function useMealRecords(query: MealRecordsQuery = {}) {
  const normalizedQuery = normalizeQuery(query);
  return useQuery({
    queryKey: mealRecordsQueryKey(query),
    queryFn: () => {
      const params = new URLSearchParams();
      Object.entries(normalizedQuery).forEach(([key, value]) => {
        if (value !== null) {
          params.set(key, String(value));
        }
      });
      const qs = params.toString();
      return apiFetch<MealRecordsPage>(`/meal-records${qs ? `?${qs}` : ""}`);
    },
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
      invalidateMealRecordDependencies(queryClient);
    },
  });
}

export function useUpdateMealRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({
      id,
      body,
    }: {
      id: string;
      body: UpdateMealRecordRequest;
    }) =>
      apiFetch<MealRecord>(`/meal-records/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      invalidateMealRecordDependencies(queryClient);
    },
  });
}

export function useDeleteMealRecord() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: boolean }>(`/meal-records/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      invalidateMealRecordDependencies(queryClient);
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
      invalidateMealRecordDependencies(queryClient);
    },
  });
}
