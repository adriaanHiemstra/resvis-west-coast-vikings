"""Backlog 5, commit 4: complete engine, service, and HTTP endpoint."""

from dataclasses import FrozenInstanceError

import pytest
from fastapi import FastAPI
from fastapi.testclient import TestClient

from resvis.features.cnf.models import Clause, CnfClauseSet, Literal
from resvis.features.resolution.engine import ResolutionEngine, resolve_pair
from resvis.features.resolution.models import (
    ClauseOrigin,
    ClauseRecord,
    ResolutionCandidate,
    ResolutionResult,
    ResolutionStatus,
    ResolutionStep,
)
from resvis.features.resolution.prioritiser import ClausePrioritiser
from resvis.features.resolution.router import router
from resvis.features.resolution.service import ResolutionService


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


def test_resolution_step_explanation_defaults_to_empty_and_serializes():
    default_step = ResolutionStep(
        step_number=1,
        left_clause_id=1,
        right_clause_id=2,
        pivot="P",
        resolvent_clause_id=3,
        resolvent=Clause((Literal("Q"),)),
    )
    assert default_step.explanation == ""

    explained_step = ResolutionStep(
        step_number=1,
        left_clause_id=1,
        right_clause_id=2,
        pivot="P",
        resolvent_clause_id=3,
        resolvent=Clause((Literal("Q"),)),
        explanation="Clause 1 (P) and Clause 2 (¬P) share P with opposite signs, so it cancels out, leaving Q.",
    )
    assert explained_step.to_dict()["explanation"] == explained_step.explanation


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


def test_engine_proves_a_goal_and_records_the_priority_driven_trace():
    knowledge_base = CnfClauseSet(
        (
            Clause((Literal("P", True), Literal("Q"))),
            Clause((Literal("Q", True), Literal("R"))),
            Clause((Literal("P"),)),
        )
    )
    negated_goal = CnfClauseSet((Clause((Literal("R", True),)),))

    result = ResolutionEngine().run(knowledge_base, negated_goal)

    assert result.status is ResolutionStatus.ENTAILED
    assert result.entailed is True
    assert [step.pivot for step in result.steps] == ["R", "Q", "P"]
    assert result.steps[-1].is_contradiction is True
    assert result.clauses[-1].clause == Clause()


def test_engine_reports_not_entailed_after_all_useful_pairs_are_exhausted():
    result = ResolutionEngine().run(
        CnfClauseSet((Clause((Literal("P"),)),)),
        CnfClauseSet((Clause((Literal("Q", True),)),)),
    )

    assert result.status is ResolutionStatus.NOT_ENTAILED
    assert result.entailed is False
    assert result.completed is True
    assert result.steps == ()


def test_contradictory_knowledge_base_entails_any_goal():
    result = ResolutionEngine().run(
        CnfClauseSet(
            (
                Clause((Literal("P"),)),
                Clause((Literal("P", True),)),
            )
        ),
        CnfClauseSet((Clause((Literal("Unrelated", True),)),)),
    )

    assert result.entailed is True
    assert result.steps[-1].resolvent.is_empty is True


def test_initial_duplicate_clause_is_kept_once_and_marked_goal_connected():
    shared = Clause((Literal("P"),))
    result = ResolutionEngine().run(
        CnfClauseSet((shared,)),
        CnfClauseSet((shared,)),
    )

    assert len(result.clauses) == 1
    assert result.clauses[0].origin is ClauseOrigin.NEGATED_GOAL
    assert result.clauses[0].goal_distance == 0


def test_clause_limit_stops_before_an_unbounded_derivation():
    result = ResolutionEngine(max_clauses=2).run(
        CnfClauseSet((Clause((Literal("P"), Literal("Q"))),)),
        CnfClauseSet((Clause((Literal("P", True),)),)),
    )

    assert result.status is ResolutionStatus.LIMIT_REACHED
    assert result.completed is False
    assert "clause limit" in result.limit_reason.lower()


def test_step_limit_returns_the_partial_trace():
    knowledge_base = CnfClauseSet(
        (
            Clause((Literal("P", True), Literal("Q"))),
            Clause((Literal("Q", True), Literal("R"))),
            Clause((Literal("P"),)),
        )
    )
    result = ResolutionEngine(max_steps=1).run(
        knowledge_base,
        CnfClauseSet((Clause((Literal("R", True),)),)),
    )

    assert result.status is ResolutionStatus.LIMIT_REACHED
    assert len(result.steps) == 1
    assert "step limit" in result.limit_reason.lower()


