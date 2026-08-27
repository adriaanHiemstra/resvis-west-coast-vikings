"""Backlog 3, commit 3: normalization and batch behavior."""

import pytest

from resvis.features.cnf.converter import CnfConversionError, CnfConverter
from resvis.features.knowledge_base.parser.adapter import ParserAdapter


def convert(formula: str, *, negate: bool = False):
    root = ParserAdapter().parse_formula(formula).root
    return CnfConverter().convert(root, negate=negate)


def literals(cnf):
    return [
        [(literal.symbol, literal.negated) for literal in clause.literals]
        for clause in cnf.clauses
    ]


@pytest.mark.parametrize(
    ("formula", "expected"),
    [
        ("P", [[("P", False)]]),
        ("~P", [[("P", True)]]),
        ("(P & Q)", [[("P", False)], [("Q", False)]]),
        ("(P | Q)", [[("P", False), ("Q", False)]]),
        ("(P -> Q)", [[("P", True), ("Q", False)]]),
        (
            "(P <-> Q)",
            [
                [("P", True), ("Q", False)],
                [("Q", True), ("P", False)],
            ],
        ),
        ("~(P & Q)", [[("P", True), ("Q", True)]]),
        ("~(P | Q)", [[("P", True)], [("Q", True)]]),
        (
            "(P | (Q & R))",
            [
                [("P", False), ("Q", False)],
                [("P", False), ("R", False)],
            ],
        ),
    ],
)
def test_keeps_core_conversion_behavior(formula, expected):
    assert literals(convert(formula)) == expected


def test_removes_duplicate_literals_and_clauses():
    assert literals(convert("((P | P) & (P | P))")) == [[("P", False)]]


def test_drops_a_tautological_clause():
    cnf = convert("(P | ~P)")
    assert cnf.clauses == ()
    assert cnf.is_tautology is True
    assert cnf.raw == "⊤"


def test_can_negate_a_goal_for_resolution_by_refutation():
    assert literals(convert("(P -> Q)", negate=True)) == [
        [("P", False)],
        [("Q", True)],
    ]


def test_convert_many_combines_formula_clause_sets():
    parser = ParserAdapter()
    roots = [
        parser.parse_formula("(P -> Q)").root,
        parser.parse_formula("P").root,
    ]
    assert literals(CnfConverter().convert_many(roots)) == [
        [("P", True), ("Q", False)],
        [("P", False)],
    ]


def test_invalid_tree_has_a_clear_conversion_error():
    class BrokenNode:
        label = "&"
        left = None
        right = None

    with pytest.raises(CnfConversionError, match="two children"):
        CnfConverter().convert(BrokenNode())
