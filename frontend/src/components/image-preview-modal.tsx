import { useEffect, useCallback } from "react";
import type { DishImage } from "../api/types.ts";
import { useSetDishImageCover, useDeleteDishImage } from "../hooks/use-dish-images.ts";
import { SecondaryButton } from "./ui.tsx";

interface ImagePreviewModalProps {
  dishId: string;
  image: DishImage;
  onClose: () => void;
}

export function ImagePreviewModal({
  dishId,
  image,
  onClose,
}: ImagePreviewModalProps) {
  const setCover = useSetDishImageCover(dishId);
  const deleteImage = useDeleteDishImage(dishId);

  const handleEscape = useCallback((event: KeyboardEvent) => {
    if (event.key === "Escape") {
      onClose();
    }
  }, [onClose]);

  useEffect(() => {
    document.addEventListener("keydown", handleEscape);
    document.body.style.overflow = "hidden";

    return () => {
      document.removeEventListener("keydown", handleEscape);
      document.body.style.overflow = "";
    };
  }, [handleEscape]);

  const handleSetCover = () => {
    setCover.mutate(image.id, {
      onSuccess: () => onClose(),
    });
  };

  const handleDelete = () => {
    deleteImage.mutate(image.id, {
      onSuccess: () => onClose(),
    });
  };

  return (
    <div
      className="fixed inset-0 z-50 flex items-center justify-center bg-[rgba(37,23,15,0.85)] p-4 animate-fade-in"
      onClick={onClose}
      role="dialog"
      aria-modal="true"
      aria-label="图片预览"
    >
      <div
        className="relative flex max-h-full w-full max-w-4xl flex-col gap-4"
        onClick={(e) => e.stopPropagation()}
      >
        <div className="relative flex items-center justify-center overflow-hidden rounded-2xl bg-slate-100">
          <img
            src={image.fileUrl}
            alt={image.isCover ? "菜品封面" : "菜品图片"}
            className="max-h-[70vh] w-auto max-w-full object-contain animate-scale-in"
          />
          {image.isCover && (
            <span className="absolute left-4 top-4 rounded-full bg-amber-500 px-3 py-1 text-sm font-semibold text-white">
              当前封面
            </span>
          )}
        </div>

        <div className="flex items-center justify-center gap-3 rounded-2xl border border-white/20 bg-white/90 p-3 shadow-lg backdrop-blur-sm">
          <SecondaryButton
            onClick={handleSetCover}
            disabled={image.isCover || setCover.isPending || deleteImage.isPending}
            className="flex-1"
          >
            {setCover.isPending ? "设置中…" : "设为封面"}
          </SecondaryButton>
          <button
            type="button"
            onClick={handleDelete}
            disabled={setCover.isPending || deleteImage.isPending}
            className="flex-1 rounded-xl border-2 border-red-200 bg-white/90 px-4 py-2.5 font-semibold text-red-600 transition hover:border-red-300 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50"
          >
            {deleteImage.isPending ? "删除中…" : "删除"}
          </button>
          <SecondaryButton
            onClick={onClose}
            disabled={setCover.isPending || deleteImage.isPending}
          >
            关闭
          </SecondaryButton>
        </div>

        {(setCover.isError || deleteImage.isError) && (
          <p className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-center text-sm text-red-700">
            操作失败，请重试
          </p>
        )}
      </div>
    </div>
  );
}
