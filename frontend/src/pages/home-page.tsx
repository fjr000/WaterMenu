import { useState } from "react";
import { useAuth } from "../hooks/use-auth.tsx";
import { useDishes, useUpdateDish } from "../hooks/use-dishes.ts";
import {
  useRecommend,
  useBlindBox,
} from "../hooks/use-recommendations.ts";
import type { Dish, MealType } from "../api/types.ts";
import {
  CreateDishForm,
  EditDishForm,
} from "../components/create-dish-form.tsx";
import { DishCoverImage } from "../components/dish-cover-image.tsx";
import { DishImagePanel } from "../components/dish-image-panel.tsx";
import { RecommendationPanel } from "../components/recommendation-panel.tsx";
import { RecipePanel } from "../components/recipe-panel.tsx";
import { HistoryRecordsPanel } from "../components/history-records-panel.tsx";
import { MealRecordForm } from "../components/meal-record-form.tsx";
import { MealTag } from "../components/meal-tag.tsx";
import { RecentMealRecords } from "../components/recent-meal-records.tsx";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  PageHeader,
  SecondaryButton,
  Spinner,
} from "../components/ui.tsx";

export function HomePage() {
  const auth = useAuth();
  const [mealType, setMealType] = useState<MealType | "">("");
  const dishesQuery = useDishes();
  const recommendMutation = useRecommend();
  const blindBoxMutation = useBlindBox();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<"recommend" | "dishes" | "history">(
    "recommend",
  );
  const [recordDish, setRecordDish] = useState<Dish | null>(null);
  const [recipeDish, setRecipeDish] = useState<Dish | null>(null);
  const [imageDish, setImageDish] = useState<Dish | null>(null);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);

  const handleRecommend = () => {
    recommendMutation.mutate(
      mealType ? { mealType: mealType as MealType } : {},
    );
  };

  const handleBlindBox = () => {
    blindBoxMutation.mutate(mealType ? { mealType: mealType as MealType } : {});
  };

  const resetRecommendationState = () => {
    recommendMutation.reset();
    blindBoxMutation.reset();
  };

  const handleRecordDish = (dish: Dish) => {
    setRecipeDish(null);
    setImageDish(null);
    setEditingDish(null);
    setRecordDish(dish);
  };

  const handleViewRecipe = (dish: Dish) => {
    setRecordDish(null);
    setImageDish(null);
    setEditingDish(null);
    setRecipeDish(dish);
  };

  const handleManageImages = (dish: Dish) => {
    setRecordDish(null);
    setRecipeDish(null);
    setEditingDish(null);
    setImageDish(dish);
  };

  const handleEditDish = (dish: Dish) => {
    setRecordDish(null);
    setRecipeDish(null);
    setImageDish(null);
    setShowCreateForm(false);
    setEditingDish(dish);
  };

  const handleDishUpdated = () => {
    setEditingDish(null);
    resetRecommendationState();
  };

  const handleRecordSuccess = () => {
    setRecordDish(null);
    resetRecommendationState();
  };

  return (
    <div className="min-h-dvh bg-slate-50">
      <div className="mx-auto max-w-lg px-4 pb-8 pt-4">
        <PageHeader
          title={auth.workspace?.name ?? "WaterMenu"}
          subtitle={auth.user?.name}
          actions={
            <SecondaryButton onClick={() => void auth.logout()}>
              退出
            </SecondaryButton>
          }
        />

        {/* 标签栏 */}
        <div className="mt-6 flex gap-1 rounded-lg bg-slate-100 p-1">
          <button
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              activeTab === "recommend"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab("recommend")}
          >
            今天吃什么
          </button>
          <button
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              activeTab === "dishes"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab("dishes")}
          >
            菜品管理
          </button>
          <button
            className={`flex-1 rounded-md px-3 py-2 text-sm font-medium transition ${
              activeTab === "history"
                ? "bg-white text-slate-900 shadow-sm"
                : "text-slate-500 hover:text-slate-700"
            }`}
            onClick={() => setActiveTab("history")}
          >
            历史记录
          </button>
        </div>

        {activeTab === "recommend" && (
          <RecommendationPanel
            mealType={mealType}
            onMealTypeChange={setMealType}
            onRecommend={handleRecommend}
            onBlindBox={handleBlindBox}
            recommendPending={recommendMutation.isPending}
            blindBoxPending={blindBoxMutation.isPending}
            recommendResult={recommendMutation.data?.items ?? null}
            blindBoxResult={blindBoxMutation.data?.item ?? null}
            blindBoxFired={blindBoxMutation.isSuccess}
            recommendError={
              recommendMutation.isError ? "请求推荐失败，请重试" : null
            }
            blindBoxError={
              blindBoxMutation.isError ? "抽盲盒失败，请重试" : null
            }
            onRecordDish={handleRecordDish}
            onViewRecipe={handleViewRecipe}
          />
        )}

        {recordDish && (
          <div className="mt-4">
            <MealRecordForm
              key={recordDish.id}
              dish={recordDish}
              defaultMealType={mealType}
              onCancel={() => setRecordDish(null)}
              onSuccess={handleRecordSuccess}
            />
          </div>
        )}

        {recipeDish && (
          <div className="mt-4">
            <RecipePanel
              key={recipeDish.id}
              dish={recipeDish}
              onClose={() => setRecipeDish(null)}
            />
          </div>
        )}

        {imageDish && (
          <div className="mt-4">
            <DishImagePanel
              key={imageDish.id}
              dish={imageDish}
              onClose={() => setImageDish(null)}
            />
          </div>
        )}

        {activeTab === "dishes" && (
          <div className="mt-4 flex flex-col gap-4">
            <div className="flex items-center justify-between">
              <h2 className="text-sm font-semibold text-slate-700">
                菜品列表
              </h2>
              <Button
                className="px-3 py-1.5 text-xs"
                onClick={() => setShowCreateForm((v) => !v)}
              >
                {showCreateForm ? "取消" : "+ 新增菜品"}
              </Button>
            </div>

            {showCreateForm && (
              <Card>
                <CreateDishForm
                  onSuccess={() => setShowCreateForm(false)}
                />
              </Card>
            )}

            {dishesQuery.isLoading && <Spinner />}

            {dishesQuery.isError && (
              <ErrorBanner
                message="加载菜品失败"
                onRetry={() => void dishesQuery.refetch()}
              />
            )}

            {dishesQuery.data && dishesQuery.data.length === 0 && (
              <EmptyState
                icon="🥘"
                title="还没有菜品"
                description="点击上方按钮添加第一道菜"
              />
            )}

            {dishesQuery.data &&
              dishesQuery.data.map((dish) => (
                <DishCard
                  key={dish.id}
                  dish={dish}
                  isEditing={editingDish?.id === dish.id}
                  onEditDish={handleEditDish}
                  onCancelEdit={() => setEditingDish(null)}
                  onDishUpdated={handleDishUpdated}
                  onRecordDish={handleRecordDish}
                  onViewRecipe={handleViewRecipe}
                  onManageImages={handleManageImages}
                  onResetRecommendations={resetRecommendationState}
                />
              ))}
          </div>
        )}

        {activeTab === "history" && auth.user && (
          <HistoryRecordsPanel
            userId={auth.user.id}
            onFeedbackSuccess={resetRecommendationState}
          />
        )}

        {activeTab === "recommend" && auth.user && (
          <RecentMealRecords
            userId={auth.user.id}
            onFeedbackSuccess={resetRecommendationState}
          />
        )}
      </div>
    </div>
  );
}

