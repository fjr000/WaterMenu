import { describe, expect, it } from "vitest";
import {
  formatFileSize,
  getCompressionAction,
  IMAGE_SIZE_THRESHOLDS,
  isCompressible,
} from "./image-compression.ts";

describe("getCompressionAction", () => {
  function fakeFile(sizeBytes: number, type = "image/jpeg"): File {
    return { size: sizeBytes, type } as unknown as File;
  }

  it("小于 3 MB 返回 upload", () => {
    expect(getCompressionAction(fakeFile(1 * 1024 * 1024))).toBe("upload");
    expect(getCompressionAction(fakeFile(IMAGE_SIZE_THRESHOLDS.SILENT_MAX))).toBe("upload");
  });

  it("3-10 MB 返回 suggest", () => {
    expect(getCompressionAction(fakeFile(IMAGE_SIZE_THRESHOLDS.SILENT_MAX + 1))).toBe("suggest");
    expect(getCompressionAction(fakeFile(5 * 1024 * 1024))).toBe("suggest");
    expect(getCompressionAction(fakeFile(IMAGE_SIZE_THRESHOLDS.UPLOAD_MAX))).toBe("suggest");
  });

  it("超过 10 MB 返回 required", () => {
    expect(getCompressionAction(fakeFile(IMAGE_SIZE_THRESHOLDS.UPLOAD_MAX + 1))).toBe("required");
    expect(getCompressionAction(fakeFile(20 * 1024 * 1024))).toBe("required");
  });
});

describe("isCompressible", () => {
  it("JPEG/PNG/WebP 可压缩", () => {
    expect(isCompressible({ type: "image/jpeg" } as File)).toBe(true);
    expect(isCompressible({ type: "image/png" } as File)).toBe(true);
    expect(isCompressible({ type: "image/webp" } as File)).toBe(true);
  });

  it("HEIC/HEIF 不可前端压缩", () => {
    expect(isCompressible({ type: "image/heic" } as File)).toBe(false);
    expect(isCompressible({ type: "image/heif" } as File)).toBe(false);
  });
});

describe("formatFileSize", () => {
  it("格式化字节为 MB", () => {
    expect(formatFileSize(1024 * 1024)).toBe("1.0 MB");
    expect(formatFileSize(5.5 * 1024 * 1024)).toBe("5.5 MB");
    expect(formatFileSize(512 * 1024)).toBe("0.5 MB");
  });
});
