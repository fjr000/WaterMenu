import { beforeEach, describe, expect, it, vi } from "vitest";
import { apiFetch } from "./client.ts";

describe("apiFetch", () => {
  beforeEach(() => {
    vi.restoreAllMocks();
  });

  it("使用 /api 前缀和 same-origin credentials 发起请求", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ ok: true }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await expect(apiFetch<{ ok: boolean }>("/dishes")).resolves.toEqual({
      ok: true,
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/dishes", {
      credentials: "same-origin",
      headers: {},
    });
  });

  it("字符串 body 自动补 JSON Content-Type", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "dish-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);

    await apiFetch("/dishes", {
      method: "POST",
      body: JSON.stringify({ name: "番茄炒蛋" }),
    });

    expect(fetchMock).toHaveBeenCalledWith("/api/dishes", {
      credentials: "same-origin",
      method: "POST",
      body: JSON.stringify({ name: "番茄炒蛋" }),
      headers: { "Content-Type": "application/json" },
    });
  });

  it("FormData body 不补 JSON Content-Type", async () => {
    const fetchMock = vi.fn().mockResolvedValue(
      new Response(JSON.stringify({ id: "image-1" }), {
        status: 200,
        headers: { "Content-Type": "application/json" },
      }),
    );
    vi.stubGlobal("fetch", fetchMock);
    const body = new FormData();

    await apiFetch("/dishes/dish-1/images", { method: "POST", body });

    expect(fetchMock).toHaveBeenCalledWith("/api/dishes/dish-1/images", {
      credentials: "same-origin",
      method: "POST",
      body,
      headers: {},
    });
  });

  it("非 2xx 响应抛 ApiError", async () => {
    vi.stubGlobal(
      "fetch",
      vi.fn().mockResolvedValue(new Response("未登录", { status: 401 })),
    );

    await expect(apiFetch("/auth/me")).rejects.toMatchObject({
      name: "ApiError",
      status: 401,
      message: "未登录",
    });
  });
});
