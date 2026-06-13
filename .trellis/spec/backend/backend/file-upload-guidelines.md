# File Upload and Image Processing Guidelines

> 文件上传与图片处理相关的实现模式和约定

## Overview

本文档记录图片上传、格式转换、压缩等文件处理的实现模式，基于 `dish-images` 模块的实际实现。

核心模式：
- 后端负责格式转换（HEIC → JPEG）和存储
- 前端负责压缩优化和用户体验
- 通过 Multer 的 `memoryStorage()` 处理上传文件
- 使用第三方库处理格式转换和压缩

---

## 1. File Size Limits

### Pattern: Progressive Size Limits

**Context**: 平衡存储成本和用户体验，使用渐进式的文件大小限制。

**Signature**:
```typescript
// backend/src/dish-images/dish-images.controller.ts
const MAX_FILE_SIZE = 10 * 1024 * 1024; // 10MB

FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { fileSize: MAX_FILE_SIZE, files: 1 },
})
```

**Frontend Thresholds**:
```typescript
// frontend/src/utils/image-compression.ts
const SUGGEST_COMPRESSION_THRESHOLD = 3 * 1024 * 1024;  // 3MB
const MAX_FILE_SIZE = 10 * 1024 * 1024;                 // 10MB
```

**Smart Compression Strategy**:
- < 3MB: 静默上传，无提示
- 3-10MB: 建议压缩（用户可选择跳过）
- \> 10MB: 必须压缩或拒绝上传

**Why**: 
- 3MB 以下的图片通常已经过手机/相机压缩，再压缩收益小
- 3-10MB 提供选择权，用户可能需要保留高清原图
- 10MB+ 文件对存储和传输压力较大，必须优化

**Contract**:
```typescript
// Request
FileInterceptor('file', {
  storage: memoryStorage(),
  limits: { 
    fileSize: 10 * 1024 * 1024,  // 10MB hard limit
    files: 1 
  },
})

// Error response (超过限制)
{
  statusCode: 413,
  message: "File too large"
}
```

---

## 2. HEIC/HEIF Format Support

### Pattern: Backend Auto-Conversion

**Context**: iPhone 默认使用 HEIC 格式，但浏览器不支持显示。解决方案是后端自动转换为 JPEG 存储。

**Scope / Trigger**: 
- 任何涉及图片格式支持的功能
- 需要兼容 iOS 用户的上传场景

**Signatures**:
```typescript
// backend/src/dish-images/dish-images.service.ts
import heicConvert from 'heic-convert';

async upload(userId: string, dishId: string, file?: Express.Multer.File)
```

**Contracts**:

Request:
- `file.mimetype`: `image/heic` 或 `image/heif`
- `file.buffer`: HEIC 图片的 Buffer

Response (转换后):
- 存储格式: JPEG
- 扩展名: `.jpg`
- `mimeType`: `image/jpeg`

Environment:
- 无需环境变量（heic-convert 无原生依赖）

**Validation & Error Matrix**:
- HEIC 文件检测成功 → 转换为 JPEG → 存储
- heic-convert 转换失败 → `BadRequestException('HEIC 图片转换失败')`
- 非支持格式 → `BadRequestException('仅支持 JPEG、PNG、WebP、HEIC 图片')`

**Implementation**:
```typescript
// 1. MIME type validation includes HEIC
const ALLOWED_MIME_TYPES = new Set([
  'image/jpeg',
  'image/png', 
  'image/webp',
  'image/heic',  // iOS default
  'image/heif',  // HEIF container
]);

// 2. Detect and convert HEIC before processing
let processedBuffer = file.buffer;
let processedMimeType = file.mimetype;
let processedSize = file.size;

if (file.mimetype === 'image/heic' || file.mimetype === 'image/heif') {
  try {
    processedBuffer = await heicConvert({
      buffer: file.buffer,
      format: 'JPEG',
      quality: 0.9,  // High quality to preserve detail
    });
    processedMimeType = 'image/jpeg';
    processedSize = processedBuffer.length;
  } catch (error) {
    throw new BadRequestException('HEIC 图片转换失败');
  }
}

// 3. Read dimensions from processed buffer
const dimensions = this.readDimensions(processedBuffer, processedMimeType);

// 4. Save with correct extension
const extension = this.getExtension(dimensions.mimeType); // 'jpg'
const storageKey = path.posix.join('dish-images', workspaceId, dishId, `${randomUUID()}.${extension}`);

// 5. Write processed buffer to disk (not original)
await fs.writeFile(absolutePath, processedBuffer);

// 6. Store metadata with processed values
await tx.dishImage.create({
  data: {
    mimeType: dimensions.mimeType,  // 'image/jpeg'
    size: processedSize,             // Converted size
    width: dimensions.width,
    height: dimensions.height,
    // ...
  },
});
```

