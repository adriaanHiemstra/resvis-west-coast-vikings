import type { Clause, DerivationTrace } from "@shared/api/types";

/**
 * One clause placed into the full derivation tree. Column 0 holds every
 * original clause (the knowledge base plus the negated goal); each
 * resolution step afterwards contributes exactly one clause to its own
 * column, numbered by that step's index. Row is its vertical position: an
 * original clause gets the next free row, and a derived clause sits at the
 * midpoint between the rows of the two clauses it was resolved from.
 */
export interface TreeColumnNode {
  id: string;
  /** null means this node is the empty clause (a contradiction), not a real clause. */
  clause: Clause | null;
  column: number;
  /** null for an original (column 0) clause; otherwise the step that derived it. */
  stepIndex: number | null;
  row: number;
}

/** A connecting line from a parent clause to the clause it was resolved into. */
export interface TreeEdge {
  fromId: string;
  toId: string;
  stepIndex: number;
}

export interface TreeLayout {
  nodes: TreeColumnNode[];
  edges: TreeEdge[];
}

export function buildTreeLayout(trace: DerivationTrace): TreeLayout {
  const nodes: TreeColumnNode[] = [];
  const edges: TreeEdge[] = [];
  const rowById = new Map<string, number>();

  const addOriginal = (clause: Clause) => {
    const row = rowById.size;
    rowById.set(clause.id, row);
    nodes.push({ id: clause.id, clause, column: 0, stepIndex: null, row });
  };

  for (const clause of trace.kbClauses) addOriginal(clause);
  if (trace.goalClause) addOriginal(trace.goalClause);

  for (const step of trace.steps) {
    const [left, right] = step.parents;
    const row = ((rowById.get(left.id) ?? 0) + (rowById.get(right.id) ?? 0)) / 2;

    const id = step.resolvent ? step.resolvent.id : `empty-${step.index}`;
    rowById.set(id, row);
    nodes.push({ id, clause: step.resolvent, column: step.index, stepIndex: step.index, row });

    edges.push({ fromId: left.id, toId: id, stepIndex: step.index });
    edges.push({ fromId: right.id, toId: id, stepIndex: step.index });
  }

  return { nodes, edges };
}
