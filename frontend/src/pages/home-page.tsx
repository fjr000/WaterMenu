import { useId, useState, type ReactNode } from "react";
import { useAuth } from "../hooks/use-auth.tsx";
import { useDishImages } from "../hooks/use-dish-images.ts";
import { useDishes, useUpdateDish } from "../hooks/use-dishes.ts";
import { useRecipes } from "../hooks/use-recipes.ts";
import { DishVariantsPanel } from "../components/dish-variants-panel.tsx";
import {
  useRecommend,
  useBlindBox,
} from "../hooks/use-recommendations.ts";
import type { Dish, DishImage, MealType } from "../api/types.ts";
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

  const handleRecordDish = (dish: Dish) => {
    setRecipeDish(null);
    setImageDish(null);
    setVariantDish(null);
    setEditingDish(null);
    setRecordDish(dish);
  };

  const handleViewRecipe = (dish: Dish) => {
    setRecordDish(null);
    setImageDish(null);
    setVariantDish(null);
    setEditingDish(null);
    setRecipeDish(dish);
  };

  const handleManageImages = (dish: Dish) => {
    setRecordDish(null);
    setRecipeDish(null);
    setVariantDish(null);
    setEditingDish(null);
    setImageDish(dish);
  };

  const handleManageVariants = (dish: Dish) => {
    setRecordDish(null);
    setRecipeDish(null);
    setImageDish(null);
    setEditingDish(null);
    setVariantDish(dish);
  };

  const handleEditDish = (dish: Dish) => {
    setRecordDish(null);
    setRecipeDish(null);
    setImageDish(null);
    setVariantDish(null);
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
                  key={getDishListKey(dish, {
                    q: dishSearch,
                    mealType: dishMealType,
                    status: dishStatus,
                  })}
                  dish={dish}
                  forceExpanded={
                    editingDish?.id === dish.id ||
                    recordDish?.id === dish.id ||
                    recipeDish?.id === dish.id ||
                    imageDish?.id === dish.id ||
                    variantDish?.id === dish.id
                  }
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
        <Input
          id="dish-search"
          value={search}
          onChange={(event) => onSearchChange(event.target.value)}
          placeholder="搜索菜名或简介"
          aria-label="搜索菜品"
        />
      </div>

      <div className="grid grid-cols-2 gap-3">
        <div>
          <Select
            id="dish-meal-type"
            value={mealType}
            onChange={(event) => onMealTypeChange(event.target.value as MealType | "")}
            aria-label="餐次筛选"
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
          <Select
            id="dish-status"
            value={status}
            onChange={(event) => onStatusChange(event.target.value as DishStatusFilter)}
            aria-label="状态筛选"
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

function getDishListKey(
  dish: Dish,
  filters: { q: string; mealType: MealType | ""; status: DishStatusFilter },
) {
  return [
    dish.id,
    filters.q.trim(),
    filters.mealType,
    filters.status,
    dish.updatedAt,
  ].join("-");
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
  const keyword = q.trim() ? `关键词“${q.trim()}”` : "全部关键词";
  const meal = mealType ? mealLabel(mealType) : "全部餐次";
  const statusLabel = getDishStatusFilterLabel(status);

  return `${keyword} · ${meal} · ${statusLabel}`;
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

function getMobileDetailsLabel(forceExpanded: boolean, expanded: boolean) {
  if (forceExpanded) {
    return "详情已展开";
  }
  if (expanded) {
    return "收起详情";
  }
  return "展开详情";
}

function DishToolButton({
  mark,
  label,
  tone = "amber",
  onClick,
}: {
  mark: ReactNode;
  label: string;
  tone?: "amber" | "emerald";
  onClick: () => void;
}) {
  return (
    <button
      type="button"
      className={`grid h-10 w-10 place-items-center rounded-xl border text-sm font-black shadow-sm transition-all duration-200 hover:-translate-y-0.5 hover:shadow-md focus:outline-none focus:ring-2 focus:ring-red-500/30 active:translate-y-0 ${
        tone === "emerald"
          ? "border-emerald-200/80 bg-emerald-50/90 text-emerald-700 hover:bg-emerald-100"
          : "border-amber-200/80 bg-amber-50/90 text-red-600 hover:bg-amber-100"
      }`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <span aria-hidden="true">{mark}</span>
    </button>
  );
}

function DishImageStrip({
  dish,
  images,
  className,
}: {
  dish: Dish;
  images: DishImage[];
  className?: string;
}) {
  return (
    <div className={className}>
      <div className="flex snap-x gap-2 overflow-x-auto pb-1 [scrollbar-width:thin]">
        {images.map((image, index) => (
          <img
            key={image.id}
            src={image.fileUrl}
            alt={image.isCover ? `${dish.name}封面` : `${dish.name}图片`}
            className={`h-28 shrink-0 snap-start rounded-2xl border border-white object-cover shadow-[0_8px_18px_rgba(111,82,56,0.14)] ${
              index === 0 ? "w-44" : "w-32"
            }`}
            loading="lazy"
          />
        ))}
      </div>
    </div>
  );
}

function ActiveSwitch({
  id,
  dish,
  disabled,
  className,
  onChange,
}: {
  id: string;
  dish: Dish;
  disabled: boolean;
  className: string;
  onChange: () => void;
}) {
  return (
    <label className={className} htmlFor={id}>
      <input
        id={id}
        type="checkbox"
        checked={dish.isActive}
        onChange={onChange}
        disabled={disabled}
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
    </label>
  );
}

function DishCard({
  dish,
  forceExpanded,
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
  forceExpanded: boolean;
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
  const activeSwitchDesktopId = useId();
  const activeSwitchMobileId = useId();
  const cardDetailsId = useId();
  const recipePanelId = useId();
  const updateDish = useUpdateDish();
  const imagesQuery = useDishImages(dish.id, Boolean(dish.coverImage));
  const [mobileExpanded, setMobileExpanded] = useState(false);
  const [recipesOpen, setRecipesOpen] = useState(false);
  const recipesQuery = useRecipes(dish.id, recipesOpen);
  const images = imagesQuery.data ?? (dish.coverImage ? [dish.coverImage] : []);
  const coverImage = dish.coverImage ?? images[0] ?? null;
  const ratingText = dish.feedbackRatingAverage?.toFixed(1);
  const showMobileDetails = forceExpanded || mobileExpanded;

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
    <Card className="overflow-hidden border-amber-200/80 bg-gradient-to-br from-white/95 via-amber-50/70 to-red-50/45 p-0 shadow-[0_18px_42px_rgba(111,82,56,0.14)]">
      {images.length > 0 && (
        <div className="hidden border-b border-amber-100/80 bg-amber-50/60 px-4 py-3.5 md:block backdrop-blur-sm">
          <DishImageStrip dish={dish} images={images} />
          {imagesQuery.isError && (
            <p className="mt-2 text-xs text-red-600">图库刷新失败，先显示已有封面</p>
          )}
        </div>
      )}

      <div className="p-5">
        <div className="flex items-start justify-between gap-4">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2.5">
              <p className="truncate font-serif text-xl font-semibold text-slate-900">
                {dish.name}
              </p>
              <span
                className={`shrink-0 rounded-full px-2.5 py-0.5 text-[10px] font-bold ${
                  dish.isActive
                    ? "bg-emerald-50 text-emerald-700 border border-emerald-200/60"
                    : "bg-slate-100 text-slate-500 border border-slate-200"
                }`}
              >
                {dish.isActive ? "启用" : "停用"}
              </span>
            </div>
            {dish.description && (
              <p className="mt-1.5 hidden line-clamp-2 text-sm leading-relaxed text-slate-500 md:block">
                {dish.description}
              </p>
            )}
          </div>
          {coverImage && (
            <img
              src={coverImage.fileUrl}
              alt={`${dish.name}封面`}
              className="h-16 w-20 shrink-0 rounded-2xl border border-white/80 object-cover shadow-[0_10px_20px_rgba(111,82,56,0.15)] md:hidden"
              loading="lazy"
            />
          )}
          <div className="hidden shrink-0 text-right md:block">
            <ActiveSwitch
              id={activeSwitchDesktopId}
              dish={dish}
              disabled={updateDish.isPending}
              className="block cursor-pointer rounded-2xl border border-amber-200/80 bg-white/85 px-3 py-2.5 shadow-inner transition-all hover:bg-amber-50/50"
              onChange={handleToggleActive}
            />
          </div>
        </div>

        <div className="mt-3 flex flex-wrap items-center gap-2">
          {dish.mealTypes.map((mt) => (
            <MealTag key={mt} mealType={mt} />
          ))}
          {dish.mealRecordCount > 0 && (
            <>
              <span className="inline-flex rounded-full border border-emerald-200/80 bg-emerald-50/90 px-2.5 py-1 text-xs font-semibold text-emerald-700">
                {dish.mealRecordCount} 次
              </span>
              {ratingText && (
                <span className="inline-flex rounded-full border border-amber-200/80 bg-amber-50/90 px-2.5 py-1 text-xs font-semibold text-amber-700">
                  ★ {ratingText}
                </span>
              )}
            </>
          )}
        </div>

        <button
          type="button"
          className="mt-4 flex min-h-10 w-full items-center justify-between rounded-2xl border border-amber-100/80 bg-white/75 px-3.5 text-left text-xs font-bold text-slate-600 shadow-inner transition-all duration-200 hover:bg-amber-50/80 focus:outline-none focus:ring-2 focus:ring-red-500/25 disabled:cursor-not-allowed disabled:opacity-70 md:hidden"
          onClick={() => setMobileExpanded((value) => !value)}
          disabled={forceExpanded}
          aria-expanded={showMobileDetails}
          aria-controls={cardDetailsId}
        >
          <span>{getMobileDetailsLabel(forceExpanded, showMobileDetails)}</span>
          <span aria-hidden="true" className="text-sm">{showMobileDetails ? "↑" : "↓"}</span>
        </button>

        <div id={cardDetailsId} className={`${showMobileDetails ? "block" : "hidden"} md:block`}>
          {dish.description && (
            <p className="mt-4 line-clamp-2 text-sm leading-relaxed text-slate-500 md:hidden">
              {dish.description}
            </p>
          )}

          {images.length > 0 && (
            <div className="mt-4 border-y border-amber-100/80 bg-amber-50/60 py-3.5 md:hidden backdrop-blur-sm">
              <DishImageStrip dish={dish} images={images} />
              {imagesQuery.isError && (
                <p className="mt-2 text-xs text-red-600">图库刷新失败，先显示已有封面</p>
              )}
            </div>
          )}

          <div className="mt-4 block shrink-0 text-right md:hidden">
            <ActiveSwitch
              id={activeSwitchMobileId}
              dish={dish}
              disabled={updateDish.isPending}
              className="inline-block cursor-pointer rounded-2xl border border-amber-200/80 bg-white/85 px-3 py-2.5 shadow-inner transition-all hover:bg-amber-50/50"
              onChange={handleToggleActive}
            />
          </div>

        {isEditing && (
          <div className="mt-4 rounded-2xl border border-slate-200/80 bg-white/85 p-4 backdrop-blur-sm">
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

        <div className="mt-5 rounded-3xl border border-amber-100/80 bg-white/60 p-3 shadow-inner backdrop-blur-sm">
          <div className="flex items-center gap-2.5">
            <Button
              className="min-h-12 flex-1 justify-between rounded-2xl px-4 py-3 text-sm shadow-[0_5px_0_rgba(111,82,56,0.16)]"
              onClick={() => onRecordDish(dish)}
            >
              <span className="truncate">记录已吃</span>
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/25 text-base font-bold"
                aria-hidden="true"
              >
                +
              </span>
            </Button>

            <div
              className="flex shrink-0 items-center gap-1.5 rounded-2xl border border-amber-100/80 bg-white/80 p-1.5"
              role="toolbar"
              aria-label={`${dish.name}管理操作`}
            >
              <DishToolButton
                mark="编"
                label="编辑菜品"
                onClick={() => onEditDish(dish)}
              />
              <DishToolButton
                mark="图"
                label="管理图库"
                onClick={() => onManageImages(dish)}
              />
              <DishToolButton
                mark="版"
                label="管理版本"
                onClick={() => onManageVariants(dish)}
              />
              <DishToolButton
                mark="做"
                label="管理做法"
                tone="emerald"
                onClick={() => onViewRecipe(dish)}
              />
            </div>
          </div>

          <button
            type="button"
            className={`mt-2.5 flex min-h-10 w-full items-center justify-between rounded-2xl border px-3.5 text-left text-xs font-bold transition-all duration-200 focus:outline-none focus:ring-2 focus:ring-red-500/25 ${
              recipesOpen
                ? "border-emerald-200/80 bg-emerald-50/90 text-emerald-800 shadow-sm"
                : "border-amber-100/80 bg-amber-50/75 text-slate-600 hover:bg-amber-100/90"
            }`}
            onClick={() => setRecipesOpen((value) => !value)}
            aria-expanded={recipesOpen}
            aria-controls={recipePanelId}
          >
            <span className="flex min-w-0 items-center gap-2.5">
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-xl text-[11px] font-black ${
                  recipesOpen ? "bg-emerald-100 text-emerald-700" : "bg-white/90 text-red-600"
                }`}
                aria-hidden="true"
              >
                做
              </span>
              <span className="truncate">做法</span>
            </span>
            <span className="shrink-0 text-[11px] text-slate-500">
              {recipesOpen ? "收起" : "展开"}
            </span>
          </button>
        </div>

        {recipesOpen && (
          <div id={recipePanelId} className="mt-3.5 rounded-2xl border border-emerald-100/80 bg-emerald-50/60 p-4 backdrop-blur-sm">
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
              <div className="flex flex-col gap-2.5">
                {recipesQuery.data.map((recipe) => (
                  <article
                    key={recipe.id}
                    className="rounded-2xl border border-white/90 bg-white/85 p-4 shadow-sm backdrop-blur-sm"
                  >
                    <p className="font-serif text-base font-semibold text-slate-900">
                      {recipe.title}
                    </p>
                    <p className="mt-2 whitespace-pre-wrap text-sm leading-relaxed text-slate-600">
                      {recipe.content}
                    </p>
                  </article>
                ))}
              </div>
            )}
          </div>
        )}
        </div>
      </div>
    </Card>
  );
}
