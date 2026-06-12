import { Component } from 'react';
import type { ErrorInfo, ReactNode } from 'react';

interface Props {
  children: ReactNode;
  fallback?: (error: Error, reset: () => void) => ReactNode;
}

interface State {
  hasError: boolean;
  error: Error | null;
}

export class ErrorBoundary extends Component<Props, State> {
  constructor(props: Props) {
    super(props);
    this.state = { hasError: false, error: null };
  }

  static getDerivedStateFromError(error: Error): State {
    return { hasError: true, error };
  }

  componentDidCatch(error: Error, errorInfo: ErrorInfo) {
    // 记录错误到控制台（生产环境可发送到错误追踪服务）
    console.error('App error caught by boundary:', error, errorInfo);

    // TODO: 发送到错误追踪服务 (Sentry, LogRocket等)
    // errorTracker.captureException(error, { extra: errorInfo });
  }

  reset = () => {
    this.setState({ hasError: false, error: null });
  };

  render() {
    if (this.state.hasError && this.state.error) {
      if (this.props.fallback) {
        return this.props.fallback(this.state.error, this.reset);
      }
      return <DefaultErrorFallback error={this.state.error} onReset={this.reset} />;
    }

    return this.props.children;
  }
}

interface ErrorFallbackProps {
  error: Error;
  onReset: () => void;
}

function DefaultErrorFallback({ error, onReset }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md animate-scale-in rounded-2xl border border-slate-200/80 bg-white p-6 shadow-[0_12px_28px_rgba(111,82,56,0.10)] ring-1 ring-white/70">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <span className="text-2xl font-bold text-red-600">!</span>
          </div>
          <h1 className="mb-2 font-serif text-xl font-semibold text-slate-900">
            应用出错了
          </h1>
          <p className="text-sm leading-relaxed text-slate-600">
            很抱歉，应用遇到了意外错误。请尝试刷新页面。
          </p>
        </div>

        {import.meta.env.DEV && (
          <details className="mb-4 rounded-xl border border-red-200 bg-red-50 p-3">
            <summary className="cursor-pointer text-xs font-semibold text-red-900">
              错误详情（开发模式）
            </summary>
            <pre className="mt-2 overflow-auto whitespace-pre-wrap break-words text-xs text-red-800">
              {error.message}
              {error.stack && (
                <>
                  {'\n\n'}
                  {error.stack}
                </>
              )}
            </pre>
          </details>
        )}

        <div className="flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 rounded-full border border-red-600 bg-red-500 px-4 py-2.5 text-sm font-semibold text-white shadow-sm transition-all hover:bg-red-600 active:shadow-none"
          >
            刷新页面
          </button>
          <button
            onClick={onReset}
            className="flex-1 rounded-full border border-slate-300 bg-white px-4 py-2.5 text-sm font-semibold text-slate-700 shadow-sm transition-all hover:border-slate-400 hover:bg-amber-50 active:shadow-none"
          >
            重试
          </button>
        </div>
      </div>
    </div>
  );
}
