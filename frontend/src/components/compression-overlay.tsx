interface Props {
  progress: number;
}

export function CompressionOverlay({ progress }: Props) {
  return (
    <div className="flex flex-col items-center gap-2 rounded-2xl border border-amber-200 bg-amber-50/90 p-4">
      <div className="h-5 w-5 animate-gentle-spin rounded-full border-2 border-amber-200 border-t-red-500" />
      <p className="text-sm font-semibold text-slate-700">
        压缩中...{progress > 0 && ` ${Math.round(progress)}%`}
      </p>
      <div className="h-1.5 w-full overflow-hidden rounded-full bg-amber-200">
        <div
          className="h-full rounded-full bg-red-500 transition-all duration-300"
          style={{ width: `${Math.max(progress, 5)}%` }}
        />
      </div>
    </div>
  );
}
