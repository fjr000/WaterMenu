import { QueryClientProvider } from "@tanstack/react-query";
import { render, screen, waitFor } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { beforeEach, describe, expect, it, vi, type Mock } from "vitest";
import { apiFetch } from "../api/client.ts";
import type { CreateInviteResponse, DishImage, Member, MealRecordsPage, Recipe, WorkspaceInvite } from "../api/types.ts";
import { sampleDish, sampleMealRecord, sampleRecipe, createTestQueryClient } from "../test/test-utils.tsx";
import { CreateDishForm, EditDishForm } from "./create-dish-form.tsx";
import { DishCoverImage } from "./dish-cover-image.tsx";
import { DishImagePanel } from "./dish-image-panel.tsx";
import { HistoryRecordsPanel } from "./history-records-panel.tsx";
import { MealRecordForm } from "./meal-record-form.tsx";
import { MealRecordCard, RecentMealRecords } from "./recent-meal-records.tsx";
import { RecipePanel } from "./recipe-panel.tsx";
import { MembersPanel } from "./members-panel.tsx";
import { RecommendationPanel } from "./recommendation-panel.tsx";
import { MealTag, mealLabel } from "./meal-tag.tsx";
import { Button, Card, EmptyState, ErrorBanner, Input, PageHeader, SecondaryButton, Select, Spinner } from "./ui.tsx";
import { useCreateDish, useDishes, useUpdateDish } from "../hooks/use-dishes.ts";
import { useCreateMealRecord, useDeleteMealRecord, useMealRecords, useUpdateMealRecord, useUpsertFeedback } from "../hooks/use-meal-records.ts";
import { useDeleteDishImage, useDishImages, useSetDishImageCover, useUploadDishImage } from "../hooks/use-dish-images.ts";
import { useDishVariants } from "../hooks/use-dish-variants.ts";
import { useCreateRecipe, useRecipes, useUpdateRecipe } from "../hooks/use-recipes.ts";
import { useCreateInvite, useInvites, useRevokeInvite } from "../hooks/use-invites.ts";
import { useMembers } from "../hooks/use-members.ts";

vi.mock("../api/client.ts", () => ({
  apiFetch: vi.fn(),
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
  useInvites: vi.fn(),
  useCreateInvite: vi.fn(),
  useRevokeInvite: vi.fn(),
}));

vi.mock("../hooks/use-members.ts", () => ({
  useMembers: vi.fn(),
}));

const apiFetchMock = vi.mocked(apiFetch);
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
const useMembersMock = useMembers as Mock;
const useInvitesMock = useInvites as Mock;
const useCreateInviteMock = useCreateInvite as Mock;
const useRevokeInviteMock = useRevokeInvite as Mock;

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
    isPending: false,
    isError: false,
    error: null,
  };
}

beforeEach(() => {
  vi.clearAllMocks();
  apiFetchMock.mockReset();
  apiFetchMock.mockResolvedValue([]);
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
  const member: Member = { id: "user-1", email: "a@b.com", name: "小明", role: "ADMIN", createdAt: "2026-06-01T00:00:00.000Z" };
  useMembersMock.mockReturnValue(queryState<Member[]>([member]));
  const invite: WorkspaceInvite = { id: "invite-1", createdAt: "2026-06-01T00:00:00.000Z", expiresAt: "2026-06-02T00:00:00.000Z" };
  useInvitesMock.mockReturnValue(queryState<WorkspaceInvite[]>([invite]));
  useCreateInviteMock.mockReturnValue(mutationState());
  useRevokeInviteMock.mockReturnValue(mutationState());
});

