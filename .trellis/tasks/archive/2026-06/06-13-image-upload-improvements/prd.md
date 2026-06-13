# 改进图片上传处理（文件大小限制、格式支持、压缩）

## Goal

改进图片上传功能，解决大文件上传失败问题，明确支持的文件格式，考虑是否需要自动压缩服务。

## What I already know

### 现有实现
- **文件大小限制**: 5MB (硬限制在 `dish-images.controller.ts:28`)
- **支持的格式**: JPEG、PNG、WebP (`ALLOWED_MIME_TYPES` in service)
- **存储方式**: 直接存储原文件，无压缩处理
- **错误提示**: 
  - 格式不支持时: "仅支持 JPEG、PNG、WebP 图片"
  - 缺少文件时: "缺少图片文件"
- **内存处理**: 使用 multer 的 `memoryStorage()`，文件在内存中处理后写入磁盘

### 技术栈
- Backend: NestJS + Multer (文件上传中间件)
- Image processing: `image-size` 库 (仅读取尺寸，不做压缩)
- 无现有的图片压缩/转换库

### 约束
- 每道菜最多 9 张图片 (`MAX_IMAGES_PER_DISH = 9`)
- 文件存储在 `UPLOADS_DIR` 配置的目录下

## Assumptions (temporary)

- 用户遇到了上传失败，很可能是文件超过 5MB 限制
- 用户不清楚是否支持 JPG 格式（实际上 JPEG 和 JPG 是同一种格式）
- 用户可能想上传其他常见格式（如 GIF、BMP、HEIC 等）

## Open Questions

(所有关键决策已确认)

## Decisions

### 文件大小限制策略 ✓
**选择**: 提高限制到 10MB，并提供可选压缩

**理由**:
- 10MB 足够存储高清菜品图片（4K 分辨率）
- 可选压缩给用户控制权（原图 vs 优化文件大小）
- 存储成本可控（每道菜最多 9 张图，10MB × 9 = 90MB 上限）

### 文件格式支持 ✓
**选择**: 明确支持 JPG 扩展名 + 增加 HEIC 支持

**支持的格式**:
- JPEG/JPG (已支持，需确保 `.jpg` 扩展名正常工作)
- PNG (已支持)
- WebP (已支持)
- HEIC (新增，iPhone 默认格式)

**技术考虑**:
- HEIC 需要转换库（如 `heic-convert`），可能需要后端转为 JPEG 存储
- 需验证转换性能（避免上传超时）
- 前端可能需要 polyfill（浏览器原生不支持 HEIC 显示）

### 压缩策略 ✓
**选择**: 混合处理 + 智能建议

**压缩处理方式**:
- **JPEG/PNG/WebP** → 前端压缩（使用 `browser-image-compression` 或类似库）
- **HEIC** → 后端自动转换为 JPEG（因浏览器不支持原生处理）

**触发时机（智能建议）**:
- 文件 < 3MB：静默上传，无提示
- 3MB - 10MB：提示"文件较大（X MB），是否压缩后上传？"（用户可选择跳过）
- \> 10MB：提示"文件超过限制（10MB），必须压缩后上传"（强制压缩或拒绝）

**压缩目标**:
- 目标文件大小: < 2MB（在质量和体积间平衡）
- 最大分辨率: 2048px（长边），保持纵横比
- 质量: 0.85（JPEG quality）

## Requirements (evolving)

- [x] 提高文件大小限制从 5MB 到 10MB
- [x] 支持格式：JPEG/JPG、PNG、WebP、HEIC
- [ ] 后端：HEIC 转换处理（转为 JPEG 存储）
- [ ] 后端：更新 MIME type 验证，支持 `image/heic` 和 `image/heif`
- [ ] 前端：集成图片压缩库（`browser-image-compression`）
- [ ] 前端：实现智能压缩建议 UI（3MB/10MB 阈值）
- [ ] 前端：文件选择时显示文件大小和支持的格式提示
- [ ] 优化错误提示文案（包含格式列表和大小限制）
- [ ] 压缩过程显示 loading 状态

