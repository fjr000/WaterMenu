import {
  createContext,
  useCallback,
  useContext,
  useMemo,
  type ReactNode,
} from "react";
import { useQuery, useQueryClient } from "@tanstack/react-query";
import { apiFetch } from "../api/client.ts";
import { ApiError } from "../api/types.ts";
import type { MeResponse } from "../api/types.ts";

export const authMeKey = ["auth", "me"] as const;

interface AuthContextValue {
  user: MeResponse["user"] | null;
  workspace: MeResponse["workspace"] | null;
  isLoading: boolean;
  logout: () => Promise<void>;
}

const AuthContext = createContext<AuthContextValue | null>(null);

export function AuthProvider({ children }: { children: ReactNode }) {
  const queryClient = useQueryClient();

  const meQuery = useQuery<MeResponse | null>({
    queryKey: authMeKey,
    queryFn: () => apiFetch<MeResponse>("/auth/me"),
    retry: false,
  });

  const logout = useCallback(async () => {
    try {
      await apiFetch<{ ok: boolean }>("/auth/logout", {
        method: "POST",
        body: JSON.stringify({}),
      });
    } catch {
      // 忽略退出登录错误
    } finally {
      queryClient.clear();
      queryClient.setQueryData(authMeKey, null);
    }
  }, [queryClient]);

  const value = useMemo<AuthContextValue>(
    () => ({
      user: meQuery.data?.user ?? null,
      workspace: meQuery.data?.workspace ?? null,
      isLoading: meQuery.isLoading,
      logout,
    }),
    [meQuery.data, meQuery.isLoading, logout],
  );

  return <AuthContext value={value}>{children}</AuthContext>;
}

export function useAuth(): AuthContextValue {
  const ctx = useContext(AuthContext);
  if (!ctx) {
    throw new Error("useAuth must be used within AuthProvider");
  }
  return ctx;
}

export function isUnauthorized(error: unknown): boolean {
  return error instanceof ApiError && error.status === 401;
}
