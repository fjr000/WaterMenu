import { useCallback, useRef, type ChangeEvent } from "react";
import type { DishImage } from "../api/types.ts";
import { useUploadDishImage } from "../hooks/use-dish-images.ts";
import { useImageUpload } from "../hooks/use-image-upload.ts";
import { CompressionOverlay } from "./compression-overlay.tsx";
import { CompressionPromptDialog } from "./compression-prompt-dialog.tsx";

const ACCEPTED_FORMATS = "image/jpeg,image/png,image/webp,image/heic,image/heif";

interface HorizontalImageGalleryProps {
  dishId: string;
  images: DishImage[];
  onImageClick: (image: DishImage) => void;
}

export function HorizontalImageGallery({
  dishId,
  images,
  onImageClick,
}: HorizontalImageGalleryProps) {
  const uploadImage = useUploadDishImage(dishId);
  const fileInputRef = useRef<HTMLInputElement>(null);

  const doUpload = useCallback(
    (file: File) => {
      uploadImage.mutate(file, {
        onSuccess: () => {
          if (fileInputRef.current) {
            fileInputRef.current.value = "";
          }
        },
      });
    },
    [uploadImage],
  );

  const {
    handleFile,
    compressing,
    compressionProgress,
    compressionError,
    prompt,
    confirmCompress,
    skipCompress,
    dismissPrompt,
  } = useImageUpload({ onUpload: doUpload });

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    const file = event.target.files?.[0];
    if (!file) return;
    handleFile(file);
  };

  const isBusy = compressing || uploadImage.isPending;

  return (
    <div className="mt-3">
      <div className="flex gap-3 overflow-x-auto pb-2 snap-x snap-mandatory">
        {images.map((image) => (
          <button
            key={image.id}
            type="button"
            onClick={() => onImageClick(image)}
            className="group relative shrink-0 snap-start overflow-hidden rounded-xl transition hover:scale-105"
          >
            <img
              src={image.fileUrl}
              alt={image.isCover ? "菜品封面" : "菜品图片"}
              className="h-24 w-24 object-cover sm:h-28 sm:w-28"
              loading="lazy"
            />
            {image.isCover && (
              <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
                封面
              </span>
            )}
          </button>
        ))}

        <button
          type="button"
          onClick={() => fileInputRef.current?.click()}
          disabled={isBusy}
          className="group relative flex h-24 w-24 shrink-0 snap-start items-center justify-center rounded-xl border-2 border-dashed border-slate-300 bg-white/80 transition hover:border-red-400 hover:bg-red-50 disabled:cursor-not-allowed disabled:opacity-50 sm:h-28 sm:w-28"
        >
          <div className="flex flex-col items-center gap-1">
            {compressing ? (
              <div className="h-5 w-5 animate-gentle-spin rounded-full border-2 border-amber-200 border-t-red-500" />
            ) : (
              <svg
                className="h-6 w-6 text-red-500"
                fill="none"
                stroke="currentColor"
                viewBox="0 0 24 24"
              >
                <path
                  strokeLinecap="round"
                  strokeLinejoin="round"
                  strokeWidth={2}
                  d="M12 4v16m8-8H4"
                />
              </svg>
            )}
            <span className="text-xs font-semibold text-red-500">
              {compressing
                ? "压缩中"
                : uploadImage.isPending
                  ? "上传中"
                  : "添加图片"}
            </span>
          </div>
          <input
            ref={fileInputRef}
            type="file"
            accept={ACCEPTED_FORMATS}
            onChange={handleFileChange}
            className="hidden"
          />
        </button>
      </div>

      {compressing && (
        <div className="mt-2">
          <CompressionOverlay progress={compressionProgress} />
        </div>
      )}

      {compressionError && (
        <p className="mt-2 text-xs text-red-600">{compressionError}</p>
      )}

      {uploadImage.isError && (
        <p className="mt-2 text-xs text-red-600">
          上传失败，请确认格式和大小后重试
        </p>
      )}

      {images.length === 0 && !isBusy && (
        <p className="text-center text-xs text-slate-400">
          支持 JPG、PNG、WebP、HEIC，最大 10MB
        </p>
      )}

      {prompt && (
        <CompressionPromptDialog
          prompt={prompt}
          onCompress={confirmCompress}
          onSkip={skipCompress}
          onDismiss={dismissPrompt}
        />
      )}
    </div>
  );
}
