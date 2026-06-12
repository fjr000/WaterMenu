import { memo, useCallback, useId, useState } from "react";
import { useAuth } from "../hooks/use-auth.tsx";
import { useDishImages } from "../hooks/use-dish-images.ts";
import { useDishes, useUpdateDish } from "../hooks/use-dishes.ts";
import { useRecipes } from "../hooks/use-recipes.ts";
import { DishVariantsPanel } from "../components/dish-variants-panel.tsx";
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
import { mealLabel, MealTag } from "../components/meal-tag.tsx";
import { MembersPanel } from "../components/members-panel.tsx";
import { RecentMealRecords } from "../components/recent-meal-records.tsx";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Input,
  PageHeader,
  SecondaryButton,
  Select,
  Spinner,
} from "../components/ui.tsx";

type HomeTab = "recommend" | "dishes" | "history" | "members";
type DishStatusFilter = "" | "true" | "false";

const mealTypeOptions: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

const homeTabs: Array<{
  key: HomeTab;
  label: string;
  shortLabel: string;
  eyebrow: string;
  mark: string;
}> = [
  {
    key: "recommend",
    label: "今天吃什么",
    shortLabel: "推荐",
    eyebrow: "今日",
    mark: "今",
  },
  {
    key: "dishes",
    label: "菜品管理",
    shortLabel: "菜品",
    eyebrow: "菜单",
    mark: "菜",
  },
  {
    key: "history",
    label: "历史记录",
    shortLabel: "历史",
    eyebrow: "回看",
    mark: "历",
  },
  {
    key: "members",
    label: "成员",
    shortLabel: "成员",
    eyebrow: "共用",
    mark: "员",
  },
];

