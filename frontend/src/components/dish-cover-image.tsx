import { useState } from "react";
import type { Dish } from "../api/types.ts";

export function DishCoverImage({ dish }: { dish: Dish }) {
  const [loaded, setLoaded] = useState(false);

  if (!dish.coverImage) {
    return null;
  }

  return (
    <div className="relative h-20 w-20 shrink-0 overflow-hidden rounded-2xl border border-white/80 bg-slate-100 shadow-[0_10px_20px_rgba(111,82,56,0.15)]">
      {/* 加载占位符 */}
      {!loaded && (
        <div className="absolute inset-0 flex items-center justify-center">
          <span className="text-2xl opacity-40">🍽️</span>
        </div>
      )}

      {/* 实际图片 */}
      <img
        src={dish.coverImage.fileUrl}
        alt={`${dish.name}封面`}
        className={`h-full w-full object-cover transition-opacity duration-300 ${
          loaded ? "opacity-100" : "opacity-0"
        }`}
        loading="lazy"
        onLoad={() => setLoaded(true)}
        onError={() => setLoaded(false)}
      />
    </div>
  );
}
