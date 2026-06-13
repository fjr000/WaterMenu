import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import type { ReactNode } from "react";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { apiFetch } from "../api/client.ts";
import { ApiError, type DishImage, type MealRecordsPage, type Member, type Recipe, type WorkspaceInvite } from "../api/types.ts";
import { useDishImages, useDeleteDishImage, useSetDishImageCover, useUploadDishImage } from "../hooks/use-dish-images.ts";
import { useDishVariants } from "../hooks/use-dish-variants.ts";
import { useCreateDish, useDishes, useUpdateDish } from "../hooks/use-dishes.ts";
import { authMeKey, useAuth } from "../hooks/use-auth.tsx";
import { useAcceptInvite, useCreateInvite, useInvitePreview, useInvites, useRevokeInvite } from "../hooks/use-invites.ts";
import { useCreateMealRecord, useDeleteMealRecord, useMealRecords, useUpdateMealRecord, useUpsertFeedback } from "../hooks/use-meal-records.ts";
import { useMembers } from "../hooks/use-members.ts";
import { useBlindBox, useRecommend } from "../hooks/use-recommendations.ts";
import { useCreateRecipe, useRecipes, useUpdateRecipe } from "../hooks/use-recipes.ts";
import { createTestQueryClient, sampleDish, sampleMealRecord, sampleRecipe } from "../test/test-utils.tsx";
import { HomePage } from "./home-page.tsx";
import { InvitePage } from "./invite-page.tsx";
import { LoginPage } from "./login-page.tsx";

vi.mock("../api/client.ts", () => ({
  apiFetch: vi.fn(),
}));

vi.mock("../hooks/use-auth.tsx", () => ({
  authMeKey: ["auth", "me"],
  isUnauthorized: (error: unknown) => Boolean(error && typeof error === "object" && "status" in error && error.status === 401),
  useAuth: vi.fn(),
}));

vi.mock("../hooks/use-dishes.ts", () => ({
  useDishes: vi.fn(),
  useCreateDish: vi.fn(),
  useUpdateDish: vi.fn(),
}));

vi.mock("../hooks/use-meal-records.ts", () => ({
  useMealRecords: vi.fn(),
  useCreateMealRecord: vi.fn(),
  useUpdateMealRecord: vi.fn(),
  useDeleteMealRecord: vi.fn(),
  useUpsertFeedback: vi.fn(),
}));

vi.mock("../hooks/use-dish-images.ts", () => ({
  dishImagesKey: vi.fn((dishId: string) => ["dish-images", dishId]),
  useDishImages: vi.fn(),
  useUploadDishImage: vi.fn(),
  useSetDishImageCover: vi.fn(),
  useDeleteDishImage: vi.fn(),
}));

vi.mock("../hooks/use-dish-variants.ts", () => ({
  useDishVariants: vi.fn(),
}));

vi.mock("../hooks/use-recipes.ts", () => ({
  useRecipes: vi.fn(),
  useCreateRecipe: vi.fn(),
  useUpdateRecipe: vi.fn(),
}));

vi.mock("../hooks/use-invites.ts", () => ({
  useInvitePreview: vi.fn(),
  useAcceptInvite: vi.fn(),
  useInvites: vi.fn(),
  useCreateInvite: vi.fn(),
  useRevokeInvite: vi.fn(),
}));

vi.mock("../hooks/use-members.ts", () => ({
  useMembers: vi.fn(),
}));

