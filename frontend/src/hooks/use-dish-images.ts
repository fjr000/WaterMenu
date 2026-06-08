import {
  useMutation,
  useQuery,
  useQueryClient,
  type QueryClient,
  type QueryKey,
} from "@tanstack/react-query";
import { apiFetch } from "../api/client.ts";
import type { DishImage } from "../api/types.ts";

const dishImagesKey = (dishId: string): QueryKey => ["dish-images", dishId];

function invalidateDishImageQueries(queryClient: QueryClient, dishId: string) {
  void queryClient.invalidateQueries({ queryKey: dishImagesKey(dishId) });
  void queryClient.invalidateQueries({ queryKey: ["dishes"] });
}

export function useDishImages(dishId: string) {
  return useQuery({
    queryKey: dishImagesKey(dishId),
    queryFn: () => apiFetch<DishImage[]>(`/dishes/${dishId}/images`),
  });
}

export function useUploadDishImage(dishId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (file: File) => {
      const formData = new FormData();
      formData.set("file", file);
      return apiFetch<DishImage>(`/dishes/${dishId}/images`, {
        method: "POST",
        body: formData,
      });
    },
    onSuccess: () => invalidateDishImageQueries(queryClient, dishId),
  });
}

export function useSetDishImageCover(dishId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<DishImage>(`/dish-images/${id}/cover`, {
        method: "PATCH",
        body: JSON.stringify({}),
      }),
    onSuccess: () => invalidateDishImageQueries(queryClient, dishId),
  });
}

export function useDeleteDishImage(dishId: string) {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: boolean }>(`/dish-images/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => invalidateDishImageQueries(queryClient, dishId),
  });
}
