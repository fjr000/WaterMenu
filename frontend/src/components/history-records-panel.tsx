import { useEffect, useMemo, useState } from "react";
import type { FeedbackRating, MealRecord, MealType } from "../api/types.ts";
import { useDishes } from "../hooks/use-dishes.ts";
import { useMealRecords } from "../hooks/use-meal-records.ts";
import { ManualMealRecordForm } from "./manual-meal-record-form.tsx";
import { mealLabel } from "./meal-tag.tsx";
import { MealRecordCard } from "./recent-meal-records.tsx";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Input,
  SecondaryButton,
  Select,
  Spinner,
} from "./ui.tsx";

const pageSize = 20;

type RangeValue = "all" | "7" | "30" | "90";

const ratingOptions: { value: FeedbackRating; label: string }[] = [
  { value: "GOOD", label: "好吃" },
  { value: "OK", label: "一般" },
  { value: "BAD", label: "不好吃" },
];

export function HistoryRecordsPanel({
  userId,
  onRecordChange,
}: {
  userId: string;
  onRecordChange?: () => void;
}) {
  const dishesQuery = useDishes();
  const [page, setPage] = useState(1);
  const [mealType, setMealType] = useState<MealType | "">("");
  const [dishId, setDishId] = useState("");
  const [rating, setRating] = useState<FeedbackRating | "">("");
  const [ratingScope, setRatingScope] = useState<"mine" | "workspace">(
    "mine",
  );
  const [range, setRange] = useState<RangeValue>("all");
  const [q, setQ] = useState("");
  const [records, setRecords] = useState<MealRecord[]>([]);
  const [showManualForm, setShowManualForm] = useState(false);

  const from = useMemo(() => buildFrom(range), [range]);
  const mealRecordsQuery = useMealRecords({
    page,
    pageSize,
    mealType: mealType || undefined,
    dishId: dishId || undefined,
    rating: rating || undefined,
    ratingScope: rating ? ratingScope : undefined,
    from,
    q: q.trim() || undefined,
  });
  const total = mealRecordsQuery.data?.total ?? 0;
  const hasMore = records.length < total;

  useEffect(() => {
    if (!mealRecordsQuery.data) {
      return;
    }
    setRecords((current) => {
      if (mealRecordsQuery.data.page === 1) {
        return mealRecordsQuery.data.items;
      }

      const next = [...current];
      mealRecordsQuery.data.items.forEach((item) => {
        const index = next.findIndex((record) => record.id === item.id);
        if (index >= 0) {
          next[index] = item;
        } else {
          next.push(item);
        }
      });
      return next;
    });
  }, [mealRecordsQuery.data]);

  const resetPage = () => {
    setPage(1);
    setRecords([]);
  };

  const resetFilters = () => {
    resetPage();
    setMealType("");
    setDishId("");
    setRating("");
    setRatingScope("mine");
    setRange("all");
    setQ("");
  };

  const handleManualRecordSuccess = () => {
    setShowManualForm(false);
    resetFilters();
    onRecordChange?.();
  };

  return (
    <section className="mt-4 flex flex-col gap-3">
      <div className="flex items-center justify-between gap-3">
        <div>
          <h2 className="font-serif text-lg font-semibold text-slate-900">
            历史记录
          </h2>
          <p className="mt-0.5 text-xs text-slate-500">
            按菜、餐次、反馈和关键词找回吃过什么
          </p>
        </div>
        <Button
          type="button"
          className="shrink-0 px-3 py-2 text-xs sm:px-4 sm:text-sm"
          onClick={() => setShowManualForm((value) => !value)}
        >
          {showManualForm ? "收起" : "手动记录"}
        </Button>
      </div>

      {showManualForm && (
        <ManualMealRecordForm
          onCancel={() => setShowManualForm(false)}
          onSuccess={handleManualRecordSuccess}
        />
      )}

      <Card className="flex flex-col gap-3">
        <Input
          value={q}
          onChange={(event) => {
            setQ(event.target.value);
            resetPage();
          }}
          placeholder="搜索标题或记录备注"
        />

        <div className="grid grid-cols-2 gap-2">
          <Select
            value={mealType}
            onChange={(event) => {
              setMealType(event.target.value as MealType | "");
              resetPage();
            }}
          >
            <option value="">全部餐次</option>
            {(["BREAKFAST", "LUNCH", "DINNER", "SNACK"] as MealType[]).map(
              (value) => (
                <option key={value} value={value}>
                  {mealLabel(value)}
                </option>
              ),
            )}
          </Select>

          <Select
            value={range}
            onChange={(event) => {
              setRange(event.target.value as RangeValue);
              resetPage();
            }}
          >
            <option value="all">全部时间</option>
            <option value="7">最近 7 天</option>
            <option value="30">最近 30 天</option>
            <option value="90">最近 90 天</option>
          </Select>
        </div>

        <Select
          value={dishId}
          onChange={(event) => {
            setDishId(event.target.value);
            resetPage();
          }}
          disabled={dishesQuery.isLoading || dishesQuery.isError}
        >
          <option value="">全部菜品</option>
          {dishesQuery.data?.map((dish) => (
            <option key={dish.id} value={dish.id}>
              {dish.name}
            </option>
          ))}
        </Select>

        <div className="grid grid-cols-2 gap-2">
          <Select
            value={rating}
            onChange={(event) => {
              setRating(event.target.value as FeedbackRating | "");
              resetPage();
            }}
          >
            <option value="">全部反馈</option>
            {ratingOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>

          <Select
            value={ratingScope}
            onChange={(event) => {
              setRatingScope(event.target.value as "mine" | "workspace");
              resetPage();
            }}
            disabled={!rating}
          >
            <option value="mine">我的反馈</option>
            <option value="workspace">全部成员反馈</option>
          </Select>
        </div>
      </Card>

      {mealRecordsQuery.isLoading && <Spinner />}

      {mealRecordsQuery.isError && (
        <ErrorBanner
          message="加载历史记录失败"
          onRetry={() => void mealRecordsQuery.refetch()}
        />
      )}

      {mealRecordsQuery.data && records.length === 0 && (
        <EmptyState
          icon="🔎"
          title="没有找到用餐记录"
          description="换个关键词或筛选条件试试"
        />
      )}

      {records.map((record) => (
        <MealRecordCard
          key={record.id}
          record={record}
          userId={userId}
          onRecordChange={() => {
            resetPage();
            onRecordChange?.();
          }}
        />
      ))}

      {mealRecordsQuery.data && records.length > 0 && (
        <div className="flex flex-col items-center gap-2 py-2">
          <p className="text-xs text-slate-500">
            已显示 {records.length} / {total} 条
          </p>
          {hasMore && (
            <SecondaryButton
              type="button"
              className="w-full"
              onClick={() => setPage((value) => value + 1)}
              disabled={mealRecordsQuery.isFetching}
            >
              {mealRecordsQuery.isFetching ? "加载中…" : "加载更多"}
            </SecondaryButton>
          )}
        </div>
      )}
    </section>
  );
}

function buildFrom(range: RangeValue) {
  if (range === "all") {
    return undefined;
  }
  const date = new Date();
  date.setDate(date.getDate() - Number(range));
  return date.toISOString();
}