export function HomePage() {
  const auth = useAuth();
  const [mealType, setMealType] = useState<MealType | "">("");
  const [dishSearch, setDishSearch] = useState("");
  const [dishMealType, setDishMealType] = useState<MealType | "">("");
  const [dishStatus, setDishStatus] = useState<DishStatusFilter>("");
  const dishesQuery = useDishes({
    q: dishSearch.trim() || undefined,
    mealType: dishMealType || undefined,
    isActive: dishStatus ? dishStatus === "true" : undefined,
  });
  const recommendMutation = useRecommend();
  const blindBoxMutation = useBlindBox();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<HomeTab>("recommend");
  const [recordDish, setRecordDish] = useState<Dish | null>(null);
  const [recipeDish, setRecipeDish] = useState<Dish | null>(null);
  const [imageDish, setImageDish] = useState<Dish | null>(null);
  const [variantDish, setVariantDish] = useState<Dish | null>(null);
  const [editingDish, setEditingDish] = useState<Dish | null>(null);
  const [expandedDishId, setExpandedDishId] = useState<string | null>(null);

  const hasDishFilters = hasActiveDishFilters({
    q: dishSearch,
    mealType: dishMealType,
    status: dishStatus,
  });
  const dishEmptyState = getDishEmptyState(hasDishFilters);

  const resetDishFilters = () => {
    setDishSearch("");
    setDishMealType("");
    setDishStatus("");
  };

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

  const handleToggleDish = useCallback((dishId: string) => {
    setExpandedDishId((current) => (current === dishId ? null : dishId));
  }, []);

  const handleRecordDish = useCallback((dish: Dish) => {
    setRecipeDish(null);
    setImageDish(null);
    setVariantDish(null);
    setEditingDish(null);
    setExpandedDishId(dish.id);
    setRecordDish(dish);
  }, []);

  const handleViewRecipe = useCallback((dish: Dish) => {
    setRecordDish(null);
    setImageDish(null);
    setVariantDish(null);
    setEditingDish(null);
    setExpandedDishId(dish.id);
    setRecipeDish(dish);
  }, []);

  const handleManageImages = useCallback((dish: Dish) => {
    setRecordDish(null);
    setRecipeDish(null);
    setVariantDish(null);
    setEditingDish(null);
    setExpandedDishId(dish.id);
    setImageDish(dish);
  }, []);

  const handleManageVariants = useCallback((dish: Dish) => {
    setRecordDish(null);
    setRecipeDish(null);
    setImageDish(null);
    setEditingDish(null);
    setExpandedDishId(dish.id);
    setVariantDish(dish);
  }, []);

  const handleEditDish = useCallback((dish: Dish) => {
    setRecordDish(null);
    setRecipeDish(null);
    setImageDish(null);
    setVariantDish(null);
    setShowCreateForm(false);
    setExpandedDishId(dish.id);
    setEditingDish(dish);
  }, []);

  const handleDishUpdated = useCallback(() => {
    setEditingDish(null);
    resetRecommendationState();
  }, []);

  const handleRecordSuccess = useCallback(() => {
    setRecordDish(null);
    resetRecommendationState();
  }, []);

  return (
    <div className="min-h-dvh pb-28 md:pb-0">
      <div className="mx-auto max-w-5xl px-4 pb-8 pt-4 md:pb-10">
        <PageHeader
          title={auth.workspace?.name ?? "WaterMenu"}
          subtitle={auth.user?.name}
          actions={
            <SecondaryButton onClick={() => void auth.logout()}>
              退出
            </SecondaryButton>
          }
        />

        <DesktopTabNav activeTab={activeTab} onChange={setActiveTab} />

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

        {variantDish && (
          <div className="mt-4">
            <DishVariantsPanel
              key={variantDish.id}
              dish={variantDish}
              onClose={() => setVariantDish(null)}
            />
          </div>
        )}

        {activeTab === "dishes" && (
          <div className="mx-auto mt-6 flex max-w-2xl flex-col gap-5 md:mt-6">
            <div className="flex items-center justify-between gap-3 rounded-3xl border border-amber-200/70 bg-white/65 p-4 shadow-[0_10px_24px_rgba(111,82,56,0.08)] backdrop-blur-sm">
              <div>
                <h2 className="font-serif text-xl font-semibold text-slate-900">
                  菜品
                </h2>
                <p className="mt-0.5 text-xs text-slate-400">管理家里的常吃菜单</p>
              </div>
              <Button
                className="shrink-0 px-4 py-2.5 text-xs sm:px-5 sm:text-sm"
                onClick={() => setShowCreateForm((v) => !v)}
              >
                {showCreateForm ? "收起" : "新增"}
              </Button>
            </div>

            <DishFiltersCard
              search={dishSearch}
              mealType={dishMealType}
              status={dishStatus}
              hasFilters={hasDishFilters}
              onSearchChange={setDishSearch}
              onMealTypeChange={setDishMealType}
              onStatusChange={setDishStatus}
              onReset={resetDishFilters}
            />

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
                icon={dishEmptyState.icon}
                title={dishEmptyState.title}
                description={dishEmptyState.description}
              />
            )}

            {dishesQuery.data &&
              dishesQuery.data.map((dish) => (
                <DishCard
                  key={dish.id}
                  dish={dish}
                  expanded={expandedDishId === dish.id}
                  onToggle={() => handleToggleDish(dish.id)}
                  isEditing={editingDish?.id === dish.id}
                  onEditDish={handleEditDish}
                  onCancelEdit={() => setEditingDish(null)}
                  onDishUpdated={handleDishUpdated}
                  onRecordDish={handleRecordDish}
                  onViewRecipe={handleViewRecipe}
                  onManageImages={handleManageImages}
                  onManageVariants={handleManageVariants}
                  onResetRecommendations={resetRecommendationState}
                />
              ))}
          </div>
        )}

        {activeTab === "history" && auth.user && (
          <HistoryRecordsPanel
            userId={auth.user.id}
            onRecordChange={resetRecommendationState}
          />
        )}

        {activeTab === "members" && auth.user && (
          <MembersPanel isAdmin={auth.user.role === "ADMIN"} />
        )}

        {activeTab === "recommend" && auth.user && (
          <RecentMealRecords
            userId={auth.user.id}
            onRecordChange={resetRecommendationState}
          />
        )}
      </div>

      <MobileTabBar activeTab={activeTab} onChange={setActiveTab} />
    </div>
  );
}

