// Domain model mirrors docs/planning/class-diagram.pdf

export interface Literal {
  symbol: string;
  negated: boolean;
}

export interface Clause {
  id: string;
  literals: Literal[];
  /** Human-readable form, e.g "¬P ∨ Q". */
  raw: string;
  /** True if this clause is the negated goal, or was derived from a chain that includes it. */
  goalRelated: boolean;
  /** Where the clause came from: typed KB line, the negated goal, or a derivation step index. */
  source: { kind: "kb"; line: number } | { kind: "goal" } | { kind: "derived"; step: number };
}

export interface ResolutionStep {
  index: number;
  parents: [Clause, Clause];
  /** null resolvent means the empty clause (a contradiction) was derived. */
  resolvent: Clause | null;
  resolvedOn: string;
  isEmptyClause: boolean;
}

/** true = goal proven, false = goal refuted (does not follow), null = indeterminate (step limit reached). */
export type Verdict = boolean | null;

export interface DerivationTrace {
  verdict: Verdict;
  steps: ResolutionStep[];
  stepLimit: number;
  stepLimitReached: boolean;
  kbClauses: Clause[];
  goalClause: Clause | null;
}

export interface ParseError {
  code: string;
  message: string;
  line?: number;
  position?: number;
}

export interface Annotation {
  id: string;
  clauseIndex: number;
  clauseText: string;
  note: string;
  createdAt: string;
}

export interface Project {
  id: string;
  name: string;
  studentName: string;
  knowledgeBase: string;
  goal: string;
  annotations: Annotation[];
  trace: DerivationTrace | null;
  traceIndex: number;
  createdAt: string;
  updatedAt: string;
  lastOpenedAt: string | null;
}

export type ProjectDraft = Pick<Project, "name" | "studentName">;