**Why**:
- HEIC 压缩效率高，iPhone 用户常见
- 浏览器无法直接显示 HEIC，必须转换
- 后端转换保证统一存储格式，简化前端逻辑
- 转换为 JPEG 兼容性最好

**Good/Base/Bad Cases**:

Good:
- iPhone 用户上传 5MB HEIC 照片 → 自动转为 JPEG → 成功存储

Base:
- 用户上传 8MB HEIC 文件 → 转换后可能略大 → 仍在 10MB 限制内

Bad:
- HEIC 文件损坏 → heic-convert 抛出异常 → 返回 400 错误提示

**Tests Required**:
```typescript
// backend/test/dish-images.e2e-spec.ts
describe('HEIC upload', () => {
  it('should convert HEIC to JPEG and store successfully', async () => {
    // Arrange: HEIC buffer
    // Act: POST /dishes/:id/images with HEIC file
    // Assert: 
    //   - response.mimeType === 'image/jpeg'
    //   - stored file has .jpg extension
    //   - dimensions preserved
  });

  it('should reject corrupted HEIC file', async () => {
    // Arrange: Invalid HEIC buffer
    // Act: POST /dishes/:id/images
    // Assert: 400 with 'HEIC 图片转换失败'
  });
});
```

**Dependencies**:
```json
{
  "heic-convert": "^2.1.0"
}
```

**Type Declarations** (if needed):
```typescript
// backend/src/dish-images/heic-convert.d.ts
declare module 'heic-convert' {
  interface ConvertOptions {
    buffer: Buffer | Uint8Array;
    format: 'JPEG' | 'PNG';
    quality?: number;
  }
  
  function convert(options: ConvertOptions): Promise<Buffer>;
  export default convert;
}
```

### Wrong vs Correct

#### Wrong
```typescript
// ❌ 直接存储 HEIC 文件
await fs.writeFile(absolutePath, file.buffer);

// ❌ 前端转换（浏览器不支持 HEIC 解码）
const convertedFile = await browserConvert(file);
```

#### Correct
```typescript
// ✅ 后端检测并转换
if (file.mimetype === 'image/heic' || file.mimetype === 'image/heif') {
  processedBuffer = await heicConvert({
    buffer: file.buffer,
    format: 'JPEG',
    quality: 0.9,
  });
  processedMimeType = 'image/jpeg';
}
```

---

## 3. Frontend Image Compression

### Pattern: Smart Compression with User Prompts

**Context**: 大文件占用带宽和存储，但用户可能需要保留高清原图。使用智能阈值和可选压缩。

**Scope / Trigger**:
- 用户上传图片大于 3MB
- 需要优化传输和存储

**Signatures**:
```typescript
// frontend/src/utils/image-compression.ts
export async function compressImage(
  file: File,
  onProgress?: (progress: number) => void
): Promise<File>

export function getCompressionAction(file: File): CompressionAction

// frontend/src/hooks/use-image-upload.ts
export function useImageUpload(
  dishId: string,
  onSuccess?: () => void
)
```

**Contracts**:

Compression Options:
```typescript
const COMPRESSION_OPTIONS = {
  maxSizeMB: 2,               // Target size
  maxWidthOrHeight: 2048,     // Max dimension
  useWebWorker: true,         // Non-blocking
  initialQuality: 0.85,       // JPEG quality
};
```

Compression Actions:
```typescript
type CompressionAction = 
  | { action: 'upload' }           // < 3MB: direct upload
  | { action: 'suggest', size: number }  // 3-10MB: prompt user
  | { action: 'required', size: number } // > 10MB: must compress
```

**Validation & Error Matrix**:
- File < 3MB → 直接上传
- File 3-10MB → 显示建议压缩对话框 → 用户选择压缩或跳过
- File > 10MB 且可压缩 → 显示必须压缩对话框 → 压缩后上传
- File > 10MB 且不可压缩（HEIC） → 拒绝上传，提示错误

