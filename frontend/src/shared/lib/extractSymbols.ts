const SYMBOL_TOKEN = /[A-Za-z][A-Za-z0-9]*/g;
const RESERVED_WORDS = new Set(["OR"]);

/**
 * Pulls unique propositional symbols (e.g. "Rain", "a", "b") out of raw knowledge-base text, in
 * order of first appearance. Deliberately tolerant of syntax errors elsewhere in the text
 * this only feeds the annotation picker, not the parser and drops the "OR" separator keyword
 * so it isn't mistaken for a symbol.
 */
export function extractSymbols(text: string): string[] {
  const seen = new Set<string>();
  const symbols: string[] = [];
  for (const match of text.matchAll(SYMBOL_TOKEN)) {
    const token = match[0];
    if (RESERVED_WORDS.has(token.toUpperCase())) continue;
    if (!seen.has(token)) {
      seen.add(token);
      symbols.push(token);
    }
  }
  return symbols;
}
