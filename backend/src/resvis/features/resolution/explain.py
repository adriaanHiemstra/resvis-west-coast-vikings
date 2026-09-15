"""Plain-English explanations for resolution steps.

The resolution engine produces mathematically correct but symbol-heavy
records (clause IDs, a pivot symbol, a resolvent). This module translates
a single step into a sentence a human can read without knowing what
resolution is, in service of the client's explainability requirement.
"""

from __future__ import annotations

from resvis.features.resolution.models import (
    ClauseRecord,
    ResolutionCandidate,
    ResolutionStatus,
    ResolutionStep,
)

def explain_step(
        left: ClauseRecord,
        right: ClauseRecord,
        candidate: ResolutionCandidate,
) -> str:
    """Explain a single resolution step in plain English."""

    lead = (
        f"Clause {left.clause_id} ({left.clause.raw}) and "
        f"Clause {right.clause_id} ({right.clause.raw}) share {candidate.pivot} "
        f"with opposite signs, so it cancels out, "
    )
    if candidate.is_contradiction:
        return lead + "leaving nothing — a contradiction (⊥)."
    return lead + f"leaving {candidate.resolvent.raw}."

def build_transcript(
        status: ResolutionStatus,
        steps: tuple[ResolutionStep, ...],
        limit_reason: str | None = None,

) -> tuple[str, ...]:
    """Summarize a whole resolution as a bullet point summary"""

    lines= [f"Step {step.step_number}: {step.explanation}" for step in steps]
    lines.append(_verdict_line(status, limit_reason))
    return tuple(lines)

def _verdict_line(status: ResolutionStatus, limit_reason: str | None) -> str:
    if status == ResolutionStatus.ENTAILED:
        return "Verdict: the empty clause (⊥) was derived, so the goal is entailed by the knowledge base."
    if status == ResolutionStatus.NOT_ENTAILED:
        return "Verdict: every useful clause pair was resolved without deriving a contradiction, so the goal is not entailed."
    return f"Verdict: resolution stopped early — {limit_reason} — so entailment is indeterminate."

   