vi.mock("../hooks/use-recommendations.ts", () => ({
  useRecommend: vi.fn(),
  useBlindBox: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);
const useAuthMock = useAuth as Mock;
const useDishesMock = useDishes as Mock;
const useCreateDishMock = useCreateDish as Mock;
const useUpdateDishMock = useUpdateDish as Mock;
const useMealRecordsMock = useMealRecords as Mock;
const useCreateMealRecordMock = useCreateMealRecord as Mock;
const useUpdateMealRecordMock = useUpdateMealRecord as Mock;
const useDeleteMealRecordMock = useDeleteMealRecord as Mock;
const useUpsertFeedbackMock = useUpsertFeedback as Mock;
const useDishImagesMock = useDishImages as Mock;
const useUploadDishImageMock = useUploadDishImage as Mock;
const useSetDishImageCoverMock = useSetDishImageCover as Mock;
const useDeleteDishImageMock = useDeleteDishImage as Mock;
const useDishVariantsMock = useDishVariants as Mock;
const useRecipesMock = useRecipes as Mock;
const useCreateRecipeMock = useCreateRecipe as Mock;
const useUpdateRecipeMock = useUpdateRecipe as Mock;
const useInvitePreviewMock = useInvitePreview as Mock;
const useAcceptInviteMock = useAcceptInvite as Mock;
const useInvitesMock = useInvites as Mock;
const useCreateInviteMock = useCreateInvite as Mock;
const useRevokeInviteMock = useRevokeInvite as Mock;
const useMembersMock = useMembers as Mock;
const useRecommendMock = useRecommend as Mock;
const useBlindBoxMock = useBlindBox as Mock;

const unauthenticatedAuth = { user: null, workspace: null, isLoading: false, logout: vi.fn() };

function queryState<T>(data: T) {
  return {
    data,
    isLoading: false,
    isError: false,
    refetch: vi.fn(),
  };
}

function mutationState(mutate = vi.fn()) {
  return {
    mutate,
    reset: vi.fn(),
    data: null,
    isPending: false,
    isError: false,
    isSuccess: false,
    error: null,
  };
}

function renderWithQueryClient(ui: ReactNode) {
  const queryClient = createTestQueryClient();
  const view = render(<QueryClientProvider client={queryClient}>{ui}</QueryClientProvider>);

  return { queryClient, ...view };
}

beforeEach(() => {
  vi.clearAllMocks();
  apiFetchMock.mockReset();
  useAuthMock.mockReturnValue({
    user: { id: "user-1", email: "a@b.com", name: "小明", role: "ADMIN" },
    workspace: { id: "workspace-1", name: "家庭菜单" },
    isLoading: false,
    logout: vi.fn(),
  });
  useDishesMock.mockReturnValue(queryState([sampleDish]));
  useCreateDishMock.mockReturnValue(mutationState());
  useUpdateDishMock.mockReturnValue(mutationState());
  useMealRecordsMock.mockReturnValue(queryState<MealRecordsPage>({ items: [sampleMealRecord], total: 1, page: 1, pageSize: 20 }));
  useCreateMealRecordMock.mockReturnValue(mutationState());
  useUpdateMealRecordMock.mockReturnValue(mutationState());
  useDeleteMealRecordMock.mockReturnValue(mutationState());
  useUpsertFeedbackMock.mockReturnValue(mutationState());
  useDishImagesMock.mockReturnValue(queryState<DishImage[]>([]));
  useUploadDishImageMock.mockReturnValue(mutationState());
  useSetDishImageCoverMock.mockReturnValue(mutationState());
  useDeleteDishImageMock.mockReturnValue(mutationState());
  useDishVariantsMock.mockReturnValue(queryState([]));
  useRecipesMock.mockReturnValue(queryState<Recipe[]>([sampleRecipe]));
  useCreateRecipeMock.mockReturnValue(mutationState());
  useUpdateRecipeMock.mockReturnValue(mutationState());
  useInvitePreviewMock.mockReturnValue(queryState({ canAccept: true, workspaceName: "家庭菜单", expiresAt: "2026-06-02T00:00:00.000Z" }));
  useAcceptInviteMock.mockReturnValue(mutationState());
  useInvitesMock.mockReturnValue(queryState<WorkspaceInvite[]>([]));
  useCreateInviteMock.mockReturnValue(mutationState());
  useRevokeInviteMock.mockReturnValue(mutationState());
  const member: Member = { id: "user-1", email: "a@b.com", name: "小明", role: "ADMIN", createdAt: "2026-06-01T00:00:00.000Z" };
  useMembersMock.mockReturnValue(queryState<Member[]>([member]));
  useRecommendMock.mockReturnValue(mutationState());
  useBlindBoxMock.mockReturnValue(mutationState());
});

describe("LoginPage", () => {
  it("校验必填和邮箱格式", async () => {
    renderWithQueryClient(<LoginPage />);

    await userEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByText("请输入有效的邮箱地址")).toBeInTheDocument();
    expect(screen.getByText("请输入密码")).toBeInTheDocument();
    expect(apiFetchMock).not.toHaveBeenCalled();
  });

  it("登录成功后写入 auth query", async () => {
    const me = {
      user: { id: "user-1", email: "a@b.com", name: "小明", role: "ADMIN" as const },
      workspace: { id: "workspace-1", name: "家庭菜单" },
    };
    apiFetchMock.mockResolvedValueOnce(me);
    const { queryClient } = renderWithQueryClient(<LoginPage />);

    await userEvent.type(screen.getByLabelText("邮箱"), "a@b.com");
    await userEvent.type(screen.getByLabelText("密码"), "password");
    await userEvent.click(screen.getByRole("button", { name: "登录" }));

    await waitFor(() => expect(apiFetchMock).toHaveBeenCalledWith("/auth/login", expect.objectContaining({ method: "POST" })));
    expect(queryClient.getQueryData(authMeKey)).toEqual(me);
  });

  it("登录失败时显示可理解错误", async () => {
    apiFetchMock.mockRejectedValueOnce(new ApiError(401, "未登录"));
    renderWithQueryClient(<LoginPage />);

    await userEvent.type(screen.getByLabelText("邮箱"), "a@b.com");
    await userEvent.type(screen.getByLabelText("密码"), "wrong-password");
    await userEvent.click(screen.getByRole("button", { name: "登录" }));

    expect(await screen.findByText("邮箱或密码错误")).toBeInTheDocument();
  });
});

describe("InvitePage", () => {
  it("已登录用户只能先退出当前账号", async () => {
    const logout = vi.fn();
    useAuthMock.mockReturnValue({
      user: { id: "user-1", email: "a@b.com", name: "小明", role: "MEMBER" },
      workspace: { id: "workspace-1", name: "家庭菜单" },
      isLoading: false,
      logout,
    });

    renderWithQueryClient(<InvitePage token="token-1" />);

    expect(screen.getByText(/当前已登录为 小明/)).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "退出当前账号" }));
    expect(logout).toHaveBeenCalledTimes(1);
  });

  it("邀请预览失败时支持重试", async () => {
    const refetch = vi.fn();
    useAuthMock.mockReturnValue(unauthenticatedAuth);
    useInvitePreviewMock.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch });

    renderWithQueryClient(<InvitePage token="token-1" />);

    expect(screen.getByText("校验邀请失败")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });

  it("校验邀请注册表单并提交接受邀请", async () => {
    const mutate = vi.fn();
    useAuthMock.mockReturnValue(unauthenticatedAuth);
    useAcceptInviteMock.mockReturnValue(mutationState(mutate));
    renderWithQueryClient(<InvitePage token="token-1" />);

    await userEvent.click(screen.getByRole("button", { name: "接受邀请并进入" }));
    expect(await screen.findByText("请输入姓名")).toBeInTheDocument();
    expect(screen.getByText("密码至少 8 个字符")).toBeInTheDocument();

    await userEvent.type(screen.getByLabelText("姓名"), " 小明 ");
    await userEvent.type(screen.getByLabelText("邮箱"), "a@b.com");
    await userEvent.type(screen.getByLabelText("密码"), "password");
    await userEvent.type(screen.getByLabelText("确认密码"), "password");
    await userEvent.click(screen.getByRole("button", { name: "接受邀请并进入" }));

    await waitFor(() => expect(mutate).toHaveBeenCalledWith(
      { name: "小明", email: "a@b.com", password: "password" },
      expect.any(Object),
    ));
  });

  it("接受邀请冲突时显示明确错误", () => {
    useAuthMock.mockReturnValue(unauthenticatedAuth);
    useAcceptInviteMock.mockReturnValue({ ...mutationState(), isError: true, error: new ApiError(409, "冲突") });

    renderWithQueryClient(<InvitePage token="token-1" />);

    expect(screen.getByText("邮箱已被使用，或需要先退出当前账号")).toBeInTheDocument();
  });
});

