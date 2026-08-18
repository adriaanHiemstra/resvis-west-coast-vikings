"""Stable interface in front of the vendored client parser (./vendor).
See ./vendor/README.md for the parser's syntax and constraints, and
CLAUDE.md's "The vendored parser" section for why this seam exists
(Risk 3 mitigation, Assignment 1).
"""

from __future__ import annotations

from dataclasses import dataclass

from resvis.features.knowledge_base.parser.vendor.lexer import LexError
from resvis.features.knowledge_base.parser.vendor.parser import Node, ParseError
from resvis.features.knowledge_base.parser.vendor.parser import parser as _vendor_parser
from resvis.shared.errors import FormulaSyntaxError, SyntaxErrorDetail


@dataclass
class SyntaxTree:
    """One parsed formula: the original text plus the parser's tree."""

    source_text: str
    root: Node


class ParserAdapter:
    def parse_formula(self, text: str) -> SyntaxTree:
        """Parses a single formula string into a syntax tree.

        Raises `FormulaSyntaxError` if `text` doesn't lex or parse
        cleanly - this is the only place that translates the vendored
        parser's own exception types (LexError, ParseError) into our
        app-wide error shape, so nothing else in the codebase needs to
        know those vendor types exist.
        """
        try:
            root = _vendor_parser.parse(text)
        except LexError as exc:
            raise FormulaSyntaxError(
                SyntaxErrorDetail(
                    code="ILLEGAL_CHARACTER",
                    position=exc.position,
                    message=str(exc),
                )
            ) from exc
        except ParseError as exc:
            raise FormulaSyntaxError(
                SyntaxErrorDetail(
                    code="UNEXPECTED_TOKEN" if exc.position is not None else "UNEXPECTED_END",
                    position=exc.position if exc.position is not None else len(text),
                    message=str(exc),
                )
            ) from exc
        return SyntaxTree(source_text=text, root=root)
