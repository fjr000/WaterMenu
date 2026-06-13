/**
 * Parse Markdown text to extract title and body.
 * If the first line is a level-1 heading (# Title), it's treated as the title.
 */
export function parseMarkdown(md: string): { title: string | null; body: string } {
  const lines = md.split("\n");
  const firstLine = lines[0]?.trim() || "";

  if (firstLine.startsWith("# ")) {
    return {
      title: firstLine.replace(/^#\s*/, ""),
      body: lines.slice(1).join("\n").trim(),
    };
  }

  return { title: null, body: md };
}
