""" CNF domain model tests."""

import pytest

from resvis.features.cnf.models import Clause, CnfClauseSet, Literal
from resvis.features.cnf.converter import CnfConverter
from resvis.features.knowledge_base.parser.adapter import ParserAdapter


def test_literal_formats_positive_and_negative_symbols():
    assert Literal("Rain").raw == "Rain"
    assert Literal("Rain", negated=True).raw == "¬Rain"


def test_literal_complement_flips_polarity():
    assert Literal("P").complement() == Literal("P", negated=True)


def test_literal_rejects_an_empty_symbol():
    with pytest.raises(ValueError):
        Literal("")


def test_clause_formats_a_disjunction():
    clause = Clause((Literal("P", True), Literal("Q")))
    assert clause.raw == "¬P ∨ Q"


def test_cnf_clause_set_formats_a_conjunction_and_serializes():
    cnf = CnfClauseSet(
        (
            Clause((Literal("P", True), Literal("Q"))),
            Clause((Literal("R"),)),
        )
    )
    assert cnf.raw == "(¬P ∨ Q) ∧ (R)"
    assert cnf.to_dict()["clauses"][0]["raw"] == "¬P ∨ Q"

""" parser-tree conversion tests."""

def convert(formula: str):
    root = ParserAdapter().parse_formula(formula).root
    return CnfConverter().convert(root)


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
def test_converts_supported_formula_shapes(formula, expected):
    assert literals(convert(formula)) == expected
