import type { MealType } from "../api/types.ts";

const mealLabels: Record<MealType, string> = {
  BREAKFAST: "早餐",
  LUNCH: "午餐",
  DINNER: "晚餐",
  SNACK: "加餐",
};

export function mealLabel(mt: MealType): string {
  return mealLabels[mt] ?? mt;
}

export function MealTag({ mealType }: { mealType: MealType }) {
  return (
    <span className="rounded-full bg-slate-100 px-2 py-0.5 text-xs text-slate-600">
      {mealLabel(mealType)}
    </span>
  );
}
