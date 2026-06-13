import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Button({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full border border-red-600 bg-red-500 px-5 py-3 text-sm font-semibold text-white shadow-[0_6px_0_rgba(111,82,56,0.18)] transition-all duration-200 hover:-translate-y-1 hover:shadow-[0_8px_0_rgba(111,82,56,0.22)] hover:bg-red-600 active:translate-y-0 active:shadow-[0_3px_0_rgba(111,82,56,0.16)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 disabled:hover:shadow-[0_6px_0_rgba(111,82,56,0.18)] ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function SecondaryButton({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/90 px-5 py-3 text-sm font-semibold text-slate-700 shadow-sm transition-all duration-200 hover:-translate-y-1 hover:border-slate-400 hover:bg-amber-50 hover:shadow-md active:translate-y-0 active:shadow-sm disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${className}`}
      {...props}
    >
      {children}
    </button>
  );
}

export function Input({
  className = "",
  ...props
}: InputHTMLAttributes<HTMLInputElement>) {
  return (
    <input
      className={`w-full rounded-xl border border-slate-300 bg-white/95 px-4 py-3 text-sm text-slate-900 shadow-inner placeholder-slate-400 outline-none transition-all duration-200 focus:border-red-400 focus:ring-2 focus:ring-red-500/25 hover:border-slate-400 ${className}`}
      {...props}
    />
  );
}

export function Select({
  className = "",
  children,
  ...props
}: React.SelectHTMLAttributes<HTMLSelectElement> & { children: ReactNode }) {
  return (
    <select
      className={`w-full rounded-xl border border-slate-300 bg-white/95 px-4 py-3 text-sm text-slate-900 shadow-inner outline-none transition-all duration-200 focus:border-red-400 focus:ring-2 focus:ring-red-500/25 hover:border-slate-400 ${className}`}
      {...props}
    >
      {children}
    </select>
  );
}

export function Card({
  children,
  className = "",
}: {
  children: ReactNode;
  className?: string;
}) {
  return (
    <div
      className={`animate-paper-enter rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-[0_12px_28px_rgba(111,82,56,0.10)] ring-1 ring-white/70 backdrop-blur-sm transition-all duration-300 hover:-translate-y-1 hover:shadow-[0_16px_36px_rgba(111,82,56,0.13)] ${className}`}
    >
      {children}
    </div>
  );
}

export function PageHeader({
  title,
  subtitle,
  actions,
}: {
  title: string;
  subtitle?: string;
  actions?: ReactNode;
}) {
  return (
    <header className="flex items-start justify-between gap-4 rounded-3xl border border-slate-200/70 bg-white/60 p-5 shadow-sm backdrop-blur-sm">
      <div className="min-w-0">
        <p className="text-[10px] font-bold uppercase tracking-[0.24em] text-red-500">
          WATERMENU
        </p>
        <h1 className="mt-1.5 font-serif text-2xl font-semibold text-slate-900">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-1 text-sm text-slate-500">{subtitle}</p>
        )}
      </div>
      {actions}
    </header>
  );
}

export function EmptyState({
  icon,
  title,
  description,
}: {
  icon?: ReactNode;
  title: string;
  description?: string;
}) {
  return (
    <div className="flex flex-col items-center gap-2.5 rounded-2xl border border-dashed border-slate-300/80 bg-white/50 px-4 py-10 text-center backdrop-blur-sm">
      {icon && <div className="text-4xl opacity-60">{icon}</div>}
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description && (
        <p className="max-w-xs text-xs leading-relaxed text-slate-500">{description}</p>
      )}
    </div>
  );
}

export function Spinner() {
  return (
    <div className="flex items-center justify-center py-6">
      <div className="h-5 w-5 animate-gentle-spin rounded-full border-2 border-amber-200 border-t-red-500" />
    </div>
  );
}

export function ErrorBanner({
  message,
  onRetry,
}: {
  message: string;
  onRetry?: () => void;
}) {
  return (
    <div className="flex items-center gap-3 rounded-2xl border border-red-200/80 bg-red-50/90 p-3.5 shadow-sm backdrop-blur-sm">
      <p className="flex-1 text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          className="shrink-0 text-sm font-semibold text-red-600 underline decoration-red-300 underline-offset-4 transition-colors hover:text-red-700 hover:decoration-red-400"
          onClick={onRetry}
        >
          重试
        </button>
      )}
    </div>
  );
}

export function DishCardSkeleton() {
  return (
    <div className="animate-pulse rounded-2xl border border-slate-200/80 bg-white/85 p-5 shadow-[0_12px_28px_rgba(111,82,56,0.10)] relative overflow-hidden">
      {/* Shimmer effect overlay */}
      <div className="absolute inset-0 animate-shimmer pointer-events-none" />

      <div className="flex items-start gap-4">
        {/* 图片骨架 */}
        <div className="h-20 w-20 shrink-0 rounded-2xl bg-slate-200" />

        <div className="min-w-0 flex-1 space-y-3">
          {/* 标题骨架 */}
          <div className="h-6 w-32 rounded-full bg-slate-200" />

          {/* 描述骨架 */}
          <div className="space-y-2">
            <div className="h-4 w-full rounded-full bg-slate-200" />
            <div className="h-4 w-3/4 rounded-full bg-slate-200" />
          </div>

          {/* 标签骨架 */}
          <div className="flex gap-2">
            <div className="h-6 w-16 rounded-full bg-slate-200" />
            <div className="h-6 w-16 rounded-full bg-slate-200" />
          </div>
        </div>
      </div>

      {/* 开关骨架 */}
      <div className="mt-3 flex items-center gap-2">
        <div className="h-5 w-9 rounded-full bg-slate-200" />
        <div className="h-4 w-12 rounded-full bg-slate-200" />
      </div>

      {/* 按钮骨架 */}
      <div className="mt-4 space-y-2.5">
        <div className="h-10 w-full rounded-xl bg-slate-200" />
        <div className="flex gap-2">
          <div className="h-10 flex-1 rounded-xl bg-slate-200" />
          <div className="h-10 flex-1 rounded-xl bg-slate-200" />
          <div className="h-10 flex-1 rounded-xl bg-slate-200" />
        </div>
      </div>
    </div>
  );
}
