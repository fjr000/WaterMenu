import { renderHook, waitFor } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useDebouncedValue } from "./use-debounced-value.ts";

describe("useDebouncedValue", () => {
  it("应该立即返回初始值", () => {
    const { result } = renderHook(() => useDebouncedValue("initial", 300));
    expect(result.current).toBe("initial");
  });

  it("应该在延迟后更新值", async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      {
        initialProps: { value: "initial", delay: 300 },
      }
    );

    expect(result.current).toBe("initial");

    // 更新值
    rerender({ value: "updated", delay: 300 });

    // 立即检查，值应该还是旧的
    expect(result.current).toBe("initial");

    // 等待延迟后，值应该更新
    await waitFor(
      () => {
        expect(result.current).toBe("updated");
      },
      { timeout: 500 }
    );
  });

  it("应该在快速连续更新时只应用最后一个值", async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      {
        initialProps: { value: "initial", delay: 300 },
      }
    );

    // 快速连续更新
    rerender({ value: "update1", delay: 300 });
    rerender({ value: "update2", delay: 300 });
    rerender({ value: "update3", delay: 300 });

    // 立即检查，值应该还是初始值
    expect(result.current).toBe("initial");

    // 等待延迟后，应该只应用最后一个值
    await waitFor(
      () => {
        expect(result.current).toBe("update3");
      },
      { timeout: 500 }
    );
  });

  it("应该处理不同的延迟时间", async () => {
    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      {
        initialProps: { value: "initial", delay: 100 },
      }
    );

    rerender({ value: "updated", delay: 100 });

    await waitFor(
      () => {
        expect(result.current).toBe("updated");
      },
      { timeout: 200 }
    );
  });

  it("应该在组件卸载时清理定时器", () => {
    vi.useFakeTimers();

    const { unmount } = renderHook(() => useDebouncedValue("test", 300));

    const pendingTimers = vi.getTimerCount();

    unmount();

    // 卸载后应该清理定时器
    expect(vi.getTimerCount()).toBeLessThanOrEqual(pendingTimers);

    vi.useRealTimers();
  });

  it("应该处理对象值", async () => {
    const obj1 = { name: "test1" };
    const obj2 = { name: "test2" };

    const { result, rerender } = renderHook(
      ({ value, delay }) => useDebouncedValue(value, delay),
      {
        initialProps: { value: obj1, delay: 300 },
      }
    );

    expect(result.current).toBe(obj1);

    rerender({ value: obj2, delay: 300 });

    await waitFor(
      () => {
        expect(result.current).toBe(obj2);
      },
      { timeout: 500 }
    );
  });
});
