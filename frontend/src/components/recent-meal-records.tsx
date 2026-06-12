import { useEffect, useMemo, useState, type FormEvent } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { useQueries } from "@tanstack/react-query";
import type { DishImage, FeedbackRating, MealRecord } from "../api/types.ts";
import {
  useDeleteMealRecord,
  useMealRecords,
  useUpdateMealRecord,
  useUpsertFeedback,
} from "../hooks/use-meal-records.ts";
import { useDishImages, dishImagesKey } from "../hooks/use-dish-images.ts";
import { mealLabel, mealTypeOptions } from "./meal-tag.tsx";
import { HorizontalImageGallery } from "./horizontal-image-gallery.tsx";
import { ImagePreviewModal } from "./image-preview-modal.tsx";
import { InlineVariantPanel } from "./inline-variant-panel.tsx";
import { ratingOptions } from "../constants/feedback-ratings.ts";
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
import { apiFetch } from "../api/client.ts";
import { toLocalInputValue, formatShortDate } from "../utils/date-formatting.ts";

const editSchema = z.object({
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
  eatenAt: z
    .string()
    .min(1, "请选择用餐时间")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "请选择有效的用餐时间",
    }),
  note: z.string().optional(),
});

type EditFormValues = z.infer<typeof editSchema>;

export function RecentMealRecords({
  userId,
  onRecordChange,
}: {
  userId: string;
  onRecordChange?: () => void;
}) {
  const mealRecordsQuery = useMealRecords({ page: 1, pageSize: 5 });
  const records = mealRecordsQuery.data?.items ?? [];

  // Extract unique dish IDs and prefetch images to avoid N+1 queries
  const uniqueDishIds = useMemo(
    () => [...new Set(records.map((r) => r.dishId))],
    [records]
  );

  // Prefetch all dish images in parallel using React Query's useQueries
  useQueries({
    queries: uniqueDishIds.map((dishId) => ({
      queryKey: dishImagesKey(dishId),
      queryFn: () => apiFetch<DishImage[]>(`/dishes/${dishId}/images`),
      staleTime: 60000,
    })),
  });

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
          onRecordChange={onRecordChange}
        />
      ))}
    </section>
  );
}

type CardMode = 'view' | 'editing' | 'variants' | 'delete-confirm' | 'note';

