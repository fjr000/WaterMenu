import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import type { Dish, Recipe } from "../api/types.ts";
import {
  useCreateRecipe,
  useRecipes,
  useUpdateRecipe,
} from "../hooks/use-recipes.ts";
import {
  Button,
  Card,
  EmptyState,
  ErrorBanner,
  Input,
  SecondaryButton,
  Spinner,
} from "./ui.tsx";

interface Props {
  dish: Dish;
  onClose: () => void;
}

const schema = z.object({
  title: z.string().trim().min(1, "请输入做法标题"),
  content: z.string().trim().min(1, "请输入做法正文"),
});

type FormValues = z.infer<typeof schema>;

export function RecipePanel({ dish, onClose }: Props) {
  const recipesQuery = useRecipes(dish.id);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Card className="border-emerald-200 bg-emerald-50/55">
      <div className="flex items-start justify-between gap-3">
        <div>
          <p className="font-serif text-lg font-semibold text-slate-900">做法记录</p>
          <p className="mt-0.5 text-sm text-slate-500">{dish.name}</p>
        </div>
        <SecondaryButton className="px-3 py-1.5 text-xs" onClick={onClose}>
          关闭
        </SecondaryButton>
      </div>

      <div className="mt-4 flex flex-col gap-3">
        {recipesQuery.isLoading && <Spinner />}

        {recipesQuery.isError && (
          <ErrorBanner
            message="加载做法失败"
            onRetry={() => void recipesQuery.refetch()}
          />
        )}

        {recipesQuery.data && recipesQuery.data.length === 0 && !showCreateForm && (
          <EmptyState
            icon="📝"
            title="还没有做法"
            description="记录一个简单做法，下次推荐出来就知道怎么做"
          />
        )}

        {recipesQuery.data && recipesQuery.data.length > 0 && (
          <div className="flex flex-col gap-3">
            {recipesQuery.data.map((recipe) =>
              editingId === recipe.id ? (
                <RecipeForm
                  key={recipe.id}
                  dishId={dish.id}
                  recipe={recipe}
                  onCancel={() => setEditingId(null)}
                  onSuccess={() => setEditingId(null)}
                />
              ) : (
                <RecipeItem
                  key={recipe.id}
                  recipe={recipe}
                  onEdit={() => {
                    setShowCreateForm(false);
                    setEditingId(recipe.id);
                  }}
                />
              ),
            )}
          </div>
        )}

        {showCreateForm ? (
          <RecipeForm
            dishId={dish.id}
            onCancel={() => setShowCreateForm(false)}
            onSuccess={() => setShowCreateForm(false)}
          />
        ) : (
          <Button
            className="w-full"
            onClick={() => {
              setEditingId(null);
              setShowCreateForm(true);
            }}
          >
            + 新增做法
          </Button>
        )}
      </div>
    </Card>
  );
}

function RecipeItem({ recipe, onEdit }: { recipe: Recipe; onEdit: () => void }) {
  return (
    <div className="rounded-2xl border border-slate-200 bg-white/85 p-3 shadow-sm">
      <div className="flex items-start justify-between gap-2">
        <p className="font-serif text-base font-semibold text-slate-900">{recipe.title}</p>
        <SecondaryButton className="px-2.5 py-1 text-xs" onClick={onEdit}>
          编辑
        </SecondaryButton>
      </div>
      <p className="mt-2 whitespace-pre-wrap text-sm leading-6 text-slate-600">
        {recipe.content}
      </p>
    </div>
  );
}

function RecipeForm({
  dishId,
  recipe,
  onCancel,
  onSuccess,
}: {
  dishId: string;
  recipe?: Recipe;
  onCancel: () => void;
  onSuccess: () => void;
}) {
  const createRecipe = useCreateRecipe(dishId);
  const updateRecipe = useUpdateRecipe(dishId);
  const isEditing = Boolean(recipe);
  const isPending = createRecipe.isPending || updateRecipe.isPending;
  const isError = createRecipe.isError || updateRecipe.isError;
  const formId = recipe ? `recipe-${recipe.id}` : `recipe-new-${dishId}`;

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      title: recipe?.title ?? "",
      content: recipe?.content ?? "",
    },
  });

  const submit = handleSubmit((values) => {
    const body = {
      title: values.title.trim(),
      content: values.content.trim(),
    };

    if (recipe) {
      updateRecipe.mutate({ id: recipe.id, body }, { onSuccess });
      return;
    }

    createRecipe.mutate(body, { onSuccess });
  });

  return (
    <form
      onSubmit={submit}
      className="flex flex-col gap-3 rounded-2xl border border-slate-200 bg-white/85 p-3 shadow-sm"
    >
      <div>
        <label
          htmlFor={`${formId}-title`}
          className="mb-1 block text-sm font-semibold text-slate-700"
        >
          标题
        </label>
        <Input
          id={`${formId}-title`}
          placeholder="例如：家常版"
          {...register("title")}
        />
        {errors.title && (
          <p className="mt-1 text-xs text-red-600">{errors.title.message}</p>
        )}
      </div>

      <div>
        <label
          htmlFor={`${formId}-content`}
          className="mb-1 block text-sm font-semibold text-slate-700"
        >
          做法正文
        </label>
        <textarea
          id={`${formId}-content`}
          rows={6}
          placeholder="写下步骤、火候、注意事项等"
          className="w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-inner placeholder-slate-400 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20"
          {...register("content")}
        />
        {errors.content && (
          <p className="mt-1 text-xs text-red-600">{errors.content.message}</p>
        )}
      </div>

      {isError && (
        <p className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-center text-sm text-red-700">
          保存失败，请重试
        </p>
      )}

      <div className="flex gap-2">
        <SecondaryButton
          type="button"
          className="flex-1"
          onClick={onCancel}
          disabled={isPending}
        >
          取消
        </SecondaryButton>
        <Button type="submit" className="flex-1" disabled={isPending}>
          {isPending ? "保存中…" : isEditing ? "保存修改" : "保存做法"}
        </Button>
      </div>
    </form>
  );
}
