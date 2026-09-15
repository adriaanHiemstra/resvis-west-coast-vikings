"""Plain-English explanations for resolution steps.

The resolution engine produces mathematically correct but symbol-heavy
records (clause IDs, a pivot symbol, a resolvent). This module translates
a single step into a sentence a human can read without knowing what
resolution is, in service of the client's explainability requirement.
"""

from __future__ import annotations

from resvis.features.resolution.models import ClauseRecord, ResolutionCandidate

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