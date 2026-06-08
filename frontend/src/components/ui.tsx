import type { ButtonHTMLAttributes, InputHTMLAttributes, ReactNode } from "react";

export function Button({
  children,
  className = "",
  ...props
}: ButtonHTMLAttributes<HTMLButtonElement> & { children: ReactNode }) {
  return (
    <button
      className={`inline-flex items-center justify-center rounded-full border border-red-600 bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-[0_6px_0_rgba(111,82,56,0.18)] transition hover:-translate-y-0.5 hover:bg-red-600 active:translate-y-0 active:shadow-[0_3px_0_rgba(111,82,56,0.16)] disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${className}`}
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
      className={`inline-flex items-center justify-center rounded-full border border-slate-300 bg-white/85 px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition hover:-translate-y-0.5 hover:border-slate-400 hover:bg-amber-50 active:translate-y-0 disabled:cursor-not-allowed disabled:opacity-50 disabled:hover:translate-y-0 ${className}`}
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
      className={`w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-inner placeholder-slate-400 outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 ${className}`}
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
      className={`w-full rounded-xl border border-slate-300 bg-white/90 px-3 py-2.5 text-sm text-slate-900 shadow-inner outline-none transition focus:border-red-500 focus:ring-2 focus:ring-red-500/20 ${className}`}
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
      className={`animate-paper-enter rounded-2xl border border-slate-200 bg-white/80 p-4 shadow-[0_10px_24px_rgba(111,82,56,0.10)] ring-1 ring-white/70 transition hover:-translate-y-0.5 hover:shadow-[0_14px_28px_rgba(111,82,56,0.12)] ${className}`}
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
    <header className="flex items-start justify-between gap-3 rounded-3xl border border-slate-200 bg-white/55 p-4 shadow-sm">
      <div>
        <p className="text-xs font-semibold uppercase tracking-[0.22em] text-red-600">
          WaterMenu
        </p>
        <h1 className="mt-1 font-serif text-2xl font-semibold text-slate-900">
          {title}
        </h1>
        {subtitle && (
          <p className="mt-0.5 text-sm text-slate-500">{subtitle}</p>
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
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-dashed border-slate-300 bg-white/45 px-4 py-8 text-center">
      {icon && <div className="text-3xl">{icon}</div>}
      <p className="text-sm font-semibold text-slate-700">{title}</p>
      {description && (
        <p className="max-w-xs text-xs leading-5 text-slate-500">{description}</p>
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
    <div className="flex items-center gap-3 rounded-2xl border border-red-200 bg-red-50 p-3 shadow-sm">
      <p className="flex-1 text-sm text-red-700">{message}</p>
      {onRetry && (
        <button
          className="shrink-0 text-sm font-semibold text-red-600 underline underline-offset-4"
          onClick={onRetry}
        >
          重试
        </button>
      )}
    </div>
  );
}
