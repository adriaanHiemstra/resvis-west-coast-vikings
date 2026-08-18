"""Backlog 2 — Knowledge base parser.

Phase 1 + 2 coverage: the adapter can turn formula text into a syntax
tree via the vendored parser, and that tree can be turned into a plain
dict so it's ready to travel over JSON. Error-path tests (malformed
input) are added in Phase 3, once the adapter actually raises a
structured error instead of printing to the console.
"""

from resvis.features.knowledge_base.parser.adapter import ParserAdapter
from resvis.features.knowledge_base.parser.tree_serializer import serialize_node


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
