"""Live-demo test cases for the 2026-08-31 prototype demo, mirroring the
client's own guideline scenarios (docs/planning/Guidelines-for-prototype-demo.pdf)
one-for-one so the mapping from "what the sponsor asked for" to "what we can
show" is obvious on screen.

Run these live during the demo with:

    cd backend && source .venv/bin/activate
    pytest tests/test_demo_prototype_scenarios.py -v

Backlog status as of this demo: parser (2), CNF converter (3), and the
reusable API (7) are implemented and exercised below through the real HTTP
layer (same contract any frontend talks to). Resolution (5) and the step
visualiser (4) are not built yet — Scenarios 4 and 5 from the client's
guideline are marked skipped rather than deleted, so the gap is visible
instead of silently missing when this file runs.
"""

import pytest


# ---------------------------------------------------------------------------
# Scenario 1: create a university knowledge base ("University-base")
#   A: "Applicant has high academic grades"
#   T: "Applicant has high NBT scores"
#   Q: "Applicant is considered qualified"
# ---------------------------------------------------------------------------


def test_scenario_1_university_base_facts_parse(client):
    """Each University-base proposition parses on its own — this is what
    the Knowledge Base panel sends per line as the admin types."""
    response = client.post(
        "/knowledge-base/parse",
        json={"formulas": ["A", "T", "Q"]},
    )
    assert response.status_code == 200
    results = response.json()["results"]
    assert [r["success"] for r in results] == [True, True, True]


# ---------------------------------------------------------------------------
# Scenario 2: create a separate student knowledge base without losing
# University-base.
#   E: "Student wrote an exceptional essay"
#   L: "Student has strong recommendation letters"
#   S: "Student receives a scholarship offer"
#   Ad: "Student is admitted to the faculty"
# ---------------------------------------------------------------------------


def test_scenario_2_student_base_facts_parse_independently_of_scenario_1(client):
    """The API is stateless per request (no server-side KB storage — see
    CLAUDE.md: single-session, no DB). Parsing this batch has no way to
    disturb Scenario 1's batch, which is exactly the "without losing
    University-base" requirement: each KB is just its own project in the
    frontend, and each parse call is independent."""
    university_response = client.post(
        "/knowledge-base/parse", json={"formulas": ["A", "T", "Q"]}
    )
    student_response = client.post(
        "/knowledge-base/parse", json={"formulas": ["E", "L", "S", "Ad"]}
    )
    assert all(r["success"] for r in university_response.json()["results"])
    assert all(r["success"] for r in student_response.json()["results"])


# ---------------------------------------------------------------------------
# Scenario 3: create faculty rules
#   (A ∨ T) → Q
#   (Q ∧ E) → Ad
#   (Ad ∧ L) → S
#
# The client's arrow/wedge notation maps to our DSL's fully-parenthesized
# infix syntax (CLAUDE.md: every binary sub-expression needs its own
# parens): "((A|T)->Q)" etc.
# ---------------------------------------------------------------------------


def test_scenario_3_faculty_rules_parse(client):
    rules = ["((A|T)->Q)", "((Q&E)->Ad)", "((Ad&L)->S)"]
    response = client.post("/knowledge-base/parse", json={"formulas": rules})
    assert response.status_code == 200
    assert all(r["success"] for r in response.json()["results"])


def test_scenario_3_faculty_rules_convert_to_cnf_correctly(client):
    """Hand-worked expected CNF for each rule, per Backlog 3's DoD ("verify
    CNF logged correctly and matches source"):

    (A ∨ T) → Q  ≡  ¬(A ∨ T) ∨ Q  ≡  (¬A ∨ Q) ∧ (¬T ∨ Q)
    (Q ∧ E) → Ad ≡  ¬Q ∨ ¬E ∨ Ad
    (Ad ∧ L) → S ≡  ¬Ad ∨ ¬L ∨ S
    """
    rules = ["((A|T)->Q)", "((Q&E)->Ad)", "((Ad&L)->S)"]
    response = client.post("/cnf/convert", json={"formulas": rules})
    assert response.status_code == 200
    results = response.json()["results"]
    assert all(r["success"] for r in results)

    def literal_sets(clauses):
        return [{(lit["symbol"], lit["negated"]) for lit in c["literals"]} for c in clauses]

    rule_1, rule_2, rule_3 = (r["cnf"]["clauses"] for r in results)

    assert literal_sets(rule_1) == [
        {("A", True), ("Q", False)},
        {("T", True), ("Q", False)},
    ]
    assert literal_sets(rule_2) == [
        {("Q", True), ("E", True), ("Ad", False)},
    ]
    assert literal_sets(rule_3) == [
        {("Ad", True), ("L", True), ("S", False)},
    ]


# ---------------------------------------------------------------------------
# Scenario 4: student KB (A, E, L) + query goal 'S', run resolution.
#
# Not built yet — backend/src/resvis/features/resolution/ is still empty
# scaffolding and its router isn't wired into main.py. What IS demonstrable
# today is the step that feeds resolution: the KB facts plus the *negated*
# goal, both converted to CNF (negate=True is resolution-by-refutation prep,
# already implemented in the CNF converter per CLAUDE.md's DerivationTrace
# design) — this is as far as the pipeline currently reaches.
# ---------------------------------------------------------------------------


def test_scenario_4_kb_and_negated_goal_are_cnf_ready_for_resolution(client):
    response = client.post(
        "/cnf/convert", json={"formulas": ["A", "E", "L"]}
    )
    goal_response = client.post(
        "/cnf/convert", json={"formulas": ["S"], "negate": True}
    )
    assert response.status_code == 200 and goal_response.status_code == 200
    assert all(r["success"] for r in response.json()["results"])
    goal_result = goal_response.json()["results"][0]
    assert goal_result["success"]
    assert goal_result["cnf"]["clauses"] == [
        {"literals": [{"symbol": "S", "negated": True}], "raw": "¬S"}
    ]


@pytest.mark.skip(
    reason="Backlog 5 (resolution algorithm) is not implemented yet — "
    "resolution/engine.py is empty and its router isn't wired into "
    "resvis.main. Nothing to run live for this scenario."
)
def test_scenario_4_resolution_proves_S_from_student_kb_and_faculty_rules():
    ...


# ---------------------------------------------------------------------------
# Scenario 5: visualisation of the resolution algorithm.
# ---------------------------------------------------------------------------


@pytest.mark.skip(
    reason="Backlog 4 (resolution step visualiser) is not implemented yet "
    "— frontend/src/features/resolution-viewer/* exist as unwired "
    "scaffolding and depend on Backlog 5. Nothing to run live for this "
    "scenario."
)
def test_scenario_5_resolution_trace_renders_step_by_step():
    ...
