import tailwindcss from "@tailwindcss/vite";
import react from "@vitejs/plugin-react";
import { defineConfig } from "vite";

export default defineConfig({
  plugins: [react(), tailwindcss()],
  server: {
    proxy: {
      "/api": "http://localhost:3000",
    },
  },
  build: {
    rollupOptions: {
      output: {
        manualChunks: {
          // React 核心库
          "react-vendor": ["react", "react-dom"],
          // React Query 状态管理
          "query-vendor": ["@tanstack/react-query"],
          // 表单相关
          "form-vendor": ["react-hook-form", "@hookform/resolvers", "zod"],
          // Markdown 渲染
          "markdown-vendor": ["react-markdown"],
          // 图片处理
          "image-vendor": ["browser-image-compression"],
          // 搜索功能
          "search-vendor": ["fuse.js"],
        },
      },
    },
    // 调整 chunk 大小警告阈值
    chunkSizeWarningLimit: 600,
  },
});
