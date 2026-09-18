import {
  forwardRef,
  useImperativeHandle,
  useRef,
  useState,
} from "react";
import { parseFormulas } from "@shared/api/client";

interface LineByLineEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export interface LineByLineEditorHandle {
  insertSymbol: (symbol: string) => void;
}

/* One real <input> per KB line instead of a single <textarea>, because a
   plain textarea can't background-color individual lines differently -
   this is what lets each line show its own valid/invalid highlight. */
export const LineByLineEditor = forwardRef<
  LineByLineEditorHandle,
  LineByLineEditorProps
>(function LineByLineEditor({ value, onChange }, ref) {
  const lines = value.split("\n");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const focusedIndexRef = useRef(0);
  /* Keyed by line index, and each entry remembers the exact text it was
     validated against (`text`) - see the `status` check below for why. */
  const [lineStatuses, setLineStatuses] = useState<
    Record<number, { status: "valid" | "invalid"; message?: string; text: string }>
  >({});

  function handleLineChange(index: number, newText: string) {
    const nextLines = [...lines];
    nextLines[index] = newText;
    onChange(nextLines.join("\n"));
  }

  /* Calls the real parse endpoint for just this one line and records
     whether it was valid, tagged with the exact text it was checked
     against so a later edit can tell the highlight is stale. */
  async function validateLine(index: number, text: string) {
    if (!text.trim()) return;
    try {
      const [result] = await parseFormulas([text]);
      setLineStatuses((prev) => ({
        ...prev,
        [index]: result.success
          ? { status: "valid", text }
          : { status: "invalid", message: result.error?.message, text },
      }));
    } catch {
      console.error("Could not validate line", index);
    }
  }

  /* Revalidates on leaving a line, but only if the text actually changed
     since the last check - avoids re-hitting the API on every stray blur. */
  function handleLineBlur(index: number) {
    const text = lines[index] ?? "";
    if (lineStatuses[index]?.text === text) return;
    validateLine(index, text);
  }

  /* Reimplements Enter-splits-the-line by hand, since splitting one
     textarea into many inputs breaks that normal browser behaviour -
     slices the current line at the cursor and moves the tail to a new line. */
  function handleLineKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key !== "Enter") return;
    event.preventDefault();

    const cursorPosition =
      event.currentTarget.selectionStart ?? lines[index].length;
    const textBeforeCursor = lines[index].slice(0, cursorPosition);
    const textAfterCursor = lines[index].slice(cursorPosition);

    const nextLines = [
      ...lines.slice(0, index),
      textBeforeCursor,
      textAfterCursor,
      ...lines.slice(index + 1),
    ];
    onChange(nextLines.join("\n"));
    validateLine(index, textBeforeCursor);

    requestAnimationFrame(() => {
      const nextInput = inputRefs.current[index + 1];
      nextInput?.focus();
      nextInput?.setSelectionRange(0, 0);
    });
  }

  /* Inserts at the caret of whichever line was last focused (focusedIndexRef),
     not just appended to the end - exposed to the parent via the ref below. */
  function insertSymbol(symbol: string) {
    const index = focusedIndexRef.current;
    const input = inputRefs.current[index];
    const cursorPosition = input?.selectionStart ?? lines[index].length;
    const line = lines[index] ?? "";
    const newLine =
      line.slice(0, cursorPosition) + symbol + line.slice(cursorPosition);
    handleLineChange(index, newLine);

    const nextCursorPosition = cursorPosition + symbol.length;
    requestAnimationFrame(() => {
      const target = inputRefs.current[index];
      target?.focus();
      target?.setSelectionRange(nextCursorPosition, nextCursorPosition);
    });
  }

  /* Lets KnowledgeBaseUpload call insertSymbol via editorRef.current -
     needed because this component has no visible prop for it otherwise. */
  useImperativeHandle(ref, () => ({ insertSymbol }));

  return (
    <div className="w-full min-h-[220px] border border-[#b7c7bb] bg-[#fbfaf5] py-2 focus-within:border-forest">
      {lines.map((line, index) => {
        const rawStatus = lineStatuses[index];
        /* A stored status only counts if it was validated against this
           exact text - once the line is edited (or a different line
           shifts into this index, e.g. after an Enter split or an
           import replacing the whole value), the stale color must not
           carry over until the new text is (re)validated. */
        const status = rawStatus?.text === line ? rawStatus : undefined;
        const backgroundClass =
          status?.status === "valid"
            ? "bg-success-soft"
            : status?.status === "invalid"
              ? "bg-danger-soft"
              : "bg-transparent";

        return (
          <div key={index}>
            <input
              ref={(el) => {
                inputRefs.current[index] = el;
              }}
              value={line}
              onChange={(e) => handleLineChange(index, e.target.value)}
              onKeyDown={(e) => handleLineKeyDown(index, e)}
              onFocus={() => {
                focusedIndexRef.current = index;
              }}
              onBlur={() => handleLineBlur(index)}
              spellCheck={false}
              className={`w-full border-none px-4 font-mono text-[0.83rem] leading-[1.85] text-[#1c3128] outline-none ${backgroundClass}`}
            />
            {status?.status === "invalid" && (
              <p className="px-4 text-xs text-danger-text">{status.message}</p>
            )}
          </div>
        );
      })}
    </div>
  );
});
