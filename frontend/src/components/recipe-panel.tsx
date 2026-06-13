import { zodResolver } from "@hookform/resolvers/zod";
import { useState } from "react";
import { useForm } from "react-hook-form";
import { z } from "zod";
import ReactMarkdown from "react-markdown";
import type { Dish, Recipe } from "../api/types.ts";
import {
  useCreateRecipe,
  useRecipes,
  useUpdateRecipe,
} from "../hooks/use-recipes.ts";
import {
  Button,
  EmptyState,
  ErrorBanner,
  SecondaryButton,
  Spinner,
} from "./ui.tsx";
import { Modal } from "./modal.tsx";
import { parseMarkdown } from "../utils/markdown.ts";

interface Props {
  dish: Dish;
  onClose: () => void;
}

const schema = z.object({
  instructions: z
    .string()
    .trim()
    .min(1, "请输入做法")
    .max(10000, "做法不能超过 10000 字符"),
});

type FormValues = z.infer<typeof schema>;

export function RecipePanel({ dish, onClose }: Props) {
  const recipesQuery = useRecipes(dish.id);
  const [showCreateForm, setShowCreateForm] = useState(false);
  const [editingId, setEditingId] = useState<string | null>(null);

  return (
    <Modal
      isOpen={true}
      onClose={onClose}
      title={`${dish.name} - 做法记录`}
      size="lg"
    >
      <div className="flex flex-col gap-4">
        {recipesQuery.isLoading && <Spinner />}

        {recipesQuery.isError && (
          <ErrorBanner
            message="加载做法失败"
            onRetry={() => void recipesQuery.refetch()}
          />
        )}

        {recipesQuery.data && recipesQuery.data.length === 0 && !showCreateForm && (
          <div className="py-8">
            <EmptyState
              icon="📖"
              title="还没有记录做法"
              description="用 Markdown 记录你的烹饪笔记"
            />
          </div>
        )}

        {recipesQuery.data && recipesQuery.data.length > 0 && (
          <div className="flex flex-col gap-4">
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
                <RecipeCard
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
            + 记录新做法
          </Button>
        )}
      </div>
    </Modal>
  );
}