describe("基础 UI 组件", () => {
  it("渲染按钮、输入框、卡片、页头、空状态和错误提示", async () => {
    const onClick = vi.fn();
    render(
      <div>
        <Button onClick={onClick}>主按钮</Button>
        <SecondaryButton>次按钮</SecondaryButton>
        <Input aria-label="名称" defaultValue="番茄炒蛋" />
        <Select aria-label="餐次" defaultValue="LUNCH"><option value="LUNCH">午餐</option></Select>
        <Card>卡片内容</Card>
        <PageHeader title="首页" subtitle="副标题" actions={<span>操作</span>} />
        <EmptyState icon="🍽️" title="空状态" description="暂无数据" />
        <Spinner />
        <ErrorBanner message="失败了" onRetry={onClick} />
      </div>,
    );

    await userEvent.click(screen.getByRole("button", { name: "主按钮" }));
    await userEvent.click(screen.getByRole("button", { name: "重试" }));

    expect(onClick).toHaveBeenCalledTimes(2);
    expect(screen.getByLabelText("名称")).toHaveValue("番茄炒蛋");
    expect(screen.getByText("首页")).toBeInTheDocument();
    expect(screen.getByText("空状态")).toBeInTheDocument();
    expect(screen.getByText("失败了")).toBeInTheDocument();
  });

  it("MealTag 和 DishCoverImage 渲染业务显示", () => {
    expect(mealLabel("DINNER")).toBe("晚餐");
    render(
      <div>
        <MealTag mealType="DINNER" />
        <DishCoverImage dish={{ ...sampleDish, coverImage: { id: "image-1", workspaceId: "workspace-1", dishId: "dish-1", storageKey: "x", mimeType: "image/jpeg", size: 1, width: 1, height: 1, sortOrder: 0, isCover: true, fileUrl: "/x.jpg", createdAt: "", updatedAt: "" } }} />
      </div>,
    );

    expect(screen.getByText("晚餐")).toBeInTheDocument();
    expect(screen.getByRole("img", { name: "番茄炒蛋封面" })).toHaveAttribute("src", "/x.jpg");
  });
});

describe("表单组件", () => {
  it("CreateDishForm 提交新菜品", async () => {
    const mutate = vi.fn();
    useCreateDishMock.mockReturnValue(mutationState(mutate));
    render(<CreateDishForm onSuccess={vi.fn()} />);

    await userEvent.type(screen.getByLabelText("菜品名称"), "番茄炒蛋");
    await userEvent.click(screen.getByRole("button", { name: "创建菜品" }));

    await waitFor(() => expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ name: "番茄炒蛋" }), expect.any(Object)));
  });

  it("EditDishForm 使用默认值并提交更新", async () => {
    const mutate = vi.fn();
    useUpdateDishMock.mockReturnValue(mutationState(mutate));
    render(<EditDishForm dish={sampleDish} onCancel={vi.fn()} onSuccess={vi.fn()} />);

    expect(screen.getByLabelText("菜品名称")).toHaveValue("番茄炒蛋");
    await userEvent.clear(screen.getByLabelText("菜品名称"));
    await userEvent.type(screen.getByLabelText("菜品名称"), "新版番茄炒蛋");
    await userEvent.click(screen.getByRole("button", { name: "保存修改" }));

    await waitFor(() => expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ id: "dish-1" }), expect.any(Object)));
  });

  it("MealRecordForm 和 ManualMealRecordForm 提交用餐记录", async () => {
    const mutate = vi.fn();
    useCreateMealRecordMock.mockReturnValue(mutationState(mutate));
    render(<MealRecordForm dish={sampleDish} onCancel={vi.fn()} onSuccess={vi.fn()} />);

    await userEvent.click(screen.getByRole("button", { name: "确认记录" }));
    await waitFor(() => expect(mutate).toHaveBeenCalledWith(expect.objectContaining({ dishId: "dish-1" }), expect.any(Object)));
  });
});

