# Research: HEIC/HEIF Image Conversion Libraries

- **Query**: Node.js libraries for HEIC/HEIF image format conversion (to JPEG)
- **Scope**: External (npm registry, library documentation)
- **Date**: 2026-06-13

## Findings

### 1. heic-convert (Recommended for NestJS Backend)

**Package**: `heic-convert@2.1.0`  
**GitHub**: https://github.com/catdad-experiments/heic-convert  
**Maintainer**: kirilv (active)  
**Last Updated**: 2023-11-30

#### Installation
```bash
npm install heic-convert
```

**No native dependencies** - Uses pure JavaScript/WebAssembly implementation via `libheif-js`.

#### API Usage

```javascript
const convert = require('heic-convert');

// Convert main image to JPEG
const outputBuffer = await convert({
  buffer: inputBuffer,      // Node Buffer or Uint8Array
  format: 'JPEG',          // 'JPEG' or 'PNG'
  quality: 1               // 0-1 for JPEG quality
});

// Convert all images in HEIC file
const images = await convert.all({
  buffer: inputBuffer,
  format: 'JPEG'
});

for (let idx in images) {
  const outputBuffer = await images[idx].convert();
}
```

#### Dependencies
- `heic-decode@^2.0.0` - HEIC decoder
- `jpeg-js@^0.4.4` - JPEG encoder
- `pngjs@^6.0.0` - PNG encoder
- `libheif-js@^1.19.8` - Core HEIC/HEIF library (Emscripten build of libheif)

#### Bundle Size
- Total: 1.51 MB (536 KB gzipped)
- Main contributor: libheif-js (1.46 MB)

#### Performance Notes
- **Synchronous work**: Most decoding/encoding is done synchronously despite returning Promises
- **Recommendation**: Use worker threads in high-concurrency environments to avoid blocking main thread
- **Lazy conversion**: When using `.all()`, images are only converted when `.convert()` is called

#### MIME Type Handling
- Library works with raw buffers, MIME type detection should be handled separately
- Supports both `image/heic` and `image/heif` file formats

#### Error Handling
- Returns standard Promise rejection
- No built-in MIME type validation

#### Browser Support
- Has browser-specific variant: `require('heic-convert/browser')`
- Browser version uses native Canvas encoders instead of pure-JS encoders

#### Maintenance Status
✅ **Active** - Published Nov 2023, part of maintained heic-* ecosystem

---

### 2. heic2any (Browser-Only - NOT for NestJS)

**Package**: `heic2any@0.0.4`  
**GitHub**: https://github.com/alexcorvi/heic2any  
**Maintainer**: alexcorvi

#### Key Limitation
⚠️ **Browser-only library** - Requires DOM and window object, will NOT work in Node.js/NestJS backend.

#### Use Case
- Client-side HEIC conversion in web browsers
- Zero dependencies (uses browser APIs)
- Can convert HEIC bursts to animated GIFs

#### Why Not Suitable
- Explicitly requires browser environment
- Cannot be used in server-side Node.js applications
- Documentation states: "this tool is specifically for the browser environment, it will not work in node environment"

---

### 3. sharp (Popular Image Processing - Limited HEIC Support)

**Package**: `sharp` (current version available)  
**GitHub**: https://github.com/lovell/sharp  
**Website**: https://sharp.pixelplumbing.com/

#### HEIF Support Status
✅ **Input support**: Can read HEIF/HEIC files (both AVIF and HEIC compression)  
✅ **Metadata**: Can extract HEIF metadata including compression type, pages, primary page  

#### Usage with HEIC
```javascript
const sharp = require('sharp');

await sharp('input.heic')
  .jpeg({ quality: 90 })
  .toFile('output.jpg');
```

#### Advantages
- Much broader image processing library (resize, crop, rotate, etc.)
- Extremely fast (uses libvips)
- Well-maintained, widely adopted
- Handles HEIC as one of many input formats

