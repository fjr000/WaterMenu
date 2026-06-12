import type { MealType } from "../api/types.ts";

const mealLabels: Record<MealType, string> = {
  BREAKFAST: "早餐",
  LUNCH: "午餐",
  DINNER: "晚餐",
  SNACK: "加餐",
};

export const mealTypeOptions: { value: MealType; label: string }[] = [
  { value: "BREAKFAST", label: "早餐" },
  { value: "LUNCH", label: "午餐" },
  { value: "DINNER", label: "晚餐" },
  { value: "SNACK", label: "加餐" },
];

export function mealLabel(mt: MealType): string {
  return mealLabels[mt] ?? mt;
}

export function MealTag({ mealType }: { mealType: MealType }) {
  return (
    <span className="rounded-full border border-slate-200/80 bg-amber-50/90 px-2.5 py-1 text-xs font-medium text-slate-600 backdrop-blur-sm">
      {mealLabel(mealType)}
    </span>
  );
}
