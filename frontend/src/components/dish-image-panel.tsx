import { useCallback, useRef, type ChangeEvent } from "react";
import type { Dish, DishImage } from "../api/types.ts";
import {
  useDeleteDishImage,
  useDishImages,
  useSetDishImageCover,
  useUploadDishImage,
} from "../hooks/use-dish-images.ts";
import { useImageUpload } from "../hooks/use-image-upload.ts";
import { CompressionOverlay } from "./compression-overlay.tsx";
import { CompressionPromptDialog } from "./compression-prompt-dialog.tsx";
import {
  Button,
  EmptyState,
  ErrorBanner,
  SecondaryButton,
  Spinner,
} from "./ui.tsx";
import { Modal } from "./modal.tsx";

const ACCEPTED_FORMATS = "image/jpeg,image/png,image/webp,image/heic,image/heif";

interface Props {
  dish: Dish;
  onClose: () => void;
}

export function DishImagePanel({ dish, onClose }: Props) {
  const imagesQuery = useDishImages(dish.id);
  const uploadImage = useUploadDishImage(dish.id);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const doUpload = useCallback(
    (file: File) => {
      uploadImage.mutate(file, {
        onSuccess: () => {
          if (inputRef.current) {
            inputRef.current.value = "";
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

  return (
    <Modal isOpen={true} onClose={onClose} title={`${dish.name} - 图库管理`} size="lg">
      <div className="flex flex-col gap-3">
        <div className="rounded-2xl border border-slate-200 bg-white/80 p-3">
          <label
            htmlFor={`dish-image-${dish.id}`}
            className="mb-1 block text-sm font-semibold text-slate-700"
          >
            上传图片
          </label>
          <input
            ref={inputRef}
            id={`dish-image-${dish.id}`}
            type="file"
            accept={ACCEPTED_FORMATS}
            onChange={handleFileChange}
            disabled={compressing || uploadImage.isPending}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-full file:border-0 file:bg-red-500 file:px-3 file:py-2 file:text-sm file:font-semibold file:text-white"
          />
          <p className="mt-2 text-xs text-slate-500">
            支持 JPG、PNG、WebP、HEIC，最大 10MB，最多 9 张。
          </p>

          {compressing && (
            <div className="mt-3">
              <CompressionOverlay progress={compressionProgress} />
            </div>
          )}

          {compressionError && (
            <p className="mt-2 rounded-xl border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              {compressionError}
            </p>
          )}

          {uploadImage.isError && (
            <p className="mt-2 rounded-xl border border-red-200 bg-red-50 p-2 text-sm text-red-700">
              上传失败，请确认格式和大小后重试
            </p>
          )}

          {!compressing && (
            <Button
              className="mt-3 w-full"
              onClick={() => {
                const file = inputRef.current?.files?.[0];
                if (file) handleFile(file);
              }}
              disabled={!inputRef.current?.files?.length || uploadImage.isPending}
            >
              {uploadImage.isPending ? "上传中..." : "上传图片"}
            </Button>
          )}
        </div>

        {imagesQuery.isLoading && <Spinner />}

        {imagesQuery.isError && (
          <ErrorBanner
            message="加载图库失败"
            onRetry={() => void imagesQuery.refetch()}
          />
        )}

        {imagesQuery.data && imagesQuery.data.length === 0 && (
          <EmptyState
            icon="🖼️"
            title="还没有图片"
            description="上传第一张图片后会自动作为封面"
          />
        )}

        {imagesQuery.data && imagesQuery.data.length > 0 && (
          <div className="grid grid-cols-2 gap-3">
            {imagesQuery.data.map((image) => (
              <DishImageItem key={image.id} dishId={dish.id} image={image} />
            ))}
          </div>
        )}
      </div>

      {prompt && (
        <CompressionPromptDialog
          prompt={prompt}
          onCompress={confirmCompress}
          onSkip={skipCompress}
          onDismiss={dismissPrompt}
        />
      )}
    </Modal>
  );
}

function DishImageItem({ dishId, image }: { dishId: string; image: DishImage }) {
  const setCover = useSetDishImageCover(dishId);
  const deleteImage = useDeleteDishImage(dishId);
  const isPending = setCover.isPending || deleteImage.isPending;

  return (
    <div className="rounded-2xl border border-slate-200 bg-white/85 p-2 shadow-sm">
      <div className="relative overflow-hidden rounded-xl bg-slate-100">
        <img
          src={image.fileUrl}
          alt={image.isCover ? "菜品封面" : "菜品图片"}
          className="aspect-square w-full object-cover"
          loading="lazy"
        />
        {image.isCover && (
          <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-semibold text-white">
            封面
          </span>
        )}
      </div>
      <div className="mt-2 flex gap-2">
        <SecondaryButton
          className="flex-1 px-2 py-1.5 text-xs"
          onClick={() => setCover.mutate(image.id)}
          disabled={image.isCover || isPending}
        >
          设封面
        </SecondaryButton>
        <SecondaryButton
          className="flex-1 px-2 py-1.5 text-xs"
          onClick={() => deleteImage.mutate(image.id)}
          disabled={isPending}
        >
          删除
        </SecondaryButton>
      </div>
      {(setCover.isError || deleteImage.isError) && (
        <p className="mt-2 text-xs text-red-600">操作失败，请重试</p>
      )}
    </div>
  );
}