export function MealRecordCard({
  record,
  userId,
  onRecordChange,
}: {
  record: MealRecord;
  userId: string;
  onRecordChange?: () => void;
}) {
  const upsertFeedback = useUpsertFeedback();
  const deleteMealRecord = useDeleteMealRecord();
  const dishImagesQuery = useDishImages(record.dishId);
  const dishImages = dishImagesQuery.data ?? [];

  const serverFeedback = record.feedbacks.find(
    (feedback) => feedback.userId === userId,
  );
  const [currentFeedback, setCurrentFeedback] = useState(serverFeedback);
  const [mode, setMode] = useState<CardMode>('view');
  const [selectedImage, setSelectedImage] = useState<DishImage | null>(null);
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
          onRecordChange?.();
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
          setMode('view');
          onRecordChange?.();
        },
      },
    );
  };

  const handleDelete = () => {
    deleteMealRecord.mutate(record.id, {
      onSuccess: () => {
        setMode('view');
        onRecordChange?.();
      },
    });
  };

  return (
    <Card>
      <div className="flex items-start justify-between gap-2">
        <div className="min-w-0">
          <p className="truncate font-serif text-lg font-semibold text-slate-900">
            {getMealRecordDisplayTitle(record)}
          </p>
          <p className="mt-0.5 text-xs text-slate-500">
            {mealLabel(record.mealType)} · {formatShortDate(record.eatenAt)}
          </p>
          {record.note && (
            <p className="mt-1 text-xs text-slate-500">备注：{record.note}</p>
          )}
        </div>
        <div className="flex shrink-0 flex-col items-end gap-2">
          <div className="flex gap-1">
            <button
              type="button"
              className="rounded-full border border-slate-200 bg-white/80 px-2.5 py-1 text-xs font-semibold text-slate-600 transition hover:border-amber-200 hover:bg-amber-50 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => setMode(mode === 'editing' ? 'view' : 'editing')}
              disabled={deleteMealRecord.isPending}
            >
              {mode === 'editing' ? "收起" : "编辑"}
            </button>
            <button
              type="button"
              className="rounded-full border border-red-100 bg-red-50/80 px-2.5 py-1 text-xs font-semibold text-red-600 transition hover:border-red-200 hover:bg-red-100 disabled:cursor-not-allowed disabled:opacity-50"
              onClick={() => setMode('delete-confirm')}
              disabled={deleteMealRecord.isPending}
            >
              删除
            </button>
          </div>
        </div>
      </div>

      <HorizontalImageGallery
        dishId={record.dishId}
        images={dishImages}
        onImageClick={(image) => setSelectedImage(image)}
      />

      {mode === 'editing' && (
        <div className="mt-3 rounded-2xl border border-amber-100 bg-amber-50/55 p-3">
          <EditMealRecordForm
            key={`${record.id}-${record.updatedAt}`}
            record={record}
            onCancel={() => setMode('view')}
            onSuccess={() => {
              setMode('view');
              onRecordChange?.();
            }}
          />
        </div>
      )}

      {mode === 'variants' && (
        <InlineVariantPanel
          dishId={record.dishId}
          dishName={record.dish.name}
        />
      )}

      {mode === 'delete-confirm' && (
        <div className="mt-3 rounded-2xl border border-red-200 bg-red-50 p-3">
          <p className="text-sm font-semibold text-red-700">确认删除这条用餐记录？</p>
          <p className="mt-1 text-xs leading-5 text-red-600">
            删除后对应反馈也会一起移除，无法恢复。
          </p>
          <div className="mt-3 flex gap-2">
            <SecondaryButton
              type="button"
              className="flex-1 px-3 py-1.5 text-xs"
              onClick={() => setMode('view')}
              disabled={deleteMealRecord.isPending}
            >
              取消
            </SecondaryButton>
            <Button
              type="button"
              className="flex-1 px-3 py-1.5 text-xs"
              onClick={handleDelete}
              disabled={deleteMealRecord.isPending}
            >
              {deleteMealRecord.isPending ? "删除中…" : "确认删除"}
            </Button>
          </div>
          {deleteMealRecord.isError && (
            <p className="mt-2 text-center text-xs text-red-700">
              删除失败，请重试
            </p>
          )}
        </div>
      )}

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

      {currentFeedback?.note && mode !== 'note' && (
        <p className="mt-2 text-xs text-slate-500">
          反馈备注：{currentFeedback.note}
        </p>
      )}

      <div className="mt-3 flex gap-2">
        <button
          type="button"
          className="text-xs font-semibold text-slate-600 underline underline-offset-4 disabled:cursor-not-allowed disabled:opacity-50"
          onClick={() => {
            setNote(currentFeedback?.note ?? "");
            setMode(mode === 'note' ? 'view' : 'note');
          }}
          disabled={!currentFeedback || upsertFeedback.isPending}
        >
          {mode === 'note' ? "收起备注" : "添加反馈备注"}
        </button>
        <button
          type="button"
          className="text-xs font-semibold text-slate-600 underline underline-offset-4"
          onClick={() => setMode(mode === 'variants' ? 'view' : 'variants')}
        >
          {mode === 'variants' ? "收起" : "管理版本"}
        </button>
      </div>

      {mode === 'note' && currentFeedback && (
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
              onClick={() => setMode('view')}
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

      {selectedImage && (
        <ImagePreviewModal
          dishId={record.dishId}
          image={selectedImage}
          onClose={() => setSelectedImage(null)}
        />
      )}
    </Card>
  );
}

function EditMealRecordForm({
  record,
  onCancel,
  onSuccess,
}: {
  record: MealRecord;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const updateMealRecord = useUpdateMealRecord();
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<EditFormValues>({
    resolver: zodResolver(editSchema),
    defaultValues: {
      mealType: record.mealType,
      eatenAt: toLocalInputValue(new Date(record.eatenAt)),
      note: record.note ?? "",
    },
  });

  const submit = handleSubmit((values) => {
    const trimmedNote = values.note?.trim();

    updateMealRecord.mutate(
      {
        id: record.id,
        body: {
          mealType: values.mealType,
          eatenAt: new Date(values.eatenAt).toISOString(),
          note: trimmedNote || null,
        },
      },
      { onSuccess },
    );
  });

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
        <div>
          <label
            htmlFor={`meal-record-meal-type-${record.id}`}
            className="mb-1 block text-sm font-semibold text-slate-700"
          >
            餐次
          </label>
          <Select
            id={`meal-record-meal-type-${record.id}`}
            {...register("mealType")}
          >
            {mealTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label
            htmlFor={`meal-record-eaten-at-${record.id}`}
            className="mb-1 block text-sm font-semibold text-slate-700"
          >
            用餐时间
          </label>
          <Input
            id={`meal-record-eaten-at-${record.id}`}
            type="datetime-local"
            {...register("eatenAt")}
          />
          {errors.eatenAt && (
            <p className="mt-1 text-xs text-red-600">
              {errors.eatenAt.message}
            </p>
          )}
        </div>
      </div>

      <div>
        <label
          htmlFor={`meal-record-note-${record.id}`}
          className="mb-1 block text-sm font-semibold text-slate-700"
        >
          备注（可选）
        </label>
        <Input id={`meal-record-note-${record.id}`} {...register("note")} />
      </div>

      {updateMealRecord.isError && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-2 text-center text-xs text-red-700">
          保存失败，请重试
        </p>
      )}

      <div className="flex gap-2">
        <SecondaryButton
          type="button"
          className="flex-1 px-3 py-1.5 text-xs"
          onClick={onCancel}
          disabled={updateMealRecord.isPending}
        >
          取消
        </SecondaryButton>
        <Button
          type="submit"
          className="flex-1 px-3 py-1.5 text-xs"
          disabled={updateMealRecord.isPending}
        >
          {updateMealRecord.isPending ? "保存中…" : "保存"}
        </Button>
      </div>
    </form>
  );
}

function getMealRecordDisplayTitle(record: MealRecord) {
  if (record.variant?.name) {
    return `${record.dish.name} · ${record.variant.name}`;
  }

  return record.dish.name;
}