**Implementation**:
```typescript
// 1. Determine compression action
const action = getCompressionAction(file);

// 2. Handle based on action
switch (action.action) {
  case 'upload':
    // Direct upload
    uploadMutation.mutate(file);
    break;
    
  case 'suggest':
    // Show optional compression dialog
    setPromptState({ 
      mode: 'suggest', 
      size: action.size,
      originalFile: file 
    });
    break;
    
  case 'required':
    // Show required compression dialog
    if (isCompressible(file)) {
      setPromptState({ 
        mode: 'required', 
        size: action.size,
        originalFile: file 
      });
    } else {
      // HEIC > 10MB
      setError(`文件过大（${formatFileSize(action.size)}），超过 10MB 限制`);
    }
    break;
}

// 3. Compress with progress callback
const compressed = await compressImage(file, (progress) => {
  setCompressionProgress(progress);
});

// 4. Upload compressed file
uploadMutation.mutate(compressed);
```

**Good/Base/Bad Cases**:

Good:
- 用户上传 2MB 图片 → 静默上传，无提示
- 用户上传 5MB 图片 → 建议压缩 → 压缩到 1.5MB → 上传

Base:
- 用户上传 8MB 图片 → 建议压缩 → 用户选择跳过 → 上传原图

Bad:
- 用户上传 15MB HEIC → 前端无法压缩 → 提示"文件过大"错误

**Tests Required**:
```typescript
// frontend/src/hooks/use-image-upload.test.ts
describe('useImageUpload', () => {
  it('should upload small file directly', async () => {
    // Arrange: 2MB file
    // Act: selectFile()
    // Assert: uploadMutation called with original file
  });

  it('should show suggest prompt for 3-10MB file', async () => {
    // Arrange: 5MB file
    // Act: selectFile()
    // Assert: promptState.mode === 'suggest'
  });

  it('should show required prompt for >10MB file', async () => {
    // Arrange: 12MB JPEG file
    // Act: selectFile()
    // Assert: promptState.mode === 'required'
  });

  it('should skip compression for HEIC files', async () => {
    // Arrange: 5MB HEIC file
    // Act: selectFile()
    // Assert: uploaded without frontend compression
  });
});
```

**Dependencies**:
```json
{
  "browser-image-compression": "^2.0.2"
}
```

### Wrong vs Correct

#### Wrong
```typescript
// ❌ 总是压缩（损失小文件质量）
const compressed = await imageCompression(file, options);
uploadMutation.mutate(compressed);

// ❌ 尝试压缩 HEIC（前端库不支持）
if (file.type.includes('heic')) {
  const compressed = await imageCompression(file, options); // 会失败
}

// ❌ 无用户提示直接压缩
if (file.size > 3MB) {
  const compressed = await compressImage(file);
  uploadMutation.mutate(compressed);
}
```

#### Correct
```typescript
// ✅ 根据文件大小智能决策
const action = getCompressionAction(file);

if (action.action === 'upload') {
  uploadMutation.mutate(file);
} else {
  // Show dialog, let user choose
  setPromptState({ mode: action.action, originalFile: file });
}

// ✅ HEIC 跳过前端压缩
export function isCompressible(file: File): boolean {
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif';
  return !isHeic;
}
```

---

## 4. Compression UI Pattern

### Pattern: Progress Overlay + Smart Prompts

**Context**: 压缩是异步操作，需要 loading 状态；不同文件大小需要不同提示策略。

**Implementation**:

**Compression Overlay** (loading 状态):
```typescript
// frontend/src/components/compression-overlay.tsx
export function CompressionOverlay({ progress }: { progress: number }) {
  return (
    <div className="fixed inset-0 bg-black/50 flex items-center justify-center z-50">
      <div className="bg-white rounded-lg p-6">
        <Spinner />
        <p>正在压缩图片...</p>
        <div className="w-full bg-gray-200 rounded h-2">
          <div 
            className="bg-blue-500 h-2 rounded transition-all"
            style={{ width: `${progress}%` }}
          />
        </div>
      </div>
    </div>
  );
}
```

**Compression Prompt Dialog** (用户选择):
```typescript
// frontend/src/components/compression-prompt-dialog.tsx
type Mode = 'suggest' | 'required';

export function CompressionPromptDialog({ 
  mode, 
  size,
  onCompress,
  onSkip,
  onDismiss 
}: Props) {
  return (
    <Modal onClose={onDismiss}>
      <h3>
        {mode === 'suggest' ? '文件较大' : '文件超过限制'}
      </h3>
      <p>
        文件大小：{formatFileSize(size)}
        {mode === 'required' && '，需要压缩后上传'}
      </p>
      <Button onClick={onCompress}>压缩上传</Button>
      {mode === 'suggest' && (
        <SecondaryButton onClick={onSkip}>
          上传原图
        </SecondaryButton>
      )}
    </Modal>
  );
}
```

