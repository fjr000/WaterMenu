import { useEffect, useState } from "react";

interface SuccessToastProps {
  message?: string;
  duration?: number;
  onClose: () => void;
}

export function SuccessToast({
  message = "操作成功！",
  duration = 2000,
  onClose,
}: SuccessToastProps) {
  const [isLeaving, setIsLeaving] = useState(false);

  useEffect(() => {
    const timer = setTimeout(() => {
      setIsLeaving(true);
      setTimeout(onClose, 300); // 等待退出动画完成
    }, duration);

    return () => clearTimeout(timer);
  }, [duration, onClose]);

  return (
    <div
      className={`fixed inset-0 z-50 flex items-center justify-center bg-black/20 backdrop-blur-sm transition-opacity duration-300 ${
        isLeaving ? "opacity-0" : "opacity-100 animate-fade-in"
      }`}
    >
      <div
        className={`rounded-3xl border-4 border-emerald-500 bg-white p-8 shadow-2xl transition-all duration-300 ${
          isLeaving
            ? "scale-95 opacity-0"
            : "scale-100 opacity-100 animate-success-bounce"
        }`}
      >
        <div className="text-center">
          <div className="text-6xl">✅</div>
          <p className="mt-3 font-serif text-xl font-semibold text-emerald-700">
            {message}
          </p>
        </div>
      </div>
    </div>
  );
}

interface SuccessOverlayProps {
  show: boolean;
  message?: string;
  onClose: () => void;
}

export function SuccessOverlay({
  show,
  message,
  onClose,
}: SuccessOverlayProps) {
  if (!show) return null;

  return <SuccessToast message={message} onClose={onClose} />;
}
