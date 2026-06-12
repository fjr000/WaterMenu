import type { DishVariantType } from "../api/types";

export const variantTypeOptions: { value: DishVariantType; label: string }[] = [
  { value: "HOME_RECIPE", label: "自家做法" },
  { value: "TAKEOUT", label: "外卖" },
  { value: "DINE_IN", label: "到店" },
  { value: "OTHER", label: "其他" },
];

export const variantTypeLabels: Record<DishVariantType, string> = {
  HOME_RECIPE: "自家做法",
  TAKEOUT: "外卖",
  DINE_IN: "到店",
  OTHER: "其他",
};
