import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { apiFetch } from "../api/client.ts";
import type {
  CreateDishVariantRequest,
  DishVariant,
  UpdateDishVariantRequest,
} from "../api/types.ts";
import { mealRecordsKey } from "./use-meal-records.ts";

const dishVariantsKey = (dishId: string): QueryKey => ["dish-variants", dishId];

function invalidateDishVariantQueries(queryClient: QueryClient, dishId: string) {
  void Promise.all([
    queryClient.invalidateQueries({ queryKey: dishVariantsKey(dishId) }),
    queryClient.invalidateQueries({ queryKey: mealRecordsKey }),
  ]);
}

export function useDishVariants(dishId: string, enabled = true) {
  return useQuery({
    queryKey: dishVariantsKey(dishId),
    queryFn: () => apiFetch<DishVariant[]>(`/dishes/${dishId}/variants`),
    enabled,
  });
}

export function useCreateDishVariant(dishId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateDishVariantRequest) =>
      apiFetch<DishVariant>(`/dishes/${dishId}/variants`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateDishVariantQueries(queryClient, dishId),
  });
}

export function useUpdateDishVariant(dishId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateDishVariantRequest }) =>
      apiFetch<DishVariant>(`/dish-variants/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => invalidateDishVariantQueries(queryClient, dishId),
  });
}
