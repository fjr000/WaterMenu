import { render, screen } from "@testing-library/react";
import userEvent from "@testing-library/user-event";
import { describe, expect, it, vi } from "vitest";
import { BlindBoxResultModal } from "./blind-box-result-modal.tsx";
import type { RecommendationCandidate } from "../api/types.ts";

const mockCandidate: RecommendationCandidate = {
  dish: {
    id: "dish-1",
    workspaceId: "workspace-1",
    name: "番茄炒蛋",
    description: "简单好吃的家常菜",
    mealTypes: ["LUNCH", "DINNER"],
    isActive: true,
    coverImage: {
      id: "image-1",
      workspaceId: "workspace-1",
      dishId: "dish-1",
      storageKey: "cover.jpg",
      mimeType: "image/jpeg",
      size: 1024,
      width: 800,
      height: 600,
      sortOrder: 0,
      isCover: true,
      fileUrl: "/images/cover.jpg",
      createdAt: "2026-06-01T00:00:00.000Z",
      updatedAt: "2026-06-01T00:00:00.000Z",
    },
    mealRecordCount: 5,
    feedbackRatingAverage: 4.5,
    createdAt: "2026-06-01T00:00:00.000Z",
    updatedAt: "2026-06-01T00:00:00.000Z",
  },
  score: 0.9,
  weight: 1.0,
  reasons: ["最近没吃", "评分较高"],
};

describe("BlindBoxResultModal", () => {
  it("不显示当 isOpen=false", () => {
    render(
      <BlindBoxResultModal
        isOpen={false}
        onClose={vi.fn()}
        candidate={mockCandidate}
        onRecordDish={vi.fn()}
        onViewRecipe={vi.fn()}
      />,
    );

    expect(screen.queryByText("🎲 盲盒结果")).not.toBeInTheDocument();
  });

  it("显示盲盒结果当 isOpen=true", () => {
    render(
      <BlindBoxResultModal
        isOpen={true}
        onClose={vi.fn()}
        candidate={mockCandidate}
        onRecordDish={vi.fn()}
        onViewRecipe={vi.fn()}
      />,
    );

    expect(screen.getByText("🎲 盲盒结果")).toBeInTheDocument();
    expect(screen.getByText("番茄炒蛋")).toBeInTheDocument();
    expect(screen.getByText("简单好吃的家常菜")).toBeInTheDocument();
    expect(screen.getByText("午餐")).toBeInTheDocument();
    expect(screen.getByText("晚餐")).toBeInTheDocument();
    expect(screen.getByText("最近没吃")).toBeInTheDocument();
    expect(screen.getByText("评分较高")).toBeInTheDocument();
  });

  it("调用 onRecordDish 和 onClose 当点击记录已吃", async () => {
    const onRecordDish = vi.fn();
    const onClose = vi.fn();

    render(
      <BlindBoxResultModal
        isOpen={true}
        onClose={onClose}
        candidate={mockCandidate}
        onRecordDish={onRecordDish}
        onViewRecipe={vi.fn()}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "记录已吃" }));

    expect(onRecordDish).toHaveBeenCalledWith(mockCandidate.dish);
    expect(onClose).toHaveBeenCalled();
  });

  it("调用 onViewRecipe 和 onClose 当点击查看做法", async () => {
    const onViewRecipe = vi.fn();
    const onClose = vi.fn();

    render(
      <BlindBoxResultModal
        isOpen={true}
        onClose={onClose}
        candidate={mockCandidate}
        onRecordDish={vi.fn()}
        onViewRecipe={onViewRecipe}
      />,
    );

    await userEvent.click(screen.getByRole("button", { name: "查看做法" }));

    expect(onViewRecipe).toHaveBeenCalledWith(mockCandidate.dish);
    expect(onClose).toHaveBeenCalled();
  });

  it("不渲染当 candidate 为 null", () => {
    render(
      <BlindBoxResultModal
        isOpen={true}
        onClose={vi.fn()}
        candidate={null}
        onRecordDish={vi.fn()}
        onViewRecipe={vi.fn()}
      />,
    );

    expect(screen.queryByText("🎲 盲盒结果")).not.toBeInTheDocument();
  });

  it("显示占位符当没有封面图", () => {
    const candidateWithoutImage: RecommendationCandidate = {
      ...mockCandidate,
      dish: {
        ...mockCandidate.dish,
        coverImage: null,
      },
    };

    render(
      <BlindBoxResultModal
        isOpen={true}
        onClose={vi.fn()}
        candidate={candidateWithoutImage}
        onRecordDish={vi.fn()}
        onViewRecipe={vi.fn()}
      />,
    );

    expect(screen.getByText("🍽️")).toBeInTheDocument();
  });
});
