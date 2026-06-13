import { act, renderHook } from "@testing-library/react";
import { describe, expect, it, vi } from "vitest";
import { useImageUpload } from "./use-image-upload.ts";

// Mock the compression utility so tests don't require real image processing.
vi.mock("../utils/image-compression.ts", async (importOriginal) => {
  const actual = await importOriginal<typeof import("../utils/image-compression.ts")>();
  return {
    ...actual,
    compressImage: vi.fn(async (file: File) => {
      // Return a fake compressed file half the size.
      return new File(["compressed"], file.name, { type: file.type });
    }),
  };
});

function fakeFile(name: string, sizeBytes: number, type = "image/jpeg"): File {
  const f = new File(["x"], name, { type });
  Object.defineProperty(f, "size", { value: sizeBytes });
  return f;
}

describe("useImageUpload", () => {
  it("小文件直接上传，无 prompt", () => {
    const onUpload = vi.fn();
    const { result } = renderHook(() => useImageUpload({ onUpload }));

    const small = fakeFile("small.jpg", 1 * 1024 * 1024);
    act(() => result.current.handleFile(small));

    expect(onUpload).toHaveBeenCalledWith(small);
    expect(result.current.prompt).toBeNull();
  });

  it("3-10 MB 文件显示 suggest prompt", () => {
    const onUpload = vi.fn();
    const { result } = renderHook(() => useImageUpload({ onUpload }));

    const medium = fakeFile("medium.jpg", 5 * 1024 * 1024);
    act(() => result.current.handleFile(medium));

    expect(onUpload).not.toHaveBeenCalled();
    expect(result.current.prompt).not.toBeNull();
    expect(result.current.prompt?.action).toBe("suggest");
  });

  it("超过 10 MB 文件显示 required prompt", () => {
    const onUpload = vi.fn();
    const { result } = renderHook(() => useImageUpload({ onUpload }));

    const large = fakeFile("large.jpg", 15 * 1024 * 1024);
    act(() => result.current.handleFile(large));

    expect(onUpload).not.toHaveBeenCalled();
    expect(result.current.prompt).not.toBeNull();
    expect(result.current.prompt?.action).toBe("required");
  });

  it("skipCompress 跳过压缩直接上传 (suggest)", () => {
    const onUpload = vi.fn();
    const { result } = renderHook(() => useImageUpload({ onUpload }));

    const medium = fakeFile("medium.jpg", 5 * 1024 * 1024);
    act(() => result.current.handleFile(medium));
    act(() => result.current.skipCompress());

    expect(onUpload).toHaveBeenCalledWith(medium);
    expect(result.current.prompt).toBeNull();
  });

  it("skipCompress 不允许跳过 required 压缩", () => {
    const onUpload = vi.fn();
    const { result } = renderHook(() => useImageUpload({ onUpload }));

    const large = fakeFile("large.jpg", 15 * 1024 * 1024);
    act(() => result.current.handleFile(large));
    act(() => result.current.skipCompress());

    // Should NOT have called onUpload because action is 'required'
    expect(onUpload).not.toHaveBeenCalled();
    // Prompt should still be shown
    expect(result.current.prompt).not.toBeNull();
  });

  it("confirmCompress 压缩后上传", async () => {
    const onUpload = vi.fn();
    const { result } = renderHook(() => useImageUpload({ onUpload }));

    const medium = fakeFile("medium.jpg", 5 * 1024 * 1024);
    act(() => result.current.handleFile(medium));

    await act(async () => {
      result.current.confirmCompress();
    });

    // Should upload the compressed result (from mock)
    expect(onUpload).toHaveBeenCalledTimes(1);
    expect(result.current.prompt).toBeNull();
  });

  it("HEIC 小文件直接上传", () => {
    const onUpload = vi.fn();
    const { result } = renderHook(() => useImageUpload({ onUpload }));

    const heic = fakeFile("photo.heic", 2 * 1024 * 1024, "image/heic");
    act(() => result.current.handleFile(heic));

    expect(onUpload).toHaveBeenCalledWith(heic);
  });

  it("HEIC 中等大小直接上传（后端处理）", () => {
    const onUpload = vi.fn();
    const { result } = renderHook(() => useImageUpload({ onUpload }));

    const heic = fakeFile("photo.heic", 5 * 1024 * 1024, "image/heic");
    act(() => result.current.handleFile(heic));

    // HEIC in suggest range should still upload directly (backend handles)
    expect(onUpload).toHaveBeenCalledWith(heic);
  });

  it("HEIC 超过限制显示错误", () => {
    const onUpload = vi.fn();
    const { result } = renderHook(() => useImageUpload({ onUpload }));

    const largeHeic = fakeFile("photo.heic", 15 * 1024 * 1024, "image/heic");
    act(() => result.current.handleFile(largeHeic));

    expect(onUpload).not.toHaveBeenCalled();
    expect(result.current.compressionError).toBeTruthy();
  });

  it("dismissPrompt 清除 prompt", () => {
    const onUpload = vi.fn();
    const { result } = renderHook(() => useImageUpload({ onUpload }));

    const medium = fakeFile("medium.jpg", 5 * 1024 * 1024);
    act(() => result.current.handleFile(medium));
    expect(result.current.prompt).not.toBeNull();

    act(() => result.current.dismissPrompt());
    expect(result.current.prompt).toBeNull();
  });
});
