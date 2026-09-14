import { useState } from "react";
import { createPortal } from "react-dom";
import { GitBranch, List, Maximize2, Minimize2, Network, Route } from "lucide-react";
import type { DerivationTrace } from "@shared/api/types";
import { verdictLabel, verdictTone } from "@features/ux-theme";
import { StepListView } from "./StepListView";

interface ResolutionTraceProps {
  trace: DerivationTrace | null;
  traceIndex: number;
  onTraceIndexChange: (index: number) => void;
}

const TONE_BANNER: Record<"success" | "danger" | "muted", string> = {
  success: "bg-success-soft text-[#1f5c2e] border-[#bfe0ac]",
  danger: "bg-danger-soft text-danger-text border-[#e6b2a7]",
  muted: "bg-[#edf0e8] text-[#365448] border-line",
};

export function ResolutionTrace({ trace, traceIndex, onTraceIndexChange }: ResolutionTraceProps) {
  const [fullscreen, setFullscreen] = useState(false);
  const [view, setView] = useState<"list" | "tree">("list");

  const hasTrace = trace !== null && trace.steps.length > 0;

  const panel = (
    <section
      className={
        fullscreen
          ? "fixed inset-0 z-30 h-screen w-full overflow-y-auto bg-warm shadow-[0_0_0_100vmax_rgba(17,37,29,0.52)]"
          : "overflow-hidden border border-line bg-warm shadow-panel"
      }
      aria-labelledby="trace-heading"
    >
      <div className="border-b border-line bg-forest p-5">
        <div className="flex items-start justify-between gap-4">
          <div>
            <p className="text-xs font-bold uppercase tracking-[0.16em] text-lime">03 · Derivation</p>
            <h2 id="trace-heading" className="mt-1 text-xl font-bold text-white">
              Resolution trace
            </h2>
          </div>
          <div className="flex items-center gap-2">
            {hasTrace && (
              <div className="flex border border-[#7c9d8e]">
                <button
                  type="button"
                  onClick={() => setView("list")}
                  aria-pressed={view === "list"}
                  className={`grid h-9 w-9 place-items-center transition-colors ${view === "list" ? "bg-lime text-forest" : "text-lime hover:bg-[#286451]"}`}
                  aria-label="Show list view"
                >
                  <List size={16} />
                </button>
                <button
                  type="button"
                  onClick={() => setView("tree")}
                  aria-pressed={view === "tree"}
                  className={`grid h-9 w-9 place-items-center transition-colors ${view === "tree" ? "bg-lime text-forest" : "text-lime hover:bg-[#286451]"}`}
                  aria-label="Show tree view"
                >
                  <GitBranch size={16} />
                </button>
              </div>
            )}
            <button
              type="button"
              onClick={() => setFullscreen((f) => !f)}
              aria-label={fullscreen ? "Collapse resolution trace" : "Expand resolution trace"}
              aria-pressed={fullscreen}
              className="grid h-9 w-9 place-items-center border border-[#7c9d8e] text-lime transition-colors hover:bg-[#286451]"
            >
              {fullscreen ? <Minimize2 size={17} /> : <Maximize2 size={17} />}
            </button>
            <Network className="text-lime" size={23} aria-hidden="true" />
          </div>
        </div>

        {!hasTrace && (
          <div className="p-8 text-center">
            <div className="mx-auto grid h-12 w-12 place-items-center rounded-full border border-[#aebcab] bg-[#edf0e8] text-forest">
              <Route size={22} />
            </div>
            <h3 className="mt-4 text-lg font-bold text-white">Your proof will appear here</h3>
            <p className="mt-2 text-sm leading-relaxed text-[#cfe0d6]">
              Run the resolver to inspect input clauses, parent clauses, derived resolvents, and the final answer.
            </p>
          </div>
        )}
      </div>

      {hasTrace && trace && (
        <div className={fullscreen ? "mx-auto max-w-4xl" : ""}>
          <div className={`border-b border-[#d4dbd0] p-5 ${TONE_BANNER[verdictTone(trace.verdict)]}`} aria-live="polite">
            <p className="text-xs font-bold uppercase tracking-[0.16em]">{verdictLabel(trace.verdict)}</p>
            <p className="mt-1 text-sm leading-relaxed">
              {trace.verdict === true &&
                "A contradiction was derived. The goal follows from the knowledge base."}
              {trace.verdict === false &&
                "No contradiction was found. The goal does not follow from the knowledge base."}
              {trace.verdict === null &&
                `The step limit (${trace.stepLimit}) was reached before a definitive answer — try a smaller knowledge base or a simpler goal.`}
            </p>
          </div>
            {view === "list" ? (
            <StepListView steps={trace.steps} currentIndex={traceIndex} />
          ) : (
            <StepListView steps={trace.steps} currentIndex={traceIndex} />
          )}
        </div>
      )}
    </section>
  );

  return fullscreen ? createPortal(panel, document.body) : panel;
}
