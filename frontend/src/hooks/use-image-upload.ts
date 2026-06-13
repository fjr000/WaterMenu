import { useCallback, useState } from "react";
import {
  compressImage,
  formatFileSize,
  getCompressionAction,
  isCompressible,
  type CompressionAction,
} from "../utils/image-compression.ts";

export interface CompressionPrompt {
  file: File;
  action: "suggest" | "required";
  fileSizeLabel: string;
}

interface UseImageUploadOptions {
  onUpload: (file: File) => void;
}

/**
 * Hook that manages the file-selection -> compression -> upload pipeline.
 *
 * It determines whether compression is needed, exposes a prompt state for the
 * dialog, and provides helpers to confirm or skip compression.
 */
export function useImageUpload({ onUpload }: UseImageUploadOptions) {
  const [compressing, setCompressing] = useState(false);
  const [compressionProgress, setCompressionProgress] = useState(0);
  const [compressionError, setCompressionError] = useState<string | null>(null);
  const [prompt, setPrompt] = useState<CompressionPrompt | null>(null);

  /** Reset ephemeral state. */
  const reset = useCallback(() => {
    setPrompt(null);
    setCompressing(false);
    setCompressionProgress(0);
    setCompressionError(null);
  }, []);

  /** Compress and upload the given file. */
  const compressAndUpload = useCallback(
    async (file: File) => {
      setCompressing(true);
      setCompressionProgress(0);
      setCompressionError(null);

      try {
        const compressed = await compressImage(file, setCompressionProgress);
        onUpload(compressed);
      } catch {
        setCompressionError("压缩失败，请重试或选择较小的图片");
      } finally {
        setCompressing(false);
      }
    },
    [onUpload],
  );

  /**
   * Entry point: call this when a file is selected.
   *
   * It decides the correct action and either uploads directly, shows a prompt,
   * or rejects non-compressible large files.
   */
  const handleFile = useCallback(
    (file: File) => {
      setCompressionError(null);
      const action: CompressionAction = getCompressionAction(file);

      if (action === "upload") {
        onUpload(file);
        return;
      }

      if (!isCompressible(file)) {
        // HEIC or other non-compressible type: backend handles conversion.
        // If within upload limit, send as-is; otherwise reject.
        if (action === "suggest") {
          onUpload(file);
          return;
        }

        setCompressionError(
          `文件大小 ${formatFileSize(file.size)} 超过 10 MB 限制，且该格式无法在浏览器压缩`,
        );
        return;
      }

      // Compressible file that is either suggest or required range
      setPrompt({
        file,
        action,
        fileSizeLabel: formatFileSize(file.size),
      });
    },
    [onUpload],
  );

  /** User chose to compress in the prompt dialog. */
  const confirmCompress = useCallback(() => {
    if (!prompt) return;
    const file = prompt.file;
    setPrompt(null);
    void compressAndUpload(file);
  }, [prompt, compressAndUpload]);

  /** User chose to skip compression (only valid for "suggest" action). */
  const skipCompress = useCallback(() => {
    if (!prompt || prompt.action !== "suggest") return;
    const file = prompt.file;
    setPrompt(null);
    onUpload(file);
  }, [prompt, onUpload]);

  /** User dismissed the prompt. */
  const dismissPrompt = useCallback(() => {
    setPrompt(null);
  }, []);

  return {
    handleFile,
    compressing,
    compressionProgress,
    compressionError,
    prompt,
    confirmCompress,
    skipCompress,
    dismissPrompt,
    reset,
  };
}
