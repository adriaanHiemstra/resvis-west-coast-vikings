"""Domain objects shared by CNF conversion and the resolution engine.

The classes are immutable so clauses can be compared safely and reused in a
future derivation trace. Ordering is kept deterministic for readable API and
console output, while duplicate logical content is removed.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterator


@dataclass(frozen=True, slots=True)
class Literal:
    """One propositional symbol, optionally negated."""

    symbol: str
    negated: bool = False

    def __post_init__(self) -> None:
        if not isinstance(self.symbol, str) or not self.symbol:
            raise ValueError("A literal symbol must be a non-empty string")

    def complement(self) -> Literal:
        return Literal(self.symbol, not self.negated)

    @property
    def raw(self) -> str:
        return f"¬{self.symbol}" if self.negated else self.symbol

    def to_dict(self) -> dict[str, object]:
        return {"symbol": self.symbol, "negated": self.negated}

    def __str__(self) -> str:
        return self.raw


@dataclass(frozen=True, slots=True)
class Clause:
    """A disjunction of literals.

    An empty clause is allowed because the resolution engine uses it to
    represent a contradiction. The CNF converter itself only produces an
    empty clause if a future syntax extension introduces a false constant.
    """

    literals: tuple[Literal, ...] = ()

    def __post_init__(self) -> None:
        unique: list[Literal] = []
        for literal in self.literals:
            if not isinstance(literal, Literal):
                raise TypeError("Clause.literals must contain Literal objects")
            if literal not in unique:
                unique.append(literal)
        object.__setattr__(self, "literals", tuple(unique))

    @property
    def is_empty(self) -> bool:
        return not self.literals

    @property
    def is_tautology(self) -> bool:
        literals = set(self.literals)
        return any(literal.complement() in literals for literal in literals)

    @property
    def raw(self) -> str:
        return " ∨ ".join(str(literal) for literal in self.literals) or "⊥"

    def to_dict(self) -> dict[str, object]:
        return {
            "literals": [literal.to_dict() for literal in self.literals],
            "raw": self.raw,
        }

    def __iter__(self) -> Iterator[Literal]:
        return iter(self.literals)

    def __len__(self) -> int:
        return len(self.literals)

    def __str__(self) -> str:
        return self.raw


@dataclass(frozen=True, slots=True)
class ClauseSet:
    """A conjunction of clauses, preserving the first occurrence order."""

    clauses: tuple[Clause, ...] = ()

    def __post_init__(self) -> None:
        unique: list[Clause] = []
        seen: set[frozenset[Literal]] = set()
        for clause in self.clauses:
            if not isinstance(clause, Clause):
                raise TypeError("ClauseSet.clauses must contain Clause objects")
            key = frozenset(clause.literals)
            if key not in seen:
                seen.add(key)
                unique.append(clause)
        object.__setattr__(self, "clauses", tuple(unique))

    @property
    def is_tautology(self) -> bool:
        """An empty conjunction represents logical true."""

        return not self.clauses

    @property
    def raw(self) -> str:
        if not self.clauses:
            return "⊤"
        return " ∧ ".join(f"({clause.raw})" for clause in self.clauses)

    def to_dict(self) -> dict[str, object]:
        return {
            "clauses": [clause.to_dict() for clause in self.clauses],
            "raw": self.raw,
            "is_tautology": self.is_tautology,
        }

    def __iter__(self) -> Iterator[Clause]:
        return iter(self.clauses)

    def __len__(self) -> int:
        return len(self.clauses)

    def __str__(self) -> str:
        return self.raw


@dataclass(frozen=True, slots=True)
class CnfClauseSet(ClauseSet):
    """A clause set guaranteed by `CnfConverter` to be in CNF."""
