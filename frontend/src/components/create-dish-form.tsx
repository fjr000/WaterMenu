import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateDish, useUpdateDish } from "../hooks/use-dishes.ts";
import type { Dish, MealType } from "../api/types.ts";
import { Button, Input, SecondaryButton } from "./ui.tsx";

const mealOptions: { value: MealType; label: string }[] = [
  { value: "BREAKFAST", label: "早餐" },
  { value: "LUNCH", label: "午餐" },
  { value: "DINNER", label: "晚餐" },
  { value: "SNACK", label: "加餐" },
];

const schema = z.object({
  name: z.string().trim().min(1, "请输入菜品名称"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

interface DishFormProps {
  defaultValues?: FormValues;
  defaultMealTypes?: MealType[];
  idPrefix: string;
  submitLabel: string;
  pendingLabel: string;
  errorMessage: string;
  isPending: boolean;
  isError: boolean;
  onCancel?: () => void;
  allowEmptyDescription?: boolean;
  onSubmit: (values: {
    name: string;
    description?: string;
    mealTypes: MealType[];
  }) => void;
}

function DishForm({
  defaultValues,
  defaultMealTypes = ["LUNCH", "DINNER"],
  idPrefix,
  submitLabel,
  pendingLabel,
  errorMessage,
  isPending,
  isError,
  onCancel,
  allowEmptyDescription = false,
  onSubmit,
}: DishFormProps) {
  const [selectedMeals, setSelectedMeals] =
    useState<MealType[]>(defaultMealTypes);
  const [mealError, setMealError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues,
  });

  const toggleMeal = (mt: MealType) => {
    setSelectedMeals((prev) =>
      prev.includes(mt) ? prev.filter((m) => m !== mt) : [...prev, mt],
    );
  };

  const submit = handleSubmit((values) => {
    if (selectedMeals.length === 0) {
      setMealError("请至少选择一个餐次");
      return;
    }
    setMealError(null);

    const description = values.description?.trim() ?? "";
    onSubmit({
      name: values.name.trim(),
      description: allowEmptyDescription ? description : description || undefined,
      mealTypes: selectedMeals,
    });
  });

  const handleReset = () => {
    reset();
    setSelectedMeals(defaultMealTypes);
    setMealError(null);
  };

  return (
    <form onSubmit={submit} className="flex flex-col gap-3">
      <div>
        <label
          htmlFor={`${idPrefix}-name`}
          className="mb-1 block text-sm font-semibold text-slate-700"
        >
          菜品名称
        </label>
        <Input
          id={`${idPrefix}-name`}
          placeholder="例如：番茄炒蛋"
          {...register("name")}
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor={`${idPrefix}-desc`}
          className="mb-1 block text-sm font-semibold text-slate-700"
        >
          简介（可选）
        </label>
        <Input
          id={`${idPrefix}-desc`}
          placeholder="例如：少油版"
          {...register("description")}
        />
      </div>

      <div>
        <p className="mb-1.5 text-sm font-semibold text-slate-700">适用餐次</p>
        <div className="flex flex-wrap gap-2">
          {mealOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleMeal(opt.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
                selectedMeals.includes(opt.value)
                  ? "border-red-600 bg-red-500 text-white"
                  : "border-slate-300 bg-white/85 text-slate-600 hover:border-red-200 hover:bg-red-50"
              }`}
            >
              {opt.label}
            </button>
          ))}
        </div>
        {mealError && (
          <p className="mt-1 text-xs text-red-600">{mealError}</p>
        )}
      </div>

      {isError && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-center text-sm text-red-700">
          {errorMessage}
        </p>
      )}

      <div className="flex gap-2">
        {onCancel && (
          <SecondaryButton
            type="button"
            className="flex-1"
            onClick={() => {
              handleReset();
              onCancel();
            }}
          >
            取消
          </SecondaryButton>
        )}
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending ? pendingLabel : submitLabel}
        </Button>
      </div>
    </form>
  );
}

export function CreateDishForm({ onSuccess }: { onSuccess: () => void }) {
  const createDish = useCreateDish();

  return (
    <DishForm
      idPrefix="dish-create"
      submitLabel="创建菜品"
      pendingLabel="创建中…"
      errorMessage="创建失败，可能是菜品名称重复"
      isPending={createDish.isPending}
      isError={createDish.isError}
      onSubmit={(values) => {
        createDish.mutate(values, {
          onSuccess,
        });
      }}
    />
  );
}

export function EditDishForm({
  dish,
  onCancel,
  onSuccess,
}: {
  dish: Dish;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const updateDish = useUpdateDish();

  return (
    <DishForm
      idPrefix={`dish-edit-${dish.id}`}
      defaultValues={{
        name: dish.name,
        description: dish.description ?? "",
      }}
      defaultMealTypes={dish.mealTypes}
      submitLabel="保存修改"
      pendingLabel="保存中…"
      errorMessage="保存失败，可能是菜品名称重复"
      isPending={updateDish.isPending}
      isError={updateDish.isError}
      onCancel={onCancel}
      allowEmptyDescription
      onSubmit={(values) => {
        updateDish.mutate(
          {
            id: dish.id,
            body: values,
          },
          {
            onSuccess,
          },
        );
      }}
    />
  );
}
