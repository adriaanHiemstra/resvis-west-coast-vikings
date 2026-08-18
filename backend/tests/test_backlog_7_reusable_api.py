"""Backlog 7 — Reusable API. Assignment 1 DoD: "The API should link the
front and backend of the app and be transferrable to different frontends
created by different teams." Test cases: "Connect front end to backend
and see if results... are displayed correctly and timely... Test API on
another team's frontend to see if it is reusable."

These tests go through the real HTTP layer (FastAPI's TestClient - an
in-memory fake client, no actual network needed) rather than calling
Python functions directly, so they're checking the same contract any
frontend - ours or another team's - would actually be talking to.
"""


def test_health_check_available_for_any_client(client):
    response = client.get("/health")
    assert response.status_code == 200
    assert response.json() == {"status": "ok"}


def test_parse_endpoint_batch_results_match_request_order(client):
    formulas = ["(P & Q)", "(P -> Q)", "~P"]
    response = client.post("/knowledge-base/parse", json={"formulas": formulas})
    assert response.status_code == 200
    results = response.json()["results"]
    assert [r["formula"] for r in results] == formulas
    assert all(r["success"] for r in results)


def test_parse_endpoint_reports_mixed_success_and_failure_independently(client):
    """This is the core Phase 5 guarantee: one bad formula in a batch
    only affects its own entry, everything else still parses."""
    formulas = ["(P & Q)", "(P @ Q)", "(P -> "]
    response = client.post("/knowledge-base/parse", json={"formulas": formulas})
    assert response.status_code == 200
    results = response.json()["results"]
    assert [r["success"] for r in results] == [True, False, False]
    assert results[1]["error"]["code"] == "ILLEGAL_CHARACTER"
    assert results[2]["error"]["code"] == "UNEXPECTED_END"


def test_parse_endpoint_empty_list_returns_empty_results(client):
    response = client.post("/knowledge-base/parse", json={"formulas": []})
    assert response.status_code == 200
    assert response.json() == {"results": []}


def test_openapi_schema_documents_the_parse_endpoint():
    """A generated/typed client (any framework, any team) needs the
    published schema to build against without reading our source code -
    this is what makes the API "reusable" in the DoD sense, not just
    "it happens to work for our frontend."""
    from resvis.main import app

    schema = app.openapi()
    assert "/knowledge-base/parse" in schema["paths"]
    assert "post" in schema["paths"]["/knowledge-base/parse"]
