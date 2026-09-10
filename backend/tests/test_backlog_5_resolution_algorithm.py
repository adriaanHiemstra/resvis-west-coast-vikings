"""Backlog 5, commit 2: domain models and the binary resolution rule."""

from dataclasses import FrozenInstanceError

import pytest

from resvis.features.cnf.models import Clause, Literal
from resvis.features.resolution.engine import resolve_pair
from resvis.features.resolution.models import (
    ClauseOrigin,
    ClauseRecord,
    ResolutionCandidate,
    ResolutionResult,
    ResolutionStatus,
    ResolutionStep,
)


def test_clause_origin_values_are_stable_for_api_output():
    assert [origin.value for origin in ClauseOrigin] == [
        "knowledge_base",
        "negated_goal",
        "derived",
    ]


def test_clause_record_reuses_and_serializes_the_cnf_clause_model():
    record = ClauseRecord(
        clause_id=1,
        clause=Clause((Literal("P", negated=True), Literal("Q"))),
        origin=ClauseOrigin.KNOWLEDGE_BASE,
    )

    assert record.to_dict() == {
        "clause_id": 1,
        "clause": {
            "literals": [
                {"symbol": "P", "negated": True},
                {"symbol": "Q", "negated": False},
            ],
            "raw": "¬P ∨ Q",
        },
        "origin": "knowledge_base",
        "depth": 0,
    }


@pytest.mark.parametrize(
    ("arguments", "exception", "message"),
    [
        (
            {"clause_id": 0, "clause": Clause(), "origin": ClauseOrigin.DERIVED},
            ValueError,
            "positive",
        ),
        (
            {"clause_id": 1, "clause": "P", "origin": ClauseOrigin.KNOWLEDGE_BASE},
            TypeError,
            "must be a Clause",
        ),
        (
            {
                "clause_id": 1,
                "clause": Clause(),
                "origin": ClauseOrigin.DERIVED,
                "depth": -1,
            },
            ValueError,
            "cannot be negative",
        ),
    ],
)
def test_clause_record_rejects_invalid_identity_clause_and_depth(
    arguments,
    exception,
    message,
):
    with pytest.raises(exception, match=message):
        ClauseRecord(**arguments)


def test_resolution_step_records_parents_pivot_and_resolvent():
    step = ResolutionStep(
        step_number=1,
        left_clause_id=1,
        right_clause_id=2,
        pivot="P",
        resolvent_clause_id=3,
        resolvent=Clause((Literal("Q"),)),
    )

    assert step.is_contradiction is False
    assert step.to_dict()["pivot"] == "P"
    assert step.to_dict()["resolvent"]["raw"] == "Q"


def test_empty_resolvent_marks_a_contradiction():
    step = ResolutionStep(
        step_number=2,
        left_clause_id=3,
        right_clause_id=4,
        pivot="Q",
        resolvent_clause_id=5,
        resolvent=Clause(),
    )

    assert step.is_contradiction is True
    assert step.to_dict()["resolvent"]["raw"] == "⊥"


def test_resolution_result_serializes_a_complete_trace():
    initial = ClauseRecord(
        clause_id=1,
        clause=Clause((Literal("P"),)),
        origin=ClauseOrigin.NEGATED_GOAL,
    )
    contradiction = ResolutionStep(
        step_number=1,
        left_clause_id=1,
        right_clause_id=2,
        pivot="P",
        resolvent_clause_id=3,
        resolvent=Clause(),
    )
    result = ResolutionResult(
        status=ResolutionStatus.ENTAILED,
        clauses=(initial,),
        steps=(contradiction,),
    )

    assert result.entailed is True
    assert result.completed is True
    assert list(result) == [contradiction]
    assert result.to_dict()["steps"][0]["is_contradiction"] is True


def test_limit_reached_requires_an_explanation():
    with pytest.raises(ValueError, match="limit_reason"):
        ResolutionResult(status=ResolutionStatus.LIMIT_REACHED)


def test_resolution_records_are_immutable():
    record = ClauseRecord(
        clause_id=1,
        clause=Clause((Literal("P"),)),
        origin=ClauseOrigin.KNOWLEDGE_BASE,
    )

    with pytest.raises(FrozenInstanceError):
        record.depth = 1


def test_resolution_candidate_serializes_the_pivot_and_resolvent():
    candidate = ResolutionCandidate(
        pivot="P",
        resolvent=Clause((Literal("Q"),)),
    )

    assert candidate.to_dict() == {
        "pivot": "P",
        "resolvent": {
            "literals": [{"symbol": "Q", "negated": False}],
            "raw": "Q",
        },
        "is_contradiction": False,
    }


def test_resolves_two_non_unit_clauses_on_a_complementary_literal():
    left = Clause((Literal("P"), Literal("Q")))
    right = Clause((Literal("P", negated=True), Literal("R")))

    assert resolve_pair(left, right) == (
        ResolutionCandidate(
            pivot="P",
            resolvent=Clause((Literal("Q"), Literal("R"))),
        ),
    )


def test_unit_resolution_derives_the_empty_clause():
    candidates = resolve_pair(
        Clause((Literal("P"),)),
        Clause((Literal("P", negated=True),)),
    )

    assert len(candidates) == 1
    assert candidates[0].pivot == "P"
    assert candidates[0].is_contradiction is True
    assert candidates[0].resolvent == Clause()


def test_resolution_works_when_the_negative_literal_is_on_the_left():
    candidates = resolve_pair(
        Clause((Literal("P", negated=True), Literal("Q"))),
        Clause((Literal("P"), Literal("R"))),
    )

    assert candidates == (
        ResolutionCandidate(
            pivot="P",
            resolvent=Clause((Literal("Q"), Literal("R"))),
        ),
    )


def test_returns_no_candidate_when_clauses_have_no_complementary_literal():
    assert resolve_pair(
        Clause((Literal("P"), Literal("Q"))),
        Clause((Literal("P"), Literal("R"))),
    ) == ()


def test_discards_tautological_resolvents_from_multiple_pivots():
    # Resolving on P would produce Q ∨ ¬Q; resolving on Q would produce
    # P ∨ ¬P. Both candidates are tautologies and add no useful information.
    assert resolve_pair(
        Clause((Literal("P"), Literal("Q"))),
        Clause((Literal("P", negated=True), Literal("Q", negated=True))),
    ) == ()


def test_resolvent_order_is_deterministic_and_inputs_are_not_modified():
    left = Clause((Literal("Q"), Literal("P")))
    right = Clause((Literal("P", negated=True), Literal("R")))

    candidates = resolve_pair(left, right)

    assert candidates[0].resolvent.literals == (Literal("Q"), Literal("R"))
    assert left.literals == (Literal("Q"), Literal("P"))
    assert right.literals == (Literal("P", negated=True), Literal("R"))


@pytest.mark.parametrize(
    ("left", "right"),
    [
        ("P", Clause((Literal("P"),))),
        (Clause((Literal("P"),)), "~P"),
    ],
)
def test_resolve_pair_rejects_non_clause_inputs(left, right):
    with pytest.raises(TypeError, match="two Clause objects"):
        resolve_pair(left, right)
