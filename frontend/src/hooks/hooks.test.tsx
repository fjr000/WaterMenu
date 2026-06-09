import { QueryClientProvider } from "@tanstack/react-query";
import { act, renderHook, waitFor } from "@testing-library/react";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "../api/client.ts";
import type { CreateInviteResponse, DishImage, Member, MeResponse } from "../api/types.ts";
import { createQueryWrapper, createTestQueryClient, sampleDish, sampleMealRecord, sampleRecipe } from "../test/test-utils.tsx";
import { AuthProvider, isUnauthorized, useAuth } from "./use-auth.tsx";
import { useDeleteDishImage, useDishImages, useSetDishImageCover, useUploadDishImage } from "./use-dish-images.ts";
import { useCreateDish, useDishes, useUpdateDish } from "./use-dishes.ts";
import { useAcceptInvite, useCreateInvite, useInvitePreview, useInvites, useRevokeInvite } from "./use-invites.ts";
import { useCreateMealRecord, useDeleteMealRecord, useMealRecords, useUpdateMealRecord, useUpsertFeedback } from "./use-meal-records.ts";
import { useMembers } from "./use-members.ts";
import { useCreateRecipe, useRecipes, useUpdateRecipe } from "./use-recipes.ts";
import { useBlindBox, useRecommend } from "./use-recommendations.ts";

