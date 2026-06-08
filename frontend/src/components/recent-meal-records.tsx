import { useEffect, useState, type FormEvent } from "react";
import type { FeedbackRating, MealRecord } from "../api/types.ts";
import {
  useMealRecords,
  useUpsertFeedback,
} from "../hooks/use-meal-records.ts";
import { mealLabel } from "./meal-tag.tsx";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Input,
  SecondaryButton,
  Spinner,
} from "./ui.tsx";

const ratingOptions: { value: FeedbackRating; label: string }[] = [
  { value: "GOOD", label: "好吃" },
  { value: "OK", label: "一般" },
  { value: "BAD", label: "不好吃" },
];

export function RecentMealRecords({
  userId,
  onFeedbackSuccess,
}: {
  userId: string;
  onFeedbackSuccess?: () => void;
}) {
  const mealRecordsQuery = useMealRecords({ page: 1, pageSize: 5 });
  const records = mealRecordsQuery.data?.items ?? [];

  return (
    <section className="mt-6 flex flex-col gap-3">
      <div className="flex items-center justify-between">
        <h2 className="font-serif text-lg font-semibold text-slate-900">最近用餐</h2>
        <span className="rounded-full bg-white/60 px-2 py-1 text-xs text-slate-500">最近 5 条</span>
      </div>

      {mealRecordsQuery.isLoading && <Spinner />}

      {mealRecordsQuery.isError && (
        <ErrorBanner
          message="加载最近用餐失败"
          onRetry={() => void mealRecordsQuery.refetch()}
        />
      )}

      {mealRecordsQuery.data && records.length === 0 && (
        <EmptyState
          icon="🍽️"
          title="还没有用餐记录"
          description="从推荐结果或菜品列表里点击“记录已吃”开始记录"
        />
      )}

      {records.map((record) => (
        <MealRecordCard
          key={record.id}
          record={record}
          userId={userId}
          onFeedbackSuccess={onFeedbackSuccess}
        />
      ))}
    </section>
  );
}

export function MealRecordCard({
  record,
  userId,
  onFeedbackSuccess,
}: {
  record: MealRecord;
  userId: string;
  onFeedbackSuccess?: () => void;
}) {
  const upsertFeedback = useUpsertFeedback();
  const serverFeedback = record.feedbacks.find(
    (feedback) => feedback.userId === userId,
  );
  const [currentFeedback, setCurrentFeedback] = useState(serverFeedback);
  const [showNote, setShowNote] = useState(false);
  const [note, setNote] = useState(serverFeedback?.note ?? "");
  const [selectedRating, setSelectedRating] = useState<
    FeedbackRating | undefined
  >(serverFeedback?.rating);

  useEffect(() => {
    setCurrentFeedback(serverFeedback);
    setSelectedRating(serverFeedback?.rating);
  }, [serverFeedback]);

  const submitRating = (rating: FeedbackRating) => {
    setSelectedRating(rating);
    upsertFeedback.mutate(
      {
        mealRecordId: record.id,
        rating,
        note: currentFeedback?.note || undefined,
      },
      {
        onSuccess: (feedback) => {
          setCurrentFeedback(feedback);
          onFeedbackSuccess?.();
        },
        onError: () => setSelectedRating(currentFeedback?.rating),
      },
    );
  };

  const submitNote = (event: FormEvent<HTMLFormElement>) => {
    event.preventDefault();
    if (!currentFeedback) {
      return;
    }
    upsertFeedback.mutate(
      {
        mealRecordId: record.id,
        rating: currentFeedback.rating,
        note: note.trim() || undefined,
      },
      {
        onSuccess: (feedback) => {
          setCurrentFeedback(feedback);
          setShowNote(false);
          onFeedbackSuccess?.();
        },
      },
    );
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-serif text-lg font-semibold text-slate-900">
            {record.title}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {mealLabel(record.mealType)} · {formatDate(record.eatenAt)}
          </p>
          {record.note && (
            <p className="mt-1 text-xs text-slate-500">备注：{record.note}</p>
          )}
        </div>
        {record.dishId && (
          <span className="shrink-0 rounded-full border border-emerald-100 bg-emerald-50 px-2 py-0.5 text-xs font-medium text-emerald-700">
            已关联菜品
          </span>
        )}
      </div>

      <div className="mt-3 flex flex-wrap gap-2">
        {ratingOptions.map((option) => {
          const active = selectedRating === option.value;
          return (
            <button
              key={option.value}
              type="button"
              onClick={() => submitRating(option.value)}
              disabled={upsertFeedback.isPending}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition disabled:cursor-not-allowed disabled:opacity-50 ${
                active
                  ? "border-red-600 bg-red-500 text-white"
                  : "border-slate-300 bg-white/85 text-slate-600 hover:border-red-200 hover:bg-red-50"
              }`}
            >
              {option.label}
            </button>
          );
        })}
      </div>

      {currentFeedback?.note && !showNote && (
        <p className="mt-2 text-xs text-slate-500">
          反馈备注：{currentFeedback.note}
        </p>
      )}

      <div className="mt-3">
        <button
          type="button"
          className="text-xs font-semibold text-slate-600 underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            setNote(currentFeedback?.note ?? "");
            setShowNote((value) => !value);
          }}
          disabled={!currentFeedback || upsertFeedback.isPending}
        >
          {showNote ? "收起备注" : "添加反馈备注"}
        </button>
      </div>

      {showNote && currentFeedback && (
        <form onSubmit={submitNote} className="mt-3 flex flex-col gap-2">
          <Input
            value={note}
            onChange={(event) => setNote(event.target.value)}
            placeholder="例如：下次还想吃、味道偏淡"
          />
          <div className="flex gap-2">
            <SecondaryButton
              type="button"
              className="flex-1 px-3 py-1.5 text-xs"
              onClick={() => setShowNote(false)}
              disabled={upsertFeedback.isPending}
            >
              取消
            </SecondaryButton>
            <Button
              type="submit"
              className="flex-1 px-3 py-1.5 text-xs"
              disabled={upsertFeedback.isPending}
            >
              {upsertFeedback.isPending ? "提交中…" : "提交备注"}
            </Button>
          </div>
        </form>
      )}

      {upsertFeedback.isError && (
        <p className="mt-2 rounded-xl border border-red-200 bg-red-50 p-2 text-center text-xs text-red-700">
          反馈提交失败，请重试
        </p>
      )}
    </Card>
  );
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