describe("HomePage", () => {
  it("渲染推荐首页并触发推荐和盲盒", async () => {
    const recommend = vi.fn();
    const blindBox = vi.fn();
    useRecommendMock.mockReturnValue(mutationState(recommend));
    useBlindBoxMock.mockReturnValue(mutationState(blindBox));
    // Mock apiFetch for dishImagesKey queries
    apiFetchMock.mockResolvedValue([]);

    renderWithQueryClient(<HomePage />);

    // PageHeader is now only on members tab, so check for something else on recommend tab
    expect(screen.getByText("最近用餐")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "智能推荐" }));
    await userEvent.click(screen.getByRole("button", { name: /盲盒/ }));

    expect(recommend).toHaveBeenCalledWith({});
    expect(blindBox).toHaveBeenCalledWith({});
  });

  it("菜品页支持筛选并传给 useDishes", async () => {
    apiFetchMock.mockResolvedValue([]);
    renderWithQueryClient(<HomePage />);

    await userEvent.click(screen.getByRole("button", { name: /菜品管理/ }));
    await userEvent.type(screen.getByLabelText("关键词"), "番茄");
    await userEvent.selectOptions(screen.getByLabelText("餐次"), "DINNER");
    await userEvent.selectOptions(screen.getByLabelText("状态"), "false");

    await waitFor(() => expect(useDishesMock).toHaveBeenLastCalledWith({ q: "番茄", mealType: "DINNER", isActive: false }));
    expect(screen.getByText((_content, element) => {
      return element?.textContent === '正在筛选：关键词"番茄" · 晚餐 · 停用';
    })).toBeInTheDocument();
  });

  it("菜品加载失败时显示重试入口", async () => {
    const refetch = vi.fn();
    useDishesMock.mockReturnValue({ data: undefined, isLoading: false, isError: true, refetch });
    apiFetchMock.mockResolvedValue([]);

    renderWithQueryClient(<HomePage />);

    await userEvent.click(screen.getByRole("button", { name: /菜品管理/ }));
    expect(screen.getByText("加载菜品失败")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "重试" }));
    expect(refetch).toHaveBeenCalledTimes(1);
  });
});
