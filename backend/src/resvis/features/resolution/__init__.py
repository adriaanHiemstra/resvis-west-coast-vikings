"""Backlog 5: priority-based propositional resolution."""

from resvis.features.resolution.models import (
    ClauseOrigin,
    ClauseRecord,
    ResolutionCandidate,
    ResolutionResult,
    ResolutionStatus,
    ResolutionStep,
)
from resvis.features.resolution.engine import ResolutionEngine, resolve_pair
from resvis.features.resolution.explain import explain_step
from resvis.features.resolution.prioritiser import ClausePrioritiser

__all__ = [
    "ClauseOrigin",
    "ClausePrioritiser",
    "ClauseRecord",
    "ResolutionCandidate",
    "ResolutionEngine",
    "ResolutionResult",
    "ResolutionStatus",
    "ResolutionStep",
    "explain_step",
    "resolve_pair",
]
