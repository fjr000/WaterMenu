import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { apiFetch } from "../api/client.ts";
import type {
  CreateDishRequest,
  Dish,
  MealType,
  UpdateDishRequest,
} from "../api/types.ts";

const dishesKey = (mealType?: MealType): QueryKey => [
  "dishes",
  mealType ?? null,
];

export function useDishes(mealType?: MealType) {
  return useQuery({
    queryKey: dishesKey(mealType),
    queryFn: () => {
      const params = new URLSearchParams();
      if (mealType) {
        params.set("mealType", mealType);
      }
      const qs = params.toString();
      return apiFetch<Dish[]>(`/dishes${qs ? `?${qs}` : ""}`);
    },
  });
}

export function useCreateDish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateDishRequest) =>
      apiFetch<Dish>("/dishes", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dishes"] });
    },
  });
}

export function useUpdateDish() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateDishRequest }) =>
      apiFetch<Dish>(`/dishes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["dishes"] });
    },
  });
}
