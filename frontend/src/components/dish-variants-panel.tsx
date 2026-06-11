import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Dish, DishVariant, DishVariantType } from "../api/types.ts";
import {
  useCreateDishVariant,
  useDishVariants,
  useUpdateDishVariant,
} from "../hooks/use-dish-variants.ts";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Input,
  SecondaryButton,
  Select,
  Spinner,
} from "./ui.tsx";

const variantTypeOptions: { value: DishVariantType; label: string }[] = [
  { value: "HOME_RECIPE", label: "自家做法" },
  { value: "TAKEOUT", label: "外卖" },
  { value: "DINE_IN", label: "到店" },
  { value: "OTHER", label: "其他" },
];

const variantTypeLabels: Record<DishVariantType, string> = {
  HOME_RECIPE: "自家做法",
  TAKEOUT: "外卖",
  DINE_IN: "到店",
  OTHER: "其他",
};

const createSchema = z.object({
  name: z.string().trim().min(1, "请输入版本名称"),
  type: z.enum(["HOME_RECIPE", "TAKEOUT", "DINE_IN", "OTHER"]),
});

type CreateFormValues = z.infer<typeof createSchema>;

export function DishVariantsPanel({ dish, onClose }: { dish: Dish; onClose: () => void }) {
  const variantsQuery = useDishVariants(dish.id);
  const createVariant = useCreateDishVariant(dish.id);
  const updateVariant = useUpdateDishVariant(dish.id);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      type: "OTHER",
    },
  });

  const submit = handleSubmit((values) => {
    createVariant.mutate(
      { name: values.name.trim(), type: values.type },
      {
        onSuccess: () => {
          reset({ name: "", type: "OTHER" });
        },
      },
    );
  });

  return (
    <Card className="border-amber-200 bg-amber-50/55">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-serif text-lg font-semibold text-slate-900">版本 / 来源</p>
          <p className="mt-0.5 text-sm text-slate-500">{dish.name}</p>
        </div>
        <SecondaryButton className="px-3 py-1.5 text-xs" onClick={onClose}>
          关闭
        </SecondaryButton>
      </div>

      <form onSubmit={submit} className="mt-4 grid gap-3 rounded-2xl border border-white/80 bg-white/75 p-3 sm:grid-cols-[1fr_160px_auto]">
        <div>
          <label htmlFor={`variant-name-${dish.id}`} className="mb-1 block text-sm font-semibold text-slate-700">
            名称
          </label>
          <Input id={`variant-name-${dish.id}`} placeholder="例如：外卖店1、家常版、到店" {...register("name")} />
          {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
        </div>
        <div>
          <label htmlFor={`variant-type-${dish.id}`} className="mb-1 block text-sm font-semibold text-slate-700">
            类型
          </label>
          <Select id={`variant-type-${dish.id}`} {...register("type")}>
            {variantTypeOptions.map((option) => (
              <option key={option.value} value={option.value}>
                {option.label}
              </option>
            ))}
          </Select>
        </div>
        <div className="flex items-end">
          <Button type="submit" className="w-full" disabled={createVariant.isPending}>
            {createVariant.isPending ? "添加中…" : "添加版本"}
          </Button>
        </div>
      </form>

      {createVariant.isError && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-center text-sm text-red-700">
          创建失败，可能是名称重复
        </p>
      )}

      <div className="mt-4 flex flex-col gap-3">
        {variantsQuery.isLoading && <Spinner />}
        {variantsQuery.isError && (
          <ErrorBanner message="加载版本失败" onRetry={() => void variantsQuery.refetch()} />
        )}
        {variantsQuery.data && variantsQuery.data.length === 0 && (
          <EmptyState icon="🧾" title="还没有版本" description="可以按外卖、到店或做法为同一道菜补充版本。" />
        )}
        {variantsQuery.data?.map((variant) => (
          <VariantRow
            key={variant.id}
            variant={variant}
            pending={updateVariant.isPending}
            onToggleActive={() => {
              updateVariant.mutate({
                id: variant.id,
                body: { isActive: !variant.isActive },
              });
            }}
          />
        ))}
      </div>
    </Card>
  );
}

function VariantRow({
  variant,
  pending,
  onToggleActive,
}: {
  variant: DishVariant;
  pending: boolean;
  onToggleActive: () => void;
}) {
  return (
    <div className="flex items-center justify-between gap-3 rounded-2xl border border-white/80 bg-white/75 p-3 shadow-sm">
      <div className="min-w-0">
        <p className="truncate font-semibold text-slate-900">{variant.name}</p>
        <p className="mt-0.5 text-xs text-slate-500">{variantTypeLabel(variant.type)}</p>
      </div>
      <button
        type="button"
        className={`rounded-full border px-3 py-1.5 text-xs font-semibold transition ${
          variant.isActive
            ? "border-emerald-200 bg-emerald-50 text-emerald-700"
            : "border-slate-200 bg-slate-100 text-slate-500"
        }`}
        onClick={onToggleActive}
        disabled={pending}
      >
        {variant.isActive ? "停用" : "启用"}
      </button>
    </div>
  );
}

function variantTypeLabel(type: DishVariantType) {
  return variantTypeLabels[type];
}
