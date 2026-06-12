# 添加 React Error Boundary

## 背景

代码质量审查发现前端应用缺少 React Error Boundary，运行时错误会导致整个应用崩溃显示白屏，用户体验极差且无法诊断问题。

## 问题详情

**当前状态：**
- `/frontend/src/main.tsx` 直接渲染 `<App />`
- 组件内未捕获的错误导致整个应用卸载
- 用户看到空白页面，无任何提示
- 无错误报告机制

**触发场景：**
- 网络请求失败后组件渲染错误
- 第三方库抛出异常
- 开发错误（类型断言失败、null引用等）
- React 18 suspense边界内错误

## 解决方案

### 1. 创建 ErrorBoundary 组件

`frontend/src/components/error-boundary.tsx`:

```typescript
import { Component, ErrorInfo, ReactNode } from 'react';

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
```

### 2. 创建默认错误回退 UI

```typescript
interface ErrorFallbackProps {
  error: Error;
  onReset: () => void;
}

function DefaultErrorFallback({ error, onReset }: ErrorFallbackProps) {
  return (
    <div className="flex min-h-dvh items-center justify-center bg-slate-50 px-4">
      <div className="w-full max-w-md rounded-lg bg-white p-6 shadow-lg">
        <div className="mb-4 text-center">
          <div className="mx-auto mb-4 flex h-12 w-12 items-center justify-center rounded-full bg-red-100">
            <span className="text-2xl text-red-600">!</span>
          </div>
          <h1 className="mb-2 text-xl font-semibold text-slate-900">
            应用出错了
          </h1>
          <p className="text-sm text-slate-600">
            很抱歉，应用遇到了意外错误。请尝试刷新页面。
          </p>
        </div>
        
        {import.meta.env.DEV && (
          <details className="mb-4 rounded border border-red-200 bg-red-50 p-3">
            <summary className="cursor-pointer text-xs font-medium text-red-900">
              错误详情（开发模式）
            </summary>
            <pre className="mt-2 overflow-auto text-xs text-red-800">
              {error.message}
              {'\n\n'}
              {error.stack}
            </pre>
          </details>
        )}
        
        <div className="flex gap-2">
          <button
            onClick={() => window.location.reload()}
            className="flex-1 rounded bg-slate-900 px-4 py-2 text-sm font-medium text-white hover:bg-slate-800"
          >
            刷新页面
          </button>
          <button
            onClick={onReset}
            className="flex-1 rounded border border-slate-300 px-4 py-2 text-sm font-medium text-slate-700 hover:bg-slate-50"
          >
            重试
          </button>
        </div>
      </div>
    </div>
  );
}
```

### 3. 在应用中使用

更新 `frontend/src/main.tsx`:

```typescript
import { StrictMode } from 'react';
import { createRoot } from 'react-dom/client';
import { ErrorBoundary } from './components/error-boundary';
import { App } from './app';
import './index.css';

createRoot(document.getElementById('root')!).render(
  <StrictMode>
    <ErrorBoundary>
      <App />
    </ErrorBoundary>
  </StrictMode>,
);
```

### 4. 可选：页面级边界

对于大型页面，可添加页面级边界：

```typescript
// home-page.tsx
export function HomePage() {
  return (
    <ErrorBoundary fallback={(error, reset) => (
      <div className="p-4">
        <p className="text-red-600">主页加载失败：{error.message}</p>
        <button onClick={reset} className="mt-2 underline">重试</button>
      </div>
    )}>
      {/* 现有页面内容 */}
    </ErrorBoundary>
  );
}
```

## 实施步骤

1. 创建 `frontend/src/components/error-boundary.tsx`
2. 实现 ErrorBoundary class 组件
3. 实现 DefaultErrorFallback 组件
4. 更新 `main.tsx` 包裹 App
5. （可选）为 HomePage 添加页面级边界
6. 测试错误捕获（故意抛出错误验证）

## 验收标准

- [ ] ErrorBoundary 组件创建完成
- [ ] DefaultErrorFallback UI 美观且功能完整
- [ ] main.tsx 正确包裹 ErrorBoundary
- [ ] 开发模式显示错误详情
- [ ] 生产模式隐藏技术细节
- [ ] "刷新页面"按钮正常工作
- [ ] "重试"按钮重置错误状态
- [ ] 错误记录到控制台
- [ ] TypeScript 类型检查通过
- [ ] 构建成功

## 测试方法

在任意组件中添加测试代码：

```typescript
// 临时测试代码
function TestErrorComponent() {
  throw new Error('测试 Error Boundary');
  return <div>This will never render</div>;
}
```

应该看到错误回退 UI 而不是白屏。

## 预期影响

- **用户体验**：错误时显示友好提示，而非白屏
- **可诊断性**：开发模式显示完整错误堆栈
- **稳定性**：局部错误不影响整个应用
- **可扩展性**：为接入错误追踪服务（Sentry等）铺路

## 注意事项

- Error Boundary **不能**捕获：
  - 事件处理器中的错误（需要 try-catch）
  - 异步代码（setTimeout, Promise）
  - 服务端渲染错误
  - Error Boundary 自身抛出的错误
- 这些场景需要其他错误处理策略
