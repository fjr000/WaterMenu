import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { apiFetch } from "../api/client.ts";
import type {
  CreateRecipeRequest,
  Recipe,
  UpdateRecipeRequest,
} from "../api/types.ts";

export const recipesKey = (dishId: string): QueryKey => ["recipes", dishId];

export function useRecipes(dishId: string, enabled = true) {
  return useQuery({
    queryKey: recipesKey(dishId),
    queryFn: () => apiFetch<Recipe[]>(`/dishes/${dishId}/recipes`),
    enabled,
  });
}

export function useCreateRecipe(dishId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (body: CreateRecipeRequest) =>
      apiFetch<Recipe>(`/dishes/${dishId}/recipes`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recipesKey(dishId) });
    },
  });
}

export function useUpdateRecipe(dishId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: ({ id, body }: { id: string; body: UpdateRecipeRequest }) =>
      apiFetch<Recipe>(`/recipes/${id}`, {
        method: "PATCH",
        body: JSON.stringify(body),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: recipesKey(dishId) });
    },
  });
}
