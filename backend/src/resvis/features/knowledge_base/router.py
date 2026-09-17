"""Backlog 7 (reusable API): the HTTP layer for knowledge-base parsing.
Pure plumbing on purpose - request in, response out, no parsing logic
of its own. All real work happens in KnowledgeBaseService.
"""

from __future__ import annotations

from fastapi import APIRouter, HTTPException
from pydantic import BaseModel

from resvis.features.knowledge_base.service import KnowledgeBaseService
from resvis.shared.errors import FormulaSyntaxError

router = APIRouter(prefix="/knowledge-base", tags=["knowledge-base"])
_service = KnowledgeBaseService()


class ParseKnowledgeBaseRequest(BaseModel):
    formulas: list[str]


class TreeNode(BaseModel):
    label: str
    left: TreeNode | None = None
    right: TreeNode | None = None


class ParseErrorResponse(BaseModel):
    code: str
    position: int
    message: str


class ParseFormulaResponse(BaseModel):
    formula: str
    success: bool
    tree: TreeNode | None = None
    error: ParseErrorResponse | None = None


class ParseKnowledgeBaseResponse(BaseModel):
    results: list[ParseFormulaResponse]


TreeNode.model_rebuild()


@router.post("/parse", response_model=ParseKnowledgeBaseResponse)
def parse_formulas(body: ParseKnowledgeBaseRequest) -> dict:
    """POST /knowledge-base/parse - parses a list of formulas (one call
    covers either a whole knowledge base's worth of lines, or a single
    query formula sent as a one-item list).

    Responds with HTTP 200 and one result per formula, in the same
    order they were sent - a malformed formula only affects its own
    entry in `results`, it never blocks the other formulas in the same
    request from being parsed. The one exception is a batch that's too
    large to process at all (MAX_FORMULAS_PER_KNOWLEDGE_BASE): that's
    rejected outright as HTTP 400, using the same ErrorMsg(code,
    position, message) shape as every other error path.
    """
    try:
        return {"results": _service.parse_formulas(body.formulas)}
    except FormulaSyntaxError as exc:
        raise HTTPException(
            status_code=400,
            detail={
                "code": exc.detail.code,
                "position": exc.detail.position,
                "message": exc.detail.message,
            },
        ) from exc
