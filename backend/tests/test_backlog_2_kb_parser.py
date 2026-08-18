"""Backlog 2 — Knowledge base parser.

Phase 1 + 2 coverage: the adapter can turn formula text into a syntax
tree via the vendored parser, and that tree can be turned into a plain
dict so it's ready to travel over JSON. Phase 3 coverage: malformed
input raises a structured FormulaSyntaxError instead of silently
returning None (the vendored parser's original behavior — see
parser/vendor/lexer.py's LexError and parser/vendor/parser.py's
ParseError, which the adapter catches and translates).
"""

import pytest

from resvis.features.knowledge_base.parser.adapter import ParserAdapter
from resvis.features.knowledge_base.parser.tree_serializer import serialize_node
from resvis.shared.errors import FormulaSyntaxError


def test_parses_bare_letter_as_a_leaf_node():
    tree = ParserAdapter().parse_formula("P")
    assert serialize_node(tree.root) == {"label": "P", "left": None, "right": None}


def test_parses_negation_without_parens():
    tree = ParserAdapter().parse_formula("~P")
    assert serialize_node(tree.root) == {
        "label": "~",
        "left": {"label": "P", "left": None, "right": None},
        "right": None,
    }


def test_parses_simple_conjunction():
    tree = ParserAdapter().parse_formula("(P & Q)")
    assert serialize_node(tree.root) == {
        "label": "&",
        "left": {"label": "P", "left": None, "right": None},
        "right": {"label": "Q", "left": None, "right": None},
    }


def test_parses_nested_formula():
    """Assignment 1 DoD (Backlog 2): "Input knowledge base, run parser,
    compare clause form output to knowledge base facts" — this is the
    nested-structure version of that check, using a formula straight out
    of the vendored parser's own sample input
    (parser/vendor/input.txt, line 1)."""
    tree = ParserAdapter().parse_formula("((P -> Q) & (R -> S))")
    assert serialize_node(tree.root) == {
        "label": "&",
        "left": {
            "label": "->",
            "left": {"label": "P", "left": None, "right": None},
            "right": {"label": "Q", "left": None, "right": None},
        },
        "right": {
            "label": "->",
            "left": {"label": "R", "left": None, "right": None},
            "right": {"label": "S", "left": None, "right": None},
        },
    }


def test_source_text_is_preserved_on_the_syntax_tree():
    """So a later step can report "this formula" back to the caller
    when something goes wrong with it."""
    tree = ParserAdapter().parse_formula("(P & Q)")
    assert tree.source_text == "(P & Q)"


def test_serialize_node_of_none_is_none():
    assert serialize_node(None) is None


def test_illegal_character_raises_formula_syntax_error_with_position():
    with pytest.raises(FormulaSyntaxError) as exc_info:
        ParserAdapter().parse_formula("(P @ Q)")
    detail = exc_info.value.detail
    assert detail.code == "ILLEGAL_CHARACTER"
    assert detail.position == 3  # index of '@' in "(P @ Q)"


def test_unbalanced_parens_raises_formula_syntax_error_at_end_of_text():
    """Use Case: Upload a knowledge base — "System reports the error and
    indicates the affected section so User can correct the source file
    and re-upload." """
    text = "(P -> "
    with pytest.raises(FormulaSyntaxError) as exc_info:
        ParserAdapter().parse_formula(text)
    detail = exc_info.value.detail
    assert detail.code == "UNEXPECTED_END"
    assert detail.position == len(text)


def test_two_atoms_with_no_operator_raises_formula_syntax_error():
    with pytest.raises(FormulaSyntaxError) as exc_info:
        ParserAdapter().parse_formula("P Q")
    detail = exc_info.value.detail
    assert detail.code == "UNEXPECTED_TOKEN"
    assert detail.position == 2  # index of 'Q' in "P Q"
