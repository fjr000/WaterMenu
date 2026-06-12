import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Dish, MealType } from "../api/types.ts";
import { useDishVariants } from "../hooks/use-dish-variants.ts";
import { useCreateMealRecord } from "../hooks/use-meal-records.ts";
import { mealLabel } from "./meal-tag.tsx";
import { Button, Card, ErrorBanner, Input, SecondaryButton, Select, Spinner } from "./ui.tsx";

interface Props {
  dish: Dish;
  defaultMealType?: MealType | "";
  onCancel: () => void;
  onSuccess: () => void;
}

const schema = z.object({
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
  variantId: z.string().optional(),
  eatenAt: z
    .string()
    .min(1, "请选择用餐时间")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "请选择有效的用餐时间",
    }),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

function toLocalInputValue(date: Date) {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

export function MealRecordForm({
  dish,
  defaultMealType,
  onCancel,
  onSuccess,
}: Props) {
  const createMealRecord = useCreateMealRecord();
  const variantsQuery = useDishVariants(dish.id);
  const activeVariants = useMemo(
    () => (variantsQuery.data ?? []).filter((variant) => variant.isActive),
    [variantsQuery.data],
  );
  const initialMealType = useMemo<MealType>(
    () => pickInitialMealType(dish.mealTypes, defaultMealType),
    [defaultMealType, dish.mealTypes],
  );
  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      mealType: initialMealType,
      variantId: "",
      eatenAt: toLocalInputValue(new Date()),
      note: "",
    },
  });

  const submit = handleSubmit((values) => {
    const selectedVariant = activeVariants.find(
      (variant) => variant.id === values.variantId,
    );
    const trimmedNote = values.note?.trim();

    createMealRecord.mutate(
      {
        dishId: dish.id,
        variantId: selectedVariant?.id ?? undefined,
        mealType: values.mealType,
        eatenAt: new Date(values.eatenAt).toISOString(),
        note: trimmedNote || undefined,
      },
      { onSuccess },
    );
  });

  return (
    <Card className="border-red-200 bg-red-50/45">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div>
          <p className="font-serif text-lg font-semibold text-slate-900">记录已吃</p>
          <p className="mt-0.5 text-sm text-slate-500">{dish.name}</p>
        </div>

        <div>
          <label
            htmlFor="meal-record-type"
            className="mb-1 block text-sm font-semibold text-slate-700"
          >
            餐次
          </label>
          <Select id="meal-record-type" {...register("mealType")}>
            {dish.mealTypes.map((mt) => (
              <option key={mt} value={mt}>
                {mealLabel(mt)}
              </option>
            ))}
          </Select>
          {errors.mealType && (
            <p className="mt-1 text-xs text-red-600">
              {errors.mealType.message}
            </p>
          )}
        </div>

        {variantsQuery.isLoading && <Spinner />}

        {variantsQuery.isError && (
          <ErrorBanner
            message="加载版本失败"
            onRetry={() => void variantsQuery.refetch()}
          />
        )}

        <div>
          <label
            htmlFor="meal-record-variant"
            className="mb-1 block text-sm font-semibold text-slate-700"
          >
            版本 / 来源（可选）
          </label>
          <Select
            id="meal-record-variant"
            {...register("variantId")}
            disabled={variantsQuery.isLoading || variantsQuery.isError}
          >
            <option value="">主菜品</option>
            {activeVariants.map((variant) => (
              <option key={variant.id} value={variant.id}>
                {variant.name}
              </option>
            ))}
          </Select>
        </div>

        <div>
          <label
            htmlFor="meal-record-eaten-at"
            className="mb-1 block text-sm font-semibold text-slate-700"
          >
            用餐时间
          </label>
          <Input
            id="meal-record-eaten-at"
            type="datetime-local"
            required
            {...register("eatenAt")}
          />
          {errors.eatenAt && (
            <p className="mt-1 text-xs text-red-600">
              {errors.eatenAt.message}
            </p>
          )}
        </div>

        <div>
          <label
            htmlFor="meal-record-note"
            className="mb-1 block text-sm font-semibold text-slate-700"
          >
            备注（可选）
          </label>
          <Input
            id="meal-record-note"
            placeholder="例如：少油、分量刚好"
            {...register("note")}
          />
        </div>

        {createMealRecord.isError && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-center text-sm text-red-700">
            记录失败，请重试
          </p>
        )}

        <div className="flex gap-2">
          <SecondaryButton
            type="button"
            className="flex-1"
            onClick={onCancel}
            disabled={createMealRecord.isPending}
          >
            取消
          </SecondaryButton>
          <Button
            type="submit"
            className="flex-1"
            disabled={createMealRecord.isPending}
          >
            {createMealRecord.isPending ? "记录中…" : "确认记录"}
          </Button>
        </div>
      </form>
    </Card>
  );
}

function pickInitialMealType(
  mealTypes: MealType[],
  defaultMealType?: MealType | "",
): MealType {
  if (defaultMealType && mealTypes.includes(defaultMealType)) {
    return defaultMealType;
  }

  return mealTypes[0] ?? "LUNCH";
}
