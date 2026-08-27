"""Reusable HTTP API for Backlog 3 CNF conversion."""

from __future__ import annotations

from fastapi import APIRouter
from pydantic import BaseModel

from resvis.features.cnf.service import CnfService

router = APIRouter(prefix="/cnf", tags=["cnf"])
_service = CnfService()


class ConvertCnfRequest(BaseModel):
    formulas: list[str]
    negate: bool = False


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


class ConversionErrorResponse(BaseModel):
    code: str
    position: int
    message: str


class ConvertFormulaResponse(BaseModel):
    formula: str
    negated: bool
    success: bool
    cnf: CnfResponse | None = None
    error: ConversionErrorResponse | None = None


class ConvertCnfResponse(BaseModel):
    results: list[ConvertFormulaResponse]


@router.post("/convert", response_model=ConvertCnfResponse)
def convert_formulas(body: ConvertCnfRequest) -> dict:
    """Convert a knowledge base batch or a one-formula goal batch to CNF."""

    return {
        "results": _service.convert_formulas(
            body.formulas,
            negate=body.negate,
        )
    }
