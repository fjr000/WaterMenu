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
  DishesQuery,
  UpdateDishRequest,
} from "../api/types.ts";

function normalizeDishesQuery(query: DishesQuery = {}) {
  return {
    q: query.q?.trim() || null,
    mealType: query.mealType ?? null,
    isActive: query.isActive ?? null,
  };
}

const dishesKey = (query: DishesQuery = {}): QueryKey => [
  "dishes",
  normalizeDishesQuery(query),
];

export function useDishes(query: DishesQuery = {}) {
  const normalizedQuery = normalizeDishesQuery(query);

  return useQuery({
    queryKey: dishesKey(query),
    queryFn: () => {
      const params = new URLSearchParams();
      Object.entries(normalizedQuery).forEach(([key, value]) => {
        if (value !== null) {
          params.set(key, String(value));
        }
      });
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