**Why**:
- Overlay 显示压缩进度，防止用户重复操作
- Progress bar 提供视觉反馈，改善体验
- 两种模式（suggest/required）区分可选和必须
- Suggest 模式提供"上传原图"选项

---

## 5. Format Hints and Error Messages

### Pattern: Proactive Format Information

**Context**: 用户不清楚支持哪些格式和大小限制，提前显示信息减少上传失败。

**Implementation**:
```typescript
// 上传入口显示支持信息
<div>
  <input 
    type="file" 
    accept="image/jpeg,image/png,image/webp,image/heic,image/heif"
  />
  <p className="text-sm text-gray-500">
    支持 JPG、PNG、WebP、HEIC，最大 10MB
  </p>
</div>
```

**Error Messages** (后端):
```typescript
// 格式不支持
throw new BadRequestException('仅支持 JPEG、PNG、WebP、HEIC 图片');

// HEIC 转换失败
throw new BadRequestException('HEIC 图片转换失败');

// 文件过大
throw new BadRequestException('文件大小超过 10MB 限制');
```

**Error Messages** (前端):
```typescript
// HEIC 文件过大
setError(`文件过大（${formatFileSize(size)}），超过 10MB 限制`);

// 压缩失败
setError('图片压缩失败，请重试或上传较小的文件');
```

**Why**:
- accept 属性限制文件选择器
- 提示信息避免用户尝试不支持的格式
- 中文错误信息用户友好
- 具体的错误原因便于排查问题

---

## Design Decisions

### Why Backend HEIC Conversion Instead of Frontend?

**Options Considered**:
1. 前端转换 HEIC → JPEG（`heic2any` 库）
2. 后端转换 HEIC → JPEG（`heic-convert` 库）
3. 直接存储 HEIC，用专门服务提供 JPEG 缩略图

**Decision**: 后端转换

**Reasons**:
- 浏览器原生不支持 HEIC 解码，前端库依赖 WASM，增加前端 bundle 大小
- 后端转换保证存储格式统一，简化前端图片显示逻辑
- 转换一次存储，避免每次请求都转换
- `heic-convert` 无原生依赖，部署简单

**Trade-offs**:
- 后端 CPU 开销（可通过 worker threads 优化）
- 转换后文件可能略大于原 HEIC（HEIC 压缩率更高）

### Why 3MB/10MB Thresholds?

**Research**:
- 手机照片通常 2-8MB（已压缩）
- 单反 RAW 转 JPEG 可能 10-20MB
- 网络传输 10MB 文件在 4G 环境约 10-15 秒

**Decision**:
- 3MB: 小于此值无需压缩（质量损失 > 体积收益）
- 10MB: 硬限制，超过需要压缩（存储和传输成本）

**Validation**:
- 实测 5MB JPEG 压缩到 1.5-2MB，质量可接受
- 实测 12MB JPEG 压缩到 2-3MB，满足需求

---

## Common Mistakes

### Mistake: Forgetting to Update processedBuffer

**Symptom**: HEIC 文件转换后，存储的仍是原始 HEIC buffer

**Cause**: 转换后没有更新 `processedBuffer` 变量

**Fix**:
```typescript
let processedBuffer = file.buffer;

if (isHeic) {
  processedBuffer = await heicConvert({...}); // ✅ 更新变量
}

await fs.writeFile(absolutePath, processedBuffer); // ✅ 使用转换后的 buffer
```

### Mistake: Compressing HEIC in Frontend

**Symptom**: `browser-image-compression` 抛出错误或返回原文件

**Cause**: 前端压缩库不支持 HEIC 格式

**Fix**:
```typescript
export function isCompressible(file: File): boolean {
  const isHeic = file.type === 'image/heic' || file.type === 'image/heif';
  return !isHeic; // ✅ HEIC 跳过前端压缩
}
```

### Mistake: Not Showing Compression Progress

**Symptom**: 用户不知道压缩正在进行，可能重复点击上传

**Fix**:
```typescript
const compressed = await compressImage(file, (progress) => {
  setCompressionProgress(progress); // ✅ 更新进度
  setIsCompressing(true);
});
setIsCompressing(false);
```

---

## Related Guidelines

- [Error Handling](./error-handling.md) - Nest 异常处理模式
- [Quality Guidelines](./quality-guidelines.md) - 测试要求
- [Frontend Component Guidelines](../../frontend/frontend/component-guidelines.md) - Modal 和 loading 状态
