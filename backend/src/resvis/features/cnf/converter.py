"""Convert the parser's propositional syntax trees to CNF."""

from __future__ import annotations

from dataclasses import dataclass
from typing import Protocol

from resvis.features.cnf.models import Clause, CnfClauseSet, Literal


class SyntaxNode(Protocol):
    label: str
    left: SyntaxNode | None
    right: SyntaxNode | None


@dataclass(frozen=True, slots=True)
class _Expression:
    kind: str
    symbol: str | None = None
    left: _Expression | None = None
    right: _Expression | None = None


class CnfConverter:
    """Apply standard equivalence rules and distribute OR over AND."""

    def convert(self, root: SyntaxNode) -> CnfClauseSet:
        expression = self._remove_implications(root)
        nnf = self._to_nnf(expression)
        return CnfClauseSet(
            tuple(Clause(literals) for literals in self._to_clauses(nnf))
        )

    def _remove_implications(self, node: SyntaxNode) -> _Expression:
        if node.label not in {"~", "&", "|", "->", "<->"}:
            return _Expression("atom", symbol=node.label)

        if node.label == "~":
            return _Expression("not", left=self._remove_implications(node.left))

        left = self._remove_implications(node.left)
        right = self._remove_implications(node.right)

        if node.label == "&":
            return _Expression("and", left=left, right=right)
        if node.label == "|":
            return _Expression("or", left=left, right=right)
        if node.label == "->":
            return _Expression(
                "or",
                left=_Expression("not", left=left),
                right=right,
            )

        # A <-> B === (~A | B) & (~B | A)
        return _Expression(
            "and",
            left=_Expression(
                "or",
                left=_Expression("not", left=left),
                right=right,
            ),
            right=_Expression(
                "or",
                left=_Expression("not", left=right),
                right=left,
            ),
        )

    def _to_nnf(
        self,
        expression: _Expression,
        negated: bool = False,
    ) -> _Expression:
        if expression.kind == "atom":
            atom = _Expression("atom", symbol=expression.symbol)
            return _Expression("not", left=atom) if negated else atom

        if expression.kind == "not":
            return self._to_nnf(expression.left, not negated)

        if expression.kind == "and":
            kind = "or" if negated else "and"
        else:
            kind = "and" if negated else "or"

        return _Expression(
            kind,
            left=self._to_nnf(expression.left, negated),
            right=self._to_nnf(expression.right, negated),
        )

    def _to_clauses(self, expression: _Expression) -> list[tuple[Literal, ...]]:
        if expression.kind == "atom":
            return [(Literal(expression.symbol),)]
        if expression.kind == "not":
            return [(Literal(expression.left.symbol, negated=True),)]

        left = self._to_clauses(expression.left)
        right = self._to_clauses(expression.right)

        if expression.kind == "and":
            return left + right

        # (A1 & A2) | (B1 & B2) becomes every Ai | Bj pairing.
        return [
            left_clause + right_clause
            for left_clause in left
            for right_clause in right
        ]
