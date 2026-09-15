import type { Clause, DerivationTrace } from "@shared/api/types";

/**
 * One clause placed into the full derivation tree. Column 0 holds every
 * original clause (the knowledge base plus the negated goal); each
 * resolution step afterwards contributes exactly one clause to its own
 * column, numbered by that step's index.
 */
export interface TreeColumnNode {
  id: string;
  /** null means this node is the empty clause (a contradiction), not a real clause. */
  clause: Clause | null;
  column: number;
  /** null for an original (column 0) clause; otherwise the step that derived it. */
  stepIndex: number | null;
}

export function buildTreeColumns(trace: DerivationTrace): TreeColumnNode[] {
  const nodes: TreeColumnNode[] = [];

  for (const clause of trace.kbClauses) {
    nodes.push({ id: clause.id, clause, column: 0, stepIndex: null });
  }
  if (trace.goalClause) {
    nodes.push({ id: trace.goalClause.id, clause: trace.goalClause, column: 0, stepIndex: null });
  }

  for (const step of trace.steps) {
    const id = step.resolvent ? step.resolvent.id : `empty-${step.index}`;
    nodes.push({ id, clause: step.resolvent, column: step.index, stepIndex: step.index });
  }

  return nodes;
}
