"""Immutable domain records for resolution and its derivation trace.

The resolution engine will operate on the clause objects produced by the CNF
converter. These records add stable identifiers and proof metadata without
duplicating the existing Literal and Clause implementations.
"""

from __future__ import annotations

from dataclasses import dataclass
from enum import Enum
from typing import Iterator

from resvis.features.cnf.models import Clause


class ClauseOrigin(str, Enum):
    """Where a clause entered the resolution search."""

    KNOWLEDGE_BASE = "knowledge_base"
    NEGATED_GOAL = "negated_goal"
    DERIVED = "derived"


class ResolutionStatus(str, Enum):
    """The reason a resolution search stopped."""

    ENTAILED = "entailed"
    NOT_ENTAILED = "not_entailed"
    LIMIT_REACHED = "limit_reached"


@dataclass(frozen=True, slots=True)
class ClauseRecord:
    """A CNF clause with an identity and its place in the search."""

    clause_id: int
    clause: Clause
    origin: ClauseOrigin
    depth: int = 0

    def __post_init__(self) -> None:
        if not isinstance(self.clause_id, int) or isinstance(self.clause_id, bool):
            raise TypeError("ClauseRecord.clause_id must be an integer")
        if self.clause_id < 1:
            raise ValueError("ClauseRecord.clause_id must be positive")
        if not isinstance(self.clause, Clause):
            raise TypeError("ClauseRecord.clause must be a Clause")
        if not isinstance(self.origin, ClauseOrigin):
            raise TypeError("ClauseRecord.origin must be a ClauseOrigin")
        if not isinstance(self.depth, int) or isinstance(self.depth, bool):
            raise TypeError("ClauseRecord.depth must be an integer")
        if self.depth < 0:
            raise ValueError("ClauseRecord.depth cannot be negative")

    def to_dict(self) -> dict[str, object]:
        return {
            "clause_id": self.clause_id,
            "clause": self.clause.to_dict(),
            "origin": self.origin.value,
            "depth": self.depth,
        }


@dataclass(frozen=True, slots=True)
class ResolutionCandidate:
    """A resolvent produced from one complementary pivot."""

    pivot: str
    resolvent: Clause

    def __post_init__(self) -> None:
        if not isinstance(self.pivot, str) or not self.pivot:
            raise ValueError("ResolutionCandidate.pivot must be a non-empty symbol")
        if not isinstance(self.resolvent, Clause):
            raise TypeError("ResolutionCandidate.resolvent must be a Clause")

    @property
    def is_contradiction(self) -> bool:
        return self.resolvent.is_empty

    def to_dict(self) -> dict[str, object]:
        return {
            "pivot": self.pivot,
            "resolvent": self.resolvent.to_dict(),
            "is_contradiction": self.is_contradiction,
        }


@dataclass(frozen=True, slots=True)
class ResolutionStep:
    """One successful application of the binary resolution rule."""

    step_number: int
    left_clause_id: int
    right_clause_id: int
    pivot: str
    resolvent_clause_id: int
    resolvent: Clause

    def __post_init__(self) -> None:
        identifiers = {
            "step_number": self.step_number,
            "left_clause_id": self.left_clause_id,
            "right_clause_id": self.right_clause_id,
            "resolvent_clause_id": self.resolvent_clause_id,
        }
        for name, value in identifiers.items():
            if not isinstance(value, int) or isinstance(value, bool):
                raise TypeError(f"ResolutionStep.{name} must be an integer")
            if value < 1:
                raise ValueError(f"ResolutionStep.{name} must be positive")

        if self.left_clause_id == self.right_clause_id:
            raise ValueError("A resolution step needs two different parent clauses")
        if not isinstance(self.pivot, str) or not self.pivot:
            raise ValueError("ResolutionStep.pivot must be a non-empty symbol")
        if not isinstance(self.resolvent, Clause):
            raise TypeError("ResolutionStep.resolvent must be a Clause")

    @property
    def is_contradiction(self) -> bool:
        """Whether this step derived the empty clause."""

        return self.resolvent.is_empty

    def to_dict(self) -> dict[str, object]:
        return {
            "step_number": self.step_number,
            "left_clause_id": self.left_clause_id,
            "right_clause_id": self.right_clause_id,
            "pivot": self.pivot,
            "resolvent_clause_id": self.resolvent_clause_id,
            "resolvent": self.resolvent.to_dict(),
            "is_contradiction": self.is_contradiction,
        }


@dataclass(frozen=True, slots=True)
class ResolutionResult:
    """Final resolution outcome together with its reproducible proof trace."""

    status: ResolutionStatus
    clauses: tuple[ClauseRecord, ...] = ()
    steps: tuple[ResolutionStep, ...] = ()
    limit_reason: str | None = None

    def __post_init__(self) -> None:
        if not isinstance(self.status, ResolutionStatus):
            raise TypeError("ResolutionResult.status must be a ResolutionStatus")
        if any(not isinstance(clause, ClauseRecord) for clause in self.clauses):
            raise TypeError("ResolutionResult.clauses must contain ClauseRecord objects")
        if any(not isinstance(step, ResolutionStep) for step in self.steps):
            raise TypeError("ResolutionResult.steps must contain ResolutionStep objects")
        if self.status is ResolutionStatus.LIMIT_REACHED:
            if not isinstance(self.limit_reason, str) or not self.limit_reason:
                raise ValueError("A limited result needs a non-empty limit_reason")
        elif self.limit_reason is not None:
            raise ValueError("Only a limited result may have a limit_reason")

    @property
    def entailed(self) -> bool:
        return self.status is ResolutionStatus.ENTAILED

    @property
    def completed(self) -> bool:
        return self.status is not ResolutionStatus.LIMIT_REACHED

    def to_dict(self) -> dict[str, object]:
        return {
            "status": self.status.value,
            "entailed": self.entailed,
            "completed": self.completed,
            "clauses": [clause.to_dict() for clause in self.clauses],
            "steps": [step.to_dict() for step in self.steps],
            "limit_reason": self.limit_reason,
        }

    def __iter__(self) -> Iterator[ResolutionStep]:
        return iter(self.steps)
