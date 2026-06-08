import { useRef, useState, type ChangeEvent } from "react";
import type { Dish, DishImage } from "../api/types.ts";
import {
  useDeleteDishImage,
  useDishImages,
  useSetDishImageCover,
  useUploadDishImage,
} from "../hooks/use-dish-images.ts";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  SecondaryButton,
  Spinner,
} from "./ui.tsx";

interface Props {
  dish: Dish;
  onClose: () => void;
}

export function DishImagePanel({ dish, onClose }: Props) {
  const imagesQuery = useDishImages(dish.id);
  const uploadImage = useUploadDishImage(dish.id);
  const [selectedFile, setSelectedFile] = useState<File | null>(null);
  const inputRef = useRef<HTMLInputElement | null>(null);

  const handleFileChange = (event: ChangeEvent<HTMLInputElement>) => {
    setSelectedFile(event.target.files?.[0] ?? null);
  };

  const handleUpload = () => {
    if (!selectedFile) {
      return;
    }

    uploadImage.mutate(selectedFile, {
      onSuccess: () => {
        setSelectedFile(null);
        if (inputRef.current) {
          inputRef.current.value = "";
        }
      },
    });
  };

  return (
    <Card className="border-amber-200 bg-amber-50/40">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="text-sm font-semibold text-slate-900">菜品图库</p>
          <p className="mt-0.5 text-sm text-slate-500">{dish.name}</p>
        </div>
        <SecondaryButton className="px-3 py-1.5 text-xs" onClick={onClose}>
          关闭
        </SecondaryButton>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        <div className="rounded-lg border border-slate-200 bg-white p-3">
          <label
            htmlFor={`dish-image-${dish.id}`}
            className="mb-1 block text-sm font-medium text-slate-700"
          >
            上传图片
          </label>
          <input
            ref={inputRef}
            id={`dish-image-${dish.id}`}
            type="file"
            accept="image/jpeg,image/png,image/webp"
            onChange={handleFileChange}
            className="block w-full text-sm text-slate-600 file:mr-3 file:rounded-lg file:border-0 file:bg-slate-900 file:px-3 file:py-2 file:text-sm file:font-medium file:text-white"
          />
          <p className="mt-2 text-xs text-slate-500">
            支持 JPEG / PNG / WebP，单张最大 5MB，最多 9 张。
          </p>
          {uploadImage.isError && (
            <p className="mt-2 rounded-lg bg-red-50 p-2 text-sm text-red-700">
              上传失败，请确认格式和大小后重试
            </p>
          )}
          <Button
            className="mt-3 w-full"
            onClick={handleUpload}
            disabled={!selectedFile || uploadImage.isPending}
          >
            {uploadImage.isPending ? "上传中…" : "上传图片"}
          </Button>
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
    </Card>
  );
}

function DishImageItem({ dishId, image }: { dishId: string; image: DishImage }) {
  const setCover = useSetDishImageCover(dishId);
  const deleteImage = useDeleteDishImage(dishId);
  const isPending = setCover.isPending || deleteImage.isPending;

  return (
    <div className="rounded-lg border border-slate-200 bg-white p-2">
      <div className="relative overflow-hidden rounded-lg bg-slate-100">
        <img
          src={image.fileUrl}
          alt={image.isCover ? "菜品封面" : "菜品图片"}
          className="aspect-square w-full object-cover"
          loading="lazy"
        />
        {image.isCover && (
          <span className="absolute left-2 top-2 rounded-full bg-amber-500 px-2 py-0.5 text-xs font-medium text-white">
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
