import { useState } from "react";
import { zodResolver } from "@hookform/resolvers/zod";
import { useForm } from "react-hook-form";
import { z } from "zod";
import ReactMarkdown from "react-markdown";
import type { DishVariant } from "../api/types.ts";
import {
  useCreateDishVariant,
  useDishVariants,
  useUpdateDishVariant,
} from "../hooks/use-dish-variants.ts";
import { variantTypeOptions, variantTypeLabels } from "../constants/variant-types.ts";
import {
  Button,
  EmptyState,
  ErrorBanner,
  Input,
  Select,
  Spinner,
} from "./ui.tsx";

const createSchema = z.object({
  name: z.string().trim().min(1, "请输入版本名称"),
  description: z.string().optional(),
  type: z.enum(["HOME_RECIPE", "TAKEOUT", "DINE_IN", "OTHER"]),
});

type CreateFormValues = z.infer<typeof createSchema>;

interface InlineVariantPanelProps {
  dishId: string;
  dishName: string;
}

export function InlineVariantPanel({ dishId, dishName }: InlineVariantPanelProps) {
  const variantsQuery = useDishVariants(dishId);
  const createVariant = useCreateDishVariant(dishId);
  const updateVariant = useUpdateDishVariant(dishId);
  const {
    register,
    handleSubmit,
    reset,
    formState: { errors },
  } = useForm<CreateFormValues>({
    resolver: zodResolver(createSchema),
    defaultValues: {
      name: "",
      description: "",
      type: "OTHER",
    },
  });

  const submit = handleSubmit((values) => {
    createVariant.mutate(
      {
        name: values.name.trim(),
        description: values.description?.trim() || undefined,
        type: values.type,
      },
      {
        onSuccess: () => {
          reset({ name: "", description: "", type: "OTHER" });
        },
      },
    );
  });

  return (
    <div className="mt-3 rounded-2xl border border-amber-200 bg-amber-50/55 p-3">
      <p className="font-serif text-base font-semibold text-slate-900">管理版本</p>
      <p className="mt-0.5 text-xs text-slate-500">{dishName}</p>

      <form onSubmit={submit} className="mt-3 flex flex-col gap-3 rounded-2xl border border-white/80 bg-white/75 p-3">
        <div className="grid gap-3 sm:grid-cols-[1fr_160px]">
          <div>
            <label htmlFor={`variant-name-${dishId}`} className="mb-1 block text-sm font-semibold text-slate-700">
              版本名称
            </label>
            <Input id={`variant-name-${dishId}`} placeholder="例如：外卖店A、家常版、到店" {...register("name")} />
            {errors.name && <p className="mt-1 text-xs text-red-600">{errors.name.message}</p>}
          </div>
          <div>
            <label htmlFor={`variant-type-${dishId}`} className="mb-1 block text-sm font-semibold text-slate-700">
              类型
            </label>
            <Select id={`variant-type-${dishId}`} {...register("type")}>
              {variantTypeOptions.map((option) => (
                <option key={option.value} value={option.value}>
                  {option.label}
                </option>
              ))}
            </Select>
          </div>
        </div>

        <div>
          <label htmlFor={`variant-description-${dishId}`} className="mb-1 block text-sm font-semibold text-slate-700">
            做法说明（可选，支持 Markdown）
          </label>
          <textarea
            id={`variant-description-${dishId}`}
            placeholder="例如：&#10;1. 准备食材：...&#10;2. 烹饪步骤：..."
            rows={4}
            className="w-full rounded-xl border border-slate-300 bg-white/95 px-4 py-3 text-sm text-slate-900 shadow-inner placeholder-slate-400 outline-none transition-all duration-200 focus:border-red-400 focus:ring-2 focus:ring-red-500/25 hover:border-slate-400"
            {...register("description")}
          />
        </div>

        <Button type="submit" className="w-full" disabled={createVariant.isPending}>
          {createVariant.isPending ? "添加中…" : "添加版本"}
        </Button>
      </form>

      {createVariant.isError && (
        <p className="mt-3 rounded-xl border border-red-200 bg-red-50 p-2.5 text-center text-sm text-red-700">
          创建失败，可能是名称重复
        </p>
      )}

      <div className="mt-3 flex flex-col gap-2">
        {variantsQuery.isLoading && <Spinner />}
        {variantsQuery.isError && (
          <ErrorBanner message="加载版本失败" onRetry={() => void variantsQuery.refetch()} />
        )}
        {variantsQuery.data && variantsQuery.data.length === 0 && (
          <EmptyState icon="🧾" title="还没有版本" description="可以按外卖、到店或做法为同一道菜补充版本。" />
        )}
        {variantsQuery.data?.map((variant) => (
          <VariantCard
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
    </div>
  );
}

function VariantCard({
  variant,
  pending,
  onToggleActive,
}: {
  variant: DishVariant;
  pending: boolean;
  onToggleActive: () => void;
}) {
  const [showRecipe, setShowRecipe] = useState(false);

  return (
    <div className="rounded-xl border border-white/80 bg-white/75 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-3">
        <div className="min-w-0 flex-1">
          <p className="font-semibold text-slate-900">{variant.name}</p>
          <p className="mt-0.5 text-xs text-slate-500">{variantTypeLabels[variant.type]}</p>
        </div>
        <div className="flex shrink-0 gap-1.5">
          <button
            type="button"
            className={`rounded-full border px-2.5 py-1 text-xs font-semibold transition ${
              variant.isActive
                ? "border-emerald-200 bg-emerald-50 text-emerald-700 hover:bg-emerald-100"
                : "border-slate-200 bg-slate-100 text-slate-500 hover:bg-slate-200"
            }`}
            onClick={onToggleActive}
            disabled={pending}
          >
            {variant.isActive ? "停用" : "启用"}
          </button>
        </div>
      </div>

      {variant.description && (
        <div className="mt-2">
          <button
            type="button"
            className="text-xs font-semibold text-slate-600 underline underline-offset-4 hover:text-red-600"
            onClick={() => setShowRecipe(!showRecipe)}
          >
            {showRecipe ? "收起做法" : "查看做法"}
          </button>
          {showRecipe && (
            <div className="mt-2 rounded-xl bg-slate-100/50 p-3 animate-slide-up prose prose-sm max-w-none">
              <ReactMarkdown
                disallowedElements={["script", "iframe", "object", "embed"]}
                unwrapDisallowed={true}
                components={{
                  h1: ({ children }) => (
                    <h1 className="text-base font-semibold text-red-600">{children}</h1>
                  ),
                  h2: ({ children }) => (
                    <h2 className="text-sm font-semibold text-red-600">{children}</h2>
                  ),
                  h3: ({ children }) => (
                    <h3 className="text-sm font-semibold text-red-600">{children}</h3>
                  ),
                  ul: ({ children }) => (
                    <ul className="list-disc list-inside space-y-1">{children}</ul>
                  ),
                  ol: ({ children }) => (
                    <ol className="list-decimal list-inside space-y-1">{children}</ol>
                  ),
                  li: ({ children }) => (
                    <li className="text-sm leading-relaxed text-slate-900">{children}</li>
                  ),
                  p: ({ children }) => (
                    <p className="text-sm leading-relaxed text-slate-900">{children}</p>
                  ),
                  a: ({ children, href }) => (
                    <a href={href} className="text-red-500 underline" target="_blank" rel="noopener noreferrer">
                      {children}
                    </a>
                  ),
                }}
              >
                {variant.description}
              </ReactMarkdown>
            </div>
          )}
        </div>
      )}
    </div>
  );
}