function RecipeCard({ recipe, onEdit }: { recipe: Recipe; onEdit: () => void }) {
  const { title, body } = parseMarkdown(recipe.instructions);

  return (
    <article className="group relative overflow-hidden rounded-2xl border border-amber-200/60 bg-gradient-to-br from-amber-50/90 via-white to-orange-50/60 p-5 shadow-lg shadow-amber-900/5 backdrop-blur-sm transition-all duration-300 hover:shadow-xl hover:shadow-amber-900/10">
      <div className="absolute right-0 top-0 h-16 w-16 translate-x-6 -translate-y-6 rotate-45 bg-gradient-to-br from-amber-400/20 to-orange-500/20 blur-2xl" />

      <div className="relative">
        <div className="mb-4 flex items-start justify-between gap-3">
          <div className="flex-1">
            <h3
              className={
                title
                  ? "font-serif text-2xl font-bold leading-tight tracking-tight text-amber-950"
                  : "font-serif text-lg italic text-amber-800/70"
              }
              style={{ fontFamily: "'Playfair Display', 'Noto Serif SC', serif" }}
            >
              {title || "做法记录"}
            </h3>
          </div>

          <SecondaryButton
            className="shrink-0 bg-white/60 px-3 py-1.5 text-xs font-medium text-amber-900 shadow-sm backdrop-blur-sm transition hover:bg-white/80"
            onClick={onEdit}
          >
            编辑
          </SecondaryButton>
        </div>

        <div
          className="prose prose-sm max-w-none leading-7 text-slate-700"
          style={{ fontFamily: "'Literata', 'Noto Serif SC', Georgia, serif" }}
        >
          <ReactMarkdown
            disallowedElements={["script", "iframe", "object", "embed"]}
            unwrapDisallowed={true}
            components={{
              h1: ({ children }) => (
                <h1 className="text-xl font-bold text-amber-950 mb-3">{children}</h1>
              ),
              h2: ({ children }) => (
                <h2 className="text-lg font-semibold text-amber-900 mb-2">{children}</h2>
              ),
              h3: ({ children }) => (
                <h3 className="text-base font-semibold text-amber-900 mb-2">{children}</h3>
              ),
              ul: ({ children }) => (
                <ul className="list-disc list-inside space-y-1 my-2">{children}</ul>
              ),
              ol: ({ children }) => (
                <ol className="list-decimal list-inside space-y-1 my-2">{children}</ol>
              ),
              li: ({ children }) => (
                <li className="text-sm leading-relaxed">{children}</li>
              ),
              p: ({ children }) => (
                <p className="text-sm leading-relaxed mb-2">{children}</p>
              ),
              strong: ({ children }) => (
                <strong className="font-semibold text-amber-950">{children}</strong>
              ),
              em: ({ children }) => (
                <em className="italic">{children}</em>
              ),
              a: ({ children, href }) => (
                <a
                  href={href}
                  className="text-amber-700 underline hover:text-amber-900"
                  target="_blank"
                  rel="noopener noreferrer"
                >
                  {children}
                </a>
              ),
              img: ({ src, alt }) => (
                <img
                  src={src}
                  alt={alt}
                  className="rounded-lg max-w-full h-auto my-3"
                />
              ),
            }}
          >
            {body || recipe.instructions}
          </ReactMarkdown>
        </div>

        <div className="mt-4 flex items-center gap-2 border-t border-amber-200/50 pt-3 text-xs text-amber-700/60">
          <span>最后更新</span>
          <time>{new Date(recipe.updatedAt).toLocaleDateString("zh-CN")}</time>
        </div>
      </div>
    </article>
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
    watch,
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
    defaultValues: {
      instructions: recipe?.instructions ?? "",
    },
  });

  const submit = handleSubmit((values) => {
    const body = { instructions: values.instructions.trim() };

    if (recipe) {
      updateRecipe.mutate({ id: recipe.id, body }, { onSuccess });
    } else {
      createRecipe.mutate(body, { onSuccess });
    }
  });

  const currentValue = watch("instructions");
  const preview = parseMarkdown(currentValue || "");

  return (
    <form
      onSubmit={submit}
      className="overflow-hidden rounded-2xl border border-amber-300/40 bg-gradient-to-br from-amber-50 via-white to-orange-50/40 shadow-xl shadow-amber-900/8"
    >
      <div className="border-b border-amber-200/50 bg-gradient-to-r from-amber-100/50 to-orange-100/30 px-5 py-3.5">
        <h4 className="font-serif text-lg font-semibold text-amber-950">
          {isEditing ? "编辑做法" : "记录新做法"}
        </h4>
        <p className="mt-0.5 text-xs text-amber-700/70">
          支持 Markdown 格式：用{" "}
          <code className="rounded bg-amber-100 px-1 py-0.5 font-mono text-[11px]">
            # 标题
          </code>{" "}
          来命名做法
        </p>
      </div>

      <div className="grid gap-0 md:grid-cols-2">
        <div className="flex flex-col border-b border-amber-200/50 md:border-b-0 md:border-r">
          <label
            htmlFor={`${formId}-instructions`}
            className="border-b border-amber-200/50 bg-amber-50/50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-amber-800"
          >
            编辑区
          </label>
          <textarea
            id={`${formId}-instructions`}
            rows={12}
            placeholder={
              "# 家常版\n\n材料：\n- 番茄 2个\n- 鸡蛋 3个\n\n步骤：\n1. 番茄切块\n2. 热油炒蛋\n3. 加番茄翻炒"
            }
            className="flex-1 resize-none border-0 bg-transparent px-4 py-3 font-mono text-sm leading-6 text-slate-800 outline-none placeholder-amber-400/50 focus:bg-white/30"
            style={{ minHeight: "320px" }}
            {...register("instructions")}
          />
        </div>

        <div className="flex flex-col bg-gradient-to-br from-white to-amber-50/30">
          <div className="border-b border-amber-200/50 bg-amber-50/50 px-4 py-2 text-xs font-semibold uppercase tracking-wider text-amber-800">
            预览
          </div>
          <div
            className="flex-1 overflow-y-auto px-4 py-3"
            style={{
              minHeight: "320px",
              fontFamily: "'Literata', 'Noto Serif SC', Georgia, serif",
            }}
          >
            {preview.title && (
              <h3
                className="mb-3 font-serif text-xl font-bold text-amber-950"
                style={{
                  fontFamily: "'Playfair Display', 'Noto Serif SC', serif",
                }}
              >
                {preview.title}
              </h3>
            )}
            <div className="prose prose-sm max-w-none text-sm leading-7 text-slate-700">
              {preview.body ? (
                <ReactMarkdown
                  disallowedElements={["script", "iframe", "object", "embed"]}
                  unwrapDisallowed={true}
                  components={{
                    h1: ({ children }) => (
                      <h1 className="text-base font-bold text-amber-950 mb-2">
                        {children}
                      </h1>
                    ),
                    h2: ({ children }) => (
                      <h2 className="text-sm font-semibold text-amber-900 mb-2">
                        {children}
                      </h2>
                    ),
                    h3: ({ children }) => (
                      <h3 className="text-sm font-semibold text-amber-900 mb-2">
                        {children}
                      </h3>
                    ),
                    ul: ({ children }) => (
                      <ul className="list-disc list-inside space-y-1 my-2">
                        {children}
                      </ul>
                    ),
                    ol: ({ children }) => (
                      <ol className="list-decimal list-inside space-y-1 my-2">
                        {children}
                      </ol>
                    ),
                    li: ({ children }) => <li className="text-sm">{children}</li>,
                    p: ({ children }) => <p className="text-sm mb-2">{children}</p>,
                    img: ({ src, alt }) => (
                      <img
                        src={src}
                        alt={alt}
                        className="rounded-lg max-w-full h-auto my-2"
                      />
                    ),
                  }}
                >
                  {preview.body}
                </ReactMarkdown>
              ) : (
                <span className="italic text-amber-400/70">
                  开始输入以查看预览...
                </span>
              )}
            </div>
          </div>
        </div>
      </div>

      {errors.instructions && (
        <div className="border-t border-red-200 bg-red-50/80 px-5 py-2.5">
          <p className="text-xs text-red-700">{errors.instructions.message}</p>
        </div>
      )}

      {isError && (
        <div className="border-t border-red-200 bg-red-50/80 px-5 py-2.5">
          <p className="text-sm text-red-700">保存失败，请重试</p>
        </div>
      )}

      <div className="flex gap-3 border-t border-amber-200/50 bg-gradient-to-r from-amber-100/30 to-orange-100/20 px-5 py-4">
        <SecondaryButton
          type="button"
          className="flex-1"
          onClick={onCancel}
          disabled={isPending}
        >
          取消
        </SecondaryButton>
        <Button
          type="submit"
          className="flex-1 bg-gradient-to-r from-amber-600 to-orange-600 font-semibold shadow-lg shadow-amber-600/25 transition hover:from-amber-700 hover:to-orange-700"
          disabled={isPending}
        >
          {isPending ? "保存中…" : isEditing ? "保存修改" : "保存做法"}
        </Button>
      </div>
    </form>
  );
}
