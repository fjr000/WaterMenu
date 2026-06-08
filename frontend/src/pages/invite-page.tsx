import { zodResolver } from "@hookform/resolvers/zod";
import { useQueryClient } from "@tanstack/react-query";
import { useForm } from "react-hook-form";
import { z } from "zod";
import { ApiError } from "../api/types.ts";
import { Button, Card, ErrorBanner, Input, SecondaryButton, Spinner } from "../components/ui.tsx";
import { authMeKey, useAuth } from "../hooks/use-auth.tsx";
import { useAcceptInvite, useInvitePreview } from "../hooks/use-invites.ts";

const schema = z
  .object({
    name: z.string().trim().min(1, "请输入姓名"),
    email: z.email("请输入有效的邮箱地址"),
    password: z.string().min(8, "密码至少 8 个字符"),
    confirmPassword: z.string().min(8, "请再次输入密码"),
  })
  .refine((value) => value.password === value.confirmPassword, {
    message: "两次输入的密码不一致",
    path: ["confirmPassword"],
  });

type FormValues = z.infer<typeof schema>;

const reasonText = {
  EXPIRED: "邀请已过期，请联系管理员重新创建邀请。",
  USED: "邀请已被使用，不能再次加入。",
  REVOKED: "邀请已被撤销，请联系管理员确认。",
  UNAVAILABLE: "邀请不可用，请检查链接或联系管理员。",
};

export function InvitePage({ token }: { token: string }) {
  const auth = useAuth();
  const queryClient = useQueryClient();
  const previewQuery = useInvitePreview(token);
  const acceptInvite = useAcceptInvite(token);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const onSubmit = handleSubmit((values) => {
    acceptInvite.mutate(
      {
        name: values.name.trim(),
        email: values.email,
        password: values.password,
      },
      {
        onSuccess: (data) => {
          queryClient.setQueryData(authMeKey, data);
          window.location.assign("/");
        },
      },
    );
  });

  return (
    <div className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-md">
        <div className="mb-6 text-center">
          <div className="mx-auto grid h-16 w-16 rotate-[-6deg] place-items-center rounded-3xl border border-amber-200 bg-amber-50 text-4xl shadow-[0_8px_0_rgba(111,82,56,0.12)]">
            👥
          </div>
          <h1 className="mt-4 font-serif text-3xl font-semibold text-slate-900">加入 WaterMenu</h1>
          <p className="mt-1 text-sm text-slate-500">通过邀请加入家庭菜单</p>
        </div>

        <Card>
          {auth.user && (
            <div className="flex flex-col gap-4 text-center">
              <p className="text-sm leading-6 text-slate-600">
                当前已登录为 {auth.user.name}。第一版不支持用已登录账号接受邀请，请先退出当前账号。
              </p>
              <SecondaryButton onClick={() => void auth.logout()}>退出当前账号</SecondaryButton>
            </div>
          )}

          {!auth.user && previewQuery.isLoading && <Spinner />}

          {!auth.user && previewQuery.isError && (
            <ErrorBanner message="校验邀请失败" onRetry={() => void previewQuery.refetch()} />
          )}

          {!auth.user && previewQuery.data && !previewQuery.data.canAccept && (
            <p className="rounded-2xl border border-red-200 bg-red-50 p-4 text-center text-sm text-red-700">
              {reasonText[previewQuery.data.reason]}
            </p>
          )}

          {!auth.user && previewQuery.data && previewQuery.data.canAccept && (
            <form onSubmit={onSubmit} className="flex flex-col gap-4">
              <div className="rounded-2xl border border-emerald-200 bg-emerald-50/70 p-3">
                <p className="text-sm font-semibold text-emerald-800">
                  你将加入：{previewQuery.data.workspaceName}
                </p>
                <p className="mt-1 text-xs text-slate-500">
                  邀请有效期至 {formatDate(previewQuery.data.expiresAt)}
                </p>
              </div>

              <Field label="姓名" error={errors.name?.message}>
                <Input id="invite-name" autoComplete="name" {...register("name")} />
              </Field>

              <Field label="邮箱" error={errors.email?.message}>
                <Input id="invite-email" type="email" autoComplete="email" {...register("email")} />
              </Field>

              <Field label="密码" error={errors.password?.message}>
                <Input id="invite-password" type="password" autoComplete="new-password" {...register("password")} />
              </Field>

              <Field label="确认密码" error={errors.confirmPassword?.message}>
                <Input
                  id="invite-confirm-password"
                  type="password"
                  autoComplete="new-password"
                  {...register("confirmPassword")}
                />
              </Field>

              {acceptInvite.isError && (
                <p className="rounded-xl border border-red-200 bg-red-50 p-2.5 text-center text-sm text-red-700">
                  {getAcceptError(acceptInvite.error)}
                </p>
              )}

              <Button type="submit" disabled={acceptInvite.isPending}>
                {acceptInvite.isPending ? "加入中…" : "接受邀请并进入"}
              </Button>
            </form>
          )}
        </Card>
      </div>
    </div>
  );
}

function Field({
  label,
  error,
  children,
}: {
  label: string;
  error?: string;
  children: React.ReactNode;
}) {
  return (
    <div>
      <label className="mb-1.5 block text-sm font-semibold text-slate-700">{label}</label>
      {children}
      {error && <p className="mt-1 text-xs text-red-600">{error}</p>}
    </div>
  );
}

function getAcceptError(error: unknown) {
  if (error instanceof ApiError && error.status === 409) {
    return "邮箱已被使用，或需要先退出当前账号";
  }

  if (error instanceof ApiError && error.status === 400) {
    return "邀请不可用或表单内容不正确";
  }

  return "接受邀请失败，请重试";
}

function formatDate(value: string) {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
