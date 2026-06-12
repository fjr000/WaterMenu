import type { Dish } from "../api/types.ts";

export function DishCoverImage({ dish }: { dish: Dish }) {
  if (!dish.coverImage) {
    return null;
  }

  return (
    <img
      src={dish.coverImage.fileUrl}
      alt={`${dish.name}封面`}
      className="h-20 w-20 shrink-0 rounded-2xl border border-white/80 object-cover shadow-[0_10px_20px_rgba(111,82,56,0.15)]"
      loading="lazy"
    />
  );
}
