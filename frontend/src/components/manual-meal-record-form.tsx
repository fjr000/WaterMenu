import { zodResolver } from "@hookform/resolvers/zod";
import { useMemo, useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { MealType } from "../api/types.ts";
import { useCreateMealRecord } from "../hooks/use-meal-records.ts";
import { useDishVariants } from "../hooks/use-dish-variants.ts";
import { DishAutocomplete } from "./dish-autocomplete.tsx";
import { mealLabel } from "./meal-tag.tsx";
import { Button, Card, Input, SecondaryButton, Select } from "./ui.tsx";
import { toLocalInputValue } from "../utils/date-formatting.ts";

const mealTypes: MealType[] = ["BREAKFAST", "LUNCH", "DINNER", "SNACK"];

const schema = z.object({
  dishId: z.string().min(1, "请选择菜品"),
  variantId: z.string().optional(),
  mealType: z.enum(["BREAKFAST", "LUNCH", "DINNER", "SNACK"]),
  eatenAt: z
    .string()
    .min(1, "请选择用餐时间")
    .refine((value) => !Number.isNaN(new Date(value).getTime()), {
      message: "请选择有效的用餐时间",
    }),
  note: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface Props {
  onCancel: () => void;
  onSuccess: () => void;
}

export function ManualMealRecordForm({
  onCancel,
  onSuccess,
}: Props) {
  const createMealRecord = useCreateMealRecord();
  const defaultValues = useMemo(buildDefaultValues, []);
  const [selectedDishId, setSelectedDishId] = useState<string>("");
  const dishVariantsQuery = useDishVariants(selectedDishId, !!selectedDishId);
  const activeVariants = dishVariantsQuery.data?.filter(v => v.isActive) ?? [];

  const {
    register,
    handleSubmit,
    formState: { errors },
    setValue,
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const dishIdValue = watch("dishId");

  const submit = handleSubmit((values) => {
    createMealRecord.mutate(
      {
        dishId: values.dishId,
        variantId: values.variantId || undefined,
        mealType: values.mealType,
        eatenAt: new Date(values.eatenAt).toISOString(),
        note: values.note?.trim() || undefined,
      },
      { onSuccess },
    );
  });

  return (
    <Card className="border-red-200 bg-red-50/45">
      <form onSubmit={submit} className="flex flex-col gap-3">
        <div>
          <p className="font-serif text-lg font-semibold text-slate-900">
            手动记录
          </p>
        </div>

        <div>
          <label
            htmlFor="manual-meal-record-dish"
            className="mb-1 block text-sm font-semibold text-slate-700"
          >
            菜品
          </label>
          <DishAutocomplete
            value={dishIdValue}
            onChange={(dishId) => {
              setValue("dishId", dishId, { shouldValidate: true });
              setSelectedDishId(dishId);
              setValue("variantId", "");
            }}
            error={errors.dishId?.message}
          />
        </div>

        {selectedDishId && activeVariants.length > 0 && (
          <div>
            <label
              htmlFor="manual-meal-record-variant"
              className="mb-1 block text-sm font-semibold text-slate-700"
            >
              版本（可选）
            </label>
            <Select
              id="manual-meal-record-variant"
              {...register("variantId")}
            >
              <option value="">无版本</option>
              {activeVariants.map((variant) => (
                <option key={variant.id} value={variant.id}>
                  {variant.name}
                </option>
              ))}
            </Select>
          </div>
        )}

        <div className="grid grid-cols-1 gap-2 sm:grid-cols-2">
          <div>
            <label
              htmlFor="manual-meal-record-type"
              className="mb-1 block text-sm font-semibold text-slate-700"
            >
              餐次
            </label>
            <Select id="manual-meal-record-type" {...register("mealType")}>
              {mealTypes.map((mealType) => (
                <option key={mealType} value={mealType}>
                  {mealLabel(mealType)}
                </option>
              ))}
            </Select>
            {errors.mealType && (
              <p className="mt-1 text-xs text-red-600">
                {errors.mealType.message}
              </p>
            )}
          </div>

          <div>
            <label
              htmlFor="manual-meal-record-eaten-at"
              className="mb-1 block text-sm font-semibold text-slate-700"
            >
              用餐时间
            </label>
            <Input
              id="manual-meal-record-eaten-at"
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
        </div>

        <div>
          <label
            htmlFor="manual-meal-record-note"
            className="mb-1 block text-sm font-semibold text-slate-700"
          >
            备注（可选）
          </label>
          <Input
            id="manual-meal-record-note"
            placeholder="例如：分量刚好"
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

function buildDefaultValues(): FormValues {
  const date = new Date();

  return {
    dishId: "",
    variantId: "",
    mealType: inferMealType(date),
    eatenAt: toLocalInputValue(date),
    note: "",
  };
}

function inferMealType(date: Date): MealType {
  const hour = date.getHours();

  if (hour >= 5 && hour < 11) {
    return "BREAKFAST";
  }

  if (hour >= 11 && hour < 15) {
    return "LUNCH";
  }

  if (hour >= 17 && hour < 21) {
    return "DINNER";
  }

  return "SNACK";
}
