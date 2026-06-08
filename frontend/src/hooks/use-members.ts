import { useQuery } from "@tanstack/react-query";
import { apiFetch } from "../api/client.ts";
import type { Member } from "../api/types.ts";

export function useMembers() {
  return useQuery({
    queryKey: ["members"],
    queryFn: () => apiFetch<Member[]>("/members"),
  });
}
