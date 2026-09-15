import { expect, it, vi } from "vitest";

import { runResolution } from "@shared/api/client";

it("surfaces the explanation and transcript fields from the backend response", async () => {
  const canned = {
    success: true,
    knowledge_base_cnf: null,
    negated_goal_cnf: null,
    result: {
      status: "entailed",
      entailed: true,
      completed: true,
      clauses: [],
      steps: [
        {
          step_number: 1,
          left_clause_id: 1,
          right_clause_id: 2,
          pivot: "P",
          resolvent_clause_id: 3,
          resolvent: { literals: [], raw: "⊥" },
          is_contradiction: true,
          explanation:
            "Clause 1 (P) and Clause 2 (¬P) share P with opposite signs, so it cancels out, leaving nothing — a contradiction (⊥).",
        },
      ],
      limit_reason: null,
      transcript: [
        "Step 1: Clause 1 (P) and Clause 2 (¬P) share P with opposite signs, so it cancels out, leaving nothing — a contradiction (⊥).",
        "Verdict: the empty clause (⊥) was derived, so the goal is entailed by the knowledge base.",
      ],
    },
    error: null,
  };

  vi.stubGlobal(
    "fetch",
    vi.fn().mockResolvedValue({
      ok: true,
      json: () => Promise.resolve(canned),
    }),
  );

  const response = await runResolution(["P"], "Q");

  expect(response.result?.steps[0].explanation).toBe(
    canned.result.steps[0].explanation,
  );
  expect(response.result?.transcript).toEqual(canned.result.transcript);
});