function DishCard({
  dish,
  isEditing,
  onEditDish,
  onCancelEdit,
  onDishUpdated,
  onRecordDish,
  onViewRecipe,
  onManageImages,
  onResetRecommendations,
}: {
  dish: Dish;
  isEditing: boolean;
  onEditDish: (dish: Dish) => void;
  onCancelEdit: () => void;
  onDishUpdated: () => void;
  onRecordDish: (dish: Dish) => void;
  onViewRecipe: (dish: Dish) => void;
  onManageImages: (dish: Dish) => void;
  onResetRecommendations: () => void;
}) {
  const updateDish = useUpdateDish();

  const handleToggleActive = () => {
    updateDish.mutate(
      {
        id: dish.id,
        body: { isActive: !dish.isActive },
      },
      {
        onSuccess: onResetRecommendations,
      },
    );
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">
            {dish.name}
          </p>
          {dish.description && (
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {dish.description}
            </p>
          )}
          {!dish.isActive && (
            <span className="mt-2 inline-flex rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-500">
              已停用
            </span>
          )}
        </div>
        <DishCoverImage dish={dish} />
      </div>
      <div className="mt-2 flex flex-wrap gap-1">
        {dish.mealTypes.map((mt) => (
          <MealTag key={mt} mealType={mt} />
        ))}
      </div>

      {isEditing && (
        <div className="mt-3 rounded-lg border border-slate-100 bg-slate-50 p-3">
          <EditDishForm
            dish={dish}
            onCancel={onCancelEdit}
            onSuccess={onDishUpdated}
          />
        </div>
      )}

      {updateDish.isError && (
        <p className="mt-3 rounded-lg bg-red-50 p-2.5 text-center text-sm text-red-700">
          更新失败，请重试
        </p>
      )}

      <div className="mt-3 grid grid-cols-2 gap-2 sm:grid-cols-5">
        <SecondaryButton
          className="px-3 py-2 text-xs"
          onClick={() => onEditDish(dish)}
        >
          编辑
        </SecondaryButton>
        <SecondaryButton
          className="px-3 py-2 text-xs"
          onClick={handleToggleActive}
          disabled={updateDish.isPending}
        >
          {updateDish.isPending ? "处理中…" : dish.isActive ? "停用" : "启用"}
        </SecondaryButton>
        <SecondaryButton
          className="px-3 py-2 text-xs"
          onClick={() => onManageImages(dish)}
        >
          图库
        </SecondaryButton>
        <SecondaryButton
          className="px-3 py-2 text-xs"
          onClick={() => onViewRecipe(dish)}
        >
          做法
        </SecondaryButton>
        <SecondaryButton
          className="px-3 py-2 text-xs sm:col-auto"
          onClick={() => onRecordDish(dish)}
        >
          记录已吃
        </SecondaryButton>
      </div>
    </Card>
  );
}
