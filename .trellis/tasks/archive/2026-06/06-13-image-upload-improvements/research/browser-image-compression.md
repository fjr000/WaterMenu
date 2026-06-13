# Research: browser-image-compression

- **Query**: Research browser-image-compression npm package for frontend image compression
- **Scope**: External (npm package documentation)
- **Date**: 2026-06-13

## Package Overview

**Name**: `browser-image-compression`  
**Latest Version**: 2.0.2 (published 2023-03-06)  
**License**: MIT  
**Author**: Donald (donaldcwl@gmail.com)  
**Repository**: https://github.com/Donaldcwl/browser-image-compression  
**NPM**: https://www.npmjs.com/package/browser-image-compression

**GitHub Stats** (as of 2026-06-11):
- Stars: 1,699
- Forks: 188
- Open Issues: 65

**Description**: JavaScript module to be run in the web browser for image compression.

## Installation

### ES Module (npm/yarn)
```bash
npm install browser-image-compression --save
# or
yarn add browser-image-compression
```

```javascript
import imageCompression from 'browser-image-compression';
```

Compatible with React, Angular, Vue, and bundlers like webpack/rollup.

### UMD (CDN)
```html
<script type="text/javascript" src="https://cdn.jsdelivr.net/npm/browser-image-compression@2.0.2/dist/browser-image-compression.js"></script>
```

## Basic Usage

### Async/Await Pattern
```javascript
async function handleImageUpload(event) {
  const imageFile = event.target.files[0];
  console.log('originalFile instanceof Blob', imageFile instanceof Blob); // true
  console.log(`originalFile size ${imageFile.size / 1024 / 1024} MB`);

  const options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true,
  }
  
  try {
    const compressedFile = await imageCompression(imageFile, options);
    console.log('compressedFile instanceof Blob', compressedFile instanceof Blob); // true
    console.log(`compressedFile size ${compressedFile.size / 1024 / 1024} MB`);
    
    await uploadToServer(compressedFile);
  } catch (error) {
    console.log(error);
  }
}
```

### Promise Pattern
```javascript
function handleImageUpload(event) {
  var imageFile = event.target.files[0];
  
  var options = {
    maxSizeMB: 1,
    maxWidthOrHeight: 1920,
    useWebWorker: true
  }
  
  imageCompression(imageFile, options)
    .then(function (compressedFile) {
      return uploadToServer(compressedFile);
    })
    .catch(function (error) {
      console.log(error.message);
    });
}
```

## Configuration Options

```typescript
const options: Options = { 
  // Size/Quality Control
  maxSizeMB: number,                    // (default: Number.POSITIVE_INFINITY)
                                        // Target maximum file size in MB
  
  maxWidthOrHeight: number,             // (default: undefined)
                                        // Scale down image so width or height is smaller than this value
                                        // Automatically reduces to max Canvas size supported by browser
  
  initialQuality: number,               // (default: 1)
                                        // Initial quality value between 0 and 1
  
  alwaysKeepResolution: boolean,        // (default: false)
                                        // Only reduce quality, never reduce dimensions
  
  // Performance
  useWebWorker: boolean,                // (default: true)
                                        // Use multi-thread web worker, fallback to main-thread if unsupported
  
  libURL: string,                       // (default: https://cdn.jsdelivr.net/npm/browser-image-compression/dist/browser-image-compression.js)
                                        // Library URL for importing script in Web Worker
  
  // Progress & Control
  onProgress: Function,                 // optional
                                        // Callback function with progress argument (0 to 100)
  
  signal: AbortSignal,                  // optional
                                        // AbortSignal to cancel compression
  
  // File Metadata
  preserveExif: boolean,                // (default: false)
                                        // Preserve Exif metadata for JPEG (Camera model, Focal length, etc.)
  
  fileType: string,                     // optional
                                        // Override file type e.g., 'image/jpeg', 'image/png' (default: file.type)
  
  // Advanced Options
  maxIteration: number,                 // (default: 10)
                                        // Max number of iterations to compress the image
  
  exifOrientation: number,              // optional
                                        // Manual EXIF orientation override
}
```

### Key Options Explained

**Must provide**: At least one of `maxSizeMB` or `maxWidthOrHeight`

**maxSizeMB**: Target file size. Library will iteratively compress until reaching this size or hitting `maxIteration` limit.

**maxWidthOrHeight**: Image will be scaled down proportionally so that the larger dimension (width or height) is ≤ this value. Subject to browser Canvas size limits.

**useWebWorker**: When `true`, compression runs in Web Worker (non-blocking). Requires browser support for OffscreenCanvas API. Falls back to main thread if unsupported.

**preserveExif**: Keep JPEG metadata (camera settings, GPS, timestamps). Default is `false` to reduce file size.

## File Format Support

- **JPEG** (.jpg, .jpeg)
- **PNG** (.png)
- **WebP** (.webp) - see browser compatibility below
- **BMP** (.bmp)

Compression works by reducing:
1. **Resolution** (dimensions) via `maxWidthOrHeight`
2. **Storage size** via `maxSizeMB` and quality reduction

## Browser Compatibility

### Core Functionality
| Browser | Support |
|---------|---------|
| IE 10, IE 11 | ✓ (with polyfills) |
| Edge | Last 2 versions |
| Firefox | Last 2 versions |
| Chrome | Last 2 versions |
| Safari | Last 2 versions |
| iOS Safari | Last 2 versions |
| Opera | Last 2 versions |

### IE Support
Requires polyfills for ES features (Promise, globalThis):
```html
<script src="https://cdnjs.cloudflare.com/ajax/libs/core-js/3.21.1/minified.min.js"></script>
```

