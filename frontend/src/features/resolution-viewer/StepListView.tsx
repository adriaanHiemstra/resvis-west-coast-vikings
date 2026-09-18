import { useEffect, useRef } from "react";
import type { Clause, ResolutionStep } from "@shared/api/types";

/* One clause rendered as a small pill. `clause` is null specifically for a
   step's resolvent when that step derived the empty clause (a
   contradiction), which is rendered as "∅ (empty clause)" instead of text. */
function ClauseChip({ clause }: { clause: Clause | null }) {
  return (
    <span className="inline-flex max-w-full overflow-hidden text-ellipsis border border-[#b7c7bb] bg-[#f1f4ec] px-2 py-1 font-mono text-xs text-[#214638]">
      {clause ? clause.raw : "∅ (empty clause)"}
    </span>
  );
}

interface StepListViewProps {
  steps: ResolutionStep[];
  currentIndex: number;
  fullscreen?: boolean;
}

/* The step-forward/backward "debugger" list view: renders every step up to
   and including currentIndex, oldest first, so stepping forward reveals
   the derivation incrementally rather than dumping the whole trace at once. */
export function StepListView({ steps, currentIndex, fullscreen }: StepListViewProps) {
  const activeRef = useRef<HTMLDivElement>(null);

  /* Keeps the current step scrolled into view as the user steps forward or
     back, without jumping the whole list to the top on every change. */
  useEffect(() => {
    activeRef.current?.scrollIntoView({ block: "nearest", behavior: "smooth" });
  }, [currentIndex]);

  /* Only steps up to currentIndex are shown - later steps haven't
     "happened" yet from the debugger's point of view. */
  const visible = steps.slice(0, currentIndex + 1);

  return (
    <div className={`${fullscreen ? "h-full overflow-y-auto" : "trace-scroll"} space-y-3 p-5`}>
      {visible.map((step, i) => {
        const isCurrent = i === currentIndex;
        const isFinal = isCurrent && step.isEmptyClause;
        return (
          <div
            key={step.index}
            ref={isCurrent ? activeRef : undefined}
            className={`trace-card p-3 pl-5 ${isCurrent ? "is-current" : ""} ${isFinal ? "is-final" : ""}`}
          >
            <p className="text-[11px] font-bold uppercase tracking-wider text-[#517063]">Step {step.index}</p>
            <div className="mt-2 flex flex-wrap items-center gap-2 text-xs text-[#365448]">
              <ClauseChip clause={step.parents[0]} />
              <span className="font-mono text-[#7f948a]">+</span>
              <ClauseChip clause={step.parents[1]} />
            </div>
            <div className="mt-2 flex items-center gap-2">
              <span className="font-mono text-[#7f948a]">→</span>
              <ClauseChip clause={step.resolvent} />
            </div>
            {step.explanation && (
              <p className="mt-2 text-xs leading-relaxed text-[#517063]">{step.explanation}</p>
            )}
            {isFinal && (
              <p className="mt-2 text-xs font-bold text-danger-text">Contradiction. This step disproves satisfiability.</p>
            )}
          </div>
        );
      })}
    </div>
  );
}