function DishFiltersCard({
  search,
  mealType,
  status,
  hasFilters,
  onSearchChange,
  onMealTypeChange,
  onStatusChange,
  onReset,
}: {
  search: string;
  mealType: MealType | "";
  status: DishStatusFilter;
  hasFilters: boolean;
  onSearchChange: (value: string) => void;
  onMealTypeChange: (value: MealType | "") => void;
  onStatusChange: (value: DishStatusFilter) => void;
  onReset: () => void;
}) {
  return (
    <Card className="flex flex-col gap-4 border-amber-200/80 bg-white/70">
      <div className="flex items-center justify-between gap-3">
        <p className="font-serif text-lg font-semibold text-slate-900">
          筛选
        </p>
        {hasFilters && (
          <SecondaryButton
            type="button"
            className="shrink-0 px-3 py-2 text-xs"
            onClick={onReset}
          >
            清空
          </SecondaryButton>
        )}
      </div>

      <div>
        <label htmlFor="dish-search" className="mb-1.5 block text-sm font-medium text-slate-700">
          关键词
        </label>
        <Input
          id="dish-search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="搜索菜名或简介"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <label htmlFor="dish-meal-type" className="mb-1.5 block text-sm font-medium text-slate-700">
            餐次
          </label>
          <Select
            id="dish-meal-type"
            value={mealType}
            onChange={(event) => onMealTypeChange(event.target.value as MealType | "")}
          >
            <option value="">全部餐次</option>
            {mealTypeOptions.map((value) => (
              <option key={value} value={value}>
                {mealLabel(value)}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label htmlFor="dish-status" className="mb-1.5 block text-sm font-medium text-slate-700">
            状态
          </label>
          <Select
            id="dish-status"
            value={status}
            onChange={(event) => onStatusChange(event.target.value as DishStatusFilter)}
          >
            <option value="">全部状态</option>
            <option value="true">启用</option>
            <option value="false">停用</option>
          </Select>
        </div>
      </div>

      {hasFilters && (
        <p className="rounded-2xl border border-amber-100/80 bg-amber-50/70 px-3 py-2.5 text-xs leading-5 text-slate-600">
          {getDishFilterSummary({ q: search, mealType, status })}
        </p>
      )}
    </Card>
  );
}

function DesktopTabNav({
  activeTab,
  onChange,
}: {
  activeTab: HomeTab;
  onChange: (tab: HomeTab) => void;
}) {
  return (
    <nav className="mt-6 hidden grid-cols-4 gap-3 md:grid" aria-label="首页栏目">
      {homeTabs.map((tab) => {
        const active = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            className={`group flex items-center gap-3 rounded-3xl border p-4 text-left shadow-sm transition-all duration-300 ${
              active
                ? "border-red-200 bg-red-50/90 shadow-[0_12px_28px_rgba(217,75,53,0.13)]"
                : "border-slate-200/70 bg-white/60 hover:-translate-y-1 hover:border-amber-200 hover:bg-amber-50/80 hover:shadow-md backdrop-blur-sm"
            }`}
            onClick={() => onChange(tab.key)}
            aria-current={active ? "page" : undefined}
          >
            <span
              className={`grid h-12 w-12 shrink-0 place-items-center rounded-2xl border text-lg font-black transition-transform duration-300 group-hover:scale-105 ${
                active
                  ? "border-red-200 bg-red-500 text-white shadow-sm"
                  : "border-amber-200/80 bg-white/90 text-slate-600 group-hover:text-red-600"
              }`}
              aria-hidden="true"
            >
              {tab.mark}
            </span>
            <span className="min-w-0">
              <span className="block text-[10px] font-semibold uppercase tracking-wider text-slate-400">
                {tab.eyebrow}
              </span>
              <span
                className={`block truncate text-base font-bold ${
                  active ? "text-red-700" : "text-slate-800"
                }`}
              >
                {tab.label}
              </span>
            </span>
          </button>
        );
      })}
    </nav>
  );
}

function MobileTabBar({
  activeTab,
  onChange,
}: {
  activeTab: HomeTab;
  onChange: (tab: HomeTab) => void;
}) {
  return (
    <nav
      className="fixed inset-x-3 bottom-3 z-30 rounded-[2rem] border border-slate-200/70 bg-white/95 p-2.5 shadow-[0_20px_48px_rgba(111,82,56,0.24)] backdrop-blur-md md:hidden"
      aria-label="首页栏目"
    >
      <div className="grid grid-cols-4 gap-1.5">
        {homeTabs.map((tab) => {
          const active = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              className={`flex min-w-0 flex-col items-center gap-1.5 rounded-2xl px-2 py-2.5 text-xs font-bold transition-all duration-200 ${
                active
                  ? "bg-red-500 text-white shadow-[0_8px_20px_rgba(217,75,53,0.26)] scale-105"
                  : "text-slate-500 hover:bg-amber-50 hover:text-slate-700 active:scale-95"
              }`}
              onClick={() => onChange(tab.key)}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={`grid h-8 w-8 place-items-center rounded-xl border text-sm font-black ${
                  active ? "border-red-100/40 bg-white/20" : "border-amber-200/80 bg-white/80"
                }`}
                aria-hidden="true"
              >
                {tab.mark}
              </span>
              <span className="max-w-full truncate">{tab.shortLabel}</span>
            </button>
          );
        })}
      </div>
    </nav>
  );
}

function hasActiveDishFilters({
  q,
  mealType,
  status,
}: {
  q: string;
  mealType: MealType | "";
  status: DishStatusFilter;
}) {
  return Boolean(q.trim() || mealType || status);
}

function getDishFilterSummary({
  q,
  mealType,
  status,
}: {
  q: string;
  mealType: MealType | "";
  status: DishStatusFilter;
}) {
  const keyword = q.trim() ? `关键词"${q.trim()}"` : "全部关键词";
  const meal = mealType ? mealLabel(mealType) : "全部餐次";
  const statusLabel = getDishStatusFilterLabel(status);

  return `正在筛选：${keyword} · ${meal} · ${statusLabel}`;
}

function getDishStatusFilterLabel(status: DishStatusFilter) {
  if (status === "true") {
    return "启用";
  }
  if (status === "false") {
    return "停用";
  }
  return "全部状态";
}

function getDishEmptyState(hasFilters: boolean) {
  if (hasFilters) {
    return {
      icon: "🔎",
      title: "没有找到菜品",
      description: "换个关键词或筛选条件试试",
    };
  }

  return {
    icon: "🥘",
    title: "还没有菜品",
    description: "点击上方按钮添加第一道菜",
  };
}
const DishCard = memo(function DishCard({
  dish,
  expanded,
  onToggle,
  isEditing,
  onEditDish,
  onCancelEdit,
  onDishUpdated,
  onRecordDish,
  onViewRecipe,
  onManageImages,
  onManageVariants,
  onResetRecommendations,
}: {
  dish: Dish;
  expanded: boolean;
  onToggle: () => void;
  isEditing: boolean;
  onEditDish: (dish: Dish) => void;
  onCancelEdit: () => void;
  onDishUpdated: () => void;
  onRecordDish: (dish: Dish) => void;
  onViewRecipe: (dish: Dish) => void;
  onManageImages: (dish: Dish) => void;
  onManageVariants: (dish: Dish) => void;
  onResetRecommendations: () => void;
}) {
  const activeSwitchId = useId();
  const updateDish = useUpdateDish();
  const imagesQuery = useDishImages(dish.id, Boolean(dish.coverImage));
  const recipesQuery = useRecipes(dish.id, expanded);
  const images = imagesQuery.data ?? (dish.coverImage ? [dish.coverImage] : []);
  const coverImage = dish.coverImage ?? images[0] ?? null;
  const ratingText = dish.feedbackRatingAverage?.toFixed(1);

  const handleToggleActive = (e: React.ChangeEvent<HTMLInputElement>) => {
    e.stopPropagation();
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

  const handleActionClick = (e: React.MouseEvent, action: () => void) => {
    e.stopPropagation();
    action();
  };


  return (
    <Card className="overflow-hidden border-amber-200/80 bg-gradient-to-br from-white/95 via-amber-50/40 to-orange-50/30 p-0 shadow-[0_8px_24px_rgba(111,82,56,0.12)] transition-all duration-300 hover:shadow-[0_12px_32px_rgba(111,82,56,0.16)]">
      <div className="p-5">
        <button
          type="button"
          className="w-full cursor-pointer text-left"
          onClick={onToggle}
          aria-expanded={expanded}
        >
          <div className="flex items-start gap-4">
            {coverImage && (
              <div className="relative shrink-0">
                <img
                  src={coverImage.fileUrl}
                  alt={`${dish.name}`}
                  className="h-20 w-20 rounded-2xl border-2 border-white object-cover shadow-[0_8px_20px_rgba(111,82,56,0.15)]"
                  loading="lazy"
                />
                {images.length > 1 && (
                  <span className="absolute -right-1 -top-1 flex h-6 w-6 items-center justify-center rounded-full border-2 border-white bg-amber-500 text-[10px] font-bold text-white shadow-sm">
                    {images.length}
                  </span>
                )}
              </div>
            )}

            <div className="min-w-0 flex-1">
              <div className="flex items-start justify-between gap-3">
                <div className="min-w-0 flex-1">
                  <div className="flex items-center gap-2">
                    <h3 className="font-serif text-xl font-semibold text-slate-900">
                      {dish.name}
                    </h3>
                    <span
                      className={`shrink-0 rounded-full px-2 py-0.5 text-[10px] font-bold ${
                        dish.isActive
                          ? "bg-emerald-100 text-emerald-700"
                          : "bg-slate-100 text-slate-500"
                      }`}
                    >
                      {dish.isActive ? "启用" : "停用"}
                    </span>
                  </div>

                  {dish.description && (
                    <p className="mt-1.5 line-clamp-2 text-sm leading-relaxed text-slate-600">
                      {dish.description}
                    </p>
                  )}

                  <div className="mt-2.5 flex flex-wrap items-center gap-2">
                    {dish.mealTypes.map((mt) => (
                      <MealTag key={mt} mealType={mt} />
                    ))}
                    {dish.mealRecordCount > 0 && (
                      <>
                        <span className="inline-flex items-center gap-1 rounded-full border border-slate-200/80 bg-white/90 px-2.5 py-0.5 text-xs font-semibold text-slate-700">
                          <span className="text-[10px]">🍽️</span>
                          {dish.mealRecordCount} 次
                        </span>
                        {ratingText && (
                          <span className="inline-flex items-center gap-1 rounded-full border border-amber-200/80 bg-amber-50/90 px-2.5 py-0.5 text-xs font-semibold text-amber-700">
                            ★ {ratingText}
                          </span>
                        )}
                      </>
                    )}
                  </div>
                </div>

                <div className="shrink-0">
                  <span
                    className="inline-block rounded-full bg-slate-100 px-2 py-1 text-xs text-slate-500 transition-transform"
                    style={{ transform: expanded ? "rotate(180deg)" : "rotate(0deg)" }}
                    aria-hidden="true"
                  >
                    ▼
                  </span>
                </div>
              </div>
            </div>
          </div>
        </button>

        {/* Quick Actions - Always visible with elevated primary action */}
        <div className="mt-4 space-y-2.5">
          {/* Primary Action - Elevated */}
          <button
            type="button"
            className="group relative w-full overflow-hidden rounded-2xl border-2 border-emerald-300/50 bg-gradient-to-r from-emerald-500 to-emerald-600 px-4 py-3.5 shadow-[0_4px_12px_rgba(16,185,129,0.25)] transition-all duration-300 hover:scale-[1.02] hover:shadow-[0_8px_20px_rgba(16,185,129,0.35)] active:scale-[0.98]"
            onClick={(e) => handleActionClick(e, () => onRecordDish(dish))}
            aria-label="记录已吃"
          >
            <span className="absolute inset-0 bg-gradient-to-r from-white/0 via-white/10 to-white/0 translate-x-[-200%] group-hover:translate-x-[200%] transition-transform duration-700" />
            <span className="relative flex items-center justify-between">
              <span className="flex items-center gap-2.5 text-base font-bold text-white">
                <span className="text-xl">✅</span>
                <span>记录已吃</span>
              </span>
              <span className="grid h-7 w-7 place-items-center rounded-full bg-white/25 text-lg font-black text-white">
                +
              </span>
            </span>
          </button>

          {/* Secondary Actions - Compact chips */}
          <div className="flex items-center gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
            <button
              type="button"
              className="group relative shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-sm transition-all duration-200 hover:border-amber-300 hover:shadow-md active:scale-95"
              onClick={(e) => handleActionClick(e, () => onEditDish(dish))}
              aria-label="编辑菜品"
            >
              <span className="absolute inset-0 bg-amber-50 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <span className="relative flex items-center gap-1.5 text-sm font-semibold text-slate-700 group-hover:text-amber-900">
                <span className="text-base">✏️</span>
                <span>编辑</span>
              </span>
            </button>

            <button
              type="button"
              className="group relative shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-sm transition-all duration-200 hover:border-amber-300 hover:shadow-md active:scale-95"
              onClick={(e) => handleActionClick(e, () => onManageImages(dish))}
              aria-label="管理图库"
            >
              <span className="absolute inset-0 bg-amber-50 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <span className="relative flex items-center gap-1.5 text-sm font-semibold text-slate-700 group-hover:text-amber-900">
                <span className="text-base">🖼️</span>
                <span>图库</span>
              </span>
            </button>

            <button
              type="button"
              className="group relative shrink-0 overflow-hidden rounded-xl border border-slate-200/80 bg-white px-3.5 py-2.5 shadow-sm transition-all duration-200 hover:border-amber-300 hover:shadow-md active:scale-95"
              onClick={(e) => handleActionClick(e, () => onManageVariants(dish))}
              aria-label="管理版本"
            >
              <span className="absolute inset-0 bg-amber-50 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <span className="relative flex items-center gap-1.5 text-sm font-semibold text-slate-700 group-hover:text-amber-900">
                <span className="text-base">🔄</span>
                <span>版本</span>
              </span>
            </button>

            <button
              type="button"
              className="group relative shrink-0 overflow-hidden rounded-xl border border-emerald-200/80 bg-white px-3.5 py-2.5 shadow-sm transition-all duration-200 hover:border-emerald-300 hover:shadow-md active:scale-95"
              onClick={(e) => handleActionClick(e, () => onViewRecipe(dish))}
              aria-label="查看做法"
            >
              <span className="absolute inset-0 bg-emerald-50 opacity-0 transition-opacity duration-200 group-hover:opacity-100" />
              <span className="relative flex items-center gap-1.5 text-sm font-semibold text-emerald-700 group-hover:text-emerald-900">
                <span className="text-base">📝</span>
                <span>做法</span>
              </span>
            </button>
          </div>
        </div>
      </div>

      {expanded && (
        <div className="border-t border-amber-100/80 bg-white/50 p-5 backdrop-blur-sm">
          {images.length > 1 && (
            <div className="mb-4">
              <div className="flex gap-2 overflow-x-auto pb-2 [scrollbar-width:thin]">
                {images.map((image) => (
                  <img
                    key={image.id}
                    src={image.fileUrl}
                    alt={image.isCover ? `${dish.name}封面` : `${dish.name}图片`}
                    className="h-24 w-24 shrink-0 rounded-xl border border-white object-cover shadow-[0_6px_16px_rgba(111,82,56,0.12)]"
                    loading="lazy"
                  />
                ))}
              </div>
              {imagesQuery.isError && (
                <p className="mt-2 text-xs text-red-600">图库加载失败</p>
              )}
            </div>
          )}

          <div className="flex items-center justify-between gap-3 rounded-2xl border border-amber-100/80 bg-white/80 p-3 shadow-sm">
            <label className="flex cursor-pointer items-center gap-2.5" htmlFor={activeSwitchId}>
              <input
                id={activeSwitchId}
                type="checkbox"
                checked={dish.isActive}
                onChange={handleToggleActive}
                disabled={updateDish.isPending}
                aria-label="启用状态开关"
                className="peer sr-only"
              />
              <span className="block h-6 w-11 rounded-full bg-slate-300 p-0.5 transition peer-checked:bg-emerald-500 peer-disabled:opacity-60">
                <span
                  className={`block h-5 w-5 rounded-full bg-white shadow transition ${
                    dish.isActive ? "translate-x-5" : ""
                  }`}
                />
              </span>
              <span className="text-sm font-semibold text-slate-700">
                {dish.isActive ? "已启用" : "已停用"}
              </span>
            </label>
          </div>

          {isEditing && (
            <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white/90 p-4">
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

          {recipesQuery.isLoading && (
            <div className="mt-4">
              <Spinner />
            </div>
          )}

          {recipesQuery.isError && (
            <div className="mt-4">
              <ErrorBanner
                message="加载做法失败"
                onRetry={() => void recipesQuery.refetch()}
              />
            </div>
          )}

          {recipesQuery.data && recipesQuery.data.length > 0 && (
            <div className="mt-4 rounded-2xl border border-emerald-100/80 bg-emerald-50/50 p-4">
              <div className="mb-3 flex items-center gap-2">
                <span className="text-lg">📝</span>
                <h4 className="font-serif text-base font-semibold text-slate-900">做法</h4>
              </div>
              <div className="space-y-3">
                {recipesQuery.data.map((recipe) => (
                  <article
                    key={recipe.id}
                    className="rounded-xl border border-white/90 bg-white/80 p-3 shadow-sm"
                  >
                    <p className="font-serif text-sm font-semibold text-slate-900">
                      {recipe.title}
                    </p>
                    <p className="mt-1.5 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                      {recipe.content}
                    </p>
                  </article>
                ))}
              </div>
            </div>
          )}
        </div>
      )}
    </Card>
  );
});