#### Considerations
- Larger dependency if only needing HEIC conversion
- May have native dependencies (though usually auto-installed)

#### Keywords
- Supports: JPEG, PNG, WebP, AVIF, TIFF, GIF, SVG, JP2
- HEIF listed in metadata capabilities

---

### 4. heic-decode (Low-Level Option)

**Package**: `heic-decode@2.1.0`  
**GitHub**: https://github.com/catdad-experiments/heic-decode

#### Purpose
Decodes HEIC to raw pixel data (Uint8ClampedArray) without encoding to JPEG/PNG.

#### API
```javascript
const decode = require('heic-decode');

const { width, height, data } = await decode({ buffer });
// data is Uint8ClampedArray (raw RGBA pixels)
```

#### Use Case
- When you need raw pixel data for further processing
- Building custom conversion pipelines
- Used internally by `heic-convert`

#### Dependencies
- `libheif-js@^1.19.8`

---

## Comparison Matrix

| Library | Backend Support | Native Deps | Bundle Size | Maintenance | Outputs |
|---------|----------------|-------------|-------------|-------------|---------|
| **heic-convert** | ✅ Yes | ❌ No | 1.51 MB | Active (2023) | JPEG, PNG |
| **heic2any** | ❌ Browser-only | ❌ No | Small | Active | JPEG, PNG, GIF |
| **sharp** | ✅ Yes | ⚠️ Usually auto-installed | Larger | Very Active | All formats |
| **heic-decode** | ✅ Yes | ❌ No | 1.46 MB | Active (2023) | Raw pixels |

---

## Recommendation for NestJS Backend

### Primary Choice: `heic-convert`

**Reasons:**
1. ✅ **No native dependencies** - Pure JavaScript/WebAssembly, easy deployment
2. ✅ **Purpose-built** - Specifically designed for HEIC→JPEG/PNG conversion
3. ✅ **Simple API** - Straightforward async/await interface
4. ✅ **Active maintenance** - Part of catdad-experiments ecosystem (heic-decode, heic-convert, heic-cli, libheif-js)
5. ✅ **Flexible** - Can convert single or all images in HEIC container

**Caveats:**
- Large bundle size (1.51 MB due to libheif-js WASM)
- Synchronous processing may block in high concurrency (use worker threads)
- No built-in MIME type detection

### Alternative: `sharp`

**Consider if:**
- You need additional image processing (resize, crop, optimize)
- You're already using sharp in the project
- Performance is critical (libvips is faster)
- You want a smaller, more established library

**Trade-offs:**
- More complex API for simple conversion
- May have native dependency considerations
- HEIC is just one of many formats (not specialized)

---

## Implementation Notes

### MIME Type Detection
Both libraries work with buffers. Use a separate MIME detection library:
- `file-type` package
- Manual detection via buffer magic bytes
- Frontend sends content-type header

### Error Handling Pattern
```javascript
try {
  const outputBuffer = await convert({
    buffer: inputBuffer,
    format: 'JPEG',
    quality: 0.92
  });
} catch (error) {
  // Handle invalid HEIC file or conversion failure
  console.error('HEIC conversion failed:', error);
}
```

### Performance Optimization
```javascript
// For high-concurrency environments
const { Worker } = require('worker_threads');

// Create worker for HEIC conversion
// Offload conversion to prevent blocking main thread
```

---

## Related Resources

- libheif-js documentation: https://www.npmjs.com/package/libheif-js
- heic-convert GitHub: https://github.com/catdad-experiments/heic-convert
- sharp HEIF support: https://sharp.pixelplumbing.com/api-input
- HEIF format specification: https://en.wikipedia.org/wiki/High_Efficiency_Image_File_Format

---

## Not Found / Gaps

- No benchmarks found comparing heic-convert vs sharp for HEIC→JPEG specifically
- No published performance metrics for typical photo sizes (e.g., 3-5 MB HEIC files)
- Metadata preservation capabilities not documented in heic-convert