@pytest.mark.parametrize(
    ("argument", "value", "exception"),
    [
        ("max_steps", 0, ValueError),
        ("max_clauses", True, TypeError),
    ],
)
def test_engine_rejects_invalid_resource_limits(argument, value, exception):
    with pytest.raises(exception):
        ResolutionEngine(**{argument: value})


def test_service_runs_parser_to_cnf_to_resolution_pipeline():
    response = ResolutionService().run(["(P -> Q)", "P"], "Q")

    assert response["success"] is True
    assert response["knowledge_base_cnf"]["raw"] == "(¬P ∨ Q) ∧ (P)"
    assert response["negated_goal_cnf"]["raw"] == "(¬Q)"
    assert response["result"]["entailed"] is True
    assert response["result"]["steps"][-1]["is_contradiction"] is True


def test_service_returns_a_structured_formula_error_without_running():
    response = ResolutionService().run(["P", "(P @ Q)"], "Q")

    assert response["success"] is False
    assert response["result"] is None
    assert response["error"]["formula"] == "(P @ Q)"
    assert response["error"]["position"] == 3


def test_service_can_report_a_valid_non_entailment():
    response = ResolutionService().run(["P"], "Q")

    assert response["success"] is True
    assert response["result"]["status"] == "not_entailed"
    assert response["result"]["entailed"] is False


def test_http_endpoint_returns_cnf_result_and_derivation_trace():
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    response = client.post(
        "/resolution/run",
        json={
            "knowledge_base": ["(P -> Q)", "P"],
            "goal": "Q",
        },
    )

    assert response.status_code == 200
    body = response.json()
    assert body["success"] is True
    assert body["result"]["status"] == "entailed"
    assert body["result"]["steps"][-1]["resolvent"]["raw"] == "⊥"


def test_http_endpoint_rejects_non_positive_limits():
    app = FastAPI()
    app.include_router(router)
    client = TestClient(app)

    response = client.post(
        "/resolution/run",
        json={
            "knowledge_base": ["P"],
            "goal": "P",
            "max_steps": 0,
        },
    )

    assert response.status_code == 422

"""Integration-level checks for the completed resolution workflow."""
# Everything elow is integration testing

from fastapi import FastAPI
from fastapi.testclient import TestClient

from resvis.features.resolution.router import router
from resvis.features.resolution.service import ResolutionService


def make_client() -> TestClient:
    app = FastAPI()
    app.include_router(router)
    return TestClient(app)


def test_repeated_runs_produce_the_same_priority_order_and_trace():
    service = ResolutionService()

    first = service.run(["(P -> Q)", "(Q -> R)", "P"], "R")
    second = service.run(["(P -> Q)", "(Q -> R)", "P"], "R")

    assert first == second
    assert [step["pivot"] for step in first["result"]["steps"]] == [
        "R",
        "Q",
        "P",
    ]


def test_resolution_handles_a_goal_that_converts_to_multiple_cnf_clauses():
    response = ResolutionService().run(["P"], "(P | Q)")

    assert response["success"] is True
    assert response["negated_goal_cnf"]["raw"] == "(¬P) ∧ (¬Q)"
    assert response["result"]["status"] == "entailed"


def test_empty_knowledge_base_returns_a_completed_non_entailment():
    response = ResolutionService().run([], "P")

    assert response["success"] is True
    assert response["knowledge_base_cnf"]["clauses"] == []
    assert response["result"]["status"] == "not_entailed"
    assert response["result"]["completed"] is True


def test_invalid_goal_returns_the_same_structured_error_contract_as_invalid_kb():
    response = ResolutionService().run(["P"], "(Q @ R)")

    assert response["success"] is False
    assert response["result"] is None
    assert response["error"]["formula"] == "(Q @ R)"
    assert response["error"]["position"] == 3


def test_http_contract_exposes_both_cnf_inputs_and_the_proof_trace():
    response = make_client().post(
        "/resolution/run",
        json={"knowledge_base": ["(P -> Q)", "P"], "goal": "Q"},
    )

    assert response.status_code == 200
    body = response.json()
    assert body["knowledge_base_cnf"]["raw"] == "(¬P ∨ Q) ∧ (P)"
    assert body["negated_goal_cnf"]["raw"] == "(¬Q)"
    assert body["result"]["steps"][-1]["is_contradiction"] is True


def test_http_contract_returns_a_partial_trace_when_a_limit_is_reached():
    response = make_client().post(
        "/resolution/run",
        json={
            "knowledge_base": ["(P -> Q)", "(Q -> R)", "P"],
            "goal": "R",
            "max_steps": 1,
        },
    )

    assert response.status_code == 200
    result = response.json()["result"]
    assert result["status"] == "limit_reached"
    assert result["completed"] is False
    assert len(result["steps"]) == 1
    assert result["limit_reason"]
