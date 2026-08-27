"""Application service joining ParserAdapter to CnfConverter."""

from __future__ import annotations

from resvis.features.cnf.converter import CnfConversionError, CnfConverter
from resvis.features.knowledge_base.parser.adapter import ParserAdapter
from resvis.shared.errors import FormulaSyntaxError


class CnfService:
    def __init__(
        self,
        parser: ParserAdapter | None = None,
        converter: CnfConverter | None = None,
    ) -> None:
        self._parser = parser or ParserAdapter()
        self._converter = converter or CnfConverter()

    def convert_formula(self, formula: str, *, negate: bool = False) -> dict:
        """Parse and convert one formula, reporting errors as data."""

        try:
            syntax_tree = self._parser.parse_formula(formula)
            cnf = self._converter.convert(syntax_tree.root, negate=negate)
        except FormulaSyntaxError as exc:
            return {
                "formula": formula,
                "negated": negate,
                "success": False,
                "cnf": None,
                "error": {
                    "code": exc.detail.code,
                    "position": exc.detail.position,
                    "message": exc.detail.message,
                },
            }
        except CnfConversionError as exc:
            return {
                "formula": formula,
                "negated": negate,
                "success": False,
                "cnf": None,
                "error": {
                    "code": "CNF_CONVERSION_ERROR",
                    "position": 0,
                    "message": str(exc),
                },
            }

        return {
            "formula": formula,
            "negated": negate,
            "success": True,
            "cnf": cnf.to_dict(),
            "error": None,
        }

    def convert_formulas(
        self,
        formulas: list[str],
        *,
        negate: bool = False,
    ) -> list[dict]:
        """Convert every formula independently and preserve request order."""

        return [
            self.convert_formula(formula, negate=negate)
            for formula in formulas
        ]
