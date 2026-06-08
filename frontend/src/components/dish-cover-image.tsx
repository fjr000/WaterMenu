import type { Dish } from "../api/types.ts";

export function DishCoverImage({ dish }: { dish: Dish }) {
  if (!dish.coverImage) {
    return null;
  }

  return (
    <img
      src={dish.coverImage.fileUrl}
      alt={`${dish.name}封面`}
      className="h-20 w-20 shrink-0 rounded-2xl border border-white object-cover shadow-sm"
      loading="lazy"
    />
  );
}
