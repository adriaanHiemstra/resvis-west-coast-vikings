"""Core binary rule used by the future priority-based resolution engine."""

from __future__ import annotations

from resvis.features.cnf.models import Clause, Literal
from resvis.features.resolution.models import ResolutionCandidate


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
