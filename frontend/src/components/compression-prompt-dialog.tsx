import type { CompressionPrompt } from "../hooks/use-image-upload.ts";
import { Modal } from "./modal.tsx";
import { Button, SecondaryButton } from "./ui.tsx";

interface Props {
  prompt: CompressionPrompt;
  onCompress: () => void;
  onSkip: () => void;
  onDismiss: () => void;
}

export function CompressionPromptDialog({
  prompt,
  onCompress,
  onSkip,
  onDismiss,
}: Props) {
  const isRequired = prompt.action === "required";

  return (
    <Modal isOpen onClose={onDismiss} title="图片压缩" size="sm">
      <div className="flex flex-col gap-4">
        <p className="text-sm text-slate-700">
          {isRequired ? (
            <>
              文件大小为 <strong>{prompt.fileSizeLabel}</strong>，超过 10 MB
              上传限制，必须压缩后上传。
            </>
          ) : (
            <>
              文件较大（<strong>{prompt.fileSizeLabel}</strong>
              ），是否压缩后上传？压缩后画质几乎无损。
            </>
          )}
        </p>

        <div className="flex gap-3">
          <Button className="flex-1" onClick={onCompress}>
            压缩后上传
          </Button>
          {!isRequired && (
            <SecondaryButton className="flex-1" onClick={onSkip}>
              直接上传
            </SecondaryButton>
          )}
        </div>

        {isRequired && (
          <SecondaryButton className="w-full" onClick={onDismiss}>
            取消
          </SecondaryButton>
        )}
      </div>
    </Modal>
  );
}
