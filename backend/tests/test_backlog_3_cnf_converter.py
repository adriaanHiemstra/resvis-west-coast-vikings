"""Backlog 3, commit 1: CNF domain model tests."""

import pytest

from resvis.features.cnf.models import Clause, CnfClauseSet, Literal


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
