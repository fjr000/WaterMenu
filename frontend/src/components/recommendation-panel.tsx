import type { Dish, MealType, RecommendationCandidate } from "../api/types.ts";
import { DishCoverImage } from "./dish-cover-image.tsx";
import { MealTag } from "./meal-tag.tsx";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  SecondaryButton,
  Select,
} from "./ui.tsx";

interface Props {
  mealType: MealType | "";
  onMealTypeChange: (mt: MealType | "") => void;
  onRecommend: () => void;
  onBlindBox: () => void;
  recommendPending: boolean;
  blindBoxPending: boolean;
  recommendResult: RecommendationCandidate[] | null;
  blindBoxResult: RecommendationCandidate | null;
  blindBoxFired: boolean;
  recommendError: string | null;
  blindBoxError: string | null;
  onRecordDish: (dish: Dish) => void;
  onViewRecipe: (dish: Dish) => void;
}

export function RecommendationPanel({
  mealType,
  onMealTypeChange,
  onRecommend,
  onBlindBox,
  recommendPending,
  blindBoxPending,
  recommendResult,
  blindBoxResult,
  blindBoxFired,
  recommendError,
  blindBoxError,
  onRecordDish,
  onViewRecipe,
}: Props) {
  return (
    <div className="mt-5 flex flex-col gap-5">
      {/* 操作区 */}
      <Card>
        <div className="flex flex-col gap-4">
          <div>
            <Select
              id="meal-select"
              value={mealType}
              onChange={(e) =>
                onMealTypeChange(e.target.value as MealType | "")
              }
              aria-label="餐次筛选"
            >
              <option value="">不限餐次</option>
              <option value="BREAKFAST">早餐</option>
              <option value="LUNCH">午餐</option>
              <option value="DINNER">晚餐</option>
              <option value="SNACK">加餐</option>
            </Select>
          </div>

          <div className="flex gap-3">
            <Button
              className="flex-1"
              onClick={onRecommend}
              disabled={recommendPending || blindBoxPending}
            >
              {recommendPending ? "推荐中…" : "智能推荐"}
            </Button>
            <SecondaryButton
              className="flex-1"
              onClick={onBlindBox}
              disabled={recommendPending || blindBoxPending}
            >
              {blindBoxPending ? "抽取中…" : "🎲 盲盒"}
            </SecondaryButton>
          </div>
        </div>
      </Card>

      {/* 错误提示 */}
      {recommendError && (
        <ErrorBanner message={recommendError} onRetry={onRecommend} />
      )}
      {blindBoxError && (
        <ErrorBanner message={blindBoxError} onRetry={onBlindBox} />
      )}

      {/* 推荐结果 */}
      {recommendResult && recommendResult.length > 0 && (
        <div className="flex flex-col gap-3">
          <h2 className="font-serif text-lg font-semibold text-slate-900">推荐</h2>
          {recommendResult.map((candidate, index) => (
            <div key={candidate.dish.id} className={`animate-slide-up stagger-${Math.min(index + 1, 6)}`}>
              <CandidateCard
                candidate={candidate}
                onRecordDish={onRecordDish}
                onViewRecipe={onViewRecipe}
              />
            </div>
          ))}
        </div>
      )}

      {recommendResult && recommendResult.length === 0 && (
        <EmptyState
          icon="🤔"
          title="暂无推荐"
          description="当前没有可推荐的菜品，试试新增一些菜品或换个餐次"
        />
      )}

      {/* 盲盒结果 */}
      {blindBoxFired && !blindBoxPending && !blindBoxError && (
        <div className="flex flex-col gap-3">
          <h2 className="font-serif text-lg font-semibold text-slate-900">
            🎲 盲盒
          </h2>
          {blindBoxResult ? (
            <div className="animate-scale-in">
              <CandidateCard
                candidate={blindBoxResult}
                highlight
                onRecordDish={onRecordDish}
                onViewRecipe={onViewRecipe}
              />
            </div>
          ) : (
            <EmptyState
              icon="🎲"
              title="盲盒是空的"
              description="当前没有可抽取的菜品，试试新增一些菜品或换个餐次"
            />
          )}
        </div>
      )}
    </div>
  );
}

function CandidateCard({
  candidate,
  highlight = false,
  onRecordDish,
  onViewRecipe,
}: {
  candidate: RecommendationCandidate;
  highlight?: boolean;
  onRecordDish: (dish: Dish) => void;
  onViewRecipe: (dish: Dish) => void;
}) {
  return (
    <Card
      className={highlight ? "border-amber-300 bg-amber-50/85 shadow-[0_14px_32px_rgba(217,147,31,0.18)]" : undefined}
    >
      <div className="flex items-start justify-between gap-4">
        <div className="min-w-0 flex-1">
          <p className="truncate font-serif text-xl font-semibold text-slate-900">
            {candidate.dish.name}
          </p>
          {candidate.dish.description && (
            <p className="mt-1 line-clamp-2 text-sm leading-relaxed text-slate-500">
              {candidate.dish.description}
            </p>
          )}
          <div className="mt-3 flex flex-wrap gap-1.5">
            {candidate.dish.mealTypes.map((mt) => (
              <MealTag key={mt} mealType={mt} />
            ))}
          </div>
        </div>
        <DishCoverImage dish={candidate.dish} />
      </div>

      {candidate.reasons.length > 0 && (
        <div className="mt-3 flex flex-wrap gap-1.5">
          {candidate.reasons.map((reason, i) => (
            <span
              key={i}
              className="rounded-full border border-emerald-200/80 bg-emerald-50/90 px-2.5 py-1 text-xs font-medium text-emerald-700"
            >
              {reason}
            </span>
          ))}
        </div>
      )}

      <div className="mt-4 flex gap-2">
        <SecondaryButton
          className="flex-1 px-3 py-2.5 text-xs"
          onClick={() => onViewRecipe(candidate.dish)}
        >
          查看做法
        </SecondaryButton>
        <Button
          className="flex-1 px-3 py-2.5 text-xs shadow-[0_4px_0_rgba(111,82,56,0.16)]"
          onClick={() => onRecordDish(candidate.dish)}
        >
          记录已吃
        </Button>
      </div>
    </Card>
  );
}
