import type { Dish, RecommendationCandidate } from "../api/types.ts";
import { Modal } from "./modal.tsx";
import { MealTag } from "./meal-tag.tsx";
import { Button, SecondaryButton } from "./ui.tsx";

interface BlindBoxResultModalProps {
  isOpen: boolean;
  onClose: () => void;
  candidate: RecommendationCandidate | null;
  onRecordDish: (dish: Dish) => void;
  onViewRecipe: (dish: Dish) => void;
}

export function BlindBoxResultModal({
  isOpen,
  onClose,
  candidate,
  onRecordDish,
  onViewRecipe,
}: BlindBoxResultModalProps) {
  if (!candidate) return null;

  const { dish, reasons } = candidate;

  const handleRecordDish = () => {
    onRecordDish(dish);
    onClose();
  };

  const handleViewRecipe = () => {
    onViewRecipe(dish);
    onClose();
  };

  return (
    <Modal isOpen={isOpen} onClose={onClose} title="🎲 盲盒结果" size="md">
      <div className="rounded-2xl border-2 border-amber-300 bg-gradient-to-br from-amber-50 via-orange-50 to-red-50 p-6 shadow-[0_14px_32px_rgba(217,147,31,0.18)]">
        {/* 菜品名 */}
        <h3 className="font-serif text-2xl font-bold text-slate-900">
          {dish.name}
        </h3>

        {/* 封面图 */}
        {dish.coverImage ? (
          <div className="mt-4">
            <img
              src={dish.coverImage.fileUrl}
              alt={`${dish.name}封面`}
              className="w-full rounded-2xl border-2 border-white object-cover shadow-[0_10px_24px_rgba(111,82,56,0.16)]"
              style={{ maxHeight: "300px", objectFit: "cover" }}
            />
          </div>
        ) : (
          <div className="mt-4 flex h-48 items-center justify-center rounded-2xl border-2 border-dashed border-amber-300/60 bg-white/40">
            <span className="text-6xl opacity-40">🍽️</span>
          </div>
        )}

        {/* 简介 */}
        {dish.description && (
          <p className="mt-4 text-sm leading-relaxed text-slate-600">
            {dish.description}
          </p>
        )}

        {/* 餐次标签 */}
        <div className="mt-4 flex flex-wrap gap-1.5">
          {dish.mealTypes.map((mt) => (
            <MealTag key={mt} mealType={mt} />
          ))}
        </div>

        {/* 推荐理由 */}
        {reasons.length > 0 && (
          <div className="mt-4 flex flex-wrap gap-1.5">
            {reasons.map((reason, i) => (
              <span
                key={i}
                className="rounded-full border border-emerald-200/80 bg-emerald-50/90 px-2.5 py-1 text-xs font-medium text-emerald-700"
              >
                {reason}
              </span>
            ))}
          </div>
        )}

        {/* 操作按钮 */}
        <div className="mt-6 flex gap-3">
          <SecondaryButton
            className="flex-1 px-4 py-3 text-sm"
            onClick={handleViewRecipe}
          >
            查看做法
          </SecondaryButton>
          <Button
            className="flex-1 px-4 py-3 text-sm shadow-[0_4px_0_rgba(111,82,56,0.16)]"
            onClick={handleRecordDish}
          >
            记录已吃
          </Button>
        </div>
      </div>
    </Modal>
  );
}
