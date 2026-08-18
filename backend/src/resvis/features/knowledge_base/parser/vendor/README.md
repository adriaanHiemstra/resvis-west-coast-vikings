# Vendored client parser

Provided by the client (Project Scope §4: "the team will reuse and rewrite
the existing client-provided Python parser... as a starting point"). Kept
as-is here; adapt it rather than editing in place so upstream fixes are
easy to diff. There is no restriction on rewriting it (Client brief, slide 5).

## What it does

- `lexer.py` — a `ply.lex` tokenizer for propositional formulas. Tokens:
  `LETTER`, `CONJUCTION` (`&`), `DISJUNCTION` (`|`), `EQUIV` (`<->`),
  `NEGATION` (`~`), `IMPLICATION` (`->`), `LPAREN`, `RPAREN`.
- `parser.py` — a `ply.yacc` grammar that consumes those tokens and builds a
  binary `Node(label, left, right)` tree per formula.
- `test.py` — reads `input.txt` line by line and prints the parsed tree for
  each formula.

## Known constraints (matter for the adapter and for Backlog 2/3)

- **Fully parenthesized infix syntax is required.** Every binary
  sub-expression must be wrapped in parens, e.g. `((P -> Q) & (R -> S))`.
  There is no operator-precedence handling — the grammar leans on the
  parens instead. This is the de facto DSL referenced in Project Scope §4
  ("no agreed domain-specific language exists... the team will define its
  own syntax or use the syntax that works best with the given parser").
- **Output is a syntax tree (`Node`), not `Clause[]`.** The class diagram's
  `Parser.parse(text): Clause[]` is the target *public* interface; getting
  there from this vendored code means: tokenize/parse each formula line
  into a `Node` tree, then something (see `../../cnf/converter.py`) walks
  that tree to produce CNF clauses. The adapter in `../adapter.py` is
  where that seam lives — do not call `lexer`/`parser` directly from
  routers or services.
- **Global parser/lexer state.** `ply.yacc.yacc()` and `ply.lex.lex()`
  build module-level singletons on import. Fine for a single-threaded
  single-session app; revisit if the API ever needs concurrency.
- **`LETTER` regex** is `(\d\-)*[a-zA-Z](\d,\d)*` — a single letter,
  optionally with numeric prefix/suffix decoration. Multi-character
  identifiers like `Fail` are not supported as a single atom.
- Requires the `ply` package (declared in `backend/pyproject.toml`).
