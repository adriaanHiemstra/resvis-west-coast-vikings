// Thin HTTP client for our Python backend (Backlog 7 - Reusable API).
//
// Each function below owns one backend request and exposes its response type.

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

export interface ConvertFormulaResult {
  formula: string;
  negated: boolean;
  success: boolean;
  cnf: {
    raw: string;
    is_tautology: boolean;
    clauses: {
      raw: string;
      literals: {
        symbol: string;
        negated: boolean;
      }[];
    }[];
  } | null;
  error: ParseError | null;
}

export async function convertFormulas(
  formulas: string[],
): Promise<ConvertFormulaResult[]> {
  const response = await fetch(`${BASE_URL}/cnf/convert`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      formulas,
      negate: false,
    }),
  });

  if (!response.ok) {
    throw new Error(`CNF conversion failed: ${response.status}`);
  }

  const data = (await response.json()) as {
    results: ConvertFormulaResult[];
  };

  return data.results;
}

export interface ResolutionClause {
  literals: {
    symbol: string;
    negated: boolean;
  }[];
  raw: string;
}

export interface ResolutionCnf {
  clauses: ResolutionClause[];
  raw: string;
  is_tautology: boolean;
}

export interface ResolutionClauseRecord {
  clause_id: number;
  clause: ResolutionClause;
  origin: "knowledge_base" | "negated_goal" | "derived";
  depth: number;
  goal_distance: number | null;
}

export interface ResolutionProofStep {
  step_number: number;
  left_clause_id: number;
  right_clause_id: number;
  pivot: string;
  resolvent_clause_id: number;
  resolvent: ResolutionClause;
  is_contradiction: boolean;
}

export interface ResolutionResult {
  status: "entailed" | "not_entailed" | "limit_reached";
  entailed: boolean;
  completed: boolean;
  clauses: ResolutionClauseRecord[];
  steps: ResolutionProofStep[];
  limit_reason: string | null;
}

export interface RunResolutionResponse {
  success: boolean;
  knowledge_base_cnf: ResolutionCnf | null;
  negated_goal_cnf: ResolutionCnf | null;
  result: ResolutionResult | null;
  error: (ParseError & { formula: string; position: number }) | null;
}

export interface RunResolutionOptions {
  maxSteps?: number;
  maxClauses?: number;
}

/** Runs parser -> CNF conversion -> priority-based resolution. */
export async function runResolution(
  knowledgeBase: string[],
  goal: string,
  options: RunResolutionOptions = {},
): Promise<RunResolutionResponse> {
  const response = await fetch(`${BASE_URL}/resolution/run`, {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify({
      knowledge_base: knowledgeBase,
      goal,
      max_steps: options.maxSteps ?? 1_000,
      max_clauses: options.maxClauses ?? 500,
    }),
  });

  if (!response.ok) {
    throw new Error(`Resolution request failed: ${response.status}`);
  }

  return (await response.json()) as RunResolutionResponse;
}
