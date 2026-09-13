"""Application service joining parsing, CNF conversion, and resolution."""

from __future__ import annotations

from resvis.features.cnf.converter import CnfConversionError, CnfConverter
from resvis.features.cnf.models import CnfClauseSet
from resvis.features.knowledge_base.parser.adapter import ParserAdapter
from resvis.features.resolution.engine import ResolutionEngine
from resvis.shared.errors import FormulaSyntaxError


class ResolutionService:
    def __init__(
        self,
        parser: ParserAdapter | None = None,
        converter: CnfConverter | None = None,
    ) -> None:
        self._parser = parser or ParserAdapter()
        self._converter = converter or CnfConverter()

    def run(
        self,
        knowledge_base: list[str],
        goal: str,
        *,
        max_steps: int = 1_000,
        max_clauses: int = 500,
    ) -> dict[str, object]:
        """Parse formulas, negate the goal, and run resolution by refutation."""

        knowledge_base_clauses = []
        for formula in knowledge_base:
            converted = self._convert_formula(formula, negate=False)
            if isinstance(converted, dict):
                return self._failure(converted)
            knowledge_base_clauses.extend(converted.clauses)

        converted_goal = self._convert_formula(goal, negate=True)
        if isinstance(converted_goal, dict):
            return self._failure(converted_goal)

        knowledge_base_cnf = CnfClauseSet(tuple(knowledge_base_clauses))
        engine = ResolutionEngine(
            max_steps=max_steps,
            max_clauses=max_clauses,
        )
        result = engine.run(knowledge_base_cnf, converted_goal)

        return {
            "success": True,
            "knowledge_base_cnf": knowledge_base_cnf.to_dict(),
            "negated_goal_cnf": converted_goal.to_dict(),
            "result": result.to_dict(),
            "error": None,
        }

    def _convert_formula(
        self,
        formula: str,
        *,
        negate: bool,
    ) -> CnfClauseSet | dict[str, object]:
        try:
            syntax_tree = self._parser.parse_formula(formula)
            return self._converter.convert(syntax_tree.root, negate=negate)
        except FormulaSyntaxError as exc:
            return {
                "formula": formula,
                "code": exc.detail.code,
                "position": exc.detail.position,
                "message": exc.detail.message,
            }
        except CnfConversionError as exc:
            return {
                "formula": formula,
                "code": "CNF_CONVERSION_ERROR",
                "position": 0,
                "message": str(exc),
            }

    @staticmethod
    def _failure(error: dict[str, object]) -> dict[str, object]:
        return {
            "success": False,
            "knowledge_base_cnf": None,
            "negated_goal_cnf": None,
            "result": None,
            "error": error,
        }
