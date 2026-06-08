import { useId, useState, type ReactNode } from "react";
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

type HomeTab = "recommend" | "dishes" | "history";

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
];

export function HomePage() {
  const auth = useAuth();
  const [mealType, setMealType] = useState<MealType | "">("");
  const dishesQuery = useDishes();
  const recommendMutation = useRecommend();
  const blindBoxMutation = useBlindBox();
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [activeTab, setActiveTab] = useState<HomeTab>("recommend");
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

        {activeTab === "dishes" && (
          <div className="mx-auto mt-5 flex max-w-2xl flex-col gap-4 md:mt-6">
            <div className="flex items-center justify-between gap-3 rounded-3xl border border-amber-200 bg-white/60 p-3 shadow-[0_10px_24px_rgba(111,82,56,0.08)]">
              <div>
                <h2 className="font-serif text-lg font-semibold text-slate-900">
                  菜品列表
                </h2>
                <p className="text-xs text-slate-500">管理家里的常吃菜单</p>
              </div>
              <Button
                className="shrink-0 px-3 py-2 text-xs sm:px-4 sm:text-sm"
                onClick={() => setShowCreateForm((v) => !v)}
              >
                {showCreateForm ? "收起" : "新增"}
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
            onRecordChange={resetRecommendationState}
          />
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

function DesktopTabNav({
  activeTab,
  onChange,
}: {
  activeTab: HomeTab;
  onChange: (tab: HomeTab) => void;
}) {
  return (
    <nav className="mt-6 hidden grid-cols-3 gap-3 md:grid" aria-label="首页栏目">
      {homeTabs.map((tab) => {
        const active = activeTab === tab.key;

        return (
          <button
            key={tab.key}
            type="button"
            className={`group flex items-center gap-3 rounded-3xl border p-3 text-left shadow-sm transition ${
              active
                ? "border-red-200 bg-red-50/90 shadow-[0_12px_28px_rgba(217,75,53,0.13)]"
                : "border-slate-200 bg-white/55 hover:-translate-y-0.5 hover:border-amber-200 hover:bg-amber-50/70"
            }`}
            onClick={() => onChange(tab.key)}
            aria-current={active ? "page" : undefined}
          >
            <span
              className={`grid h-11 w-11 shrink-0 place-items-center rounded-2xl border text-base font-black ${
                active
                  ? "border-red-200 bg-red-500 text-white"
                  : "border-amber-200 bg-white/80 text-slate-600 group-hover:text-red-600"
              }`}
              aria-hidden="true"
            >
              {tab.mark}
            </span>
            <span className="min-w-0">
              <span className="block text-[11px] font-semibold text-slate-500">
                {tab.eyebrow}
              </span>
              <span
                className={`block truncate text-sm font-bold ${
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
      className="fixed inset-x-3 bottom-3 z-30 rounded-[1.75rem] border border-slate-200 bg-white/90 p-2 shadow-[0_18px_44px_rgba(111,82,56,0.22)] backdrop-blur md:hidden"
      aria-label="首页栏目"
    >
      <div className="grid grid-cols-3 gap-1">
        {homeTabs.map((tab) => {
          const active = activeTab === tab.key;

          return (
            <button
              key={tab.key}
              type="button"
              className={`flex min-w-0 flex-col items-center gap-1 rounded-2xl px-2 py-2 text-xs font-bold transition ${
                active
                  ? "bg-red-500 text-white shadow-[0_8px_18px_rgba(217,75,53,0.24)]"
                  : "text-slate-500 hover:bg-amber-50 hover:text-slate-700"
              }`}
              onClick={() => onChange(tab.key)}
              aria-current={active ? "page" : undefined}
            >
              <span
                className={`grid h-7 w-7 place-items-center rounded-xl border text-sm ${
                  active ? "border-red-100/40 bg-white/15" : "border-amber-200 bg-white/70"
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
      className={`grid h-11 w-11 place-items-center rounded-2xl border text-sm font-black shadow-sm transition hover:-translate-y-0.5 focus:outline-none focus:ring-2 focus:ring-red-500/25 ${
        tone === "emerald"
          ? "border-emerald-200 bg-emerald-50/80 text-emerald-700 hover:bg-emerald-100"
          : "border-amber-200 bg-amber-50/80 text-red-600 hover:bg-amber-100"
      }`}
      onClick={onClick}
      aria-label={label}
      title={label}
    >
      <span aria-hidden="true">{mark}</span>
    </button>
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
  const activeSwitchId = useId();
  const recipePanelId = useId();
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
    <Card className="overflow-hidden border-amber-200 bg-gradient-to-br from-white/95 via-amber-50/70 to-red-50/45 p-0 shadow-[0_16px_38px_rgba(111,82,56,0.14)]">
      {images.length > 0 && (
        <div className="border-b border-amber-100 bg-amber-50/55 px-3 py-3 sm:px-4">
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
          {imagesQuery.isError && (
            <p className="mt-2 text-xs text-red-600">图库刷新失败，先显示已有封面</p>
          )}
        </div>
      )}

      <div className="p-4">
        <div className="flex items-start justify-between gap-3">
          <div className="min-w-0">
            <div className="flex min-w-0 items-center gap-2">
              <p className="truncate font-serif text-xl font-semibold text-slate-900">
                {dish.name}
              </p>
              <span
                className={`shrink-0 rounded-full px-2 py-0.5 text-[11px] font-bold ${
                  dish.isActive
                    ? "bg-emerald-50 text-emerald-700"
                    : "bg-slate-100 text-slate-500"
                }`}
              >
                {dish.isActive ? "启用" : "停用"}
              </span>
            </div>
            {dish.description && (
              <p className="mt-1 line-clamp-2 text-sm leading-5 text-slate-500">
                {dish.description}
              </p>
            )}
          </div>
          <div className="shrink-0 text-right">
            <label
              className="block cursor-pointer rounded-2xl border border-amber-200 bg-white/75 px-2.5 py-2 shadow-inner"
              htmlFor={activeSwitchId}
            >
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
            </label>
          </div>
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

        <div className="mt-4 rounded-3xl border border-amber-100 bg-white/55 p-2.5 shadow-inner">
          <div className="flex items-center gap-2">
            <Button
              className="min-h-12 flex-1 justify-between rounded-2xl px-4 py-3 text-sm shadow-[0_5px_0_rgba(111,82,56,0.16)]"
              onClick={() => onRecordDish(dish)}
            >
              <span className="truncate">记录已吃</span>
              <span
                className="grid h-7 w-7 shrink-0 place-items-center rounded-full bg-white/20 text-base"
                aria-hidden="true"
              >
                +
              </span>
            </Button>

            <div
              className="flex shrink-0 items-center gap-1 rounded-2xl border border-amber-100 bg-white/70 p-1"
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
                mark="做"
                label="管理做法"
                tone="emerald"
                onClick={() => onViewRecipe(dish)}
              />
            </div>
          </div>

          <button
            type="button"
            className={`mt-2 flex min-h-10 w-full items-center justify-between rounded-2xl border px-3 text-left text-xs font-bold transition focus:outline-none focus:ring-2 focus:ring-red-500/20 ${
              recipesOpen
                ? "border-emerald-200 bg-emerald-50 text-emerald-800"
                : "border-amber-100 bg-amber-50/70 text-slate-600 hover:bg-amber-100"
            }`}
            onClick={() => setRecipesOpen((value) => !value)}
            aria-expanded={recipesOpen}
            aria-controls={recipePanelId}
          >
            <span className="flex min-w-0 items-center gap-2">
              <span
                className={`grid h-6 w-6 shrink-0 place-items-center rounded-xl text-[11px] ${
                  recipesOpen ? "bg-emerald-100 text-emerald-700" : "bg-white/85 text-red-600"
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
          <div id={recipePanelId} className="mt-3 rounded-2xl border border-emerald-100 bg-emerald-50/50 p-3">
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
