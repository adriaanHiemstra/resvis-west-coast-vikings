"""Propositional-logic syntax tree to conjunctive normal form.

The public converter accepts any parser node exposing `label`, `left`, and
`right`. That small protocol keeps this feature independent of the vendored
PLY parser while remaining directly compatible with ParserAdapter output.
"""

from __future__ import annotations

from dataclasses import dataclass
from typing import Iterable, Protocol

from resvis.features.cnf.models import Clause, CnfClauseSet, Literal


class SyntaxNode(Protocol):
    label: str
    left: SyntaxNode | None
    right: SyntaxNode | None


class CnfConversionError(ValueError):
    """Raised when a supplied syntax tree is structurally invalid."""


@dataclass(frozen=True, slots=True)
class _Expression:
    kind: str
    symbol: str | None = None
    left: _Expression | None = None
    right: _Expression | None = None


class CnfConverter:
    """Convert one or more parsed formula trees to equivalent CNF."""

    _BINARY_OPERATORS = frozenset({"&", "|", "->", "<->"})

    def convert(self, root: SyntaxNode, *, negate: bool = False) -> CnfClauseSet:
        """Convert a parsed formula tree.

        `negate=True` negates the complete formula before CNF conversion. It
        is intended for resolution by refutation, where the goal's negation
        is added to the knowledge base.
        """

        expression = self._remove_implications(root)
        nnf = self._to_nnf(expression, negated=negate)
        clauses = self._to_clauses(nnf)
        return CnfClauseSet(tuple(Clause(clause) for clause in clauses))

    def convert_many(
        self,
        roots: Iterable[SyntaxNode],
        *,
        negate: bool = False,
    ) -> CnfClauseSet:
        """Convert formulas and combine them as one conjunction."""

        clauses: list[Clause] = []
        for root in roots:
            clauses.extend(self.convert(root, negate=negate).clauses)
        return CnfClauseSet(tuple(clauses))

    def _remove_implications(self, node: SyntaxNode | None) -> _Expression:
        if node is None:
            raise CnfConversionError("Cannot convert an empty syntax tree")

        label = getattr(node, "label", None)
        left = getattr(node, "left", None)
        right = getattr(node, "right", None)

        if not isinstance(label, str) or not label:
            raise CnfConversionError("Every syntax-tree node needs a label")

        if label == "~":
            if left is None or right is not None:
                raise CnfConversionError("Negation must have exactly one left child")
            return _Expression("not", left=self._remove_implications(left))

        if label in self._BINARY_OPERATORS:
            if left is None or right is None:
                raise CnfConversionError(
                    f"Binary operator {label!r} must have two children"
                )
            left_expression = self._remove_implications(left)
            right_expression = self._remove_implications(right)

            if label == "&":
                return _Expression("and", left=left_expression, right=right_expression)
            if label == "|":
                return _Expression("or", left=left_expression, right=right_expression)
            if label == "->":
                # A -> B is equivalent to ~A | B.
                return _Expression(
                    "or",
                    left=_Expression("not", left=left_expression),
                    right=right_expression,
                )

            # A <-> B is equivalent to (~A | B) & (~B | A).
            return _Expression(
                "and",
                left=_Expression(
                    "or",
                    left=_Expression("not", left=left_expression),
                    right=right_expression,
                ),
                right=_Expression(
                    "or",
                    left=_Expression("not", left=right_expression),
                    right=left_expression,
                ),
            )

        if left is not None or right is not None:
            raise CnfConversionError(
                f"Atom {label!r} cannot have child nodes"
            )
        return _Expression("atom", symbol=label)

    def _to_nnf(self, expression: _Expression, *, negated: bool) -> _Expression:
        """Push negations to atoms using De Morgan's laws."""

        if expression.kind == "atom":
            if expression.symbol is None:
                raise CnfConversionError("Atom is missing its symbol")
            atom = _Expression("atom", symbol=expression.symbol)
            return _Expression("not", left=atom) if negated else atom

        if expression.kind == "not":
            if expression.left is None:
                raise CnfConversionError("Negation is missing its operand")
            return self._to_nnf(expression.left, negated=not negated)

        if expression.left is None or expression.right is None:
            raise CnfConversionError(
                f"Expression {expression.kind!r} is missing an operand"
            )

        if expression.kind == "and":
            next_kind = "or" if negated else "and"
        elif expression.kind == "or":
            next_kind = "and" if negated else "or"
        else:
            raise CnfConversionError(
                f"Unsupported internal expression {expression.kind!r}"
            )

        return _Expression(
            next_kind,
            left=self._to_nnf(expression.left, negated=negated),
            right=self._to_nnf(expression.right, negated=negated),
        )

    def _to_clauses(self, expression: _Expression) -> list[tuple[Literal, ...]]:
        if expression.kind == "atom":
            if expression.symbol is None:
                raise CnfConversionError("Atom is missing its symbol")
            return [(Literal(expression.symbol),)]

        if expression.kind == "not":
            child = expression.left
            if child is None or child.kind != "atom" or child.symbol is None:
                raise CnfConversionError(
                    "Negation normal form may only negate an atom"
                )
            return [(Literal(child.symbol, negated=True),)]

        if expression.left is None or expression.right is None:
            raise CnfConversionError(
                f"Expression {expression.kind!r} is missing an operand"
            )

        left_clauses = self._to_clauses(expression.left)
        right_clauses = self._to_clauses(expression.right)

        if expression.kind == "and":
            return self._deduplicate_clauses(left_clauses + right_clauses)

        if expression.kind != "or":
            raise CnfConversionError(
                f"Unsupported normal-form expression {expression.kind!r}"
            )

        # An empty list is logical true (an empty conjunction). True OR X
        # is true, so distribution also produces an empty clause list.
        if not left_clauses or not right_clauses:
            return []

        distributed: list[tuple[Literal, ...]] = []
        for left_clause in left_clauses:
            for right_clause in right_clauses:
                merged = self._merge_disjunction(left_clause, right_clause)
                if merged is not None:
                    distributed.append(merged)
        return self._deduplicate_clauses(distributed)

    @staticmethod
    def _merge_disjunction(
        left: tuple[Literal, ...],
        right: tuple[Literal, ...],
    ) -> tuple[Literal, ...] | None:
        merged: list[Literal] = []
        polarities: dict[str, bool] = {}

        for literal in (*left, *right):
            existing = polarities.get(literal.symbol)
            if existing is not None and existing != literal.negated:
                # A clause containing P and ~P is always true and can be
                # removed from a conjunction without changing its meaning.
                return None
            if existing is None:
                polarities[literal.symbol] = literal.negated
                merged.append(literal)

        return tuple(merged)

    @staticmethod
    def _deduplicate_clauses(
        clauses: Iterable[tuple[Literal, ...]],
    ) -> list[tuple[Literal, ...]]:
        result: list[tuple[Literal, ...]] = []
        seen: set[frozenset[Literal]] = set()
        for clause in clauses:
            key = frozenset(clause)
            if key not in seen:
                seen.add(key)
                result.append(clause)
        return result
