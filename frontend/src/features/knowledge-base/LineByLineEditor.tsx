import { useRef } from "react";

interface LineByLineEditorProps {
  value: string;
  onChange: (value: string) => void;
}

export function LineByLineEditor({ value, onChange }: LineByLineEditorProps) {
  const lines = value.split("\n");
  const inputRefs = useRef<(HTMLInputElement | null)[]>([]);

  function handleLineChange(index: number, newText: string) {
    const nextLines = [...lines];
    nextLines[index] = newText;
    onChange(nextLines.join("\n"));
  }

  function handleLineKeyDown(
    index: number,
    event: React.KeyboardEvent<HTMLInputElement>,
  ) {
    if (event.key !== "Enter") return;
    event.preventDefault();

    const cursorPosition = event.currentTarget.selectionStart ?? lines[index].length;
    const textBeforeCursor = lines[index].slice(0, cursorPosition);
    const textAfterCursor = lines[index].slice(cursorPosition);

    const nextLines = [
      ...lines.slice(0, index),
      textBeforeCursor,
      textAfterCursor,
      ...lines.slice(index + 1),
    ];
    onChange(nextLines.join("\n"));

    requestAnimationFrame(() => {
      const nextInput = inputRefs.current[index + 1];
      nextInput?.focus();
      nextInput?.setSelectionRange(0, 0);
    });
  }

  return (
    <div className="w-full min-h-[220px] border border-[#b7c7bb] bg-[#fbfaf5] py-2 focus-within:border-forest">
      {lines.map((line, index) => (
        <input
          key={index}
          ref={(el) => {
            inputRefs.current[index] = el;
          }}
          value={line}
          onChange={(e) => handleLineChange(index, e.target.value)}
          onKeyDown={(e) => handleLineKeyDown(index, e)}
          spellCheck={false}
          className="w-full border-none bg-transparent px-4 font-mono text-[0.83rem] leading-[1.85] text-[#1c3128] outline-none"
        />
      ))}
    </div>
  );
}
