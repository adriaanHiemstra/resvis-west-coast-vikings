"""Backlog 5, commit 3: models, binary resolution, and prioritisation."""

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
from resvis.features.resolution.prioritiser import ClausePrioritiser


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
        "goal_distance": None,
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


def make_record(
    clause_id,
    literals,
    *,
    origin=ClauseOrigin.KNOWLEDGE_BASE,
    depth=0,
    goal_distance=None,
):
    return ClauseRecord(
        clause_id=clause_id,
        clause=Clause(tuple(literals)),
        origin=origin,
        depth=depth,
        goal_distance=goal_distance,
    )


def test_negated_goal_is_automatically_marked_at_distance_zero():
    record = make_record(
        1,
        [Literal("Goal", negated=True)],
        origin=ClauseOrigin.NEGATED_GOAL,
    )

    assert record.goal_distance == 0
    assert record.is_goal_connected is True
    assert record.to_dict()["goal_distance"] == 0


@pytest.mark.parametrize("distance", [-1, 1])
def test_rejects_invalid_distances_for_goal_records(distance):
    with pytest.raises(ValueError, match="goal_distance"):
        make_record(
            1,
            [Literal("Goal", negated=True)],
            origin=ClauseOrigin.NEGATED_GOAL,
            goal_distance=distance,
        )


def test_prioritises_a_pair_connected_directly_to_the_negated_goal():
    shared = make_record(1, [Literal("P"), Literal("Q")])
    knowledge_base = make_record(2, [Literal("P", negated=True)])
    negated_goal = make_record(
        3,
        [Literal("Q", negated=True)],
        origin=ClauseOrigin.NEGATED_GOAL,
    )
    prioritiser = ClausePrioritiser((shared, knowledge_base, negated_goal))

    first = prioritiser.pop_pair()
    second = prioritiser.pop_pair()

    assert tuple(record.clause_id for record in first) == (1, 3)
    assert tuple(record.clause_id for record in second) == (1, 2)


def test_prioritises_clauses_closer_to_the_goal():
    distance_one = make_record(
        1,
        [Literal("P")],
        origin=ClauseOrigin.DERIVED,
        goal_distance=1,
    )
    complement_one = make_record(2, [Literal("P", negated=True)])
    distance_two = make_record(
        3,
        [Literal("Q")],
        origin=ClauseOrigin.DERIVED,
        goal_distance=2,
    )
    complement_two = make_record(4, [Literal("Q", negated=True)])
    prioritiser = ClausePrioritiser(
        (distance_two, complement_two, distance_one, complement_one)
    )

    assert tuple(
        record.clause_id for record in prioritiser.pop_pair()
    ) == (1, 2)


def test_prioritises_unit_and_shorter_clauses_at_the_same_goal_distance():
    connected = make_record(
        1,
        [Literal("P"), Literal("Q")],
        origin=ClauseOrigin.DERIVED,
        goal_distance=1,
    )
    longer = make_record(
        2,
        [Literal("P", negated=True), Literal("R"), Literal("S")],
    )
    unit = make_record(3, [Literal("Q", negated=True)])
    prioritiser = ClausePrioritiser((connected, longer, unit))

    assert tuple(
        record.clause_id for record in prioritiser.pop_pair()
    ) == (1, 3)


def test_adding_a_derived_clause_queues_new_goal_connected_work():
    positive = make_record(1, [Literal("P")])
    unrelated = make_record(2, [Literal("Q")])
    prioritiser = ClausePrioritiser((positive, unrelated))
    assert len(prioritiser) == 0

    derived = make_record(
        3,
        [Literal("P", negated=True)],
        origin=ClauseOrigin.DERIVED,
        depth=1,
        goal_distance=1,
    )
    prioritiser.add_clause(derived)

    assert len(prioritiser) == 1
    assert prioritiser.records == (positive, unrelated, derived)
    assert tuple(
        record.clause_id for record in prioritiser.pop_pair()
    ) == (1, 3)


def test_does_not_queue_unresolvable_or_tautology_only_pairs():
    no_complement = ClausePrioritiser(
        (
            make_record(1, [Literal("P")]),
            make_record(2, [Literal("Q")]),
        )
    )
    tautology_only = ClausePrioritiser(
        (
            make_record(1, [Literal("P"), Literal("Q")]),
            make_record(
                2,
                [Literal("P", negated=True), Literal("Q", negated=True)],
            ),
        )
    )

    assert len(no_complement) == 0
    assert len(tautology_only) == 0


def test_equal_priority_pairs_use_stable_clause_ids_as_tie_breakers():
    shared = make_record(1, [Literal("P"), Literal("Q")])
    not_p = make_record(2, [Literal("P", negated=True)])
    not_q = make_record(3, [Literal("Q", negated=True)])
    prioritiser = ClausePrioritiser((not_q, shared, not_p))

    assert tuple(
        record.clause_id for record in prioritiser.pop_pair()
    ) == (1, 2)


def test_prioritiser_rejects_duplicate_clause_ids():
    prioritiser = ClausePrioritiser((make_record(1, [Literal("P")]),))

    with pytest.raises(ValueError, match="already registered"):
        prioritiser.add_clause(make_record(1, [Literal("Q")]))


def test_empty_prioritiser_has_a_clear_error():
    with pytest.raises(IndexError, match="No resolvable clause pairs"):
        ClausePrioritiser().pop_pair()
