import { useMutation, useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client.ts";
import type {
  AcceptInviteRequest,
  CreateInviteResponse,
  InvitePreviewResponse,
  MeResponse,
  WorkspaceInvite,
} from "../api/types.ts";

export function useInvites(enabled: boolean) {
  return useQuery({
    queryKey: ["invites"],
    queryFn: () => apiFetch<WorkspaceInvite[]>("/invites"),
    enabled,
  });
}

export function useCreateInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: () =>
      apiFetch<CreateInviteResponse>("/invites", {
        method: "POST",
        body: JSON.stringify({}),
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invites"] });
    },
  });
}

export function useRevokeInvite() {
  const queryClient = useQueryClient();

  return useMutation({
    mutationFn: (id: string) =>
      apiFetch<{ ok: boolean }>(`/invites/${id}`, {
        method: "DELETE",
      }),
    onSuccess: () => {
      void queryClient.invalidateQueries({ queryKey: ["invites"] });
    },
  });
}

export function useInvitePreview(token: string) {
  return useQuery({
    queryKey: ["invite-preview", token],
    queryFn: () => apiFetch<InvitePreviewResponse>(`/invites/${token}/preview`),
  });
}

export function useAcceptInvite(token: string) {
  return useMutation({
    mutationFn: (body: AcceptInviteRequest) =>
      apiFetch<MeResponse>(`/invites/${token}/accept`, {
        method: "POST",
        body: JSON.stringify(body),
      }),
  });
}
