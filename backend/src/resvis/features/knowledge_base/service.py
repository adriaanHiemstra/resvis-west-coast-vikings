"""Backlog 2 + 7: orchestrates one formula through the parser and turns
the outcome (success or failure) into a plain result the API can hand
back. Kept separate from router.py on purpose: this file has zero
knowledge of HTTP, so it stays testable and reusable on its own.
"""

from __future__ import annotations

from resvis.features.knowledge_base.parser.adapter import ParserAdapter
from resvis.features.knowledge_base.parser.tree_serializer import serialize_node
from resvis.shared.errors import FormulaSyntaxError


class KnowledgeBaseService:
    def __init__(self, parser: ParserAdapter | None = None) -> None:
        self._parser = parser or ParserAdapter()

    def parse_formula(self, formula: str) -> dict:
        """Parses one formula and always returns a result dict - never
        raises. A malformed formula is an expected, everyday outcome
        here (the user mistyped something), not an exceptional one, so
        it's reported as data (`success: False` + an `error`) rather
        than as a crash.
        """
        try:
            syntax_tree = self._parser.parse_formula(formula)
        except FormulaSyntaxError as exc:
            return {
                "formula": formula,
                "success": False,
                "tree": None,
                "error": {
                    "code": exc.detail.code,
                    "position": exc.detail.position,
                    "message": exc.detail.message,
                },
            }
        return {
            "formula": formula,
            "success": True,
            "tree": serialize_node(syntax_tree.root),
            "error": None,
        }

    def parse_formulas(self, formulas: list[str]) -> list[dict]:
        """Parses each formula independently, in order, and returns one
        result per formula. Safe to call with a mix of valid and invalid
        formulas: since `parse_formula` never raises, nothing here can
        crash partway through the list - a broken formula in the middle
        just shows up as one `success: False` entry, and every other
        formula still gets parsed normally.
        """
        return [self.parse_formula(formula) for formula in formulas]
