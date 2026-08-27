"""Backlog 3: complete parser-to-CNF and HTTP-contract coverage."""

from itertools import product
from pathlib import Path

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from resvis.features.cnf.converter import CnfConversionError, CnfConverter
from resvis.features.cnf.router import router
from resvis.features.cnf.service import CnfService
from resvis.features.knowledge_base.parser.adapter import ParserAdapter


SAMPLE_FORMULAS = (
    Path(__file__).parents[1]
    / "src"
    / "resvis"
    / "features"
    / "knowledge_base"
    / "parser"
    / "vendor"
    / "input.txt"
).read_text(encoding="utf-8").splitlines()


def convert(formula: str, *, negate: bool = False):
    tree = ParserAdapter().parse_formula(formula)
    return CnfConverter().convert(tree.root, negate=negate)


def clause_literals(cnf):
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
        (
            "~(P & Q)",
            [[("P", True), ("Q", True)]],
        ),
        (
            "~(P | Q)",
            [[("P", True)], [("Q", True)]],
        ),
        (
            "(P | (Q & R))",
            [
                [("P", False), ("Q", False)],
                [("P", False), ("R", False)],
            ],
        ),
    ],
)
def test_converts_every_supported_operator(formula, expected):
    assert clause_literals(convert(formula)) == expected


def test_handles_multi_letter_atoms_and_unicode_parser_operators():
    cnf = convert("(Rain → WetRoad)")
    assert clause_literals(cnf) == [
        [("Rain", True), ("WetRoad", False)]
    ]
    assert cnf.raw == "(¬Rain ∨ WetRoad)"


def test_negate_converts_a_goal_for_resolution_by_refutation():
    assert clause_literals(convert("(P -> Q)", negate=True)) == [
        [("P", False)],
        [("Q", True)],
    ]


def test_removes_duplicate_literals_and_duplicate_clauses():
    cnf = convert("((P | P) & (P | P))")
    assert clause_literals(cnf) == [[("P", False)]]


def test_drops_tautological_clauses():
    cnf = convert("(P | ~P)")
    assert cnf.clauses == ()
    assert cnf.is_tautology is True
    assert cnf.raw == "⊤"


def test_convert_many_combines_formulas_as_a_conjunction():
    parser = ParserAdapter()
    roots = [parser.parse_formula("(P -> Q)").root, parser.parse_formula("P").root]
    cnf = CnfConverter().convert_many(roots)
    assert clause_literals(cnf) == [
        [("P", True), ("Q", False)],
        [("P", False)],
    ]


def test_invalid_tree_is_rejected_explicitly():
    class BrokenNode:
        label = "&"
        left = None
        right = None

    with pytest.raises(CnfConversionError, match="two children"):
        CnfConverter().convert(BrokenNode())


def evaluate_tree(node, assignment):
    if node.label == "~":
        return not evaluate_tree(node.left, assignment)
    if node.label == "&":
        return evaluate_tree(node.left, assignment) and evaluate_tree(node.right, assignment)
    if node.label == "|":
        return evaluate_tree(node.left, assignment) or evaluate_tree(node.right, assignment)
    if node.label == "->":
        return (not evaluate_tree(node.left, assignment)) or evaluate_tree(node.right, assignment)
    if node.label == "<->":
        return evaluate_tree(node.left, assignment) == evaluate_tree(node.right, assignment)
    return assignment[node.label]


def evaluate_cnf(cnf, assignment):
    return all(
        any(
            (not assignment[literal.symbol]) if literal.negated else assignment[literal.symbol]
            for literal in clause.literals
        )
        for clause in cnf.clauses
    )


def tree_symbols(node):
    if node.label not in {"~", "&", "|", "->", "<->"}:
        return {node.label}
    symbols = tree_symbols(node.left) if node.left is not None else set()
    if node.right is not None:
        symbols |= tree_symbols(node.right)
    return symbols


@pytest.mark.parametrize("formula", SAMPLE_FORMULAS)
def test_cnf_is_truth_table_equivalent_to_source(formula):
    root = ParserAdapter().parse_formula(formula).root
    cnf = CnfConverter().convert(root)
    symbols = sorted(tree_symbols(root))

    for values in product([False, True], repeat=len(symbols)):
        assignment = dict(zip(symbols, values))
        assert evaluate_cnf(cnf, assignment) == evaluate_tree(root, assignment)


def test_service_preserves_syntax_error_contract_and_batch_order():
    results = CnfService().convert_formulas(["P", "(P @ Q)", "(P -> Q)"])
    assert [result["formula"] for result in results] == ["P", "(P @ Q)", "(P -> Q)"]
    assert [result["success"] for result in results] == [True, False, True]
    assert results[1]["error"]["code"] == "ILLEGAL_CHARACTER"
    assert results[1]["error"]["position"] == 3


def test_http_endpoint_returns_json_ready_cnf():
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    response = client.post(
        "/cnf/convert",
        json={"formulas": ["(Rain -> WetRoad)"], "negate": False},
    )

    assert response.status_code == 200
    assert response.json() == {
        "results": [
            {
                "formula": "(Rain -> WetRoad)",
                "negated": False,
                "success": True,
                "cnf": {
                    "clauses": [
                        {
                            "literals": [
                                {"symbol": "Rain", "negated": True},
                                {"symbol": "WetRoad", "negated": False},
                            ],
                            "raw": "¬Rain ∨ WetRoad",
                        }
                    ],
                    "raw": "(¬Rain ∨ WetRoad)",
                    "is_tautology": False,
                },
                "error": None,
            }
        ]
    }