describe("业务面板组件", () => {
  it("DishImagePanel 支持选择文件并上传", async () => {
    const mutate = vi.fn();
    useUploadDishImageMock.mockReturnValue(mutationState(mutate));
    render(<DishImagePanel dish={sampleDish} onClose={vi.fn()} />);

    expect(screen.getByText("番茄炒蛋 - 图库管理")).toBeInTheDocument();
    await userEvent.upload(screen.getByLabelText("上传图片"), new File(["x"], "x.jpg", { type: "image/jpeg" }));
    await userEvent.click(screen.getByRole("button", { name: "上传图片" }));

    expect(mutate).toHaveBeenCalledWith(expect.any(File), expect.any(Object));
  });

  it("RecipePanel 渲染做法并可打开新增表单", async () => {
    render(<RecipePanel dish={sampleDish} onClose={vi.fn()} />);

    expect(screen.getByText("快手做法")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "+ 记录新做法" }));
    expect(screen.getByText("编辑区")).toBeInTheDocument();
    expect(screen.getByText("预览")).toBeInTheDocument();
  });

  it("MembersPanel 渲染成员和管理员邀请区", async () => {
    const createInvite: CreateInviteResponse = { id: "invite-2", createdAt: "2026-06-01T00:00:00.000Z", expiresAt: "2026-06-02T00:00:00.000Z", inviteLink: "http://localhost/invite/token" };
    const mutate = vi.fn((_body, options: { onSuccess?: (invite: CreateInviteResponse) => void }) => options.onSuccess?.(createInvite));
    useCreateInviteMock.mockReturnValue(mutationState(mutate));
    render(<MembersPanel isAdmin />);

    expect(screen.getByText("小明")).toBeInTheDocument();
    await userEvent.click(screen.getByRole("button", { name: "创建邀请" }));
    expect(screen.getByText("http://localhost/invite/token")).toBeInTheDocument();
  });

  it("RecommendationPanel 触发推荐、盲盒和结果操作", async () => {
    const onMealTypeChange = vi.fn();
    const onRecommend = vi.fn();
    const onBlindBox = vi.fn();
    const onRecordDish = vi.fn();
    const onViewRecipe = vi.fn();
    render(
      <RecommendationPanel
        mealType=""
        onMealTypeChange={onMealTypeChange}
        onRecommend={onRecommend}
        onBlindBox={onBlindBox}
        recommendPending={false}
        blindBoxPending={false}
        recommendResult={[{ dish: sampleDish, score: 1, weight: 1, reasons: ["最近没吃"] }]}
        blindBoxEmpty={false}
        recommendError={null}
        blindBoxError={null}
        onRecordDish={onRecordDish}
        onViewRecipe={onViewRecipe}
      />,
    );

    await userEvent.selectOptions(screen.getByLabelText("餐次筛选"), "DINNER");
    await userEvent.click(screen.getByRole("button", { name: "智能推荐" }));
    await userEvent.click(screen.getByRole("button", { name: "🎲 盲盒" }));
    await userEvent.click(screen.getByRole("button", { name: "查看做法" }));
    await userEvent.click(screen.getByRole("button", { name: "记录已吃" }));

    expect(onMealTypeChange).toHaveBeenCalledWith("DINNER");
    expect(onRecommend).toHaveBeenCalledTimes(1);
    expect(onBlindBox).toHaveBeenCalledTimes(1);
    expect(onViewRecipe).toHaveBeenCalledWith(sampleDish);
    expect(onRecordDish).toHaveBeenCalledWith(sampleDish);
  });

  it("RecommendationPanel 显示盲盒空结果提示", () => {
    render(
      <RecommendationPanel
        mealType=""
        onMealTypeChange={vi.fn()}
        onRecommend={vi.fn()}
        onBlindBox={vi.fn()}
        recommendPending={false}
        blindBoxPending={false}
        recommendResult={null}
        blindBoxEmpty={true}
        recommendError={null}
        blindBoxError={null}
        onRecordDish={vi.fn()}
        onViewRecipe={vi.fn()}
      />,
    );

    expect(screen.getByText("盲盒是空的")).toBeInTheDocument();
    expect(screen.getByText("当前没有可抽取的菜品，试试新增一些菜品或换个餐次")).toBeInTheDocument();
  });

  it("RecentMealRecords、MealRecordCard 和 HistoryRecordsPanel 渲染记录", () => {
    const queryClient = createTestQueryClient();
    render(
      <QueryClientProvider client={queryClient}>
        <RecentMealRecords userId="user-1" />
        <MealRecordCard record={sampleMealRecord} userId="user-1" />
        <HistoryRecordsPanel userId="user-1" />
      </QueryClientProvider>,
    );

    expect(screen.getAllByText("番茄炒蛋").length).toBeGreaterThan(0);
    expect(screen.getByText("最近用餐")).toBeInTheDocument();
    expect(screen.getByText("历史记录")).toBeInTheDocument();
  });

  it("MealRecordCard 优先展示当前菜品名和当前版本名", () => {
    render(
      <MealRecordCard
        record={{
          ...sampleMealRecord,
          variantId: "variant-1",
          variant: {
            id: "variant-1",
            workspaceId: "workspace-1",
            dishId: "dish-1",
            name: "外卖店1",
            description: null,
            type: "TAKEOUT",
            isActive: true,
            createdAt: "2026-06-01T00:00:00.000Z",
            updatedAt: "2026-06-01T00:00:00.000Z",
          },
        }}
        userId="user-1"
      />,
    );

    expect(screen.getByText("番茄炒蛋 · 外卖店1")).toBeInTheDocument();
  });
});
