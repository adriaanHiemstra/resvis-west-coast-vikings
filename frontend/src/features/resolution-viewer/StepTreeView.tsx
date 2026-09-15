import type { ResolutionStep } from "@shared/api/types";
import { TreeNodeBox } from "./TreeNodeBox";

interface StepTreeViewProps {
  steps: ResolutionStep[];
  currentIndex: number;
}

export function StepTreeView({ steps, currentIndex }: StepTreeViewProps) {
  const step = steps[currentIndex];
  if (!step) return null;
  const isFinal = step.isEmptyClause;

  return (
    <div className="p-6">
      <p className="mb-4 text-center text-[11px] font-bold uppercase tracking-wider text-[#517063]">
        Step {step.index}
      </p>
      <div className="flex flex-col items-center">
        <div className="flex gap-10 sm:gap-16">
          <TreeNodeBox clause={step.parents[0]} tone="parent" />
          <TreeNodeBox clause={step.parents[1]} tone="parent" />
        </div>
        <svg width="160" height="36" viewBox="0 0 160 36" className="text-line" aria-hidden="true">
          <line x1="20" y1="0" x2="80" y2="36" stroke="currentColor" strokeWidth="1.5" />
          <line x1="140" y1="0" x2="80" y2="36" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <TreeNodeBox clause={step.resolvent} tone={isFinal ? "final" : "resolvent"} />
        {step.explanation && (
          <p className="mt-3 max-w-sm text-center text-xs leading-relaxed text-[#517063]">{step.explanation}</p>
        )}
        {isFinal && (
          <p className="mt-3 text-xs font-bold text-danger-text">Contradiction. This step disproves satisfiability.</p>
        )}
      </div>
    </div>
  );
}
