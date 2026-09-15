// Thin HTTP client for our Python backend (Backlog 7 - Reusable API).
//
// Each function below owns one backend request and exposes its response type.

import type { Clause, DerivationTrace, ParseError, ResolutionStep, Verdict } from "./types";


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

/**
 * Helper function for toDerivationTrace
 * Maps a clause record onto the a 'Clause' defined in types.ts. The backend doesn't
 * echo back which KB line a clause came from, so "kb" clauses are numbered
 * by the order they appear in 'result.clauses' (input order) as a stand-in
 * for a real line number, and "derived" clauses look up their producing
 * step number from 'stepByResolventId'.
 */
function toClause(record: ResolutionClauseRecord, kbLine: number, stepByResolventId: Map<number, number>): Clause {
  const source: Clause["source"] =
    record.origin === "negated_goal"
      ? { kind: "goal" }
      : record.origin === "derived"
        ? { kind: "derived", step: stepByResolventId.get(record.clause_id) ?? 0 }
        : { kind: "kb", line: kbLine };

  return {
    id: String(record.clause_id),
    literals: record.clause.literals,
    raw: record.clause.raw,
    goalRelated: record.goal_distance !== null,
    source,
  };
}

/** Backend to frontend reconciliation. Converts a backend '/resolution/run' response into the 'DerivationTrace' shape the trace viewer renders. */
export function toDerivationTrace(response: RunResolutionResponse, stepLimit: number): DerivationTrace | null {
  const result = response.result;
  if (!result) return null;

  const stepByResolventId = new Map(result.steps.map((step) => [step.resolvent_clause_id, step.step_number]));

  let kbLine = 0;
  const clauseById = new Map<number, Clause>();
  for (const record of result.clauses) {
    clauseById.set(record.clause_id, toClause(record, record.origin === "knowledge_base" ? kbLine++ : -1, stepByResolventId));
  }

  const getClause = (id: number): Clause => {
    const clause = clauseById.get(id);
    if (!clause) throw new Error(`Resolution response referenced unknown clause id ${id}`);
    return clause;
  };

  const steps: ResolutionStep[] = result.steps.map((step) => ({
    index: step.step_number,
    parents: [getClause(step.left_clause_id), getClause(step.right_clause_id)],
    resolvent: step.is_contradiction ? null : getClause(step.resolvent_clause_id),
    resolvedOn: step.pivot,
    isEmptyClause: step.is_contradiction,
  }));

  const kbClauses = result.clauses.filter((record) => record.origin === "knowledge_base").map((record) => getClause(record.clause_id));
  const goalRecord = result.clauses.find((record) => record.origin === "negated_goal");

  const verdict: Verdict = result.status === "entailed" ? true : result.status === "not_entailed" ? false : null;

  return {
    verdict,
    steps,
    stepLimit,
    stepLimitReached: result.status === "limit_reached",
    kbClauses,
    goalClause: goalRecord ? getClause(goalRecord.clause_id) : null,
  };
}