### WebP Compression
Supported on major browsers. Check: https://caniuse.com/mdn-api_offscreencanvas_converttoblob_option_type_parameter_webp

### Web Worker (Non-blocking Compression)
Requires OffscreenCanvas API support. Check: https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas#browser_compatibility

If OffscreenCanvas is unsupported, compression runs in main thread (blocking).

## Error Handling Patterns

### Basic Try-Catch
```javascript
try {
  const compressedFile = await imageCompression(imageFile, options);
  await uploadToServer(compressedFile);
} catch (error) {
  console.log(error);
  // Handle compression error
}
```

### Promise Catch
```javascript
imageCompression(imageFile, options)
  .then(function (compressedFile) {
    return uploadToServer(compressedFile);
  })
  .catch(function (error) {
    console.log(error.message);
  });
```

### Abort/Cancel Compression
```javascript
function handleImageUpload(event) {
  var imageFile = event.target.files[0];
  var controller = new AbortController();

  var options = {
    maxSizeMB: 1,
    signal: controller.signal,
  }
  
  imageCompression(imageFile, options)
    .then(function (compressedFile) {
      return uploadToServer(compressedFile);
    })
    .catch(function (error) {
      console.log(error.message); // "I just want to stop"
    });
  
  // Cancel after 1.5 seconds
  setTimeout(function () {
    controller.abort(new Error('I just want to stop'));
  }, 1500);
}
```

**Browser Compatibility for AbortController**: Check https://caniuse.com/?search=AbortController

## Performance Characteristics

### Multi-threading
- Default `useWebWorker: true` enables non-blocking compression in Web Worker
- Requires OffscreenCanvas API support
- Gracefully falls back to main thread if unavailable

### Compression Strategy
- Uses iterative quality reduction (up to `maxIteration` times, default 10)
- Canvas-based image processing
- Automatically respects browser Canvas size limits

### Canvas Size Limits
Each browser has maximum Canvas dimensions:
- Library automatically resizes images below these limits
- Image proportions/ratios are preserved
- See: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas#maximum_canvas_size

### Typical Compression Time
**Note**: No specific benchmark data found in official documentation. Performance depends on:
- Original image size and resolution
- Target compression settings (maxSizeMB, maxWidthOrHeight)
- Device CPU performance
- Whether Web Worker is used (non-blocking vs blocking)

## Content Security Policy (CSP)

If your site has CSP enabled and you want to use Web Workers:

```
content-security-policy: script-src 'self' blob: https://cdn.jsdelivr.net
```

- `blob:` - for loading Web Worker script
- `https://cdn.jsdelivr.net` - for importing library from CDN inside Web Worker

To avoid CDN dependency, set your own hosted library URL in `options.libURL`.

## Helper Functions (Advanced)

For advanced users only. Most users won't need these:

```javascript
imageCompression.getDataUrlFromFile(file: File): Promise<base64 encoded string>

imageCompression.getFilefromDataUrl(dataUrl: string, filename: string, lastModified?: number): Promise<File>

imageCompression.loadImage(url: string): Promise<HTMLImageElement>

imageCompression.drawImageInCanvas(img: HTMLImageElement, fileType?: string): HTMLCanvasElement | OffscreenCanvas

imageCompression.drawFileInCanvas(file: File, options?: Options): Promise<[ImageBitmap | HTMLImageElement, HTMLCanvasElement | OffscreenCanvas]>

imageCompression.canvasToFile(canvas: HTMLCanvasElement | OffscreenCanvas, fileType: string, fileName: string, fileLastModified: number, quality?: number): Promise<File>

imageCompression.getExifOrientation(file: File): Promise<number>

imageCompression.copyExifWithoutOrientation(copyExifFromFile: File, copyExifToFile: File): Promise<File>
```

## TypeScript Support

TypeScript definitions are included in the package and referenced in `package.json` `types` field.

## API Signature

```typescript
imageCompression(file: File, options: Options): Promise<File>
```

**Input**: `File` object (from `<input type="file">` or File API)  
**Output**: Promise resolving to compressed `File` object (Blob)  
**Throws**: Error if compression fails

## Demo & Examples

- Live demo: https://donaldcwl.github.io/browser-image-compression/example/basic.html
- Example code: https://github.com/Donaldcwl/browser-image-compression/tree/master/example

## Caveats & Limitations

1. **Canvas Size Limits**: Each browser limits maximum Canvas size. Library automatically resizes to fit, preserving aspect ratio.

2. **OffscreenCanvas Requirement**: Non-blocking compression requires OffscreenCanvas API. Falls back to main thread if unavailable.

3. **Iterative Compression**: May not always reach exact `maxSizeMB` target if `maxIteration` limit is reached.

4. **Quality vs Size Trade-off**: `alwaysKeepResolution: true` prevents dimension reduction, may result in larger files.

5. **WebP Support**: Platform-dependent. Check browser compatibility.

6. **Maintenance Status**: Last publish was 2023-03-06. 65 open issues as of 2026-06-11.

## Package Files

- **Main (CJS)**: `dist/browser-image-compression.js`
- **Module (ESM)**: `dist/browser-image-compression.mjs`
- **Types**: `dist/browser-image-compression.d.ts`

## Related Documentation

- MDN Canvas API: https://developer.mozilla.org/en-US/docs/Web/HTML/Element/canvas
- MDN OffscreenCanvas: https://developer.mozilla.org/en-US/docs/Web/API/OffscreenCanvas
- EXIF Orientation: https://stackoverflow.com/a/32490603/10395024
- AbortController: https://caniuse.com/?search=AbortController
- WebP Support: https://caniuse.com/mdn-api_offscreencanvas_converttoblob_option_type_parameter_webp
