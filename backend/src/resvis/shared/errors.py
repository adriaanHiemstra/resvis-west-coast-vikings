"""Shared error types for surfacing problems across the API (Backlog 7).
Matches the sequence diagram's ErrorMsg(code, position, message) contract,
so every feature reports errors the same way regardless of which
frontend is calling."""

from dataclasses import dataclass


@dataclass
class SyntaxErrorDetail:
    code: str
    position: int
    message: str


class FormulaSyntaxError(Exception):
    """Raised when a single formula fails to lex or parse. Carries a
    SyntaxErrorDetail so the caller (router, eventually the frontend)
    can point at exactly what went wrong and where."""

    def __init__(self, detail: SyntaxErrorDetail) -> None:
        self.detail = detail
        super().__init__(detail.message)
