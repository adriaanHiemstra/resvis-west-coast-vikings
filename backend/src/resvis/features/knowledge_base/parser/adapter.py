"""Stable interface in front of the vendored client parser (./vendor).
See ./vendor/README.md for the parser's syntax and constraints, and
CLAUDE.md's "The vendored parser" section for why this seam exists
(Risk 3 mitigation, Assignment 1).
"""

from __future__ import annotations

from dataclasses import dataclass

from resvis.features.knowledge_base.parser.vendor.parser import Node
from resvis.features.knowledge_base.parser.vendor.parser import parser as _vendor_parser


@dataclass
class SyntaxTree:
    """One parsed formula: the original text plus the parser's tree."""

    source_text: str
    root: Node


class ParserAdapter:
    def parse_formula(self, text: str) -> SyntaxTree:
        """Parses a single formula string into a syntax tree.

        Phase 1 note: this is the happy-path version only. If `text` is
        malformed, the vendored parser currently prints a message to the
        console and returns None instead of raising — `root` would end up
        None. Phase 3 replaces that with a proper exception carrying a
        position and message.
        """
        root = _vendor_parser.parse(text)
        return SyntaxTree(source_text=text, root=root)
