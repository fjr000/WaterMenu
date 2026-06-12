import type { FeedbackRating } from "../api/types";

export const ratingOptions: { value: FeedbackRating; label: string }[] = [
  { value: "GOOD", label: "好吃" },
  { value: "OK", label: "一般" },
  { value: "BAD", label: "不好吃" },
];
