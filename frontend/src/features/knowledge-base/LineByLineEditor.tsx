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

export const LineByLineEditor = forwardRef<
  LineByLineEditorHandle,
  LineByLineEditorProps
>(function LineByLineEditor({ value, onChange }, ref) {
  const lines = value.split("\n");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);
  const focusedIndexRef = useRef(0);
  const [lineStatuses, setLineStatuses] = useState<
    Record<number, { status: "valid" | "invalid"; message?: string }>
  >({});

  function handleLineChange(index: number, newText: string) {
    const nextLines = [...lines];
    nextLines[index] = newText;
    onChange(nextLines.join("\n"));
  }

  async function validateLine(index: number, text: string) {
    if (!text.trim()) return;
    try {
      const [result] = await parseFormulas([text]);
      setLineStatuses((prev) => ({
        ...prev,
        [index]: result.success
          ? { status: "valid" }
          : { status: "invalid", message: result.error?.message },
      }));
    } catch {
      console.error("Could not validate line", index);
    }
  }

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

  useImperativeHandle(ref, () => ({ insertSymbol }));

  return (
    <div className="w-full min-h-[220px] border border-[#b7c7bb] bg-[#fbfaf5] py-2 focus-within:border-forest">
      {lines.map((line, index) => {
        const status = lineStatuses[index];
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
