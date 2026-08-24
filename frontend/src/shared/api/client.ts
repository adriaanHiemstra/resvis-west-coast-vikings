// Thin HTTP client for our Python backend (Backlog 7 - Reusable API).
//
// Today this only wraps POST /knowledge-base/parse (parses
// a formula into its syntax tree). CNF conversion  and the
// resolution algorithm  aren't built on the backend yet, so
// there's nothing to call for those - functions for them get added
// here once they exist, following this same pattern.

import type { ParseError } from "./types";

const BASE_URL = import.meta.env.VITE_API_BASE_URL ?? "http://localhost:8000";

/** One node in a parsed formula's syntax tree - matches the backend's
 * tree_serializer.py output exactly: a label, plus two optional
 * children (both null for a leaf, e.g. a bare letter like "P"). */
export interface SyntaxTreeNode {
  label: string;
  left: SyntaxTreeNode | null;
  right: SyntaxTreeNode | null;
}

/** One formula's outcome from POST /knowledge-base/parse. */
export interface ParseFormulaResult {
  formula: string;
  success: boolean;
  tree: SyntaxTreeNode | null;
  error: ParseError | null;
}

/**
 * Sends a list of formula strings to the backend and gets back one
 * result per formula, in the same order. A bad formula only affects
 * its own entry - the rest still come back parsed normally.
 */
export async function parseFormulas(
  formulas: string[],
): Promise<ParseFormulaResult[]> {
  const response = await fetch(`${BASE_URL}/knowledge-base/parse`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({ formulas }),
  });
  if (!response.ok) {
    throw new Error(`Parse request failed: ${response.status}`);
  }
  const data = (await response.json()) as { results: ParseFormulaResult[] };
  return data.results;
}
