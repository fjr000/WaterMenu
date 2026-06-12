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
    <div className="flex min-h-dvh items-center justify-center px-4 py-8">
      <div className="w-full max-w-sm">
        <div className="mb-8 text-center">
          <div className="mx-auto flex h-16 w-16 rotate-[-6deg] items-center justify-center rounded-3xl border border-amber-200 bg-amber-50 text-4xl shadow-[0_8px_0_rgba(111,82,56,0.12)]">
            🍽️
          </div>
          <h1 className="mt-4 font-serif text-3xl font-semibold text-slate-900">
            WaterMenu
          </h1>
          <p className="mt-1 text-sm text-slate-500">把今天吃什么写进厨房手账</p>
        </div>

        <Card className="relative overflow-hidden before:absolute before:left-8 before:top-0 before:h-3 before:w-20 before:-translate-y-1/2 before:rounded-full before:bg-red-200 before:opacity-70">
          <form onSubmit={onSubmit} className="relative flex flex-col gap-5">
            <div>
              <label htmlFor="email" className="mb-1.5 block text-sm font-medium text-slate-700">
                邮箱
              </label>
              <Input
                id="email"
                type="email"
                placeholder="邮箱地址"
                autoComplete="email"
                {...register("email")}
              />
              {errors.email && (
                <p className="mt-1.5 text-xs text-red-600">
                  {errors.email.message}
                </p>
              )}
            </div>

            <div>
              <label htmlFor="password" className="mb-1.5 block text-sm font-medium text-slate-700">
                密码
              </label>
              <Input
                id="password"
                type="password"
                placeholder="密码"
                autoComplete="current-password"
                {...register("password")}
              />
              {errors.password && (
                <p className="mt-1.5 text-xs text-red-600">
                  {errors.password.message}
                </p>
              )}
            </div>

            {serverError && (
              <p className="rounded-xl border border-red-200 bg-red-50 p-3 text-center text-sm text-red-700">
                {serverError}
              </p>
            )}

            <Button type="submit" disabled={loginMutation.isPending}>
              {loginMutation.isPending ? "登录中…" : "登录"}
            </Button>
          </form>
        </Card>

        <p className="mt-6 text-center text-xs text-slate-400">
          需要账号请联系管理员
        </p>
      </div>
    </div>
  );
}