vi.mock("../api/client.ts", () => ({
  apiFetch: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);

function renderQueryHook<T>(callback: () => T) {
  return renderHook(callback, { wrapper: createQueryWrapper().Wrapper });
}

describe("React Query hooks", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("useDishes 正规化查询参数", async () => {
    apiFetchMock.mockResolvedValueOnce([sampleDish]);
    const { result } = renderQueryHook(() =>
      useDishes({ q: " 番茄 ", mealType: "LUNCH", isActive: true }),
    );

    await waitFor(() => expect(result.current.data).toEqual([sampleDish]));
    expect(apiFetchMock).toHaveBeenCalledWith(
      "/dishes?q=%E7%95%AA%E8%8C%84&mealType=LUNCH&isActive=true",
    );
  });

  it("dish mutations 调用正确 endpoint", async () => {
    apiFetchMock.mockResolvedValue(sampleDish);
    const createHook = renderQueryHook(() => useCreateDish());
    await act(() => createHook.result.current.mutateAsync({ name: "番茄炒蛋" }));
    expect(apiFetchMock).toHaveBeenLastCalledWith("/dishes", {
      method: "POST",
      body: JSON.stringify({ name: "番茄炒蛋" }),
    });

    const updateHook = renderQueryHook(() => useUpdateDish());
    await act(() =>
      updateHook.result.current.mutateAsync({
        id: "dish-1",
        body: { isActive: false },
      }),
    );
    expect(apiFetchMock).toHaveBeenLastCalledWith("/dishes/dish-1", {
      method: "PATCH",
      body: JSON.stringify({ isActive: false }),
    });
  });

  it("meal record hooks 调用正确 endpoint", async () => {
    apiFetchMock.mockResolvedValueOnce({ items: [sampleMealRecord], total: 1, page: 2, pageSize: 10 });
    const queryHook = renderQueryHook(() =>
      useMealRecords({ page: 2, pageSize: 10, q: " 午餐 " }),
    );
    await waitFor(() => expect(queryHook.result.current.data?.items).toHaveLength(1));
    expect(apiFetchMock).toHaveBeenCalledWith("/meal-records?page=2&pageSize=10&q=%E5%8D%88%E9%A4%90");

    apiFetchMock.mockResolvedValue(sampleMealRecord);
    const createHook = renderQueryHook(() => useCreateMealRecord());
    await act(() =>
      createHook.result.current.mutateAsync({
        title: "番茄炒蛋",
        mealType: "LUNCH",
        eatenAt: "2026-06-01T12:00:00.000Z",
      }),
    );
    expect(apiFetchMock).toHaveBeenLastCalledWith("/meal-records", expect.objectContaining({ method: "POST" }));

    const updateHook = renderQueryHook(() => useUpdateMealRecord());
    await act(() => updateHook.result.current.mutateAsync({ id: "record-1", body: { note: null } }));
    expect(apiFetchMock).toHaveBeenLastCalledWith("/meal-records/record-1", expect.objectContaining({ method: "PATCH" }));

    apiFetchMock.mockResolvedValueOnce({ ok: true });
    const deleteHook = renderQueryHook(() => useDeleteMealRecord());
    await act(() => deleteHook.result.current.mutateAsync("record-1"));
    expect(apiFetchMock).toHaveBeenLastCalledWith("/meal-records/record-1", { method: "DELETE" });

    apiFetchMock.mockResolvedValueOnce({ id: "feedback-1", userId: "user-1", rating: "GOOD", note: null, createdAt: "", updatedAt: "" });
    const feedbackHook = renderQueryHook(() => useUpsertFeedback());
    await act(() => feedbackHook.result.current.mutateAsync({ mealRecordId: "record-1", rating: "GOOD" }));
    expect(apiFetchMock).toHaveBeenLastCalledWith("/feedback", expect.objectContaining({ method: "POST" }));
  });

  it("recipe hooks 调用正确 endpoint", async () => {
    apiFetchMock.mockResolvedValueOnce([sampleRecipe]);
    const queryHook = renderQueryHook(() => useRecipes("dish-1"));
    await waitFor(() => expect(queryHook.result.current.data).toEqual([sampleRecipe]));
    expect(apiFetchMock).toHaveBeenCalledWith("/dishes/dish-1/recipes");

    apiFetchMock.mockResolvedValue(sampleRecipe);
    const createHook = renderQueryHook(() => useCreateRecipe("dish-1"));
    await act(() => createHook.result.current.mutateAsync({ title: "做法", content: "内容" }));
    expect(apiFetchMock).toHaveBeenLastCalledWith("/dishes/dish-1/recipes", expect.objectContaining({ method: "POST" }));

    const updateHook = renderQueryHook(() => useUpdateRecipe("dish-1"));
    await act(() => updateHook.result.current.mutateAsync({ id: "recipe-1", body: { title: "新版" } }));
    expect(apiFetchMock).toHaveBeenLastCalledWith("/recipes/recipe-1", expect.objectContaining({ method: "PATCH" }));
  });

  it("dish image hooks 调用正确 endpoint", async () => {
    const image: DishImage = {
      id: "image-1",
      workspaceId: "workspace-1",
      dishId: "dish-1",
      storageKey: "image.jpg",
      mimeType: "image/jpeg",
      size: 100,
      width: 10,
      height: 10,
      sortOrder: 0,
      isCover: false,
      fileUrl: "/uploads/image.jpg",
      createdAt: "",
      updatedAt: "",
    };
    apiFetchMock.mockResolvedValueOnce([image]);
    const queryHook = renderQueryHook(() => useDishImages("dish-1"));
    await waitFor(() => expect(queryHook.result.current.data).toEqual([image]));
    expect(apiFetchMock).toHaveBeenCalledWith("/dishes/dish-1/images");

    apiFetchMock.mockResolvedValue(image);
    const uploadHook = renderQueryHook(() => useUploadDishImage("dish-1"));
    await act(() => uploadHook.result.current.mutateAsync(new File(["x"], "x.jpg", { type: "image/jpeg" })));
    expect(apiFetchMock).toHaveBeenLastCalledWith("/dishes/dish-1/images", expect.objectContaining({ method: "POST" }));

    const coverHook = renderQueryHook(() => useSetDishImageCover("dish-1"));
    await act(() => coverHook.result.current.mutateAsync("image-1"));
    expect(apiFetchMock).toHaveBeenLastCalledWith("/dish-images/image-1/cover", expect.objectContaining({ method: "PATCH" }));

    apiFetchMock.mockResolvedValueOnce({ ok: true });
    const deleteHook = renderQueryHook(() => useDeleteDishImage("dish-1"));
    await act(() => deleteHook.result.current.mutateAsync("image-1"));
    expect(apiFetchMock).toHaveBeenLastCalledWith("/dish-images/image-1", { method: "DELETE" });
  });

  it("invite hooks 调用正确 endpoint", async () => {
    const invite = { id: "invite-1", createdAt: "2026-06-01T00:00:00.000Z", expiresAt: "2026-06-02T00:00:00.000Z" };
    apiFetchMock.mockResolvedValueOnce([invite]);
    const queryHook = renderQueryHook(() => useInvites(true));
    await waitFor(() => expect(queryHook.result.current.data).toEqual([invite]));
    expect(apiFetchMock).toHaveBeenCalledWith("/invites");

    const createResponse: CreateInviteResponse = { ...invite, inviteLink: "http://localhost/invite/token" };
    apiFetchMock.mockResolvedValue(createResponse);
    const createHook = renderQueryHook(() => useCreateInvite());
    await act(() => createHook.result.current.mutateAsync());
    expect(apiFetchMock).toHaveBeenLastCalledWith("/invites", expect.objectContaining({ method: "POST" }));

    apiFetchMock.mockResolvedValueOnce({ ok: true });
    const revokeHook = renderQueryHook(() => useRevokeInvite());
    await act(() => revokeHook.result.current.mutateAsync("invite-1"));
    expect(apiFetchMock).toHaveBeenLastCalledWith("/invites/invite-1", { method: "DELETE" });

    apiFetchMock.mockResolvedValueOnce({ canAccept: true, workspaceName: "WaterMenu", expiresAt: invite.expiresAt });
    const previewHook = renderQueryHook(() => useInvitePreview("token-1"));
    await waitFor(() => expect(previewHook.result.current.data).toMatchObject({ canAccept: true }));
    expect(apiFetchMock).toHaveBeenLastCalledWith("/invites/token-1/preview");

    apiFetchMock.mockResolvedValueOnce({ user: { id: "user-1", email: "a@b.com", name: "A", role: "MEMBER" }, workspace: { id: "workspace-1", name: "WaterMenu" } });
    const acceptHook = renderQueryHook(() => useAcceptInvite("token-1"));
    await act(() => acceptHook.result.current.mutateAsync({ name: "A", email: "a@b.com", password: "password" }));
    expect(apiFetchMock).toHaveBeenLastCalledWith("/invites/token-1/accept", expect.objectContaining({ method: "POST" }));
  });

  it("members 和 recommendation hooks 调用正确 endpoint", async () => {
    const member: Member = { id: "user-1", email: "a@b.com", name: "A", role: "ADMIN", createdAt: "2026-06-01T00:00:00.000Z" };
    apiFetchMock.mockResolvedValueOnce([member]);
    const membersHook = renderQueryHook(() => useMembers());
    await waitFor(() => expect(membersHook.result.current.data).toEqual([member]));
    expect(apiFetchMock).toHaveBeenCalledWith("/members");

    apiFetchMock.mockResolvedValueOnce({ items: [] });
    const recommendHook = renderQueryHook(() => useRecommend());
    await act(() => recommendHook.result.current.mutateAsync({ mealType: "DINNER" }));
    expect(apiFetchMock).toHaveBeenLastCalledWith("/recommendations", expect.objectContaining({ method: "POST" }));

    apiFetchMock.mockResolvedValueOnce({ item: null });
    const blindBoxHook = renderQueryHook(() => useBlindBox());
    await act(() => blindBoxHook.result.current.mutateAsync({}));
    expect(apiFetchMock).toHaveBeenLastCalledWith("/blind-box", expect.objectContaining({ method: "POST" }));
  });
});

describe("auth hook", () => {
  beforeEach(() => {
    apiFetchMock.mockReset();
  });

  it("AuthProvider 提供当前用户信息", async () => {
    const me: MeResponse = {
      user: { id: "user-1", email: "a@b.com", name: "A", role: "ADMIN" },
      workspace: { id: "workspace-1", name: "WaterMenu" },
    };
    apiFetchMock.mockResolvedValueOnce(me);
    const queryClient = createTestQueryClient();
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      );
    }

    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    await waitFor(() => expect(result.current.user?.id).toBe("user-1"));
    expect(result.current.workspace?.name).toBe("WaterMenu");
  });

  it("logout 清理非 auth query", async () => {
    apiFetchMock.mockResolvedValueOnce({ user: null, workspace: null }).mockResolvedValueOnce({ ok: true });
    const queryClient = createTestQueryClient();
    queryClient.setQueryData(["dishes"], [sampleDish]);
    function Wrapper({ children }: { children: ReactNode }) {
      return (
        <QueryClientProvider client={queryClient}>
          <AuthProvider>{children}</AuthProvider>
        </QueryClientProvider>
      );
    }
    const { result } = renderHook(() => useAuth(), { wrapper: Wrapper });

    await act(() => result.current.logout());

    expect(apiFetchMock).toHaveBeenLastCalledWith("/auth/logout", {
      method: "POST",
      body: JSON.stringify({}),
    });
    expect(queryClient.getQueryData(["dishes"])).toBeUndefined();
  });

  it("isUnauthorized 识别 401 ApiError", async () => {
    const { ApiError } = await import("../api/types.ts");
    expect(isUnauthorized(new ApiError(401, "未登录"))).toBe(true);
    expect(isUnauthorized(new Error("x"))).toBe(false);
  });
});
