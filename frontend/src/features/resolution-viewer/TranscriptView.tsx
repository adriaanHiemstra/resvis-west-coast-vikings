interface TranscriptViewProps {
  transcript: string[];
}

/** Plain-English summary of the whole derivation, one line per step plus a final verdict line. */
export function TranscriptView({ transcript }: TranscriptViewProps) {
  if (transcript.length === 0) {
    return <p className="p-5 text-xs text-[#517063]">No transcript available for this derivation.</p>;
  }

  const lastIndex = transcript.length - 1;

  return (
    <ol className="trace-scroll space-y-2 p-5 text-xs leading-relaxed text-[#365448]">
      {transcript.map((line, i) => (
        <li key={i} className={i === lastIndex ? "mt-1 border-t border-line pt-3 font-bold" : undefined}>
          {line}
        </li>
      ))}
    </ol>
  );
}
