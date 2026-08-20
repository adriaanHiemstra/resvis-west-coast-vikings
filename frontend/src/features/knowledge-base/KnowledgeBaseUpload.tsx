import { useRef } from "react";
import { Download, Upload } from "lucide-react";
import { Panel } from "@shared/components";
import { insertAtCursor } from "@shared/lib/insertAtCursor";
import { SymbolPalette } from "@features/proposition-input";

interface KnowledgeBaseUploadProps {
  value: string;
  onChange: (value: string) => void;
  error: string | null;
  projectName: string;
}

export function KnowledgeBaseUpload({ value, onChange, error, projectName }: KnowledgeBaseUploadProps) {
  const textareaRef = useRef<HTMLTextAreaElement>(null);
  const fileInputRef = useRef<HTMLInputElement>(null);

  function handleImport(e: React.ChangeEvent<HTMLInputElement>) {
    const file = e.target.files?.[0];
    if (!file) return;
    const reader = new FileReader();
    reader.onload = () => {
      const text = String(reader.result ?? "");
      if (file.name.endsWith(".json")) {
        try {
          const parsed = JSON.parse(text);
          onChange(Array.isArray(parsed.clauses) ? parsed.clauses.join("\n") : String(parsed.knowledgeBase ?? text));
        } catch {
          onChange(text);
        }
      } else {
        onChange(text);
      }
    };
    reader.readAsText(file);
    e.target.value = "";
  }

  function handleExport() {
    const blob = new Blob([value], { type: "text/plain;charset=utf-8" });
    const url = URL.createObjectURL(blob);
    const link = document.createElement("a");
    link.href = url;
    link.download = `${projectName || "resviz-knowledge-base"}.txt`;
    document.body.appendChild(link);
    link.click();
    document.body.removeChild(link);
    URL.revokeObjectURL(url);
  }

  return (
    <Panel
      className="overflow-hidden"
      kicker="01 · Source clauses"
      title="Knowledge Base"
      headerClassName="bg-[#e7ece3]"
      headerExtra={
        <div className="flex flex-wrap gap-2">
          <label className="inline-flex cursor-pointer items-center gap-2 border border-forest bg-warm px-3 py-2 text-sm font-bold text-forest hover:bg-lime">
            <Upload size={16} />
            <span>Import</span>
            <input ref={fileInputRef} type="file" accept=".txt,.json,application/json,text/plain" className="sr-only" onChange={handleImport} />
          </label>
          <button
            type="button"
            onClick={handleExport}
            className="inline-flex items-center gap-2 border border-forest bg-warm px-3 py-2 text-sm font-bold text-forest transition-transform duration-150 hover:-translate-y-0.5"
          >
            <Download size={16} />
            Export
          </button>
        </div>
      }
    >
      <div className="p-5 sm:p-6">
        <label htmlFor="knowledge-editor" className="mb-2 block text-sm font-bold text-ink">
          Facts and clauses
        </label>
        <textarea
          id="knowledge-editor"
          ref={textareaRef}
          spellCheck={false}
          value={value}
          onChange={(e) => onChange(e.target.value)}
          className="editor-area"
          aria-describedby="knowledge-help"
          aria-invalid={error ? true : undefined}
        />
        <p id="knowledge-help" className="mt-3 text-sm leading-relaxed text-muted">
          Write one clause per line. Use the symbols from the palette below to represent logical relationships.
        </p>
        <SymbolPalette
          ariaLabel="Logical symbol palette for knowledge base"
          onInsert={(symbol) => insertAtCursor(textareaRef.current, value, symbol, onChange)}
        />
        {error && (
          <div className="mt-4 border border-[#e6b2a7] bg-danger-soft p-3 text-sm leading-relaxed text-danger-text" role="alert">
            {error}
          </div>
        )}
      </div>
    </Panel>
  );
}
