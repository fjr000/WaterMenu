import { useState } from "react";
import { useAuth } from "../hooks/use-auth.tsx";
import { useDishImages } from "../hooks/use-dish-images.ts";
import { useDishes, useUpdateDish } from "../hooks/use-dishes.ts";
import { useRecipes } from "../hooks/use-recipes.ts";
import {
  useRecommend,
  useBlindBox,
} from "../hooks/use-recommendations.ts";
import type { Dish, MealType } from "../api/types.ts";
import {
  CreateDishForm,
  EditDishForm,
} from "../components/create-dish-form.tsx";
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
    <div className="min-h-dvh">
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
        <div className="mt-6 flex gap-1 rounded-full border border-slate-200 bg-white/55 p-1 shadow-inner">
          {[
            ["recommend", "今天吃什么"],
            ["dishes", "菜品管理"],
            ["history", "历史记录"],
          ].map(([tab, label]) => (
            <button
              key={tab}
              className={`flex-1 rounded-full px-3 py-2 text-sm font-semibold transition ${
                activeTab === tab
                  ? "bg-red-500 text-white shadow-sm"
                  : "text-slate-500 hover:bg-amber-50 hover:text-slate-700"
              }`}
              onClick={() => setActiveTab(tab as typeof activeTab)}
            >
              {label}
            </button>
          ))}
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
              <div>
                <h2 className="font-serif text-lg font-semibold text-slate-900">
                  菜品列表
                </h2>
                <p className="text-xs text-slate-500">管理家里的常吃菜单</p>
              </div>
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
  const imagesQuery = useDishImages(dish.id, Boolean(dish.coverImage));
  const [recipesOpen, setRecipesOpen] = useState(false);
  const recipesQuery = useRecipes(dish.id, recipesOpen);
  const images = imagesQuery.data ?? (dish.coverImage ? [dish.coverImage] : []);
  const ratingText = dish.feedbackRatingAverage?.toFixed(1);

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
    <Card className="overflow-hidden border-amber-200 bg-gradient-to-br from-white/90 via-amber-50/65 to-orange-50/55 p-0 shadow-[0_14px_34px_rgba(111,82,56,0.13)]">
      {images.length > 0 && (
        <div className="border-b border-amber-100 bg-amber-50/60 px-4 py-3">
          <div className="flex gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
            {images.map((image) => (
              <img
                key={image.id}
                src={image.fileUrl}
                alt={image.isCover ? `${dish.name}封面` : `${dish.name}图片`}
                className="h-28 w-36 shrink-0 rounded-2xl border border-white object-cover shadow-[0_8px_18px_rgba(111,82,56,0.14)]"
                loading="lazy"
              />
            ))}
          </div>
          {imagesQuery.isError && (
            <p className="mt-2 text-xs text-red-600">图库刷新失败，先显示已有封面</p>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <p className="truncate font-serif text-xl font-semibold text-slate-900">
              {dish.name}
            </p>
            {dish.description && (
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                {dish.description}
              </p>
            )}
          </div>
          <label className="inline-flex shrink-0 cursor-pointer items-center gap-2 rounded-full border border-amber-200 bg-white/75 px-2 py-1 shadow-inner">
            <span className="text-xs font-semibold text-slate-600">
              {dish.isActive ? "启用" : "停用"}
            </span>
            <input
              type="checkbox"
              checked={dish.isActive}
              onChange={handleToggleActive}
              disabled={updateDish.isPending}
              className="peer sr-only"
              aria-label={`${dish.name}${dish.isActive ? "停用" : "启用"}`}
            />
            <span className="h-6 w-11 rounded-full bg-slate-300 p-0.5 transition peer-checked:bg-emerald-500 peer-disabled:opacity-60">
              <span
                className={`block h-5 w-5 rounded-full bg-white shadow transition ${
                  dish.isActive ? "translate-x-5" : ""
                }`}
              />
            </span>
          </label>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-1.5">
          {dish.mealTypes.map((mt) => (
            <MealTag key={mt} mealType={mt} />
          ))}
          {dish.mealRecordCount > 0 && (
            <>
              <span className="inline-flex rounded-full border border-emerald-200 bg-emerald-50 px-2 py-0.5 text-xs font-semibold text-emerald-700">
                {dish.mealRecordCount} 次
              </span>
              {ratingText && (
                <span className="inline-flex rounded-full border border-amber-200 bg-amber-50 px-2 py-0.5 text-xs font-semibold text-amber-700">
                  ★ {ratingText}
                </span>
              )}
            </>
          )}
        </div>

        {isEditing && (
          <div className="mt-4 rounded-2xl border border-slate-200 bg-white/75 p-3">
            <EditDishForm
              dish={dish}
              onCancel={onCancelEdit}
              onSuccess={onDishUpdated}
            />
          </div>
        )}

        {updateDish.isError && (
          <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-center text-sm text-red-700">
            更新失败，请重试
          </p>
        )}

        <div className="mt-4 flex flex-col gap-2 border-t border-amber-100 pt-3">
          <div className="flex flex-wrap gap-2">
            <SecondaryButton
              className="px-3 py-2 text-xs"
              onClick={() => onEditDish(dish)}
            >
              编辑
            </SecondaryButton>
            <SecondaryButton
              className="px-3 py-2 text-xs"
              onClick={() => setRecipesOpen((value) => !value)}
            >
              {recipesOpen ? "收起做法" : "展开做法"}
            </SecondaryButton>
            <Button
              className="px-3 py-2 text-xs"
              onClick={() => onRecordDish(dish)}
            >
              记录已吃
            </Button>
          </div>
          <div className="flex flex-wrap gap-2">
            <SecondaryButton
              className="px-3 py-1.5 text-xs"
              onClick={() => onManageImages(dish)}
            >
              管理图库
            </SecondaryButton>
            <SecondaryButton
              className="px-3 py-1.5 text-xs"
              onClick={() => onViewRecipe(dish)}
            >
              管理做法
            </SecondaryButton>
          </div>
        </div>

        {recipesOpen && (
          <div className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3">
            {recipesQuery.isLoading && <Spinner />}

            {recipesQuery.isError && (
              <ErrorBanner
                message="加载做法失败"
                onRetry={() => void recipesQuery.refetch()}
              />
            )}

            {recipesQuery.data && recipesQuery.data.length === 0 && (
              <p className="text-sm text-slate-500">还没有做法，先在做法面板里记录一个。</p>
            )}

            {recipesQuery.data && recipesQuery.data.length > 0 && (
              <div className="flex flex-col gap-2">
                {recipesQuery.data.map((recipe) => (
                  <article
                    key={recipe.id}
                    className="rounded-2xl border border-white/80 bg-white/75 p-3 shadow-sm"
                  >
                    <p className="font-serif text-base font-semibold text-slate-900">
                      {recipe.title}
                    </p>
                    <p className="mt-1 whitespace-pre-wrap text-sm leading-6 text-slate-600">
                      {recipe.content}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
      </div>
    </Card>
  );
}
