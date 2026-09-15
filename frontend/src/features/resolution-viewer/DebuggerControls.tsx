import { ChevronLeft, ChevronRight } from "lucide-react";

interface DebuggerControlsProps {
  index: number;
  total: number;
  onPrev: () => void;
  onNext: () => void;
}

export function DebuggerControls({ index, total, onPrev, onNext }: DebuggerControlsProps) {
  return (
    <div className="flex items-center justify-between border-b border-[#d4dbd0] bg-[#f1f4ec] px-5 py-3">
      <button
        type="button"
        onClick={onPrev}
        disabled={index <= 0}
        aria-label="Previous step"
        className="grid h-8 w-8 place-items-center border border-[#b7c7bb] text-forest transition-colors hover:bg-[#e3e9dd] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronLeft size={16} />
      </button>
      <p className="font-mono text-xs font-bold text-[#365448]" aria-live="polite">
        Step {index + 1} of {total}
      </p>
      <button
        type="button"
        onClick={onNext}
        disabled={index >= total - 1}
        aria-label="Next step"
        className="grid h-8 w-8 place-items-center border border-[#b7c7bb] text-forest transition-colors hover:bg-[#e3e9dd] disabled:cursor-not-allowed disabled:opacity-40"
      >
        <ChevronRight size={16} />
      </button>
    </div>
  );
}
