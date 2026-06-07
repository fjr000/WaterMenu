import { useMutation } from "@tanstack/react-query";
import { apiFetch } from "../api/client.ts";
import type {
  BlindBoxResponse,
  RecommendationRequest,
  RecommendationResponse,
} from "../api/types.ts";

export function useRecommend() {
  return useMutation({
    mutationFn: (body: RecommendationRequest) =>
      apiFetch<RecommendationResponse>("/recommendations", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}

export function useBlindBox() {
  return useMutation({
    mutationFn: (body: RecommendationRequest) =>
      apiFetch<BlindBoxResponse>("/blind-box", {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}
