"""Binary resolution and the complete priority-based refutation loop."""

from __future__ import annotations

from resvis.features.cnf.models import Clause, CnfClauseSet, Literal
from resvis.features.resolution.models import (
    ClauseOrigin,
    ClauseRecord,
    ResolutionCandidate,
    ResolutionResult,
    ResolutionStatus,
    ResolutionStep,
)


def resolve_pair(left: Clause, right: Clause) -> tuple[ResolutionCandidate, ...]:
    """Return every useful resolvent for two clauses.

    A candidate is created for each symbol that occurs positively in one
    clause and negatively in the other. The complementary literals are
    removed and the remaining literals are joined. Tautological results are
    discarded because they are always true and cannot help derive a
    contradiction.

    Candidate order follows the literal order of ``left`` so later priority
    and trace output remain deterministic.
    """

    if not isinstance(left, Clause) or not isinstance(right, Clause):
        raise TypeError("resolve_pair expects two Clause objects")

    candidates: list[ResolutionCandidate] = []
    seen: set[frozenset[Literal]] = set()

    for pivot_literal in left:
        complement = pivot_literal.complement()
        if complement not in right.literals:
            continue

        remaining = tuple(
            literal
            for literal in left.literals
            if literal != pivot_literal
        ) + tuple(
            literal
            for literal in right.literals
            if literal != complement
        )
        resolvent = Clause(remaining)

        if resolvent.is_tautology:
            continue

        key = frozenset(resolvent.literals)
        if key in seen:
            continue
        seen.add(key)

        candidates.append(
            ResolutionCandidate(
                pivot=pivot_literal.symbol,
                resolvent=resolvent,
            )
        )

    return tuple(candidates)


class ResolutionEngine:
    """Decide entailment by resolving ``KB ∧ ¬goal`` to saturation.

    The engine stops successfully when it derives the empty clause. If every
    useful pair is exhausted first, the goal is not entailed. Clause and step
    limits keep pathological inputs from consuming unbounded resources.
    """

    def __init__(self, *, max_steps: int = 1_000, max_clauses: int = 500) -> None:
        self._max_steps = self._positive_limit("max_steps", max_steps)
        self._max_clauses = self._positive_limit("max_clauses", max_clauses)

    def run(
        self,
        knowledge_base: CnfClauseSet,
        negated_goal: CnfClauseSet,
    ) -> ResolutionResult:
        # Imported here to keep the pure resolve_pair function available to
        # prioritiser.py without creating a module-level circular import.
        from resvis.features.resolution.prioritiser import ClausePrioritiser

        if not isinstance(knowledge_base, CnfClauseSet):
            raise TypeError("knowledge_base must be a CnfClauseSet")
        if not isinstance(negated_goal, CnfClauseSet):
            raise TypeError("negated_goal must be a CnfClauseSet")

        records = self._initial_records(knowledge_base, negated_goal)
        known_clauses = {
            frozenset(record.clause.literals): record.clause_id
            for record in records
        }

        if len(records) > self._max_clauses:
            return self._limited(
                records,
                (),
                f"Initial clauses exceed maximum clause limit of {self._max_clauses}",
            )

        if any(record.clause.is_empty for record in records):
            return ResolutionResult(
                status=ResolutionStatus.ENTAILED,
                clauses=tuple(records),
            )

        prioritiser = ClausePrioritiser(records)
        steps: list[ResolutionStep] = []
        next_clause_id = len(records) + 1

        while len(prioritiser):
            left, right = prioritiser.pop_pair()

            for candidate in resolve_pair(left.clause, right.clause):
                key = frozenset(candidate.resolvent.literals)
                if key in known_clauses:
                    continue

                if len(steps) >= self._max_steps:
                    return self._limited(
                        records,
                        steps,
                        f"Maximum resolution step limit of {self._max_steps} reached",
                    )
                if len(records) >= self._max_clauses:
                    return self._limited(
                        records,
                        steps,
                        f"Maximum clause limit of {self._max_clauses} reached",
                    )

                goal_distance = self._next_goal_distance(left, right)
                derived = ClauseRecord(
                    clause_id=next_clause_id,
                    clause=candidate.resolvent,
                    origin=ClauseOrigin.DERIVED,
                    depth=max(left.depth, right.depth) + 1,
                    goal_distance=goal_distance,
                )
                step = ResolutionStep(
                    step_number=len(steps) + 1,
                    left_clause_id=left.clause_id,
                    right_clause_id=right.clause_id,
                    pivot=candidate.pivot,
                    resolvent_clause_id=derived.clause_id,
                    resolvent=derived.clause,
                )

                records.append(derived)
                steps.append(step)
                known_clauses[key] = derived.clause_id
                next_clause_id += 1

                if candidate.is_contradiction:
                    return ResolutionResult(
                        status=ResolutionStatus.ENTAILED,
                        clauses=tuple(records),
                        steps=tuple(steps),
                    )

                prioritiser.add_clause(derived)

        return ResolutionResult(
            status=ResolutionStatus.NOT_ENTAILED,
            clauses=tuple(records),
            steps=tuple(steps),
        )

    @staticmethod
    def _positive_limit(name: str, value: int) -> int:
        if not isinstance(value, int) or isinstance(value, bool):
            raise TypeError(f"{name} must be an integer")
        if value < 1:
            raise ValueError(f"{name} must be positive")
        return value

    @staticmethod
    def _next_goal_distance(
        left: ClauseRecord,
        right: ClauseRecord,
    ) -> int | None:
        distances = [
            distance
            for distance in (left.goal_distance, right.goal_distance)
            if distance is not None
        ]
        return min(distances) + 1 if distances else None

    @staticmethod
    def _initial_records(
        knowledge_base: CnfClauseSet,
        negated_goal: CnfClauseSet,
    ) -> list[ClauseRecord]:
        records: list[ClauseRecord] = []
        positions: dict[frozenset[Literal], int] = {}

        for clause in knowledge_base:
            key = frozenset(clause.literals)
            if key in positions:
                continue
            positions[key] = len(records)
            records.append(
                ClauseRecord(
                    clause_id=len(records) + 1,
                    clause=clause,
                    origin=ClauseOrigin.KNOWLEDGE_BASE,
                )
            )

        for clause in negated_goal:
            key = frozenset(clause.literals)
            existing_position = positions.get(key)
            if existing_position is not None:
                existing = records[existing_position]
                records[existing_position] = ClauseRecord(
                    clause_id=existing.clause_id,
                    clause=existing.clause,
                    origin=ClauseOrigin.NEGATED_GOAL,
                    goal_distance=0,
                )
                continue

            positions[key] = len(records)
            records.append(
                ClauseRecord(
                    clause_id=len(records) + 1,
                    clause=clause,
                    origin=ClauseOrigin.NEGATED_GOAL,
                    goal_distance=0,
                )
            )

        return records

    @staticmethod
    def _limited(
        records: list[ClauseRecord],
        steps: list[ResolutionStep] | tuple[ResolutionStep, ...],
        reason: str,
    ) -> ResolutionResult:
        return ResolutionResult(
            status=ResolutionStatus.LIMIT_REACHED,
            clauses=tuple(records),
            steps=tuple(steps),
            limit_reason=reason,
        )
