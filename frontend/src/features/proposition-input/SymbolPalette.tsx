interface SymbolDef {
  symbol: string;
  label: string;
}

const SYMBOLS: SymbolDef[] = [
  { symbol: "¬", label: "Insert negation symbol" },
  { symbol: " ∧ ", label: "Insert conjunction symbol" },
  { symbol: " ∨ ", label: "Insert disjunction symbol" },
  { symbol: " → ", label: "Insert implication symbol" },
  { symbol: " ↔ ", label: "Insert equivalence symbol" },
  { symbol: " ⊥ ", label: "Insert contradiction symbol" },
  { symbol: "∀", label: "Insert universal quantifier" },
  { symbol: "∃", label: "Insert existential quantifier" },
  { symbol: "(", label: "Insert opening parenthesis" },
  { symbol: ")", label: "Insert closing parenthesis" },
];

interface SymbolPaletteProps {
  onInsert: (symbol: string) => void;
  ariaLabel: string;
}

export function SymbolPalette({ onInsert, ariaLabel }: SymbolPaletteProps) {
  return (
    <div className="mt-5 border-t border-[#d9dfd5] pt-5">
      <p className="mb-3 text-xs font-bold uppercase tracking-[0.16em] text-[#517063]">Insert a logical symbol</p>
      <div className="flex flex-wrap gap-2" aria-label={ariaLabel}>
        {SYMBOLS.map((s) => (
          <button
            key={s.label}
            type="button"
            className="symbol-key"
            aria-label={s.label}
            onClick={() => onInsert(s.symbol)}
          >
            {s.symbol.trim()}
          </button>
        ))}
      </div>
    </div>
  );
}
