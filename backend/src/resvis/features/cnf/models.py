"""Core clause and literal objects used by CNF and resolution."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterator 


@dataclass(frozen=True, slots=True)
class Literal:
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
    literals: tuple[Literal, ...] = ()

    @property
    def is_empty(self) -> bool:
        return not self.literals

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


@dataclass(frozen=True, slots=True)
class ClauseSet:
    clauses: tuple[Clause, ...] = ()

    @property
    def raw(self) -> str:
        if not self.clauses:
            return "⊤"
        return " ∧ ".join(f"({clause.raw})" for clause in self.clauses)

    def to_dict(self) -> dict[str, object]:
        return {
            "clauses": [clause.to_dict() for clause in self.clauses],
            "raw": self.raw,
        }

    def __iter__(self) -> Iterator[Clause]:
        return iter(self.clauses)


@dataclass(frozen=True, slots=True)
class CnfClauseSet(ClauseSet):
    """A clause set produced by the CNF conversion feature."""
