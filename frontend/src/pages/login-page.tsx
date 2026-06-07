import { useForm } from "react-hook-form";
import { z } from "zod";
import { zodResolver } from "@hookform/resolvers/zod";
import { useMutation, useQueryClient } from "@tanstack/react-query";
import { useState } from "react";
import { apiFetch } from "../api/client.ts";
import type { LoginRequest, MeResponse } from "../api/types.ts";
import { authMeKey, isUnauthorized } from "../hooks/use-auth.tsx";
import { Button, Card, Input } from "../components/ui.tsx";

const schema = z.object({
  email: z.email("请输入有效的邮箱地址"),
  password: z.string().min(1, "请输入密码"),
});

type FormValues = z.infer<typeof schema>;

export function LoginPage() {
  const queryClient = useQueryClient();
  const [serverError, setServerError] = useState<string | null>(null);

  const {
    register,
    handleSubmit,
    formState: { errors },
  } = useForm<FormValues>({
    resolver: zodResolver(schema),
  });

  const loginMutation = useMutation({
    mutationFn: (body: LoginRequest) =>
      apiFetch<MeResponse>("/auth/login", {
        method: "POST",
        body: JSON.stringify(body),
      }),
    onSuccess: (data) => {
      queryClient.setQueryData(authMeKey, data);
    },
    onError: (error: unknown) => {
      if (isUnauthorized(error)) {
        setServerError("邮箱或密码错误");
      } else {
        setServerError("登录失败，请稍后重试");
      }
    },
  });

  const onSubmit = handleSubmit((values) => {
    setServerError(null);
    loginMutation.mutate(values);
  });

  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <p className="text-3xl">🍽️</p>
          <h1 className="mt-2 text-xl font-semibold text-slate-900">
            WaterMenu
          </h1>
          <p className="mt-1 text-sm text-slate-500">今天吃什么？</p>
        </div>

        <Card>
          <form onSubmit={onSubmit} className="flex flex-col gap-4">
            <div>
              <label
                htmlFor="email"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                邮箱
              </label>
              <Input
                id="email"
                type="email"
                placeholder="you@example.com"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label
                htmlFor="password"
                className="mb-1.5 block text-sm font-medium text-slate-700"
              >
                密码
              </label>
              <Input
                id="password"
                type="password"
                placeholder="••••••••"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="mt-1 text-xs text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            {serverError && (
              <p className="rounded-lg bg-red-50 p-2.5 text-center text-sm text-red-700">
                {serverError}
              </p>
            )}

            <Button type="submit" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "登录中…" : "登录"}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-400">
          暂不支持注册，请联系管理员创建账号
        </p>
      </div>
    </div>
  );
}
