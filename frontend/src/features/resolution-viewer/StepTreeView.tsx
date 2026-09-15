import type { Clause, ResolutionStep } from "@shared/api/types";

function TreeNode({ clause, tone }: { clause: Clause | null; tone: "parent" | "resolvent" | "final" }) {
  const toneClasses =
    tone === "final"
      ? "border-danger bg-danger-soft text-danger-text"
      : tone === "resolvent"
        ? "border-teal bg-[#eef8f4] text-[#0f4a44]"
        : "border-[#9fb0a5] bg-[#f1f4ec] text-[#214638]";
  return (
    <div className={`min-w-[7rem] max-w-[14rem] border px-3 py-2 text-center font-mono text-xs ${toneClasses}`}>
      {clause ? clause.raw : "∅ (empty clause)"}
    </div>
  );
}

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
          <TreeNode clause={step.parents[0]} tone="parent" />
          <TreeNode clause={step.parents[1]} tone="parent" />
        </div>
        <svg width="160" height="36" viewBox="0 0 160 36" className="text-line" aria-hidden="true">
          <line x1="20" y1="0" x2="80" y2="36" stroke="currentColor" strokeWidth="1.5" />
          <line x1="140" y1="0" x2="80" y2="36" stroke="currentColor" strokeWidth="1.5" />
        </svg>
        <TreeNode clause={step.resolvent} tone={isFinal ? "final" : "resolvent"} />
        {isFinal && (
          <p className="mt-3 text-xs font-bold text-danger-text">Contradiction. This step disproves satisfiability.</p>
        )}
      </div>
    </div>
  );
}