## Acceptance Criteria

- [ ] 文件大小限制提升到 10MB，超过限制的文件被拒绝
- [ ] JPEG/JPG、PNG、WebP、HEIC 格式均可上传
- [ ] HEIC 文件自动转换为 JPEG 存储，转换时间 < 5 秒
- [ ] 3MB - 10MB 文件上传时，显示压缩建议弹窗
- [ ] 超过 10MB 的文件提示必须压缩或被拒绝
- [ ] 压缩后文件 < 2MB，质量可接受（目视无明显劣化）
- [ ] 压缩过程显示 loading 状态，处理时间 < 3 秒
- [ ] 错误提示清晰说明原因："支持 JPG、PNG、WebP、HEIC，最大 10MB"
- [ ] 上传界面显示支持的格式和大小限制
- [ ] 所有现有上传功能正常工作（设为封面、删除图片等）

## Definition of Done (team quality bar)

- Tests added/updated (unit/integration where appropriate)
- Lint / typecheck / CI green
- Docs/notes updated if behavior changes
- Frontend 需要同步更新（如果有 UI 变更或错误提示优化）

## Out of Scope (explicit)

- 批量上传（当前只处理单文件上传的改进）
- 进度条显示（文件上传进度条）
- 图片编辑功能（裁剪、滤镜、旋转等）
- GIF 动图支持（菜品图片场景较少使用）
- SVG 矢量图支持（存在 XSS 风险）
- 压缩后效果预览（用户无需对比压缩前后）
- 自定义压缩参数（使用固定的压缩配置即可）

## Technical Notes

### 相关文件
- `backend/src/dish-images/dish-images.controller.ts` - 文件大小限制定义
- `backend/src/dish-images/dish-images.service.ts` - MIME type 验证和存储逻辑
- `frontend/src/hooks/use-dish-images.ts` - 前端上传 hook

### 技术选型（基于研究）

**前端压缩**: `browser-image-compression@2.0.2`
- 支持 JPEG/PNG/WebP/BMP
- Web Worker 非阻塞压缩
- 配置: `maxSizeMB: 2, maxWidthOrHeight: 2048, quality: 0.85`

**后端 HEIC 转换**: `heic-convert@2.1.0` (推荐)
- 无原生依赖，纯 JS/WASM
- 简单 API: `convert({ buffer, format: 'JPEG', quality: 0.9 })`
- 注意: 同步处理，高并发场景考虑 worker threads

### Research References

- [browser-image-compression.md](research/browser-image-compression.md) — 前端压缩库完整 API 和配置
- [heic-conversion.md](research/heic-conversion.md) — HEIC 转换方案对比和推荐

## Implementation Plan

### PR1: 后端基础改进
- [ ] 提升 MAX_FILE_SIZE 到 10MB
- [ ] 安装 `heic-convert` 依赖
- [ ] 更新 ALLOWED_MIME_TYPES 支持 `image/heic` 和 `image/heif`
- [ ] 实现 HEIC → JPEG 转换逻辑
- [ ] 更新错误提示文案
- [ ] 添加/更新后端测试

### PR2: 前端压缩功能
- [ ] 安装 `browser-image-compression` 依赖
- [ ] 创建压缩 hook/utility
- [ ] 实现智能压缩建议 UI（3MB/10MB 阈值判断）
- [ ] 更新上传流程集成压缩逻辑
- [ ] 添加压缩 loading 状态
- [ ] 更新上传界面显示格式和大小限制
- [ ] 添加/更新前端测试

### PR3: 端到端验证和文档
- [ ] E2E 测试覆盖新格式和压缩场景
- [ ] 性能验证（HEIC 转换 < 5s，压缩 < 3s）
- [ ] 更新用户文档/帮助文本
- [ ] 验证所有 Acceptance Criteria
