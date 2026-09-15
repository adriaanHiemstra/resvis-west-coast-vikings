"""HTTP API for priority-based propositional resolution."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel, Field

from resvis.features.resolution.service import ResolutionService


router = APIRouter(prefix="/resolution", tags=["resolution"])
_service = ResolutionService()


class RunResolutionRequest(BaseModel):
    knowledge_base: list[str]
    goal: str
    max_steps: int = Field(default=1_000, ge=1, le=10_000)
    max_clauses: int = Field(default=500, ge=1, le=5_000)


class LiteralResponse(BaseModel):
    symbol: str
    negated: bool


class ClauseResponse(BaseModel):
    literals: list[LiteralResponse]
    raw: str


class CnfResponse(BaseModel):
    clauses: list[ClauseResponse]
    raw: str
    is_tautology: bool


class ClauseRecordResponse(BaseModel):
    clause_id: int
    clause: ClauseResponse
    origin: str
    depth: int
    goal_distance: int | None


class ResolutionStepResponse(BaseModel):
    step_number: int
    left_clause_id: int
    right_clause_id: int
    pivot: str
    resolvent_clause_id: int
    resolvent: ClauseResponse
    is_contradiction: bool
    explanation: str


class ResolutionResultResponse(BaseModel):
    status: str
    entailed: bool
    completed: bool
    clauses: list[ClauseRecordResponse]
    steps: list[ResolutionStepResponse]
    limit_reason: str | None
    transcript: list[str]


class ResolutionErrorResponse(BaseModel):
    formula: str
    code: str
    position: int
    message: str


class RunResolutionResponse(BaseModel):
    success: bool
    knowledge_base_cnf: CnfResponse | None = None
    negated_goal_cnf: CnfResponse | None = None
    result: ResolutionResultResponse | None = None
    error: ResolutionErrorResponse | None = None


@router.post("/run", response_model=RunResolutionResponse)
def run_resolution(body: RunResolutionRequest) -> dict[str, object]:
    """Determine whether the knowledge base entails the supplied goal."""

    return _service.run(
        body.knowledge_base,
        body.goal,
        max_steps=body.max_steps,
        max_clauses=body.max_clauses,
    )
