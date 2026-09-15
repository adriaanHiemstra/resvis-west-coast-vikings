import type { Clause } from "@shared/api/types";

export type TreeNodeTone = "parent" | "resolvent" | "final";

interface TreeNodeBoxProps {
  clause: Clause | null;
  tone: TreeNodeTone;
  /** Marks this box as belonging to the step currently selected by the debugger controls. */
  highlighted?: boolean;
}

/** One clause box in a tree diagram, shared by the single-step tree view and the full-tree view. */
export function TreeNodeBox({ clause, tone, highlighted }: TreeNodeBoxProps) {
  const toneClasses =
    tone === "final"
      ? "border-danger bg-danger-soft text-danger-text"
      : tone === "resolvent"
        ? "border-teal bg-[#eef8f4] text-[#0f4a44]"
        : "border-[#9fb0a5] bg-[#f1f4ec] text-[#214638]";
  const highlightClasses = highlighted ? "ring-2 ring-offset-1 ring-[#177d78]" : "";

  return (
    <div
      className={`min-w-[7rem] max-w-[14rem] border px-3 py-2 text-center font-mono text-xs ${toneClasses} ${highlightClasses}`}
    >
      {clause ? clause.raw : "∅ (empty clause)"}
    </div>
  );
}
