import type { MealType, RecommendationCandidate } from "../api/types.ts";
import { mealLabel } from "./meal-tag.tsx";
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
}: Props) {
  return (
    <div className="mt-4 flex flex-col gap-4">
      {/* 操作区 */}
      <Card>
        <div className="flex flex-col gap-3">
          <div>
            <label
              htmlFor="meal-select"
              className="mb-1 block text-sm font-medium text-slate-700"
            >
              餐次筛选
            </label>
            <Select
              id="meal-select"
              value={mealType}
              onChange={(e) =>
                onMealTypeChange(e.target.value as MealType | "")
              }
            >
              <option value="">不限餐次</option>
              <option value="BREAKFAST">早餐</option>
              <option value="LUNCH">午餐</option>
              <option value="DINNER">晚餐</option>
              <option value="SNACK">加餐</option>
            </Select>
          </div>

          <div className="flex gap-2">
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
          <h2 className="text-sm font-semibold text-slate-700">推荐结果</h2>
          {recommendResult.map((candidate) => (
            <CandidateCard key={candidate.dish.id} candidate={candidate} />
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
          <h2 className="text-sm font-semibold text-slate-700">
            🎲 盲盒结果
          </h2>
          {blindBoxResult ? (
            <CandidateCard candidate={blindBoxResult} highlight />
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
}: {
  candidate: RecommendationCandidate;
  highlight?: boolean;
}) {
  return (
    <Card
      className={highlight ? "border-amber-300 bg-amber-50" : undefined}
    >
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate text-sm font-medium text-slate-900">
            {candidate.dish.name}
          </p>
          {candidate.dish.description && (
            <p className="mt-0.5 truncate text-xs text-slate-500">
              {candidate.dish.description}
            </p>
          )}
        </div>
        <div className="flex shrink-0 flex-wrap gap-1">
          {candidate.dish.mealTypes.map((mt) => (
            <span
              key={mt}
              className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600"
            >
              {mealLabel(mt as MealType)}
            </span>
          ))}
        </div>
      </div>

      {candidate.reasons.length > 0 && (
        <div className="mt-2 flex flex-wrap gap-1">
          {candidate.reasons.map((reason, i) => (
            <span
              key={i}
              className="rounded-full bg-emerald-50 px-2 py-0.5 text-xs text-emerald-700"
            >
              {reason}
            </span>
          ))}
        </div>
      )}
    </Card>
  );
}
