import imageCompression from "browser-image-compression";

/** Compression configuration aligned with PRD targets. */
const COMPRESSION_OPTIONS = {
  maxSizeMB: 2,
  maxWidthOrHeight: 2048,
  initialQuality: 0.85,
  useWebWorker: true,
} as const;

/** Size thresholds in bytes. */
export const IMAGE_SIZE_THRESHOLDS = {
  /** Files below this are uploaded directly without prompt. */
  SILENT_MAX: 3 * 1024 * 1024,
  /** Hard upper limit accepted by the backend. */
  UPLOAD_MAX: 10 * 1024 * 1024,
} as const;

export type CompressionAction = "upload" | "suggest" | "required";

/**
 * Determine what compression action is appropriate for a file.
 *
 * - `upload`   : File is small enough, upload directly.
 * - `suggest`  : File is between 3-10 MB, suggest compression.
 * - `required` : File exceeds 10 MB, compression is mandatory.
 */
export function getCompressionAction(file: File): CompressionAction {
  if (file.size <= IMAGE_SIZE_THRESHOLDS.SILENT_MAX) return "upload";
  if (file.size <= IMAGE_SIZE_THRESHOLDS.UPLOAD_MAX) return "suggest";
  return "required";
}

/** MIME types that the frontend can compress. HEIC is handled server-side. */
const COMPRESSIBLE_TYPES = new Set([
  "image/jpeg",
  "image/png",
  "image/webp",
]);

/** Whether the file is a type that can be compressed client-side. */
export function isCompressible(file: File): boolean {
  return COMPRESSIBLE_TYPES.has(file.type);
}

/** Format a byte count as a readable MB string (e.g. "4.2 MB"). */
export function formatFileSize(bytes: number): string {
  return `${(bytes / (1024 * 1024)).toFixed(1)} MB`;
}

/**
 * Compress an image file using browser-image-compression.
 *
 * @returns The compressed File (Blob). Rejects on failure.
 */
export async function compressImage(
  file: File,
  onProgress?: (progress: number) => void,
): Promise<File> {
  return imageCompression(file, {
    ...COMPRESSION_OPTIONS,
    onProgress,
  });
}
