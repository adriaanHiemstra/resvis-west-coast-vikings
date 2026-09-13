"""Deterministic, goal-aware ordering for resolvable clause pairs."""

from __future__ import annotations

from dataclasses import dataclass, field
from heapq import heappop, heappush
from typing import Iterable

from resvis.features.resolution.engine import resolve_pair
from resvis.features.resolution.models import ClauseRecord


_UNCONNECTED_DISTANCE = 1_000_000_000


@dataclass(frozen=True, order=True, slots=True)
class _QueueEntry:
    """Internal heap entry; only the score participates in ordering."""

    score: tuple[int, int, int, int, int, int, int]
    left_clause_id: int = field(compare=False)
    right_clause_id: int = field(compare=False)


class ClausePrioritiser:
    """Queue every useful pair while trying goal-linked work first.

    Priority, from strongest to weakest, is:

    1. at least one clause is connected to the negated goal;
    2. the closest recorded distance from the negated goal;
    3. the shortest parent clause (unit clauses therefore come first);
    4. the combined parent size;
    5. the combined derivation depth;
    6. stable clause identifiers as deterministic tie breakers.

    Lower-priority pairs remain queued. The heuristic changes search order but
    does not make the future solver incomplete by throwing valid work away.
    """

    def __init__(self, records: Iterable[ClauseRecord] = ()) -> None:
        self._records: dict[int, ClauseRecord] = {}
        self._queue: list[_QueueEntry] = []
        self._seen_pairs: set[tuple[int, int]] = set()

        for record in records:
            self.add_clause(record)

    def add_clause(self, record: ClauseRecord) -> None:
        """Store a clause and queue its useful pairs with existing clauses."""

        if not isinstance(record, ClauseRecord):
            raise TypeError("ClausePrioritiser only accepts ClauseRecord objects")
        if record.clause_id in self._records:
            raise ValueError(f"Clause id {record.clause_id} is already registered")

        for existing in self._records.values():
            self._queue_pair(existing, record)

        self._records[record.clause_id] = record

    def pop_pair(self) -> tuple[ClauseRecord, ClauseRecord]:
        """Remove and return the highest-priority pair."""

        if not self._queue:
            raise IndexError("No resolvable clause pairs remain")

        entry = heappop(self._queue)
        return (
            self._records[entry.left_clause_id],
            self._records[entry.right_clause_id],
        )

    @property
    def records(self) -> tuple[ClauseRecord, ...]:
        return tuple(self._records.values())

    def __len__(self) -> int:
        return len(self._queue)

    def _queue_pair(self, first: ClauseRecord, second: ClauseRecord) -> None:
        left, right = sorted((first, second), key=lambda record: record.clause_id)
        pair_key = (left.clause_id, right.clause_id)

        if pair_key in self._seen_pairs:
            return
        self._seen_pairs.add(pair_key)

        # Pairs producing no useful candidate either lack a complement or only
        # create tautologies, so attempting them in the main loop adds nothing.
        if not resolve_pair(left.clause, right.clause):
            return

        heappush(
            self._queue,
            _QueueEntry(
                score=self._score(left, right),
                left_clause_id=left.clause_id,
                right_clause_id=right.clause_id,
            ),
        )

    @staticmethod
    def _score(
        left: ClauseRecord,
        right: ClauseRecord,
    ) -> tuple[int, int, int, int, int, int, int]:
        connected_distances = [
            distance
            for distance in (left.goal_distance, right.goal_distance)
            if distance is not None
        ]
        goal_rank = 0 if connected_distances else 1
        goal_distance = (
            min(connected_distances)
            if connected_distances
            else _UNCONNECTED_DISTANCE
        )

        return (
            goal_rank,
            goal_distance,
            min(len(left.clause), len(right.clause)),
            len(left.clause) + len(right.clause),
            left.depth + right.depth,
            left.clause_id,
            right.clause_id,
        )
