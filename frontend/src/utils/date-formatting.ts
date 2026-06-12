/**
 * 将 Date 对象转换为 datetime-local input 的值格式
 * @param date Date 对象
 * @returns 格式: "2026-06-12T14:30"
 */
export function toLocalInputValue(date: Date): string {
  const offsetMs = date.getTimezoneOffset() * 60_000;
  return new Date(date.getTime() - offsetMs).toISOString().slice(0, 16);
}

/**
 * 格式化日期为简短格式（用于列表展示）
 * @param value ISO 字符串
 * @returns 格式: "6/12 14:30"
 */
export function formatShortDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    month: "numeric",
    day: "numeric",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}

/**
 * 格式化日期为完整格式（用于详情页）
 * @param value ISO 字符串
 * @returns 格式: "2026/06/12 14:30"
 */
export function formatFullDate(value: string): string {
  return new Intl.DateTimeFormat("zh-CN", {
    year: "numeric",
    month: "2-digit",
    day: "2-digit",
    hour: "2-digit",
    minute: "2-digit",
  }).format(new Date(value));
}
