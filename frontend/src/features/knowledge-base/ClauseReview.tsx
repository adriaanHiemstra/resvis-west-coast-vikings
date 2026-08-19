import { useEffect, useMemo, useState } from "react";
import { StickyNote, Trash2 } from "lucide-react";
import type { Annotation } from "@shared/api/types";
import { Panel, Button } from "@shared/components";
import { extractSymbols } from "@shared/lib/extractSymbols";

interface ClauseReviewProps {
  knowledgeBase: string;
  annotations: Annotation[];
  onSave: (symbol: string, meaning: string) => void;
  onRemove: (annotationId: string) => void;
}

export function ClauseReview({ knowledgeBase, annotations, onSave, onRemove }: ClauseReviewProps) {
  const symbols = useMemo(() => extractSymbols(knowledgeBase), [knowledgeBase]);
  const [selectedSymbol, setSelectedSymbol] = useState<string | null>(symbols[0] ?? null);
  const [meaning, setMeaning] = useState("");

  const activeSymbol = selectedSymbol && symbols.includes(selectedSymbol) ? selectedSymbol : (symbols[0] ?? null);
  const existingAnnotation = activeSymbol ? annotations.find((a) => a.symbol === activeSymbol) : undefined;

  useEffect(() => {
    setMeaning(existingAnnotation?.meaning ?? "");
  }, [activeSymbol, existingAnnotation?.meaning]);

  function handleSave() {
    if (!activeSymbol || !meaning.trim()) return;
    onSave(activeSymbol, meaning.trim());
  }

  return (
    <Panel
      className="overflow-hidden"
      kicker="Study notes"
      title="Clause annotations"
      headerClassName="bg-[#edf0e8]"
      headerExtra={<StickyNote className="text-teal" size={21} aria-hidden="true" />}
    >
      <div className="p-5">
        <label htmlFor="annotation-symbol" className="mb-2 block text-sm font-bold text-ink">
          Attach note to
        </label>
        {symbols.length === 0 ? (
          <select id="annotation-symbol" disabled className="w-full border border-[#b7c7bb] bg-[#fbfaf5] p-3 text-sm text-ink">
            <option>Add a knowledge-base clause to annotate its symbols</option>
          </select>
        ) : (
          <select
            id="annotation-symbol"
            value={activeSymbol ?? ""}
            onChange={(e) => setSelectedSymbol(e.target.value)}
            className="w-full border border-[#b7c7bb] bg-[#fbfaf5] p-3 text-sm text-ink"
          >
            {symbols.map((s) => (
              <option key={s} value={s}>
                {s}
                {annotations.some((a) => a.symbol === s) ? " · has a note" : ""}
              </option>
            ))}
          </select>
        )}

        <label htmlFor="annotation-note" className="mb-2 mt-4 block text-sm font-bold text-ink">
          Meaning
        </label>
        <textarea
          id="annotation-note"
          rows={3}
          value={meaning}
          onChange={(e) => setMeaning(e.target.value)}
          disabled={symbols.length === 0}
          className="w-full resize-y border border-[#b7c7bb] bg-[#fbfaf5] p-3 text-sm leading-relaxed outline-none focus:border-forest disabled:opacity-55"
          placeholder="e.g. WetRoad means the access road was flagged as impassable."
        />
        <Button variant="primary" className="mt-3" disabled={symbols.length === 0 || !meaning.trim()} onClick={handleSave}>
          {existingAnnotation ? "Update Note" : "Save Note"}
        </Button>

        <p className="mt-4 text-sm leading-relaxed text-muted">
          Notes stay attached to the symbol wherever it appears in this project — one meaning per symbol.
        </p>

        <div className="mt-4 space-y-3">
          {annotations.length === 0 ? (
            <p className="text-sm text-muted">No annotations yet. Pick a symbol above and describe what it means.</p>
          ) : (
            annotations.map((a) => (
              <div key={a.id} className="border-l-[3px] border-[#79a998] bg-[#f3f6ee] p-3">
                <div className="flex items-start justify-between gap-3">
                  <div>
                    <p className="font-mono text-xs font-bold text-[#365448]">{a.symbol}</p>
                    <p className="mt-1 text-sm leading-relaxed text-ink">{a.meaning}</p>
                  </div>
                  <button
                    type="button"
                    aria-label={`Remove note for ${a.symbol}`}
                    onClick={() => onRemove(a.id)}
                    className="flex-none text-muted transition-colors hover:text-danger"
                  >
                    <Trash2 size={15} />
                  </button>
                </div>
              </div>
            ))
          )}
        </div>
      </div>
    </Panel>
  );
}
