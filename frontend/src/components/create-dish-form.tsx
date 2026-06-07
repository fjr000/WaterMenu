import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useCreateDish } from "../hooks/use-dishes.ts";
import type { MealType } from "../api/types.ts";
import { Button, Input } from "./ui.tsx";
import { useState } from "react";

const mealOptions: { value: MealType; label: string }[] = [
  { value: "BREAKFAST", label: "早餐" },
  { value: "LUNCH", label: "午餐" },
  { value: "DINNER", label: "晚餐" },
  { value: "SNACK", label: "加餐" },
];

const schema = z.object({
  name: z.string().min(1, "请输入菜品名称"),
  description: z.string().optional(),
});

type FormValues = z.infer<typeof schema>;

export function CreateDishForm({ onSuccess }: { onSuccess: () => void }) {
  const createDish = useCreateDish();
  const [selectedMeals, setSelectedMeals] = useState<MealType[]>([
    "LUNCH",
    "DINNER",
  ]);
  const [mealError, setMealError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
    reset,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const toggleMeal = (mt: MealType) => {
    setSelectedMeals((prev) =>
      prev.includes(mt) ? prev.filter((m) => m !== mt) : [...prev, mt],
    );
  };

  const onSubmit = handleSubmit((values) => {
    if (selectedMeals.length === 0) {
      setMealError("请至少选择一个餐次");
      return;
    }
    setMealError(null);
    createDish.mutate(
      {
        name: values.name,
        description: values.description || undefined,
        mealTypes: selectedMeals,
      },
      {
        onSuccess: () => {
          reset();
          setSelectedMeals(["LUNCH", "DINNER"]);
          onSuccess();
        },
      },
    );
  });

  return (
    <form onSubmit={onSubmit} className="flex flex-col gap-3">
      <div>
        <label
          htmlFor="dish-name"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          菜品名称
        </label>
        <Input
          id="dish-name"
          placeholder="例如：番茄炒蛋"
          {...register("name")}
        />
        {errors.name && (
          <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor="dish-desc"
          className="mb-1 block text-sm font-medium text-slate-700"
        >
          简介（可选）
        </label>
        <Input
          id="dish-desc"
          placeholder="例如：少油版"
          {...register("description")}
        />
      </div>

      <div>
        <p className="mb-1.5 text-sm font-medium text-slate-700">适用餐次</p>
        <div className="flex flex-wrap gap-2">
          {mealOptions.map((opt) => (
            <button
              key={opt.value}
              type="button"
              onClick={() => toggleMeal(opt.value)}
              className={`rounded-full border px-3 py-1.5 text-xs font-medium transition ${
                selectedMeals.includes(opt.value)
                  ? "border-slate-900 bg-slate-900 text-white"
                  : "border-slate-300 bg-white text-slate-600 hover:border-slate-400"
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

      {createDish.isError && (
        <p className="rounded-lg bg-red-50 p-2.5 text-center text-sm text-red-700">
          创建失败，可能是菜品名称重复
        </p>
      )}

      <Button type="submit" disabled={createDish.isPending}>
        {createDish.isPending ? "创建中…" : "创建菜品"}
      </Button>
    </form>
  );
}
