import { useRef } from "react";
import { Play } from "lucide-react";
import { Panel, Button } from "@shared/components";
import { insertAtCursor } from "@shared/lib/insertAtCursor";
import { SymbolPalette } from "./SymbolPalette";

interface PropositionEditorProps {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  summary: string;
  onRun: () => void;
  running: boolean;
}

export function PropositionEditor({ value, onChange, error, summary, onRun, running }: PropositionEditorProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);

  return (
    <Panel
      className="overflow-hidden"
      headerClassName="bg-[#edf0e8] block sm:block"
      kicker="02 · Question"
      title="Goal / Logical Formula"
    >
      <div className="p-5 sm:p-6">
        <label htmlFor="goal-editor" className="mb-2 block text-sm font-bold text-ink">
          Goal to verify
        </label>
        <textarea
          id="goal-editor"
          ref={textareaRef}
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="editor-area min-h-[132px]"
          aria-describedby="goal-help"
          aria-invalid={error ? true : undefined}
        />
        <p id="goal-help" className="mt-3 text-sm leading-relaxed text-muted">
          Enter one goal to verify. ResViz runs the resolution against the knowledge base and searches for a contradiction.
        </p>
        {error && (
          <div className="mt-4 border border-[#e6b2a7] bg-danger-soft p-3 text-sm leading-relaxed text-danger-text" role="alert">
            {error}
          </div>
        )}
        <SymbolPalette
          ariaLabel="Logical symbol palette for goal"
          onInsert={(symbol) => insertAtCursor(textareaRef.current, value, symbol, onChange)}
        />
        <div className="mt-6 flex flex-wrap items-center justify-between gap-3 border-t border-[#d9dfd5] pt-5">
          <p className="font-mono text-xs text-[#50645a]" aria-live="polite">
            {summary}
          </p>
          <Button variant="primary" icon={<Play size={16} />} onClick={onRun} disabled={running}>
            {running ? "Running…" : "Run Resolution"}
          </Button>
        </div>
      </div>
    </Panel>
  );
}
