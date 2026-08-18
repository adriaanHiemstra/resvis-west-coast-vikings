# ResViz — project context

Capstone project (CSC3003S), team **West Coast Vikings**. This file is the
canonical context dump for anyone (human or AI) picking up work in this
repo. Source documents are checked in under [docs/planning](docs/planning).

## Team

| Name | Student number | Owns |
|---|---|---|
| Suhayl Khoodoruth | KHDSUH001 | Backlog 1 (UI), Backlog 6 (UX polish) |
| Adriaan Hiemstra | HMSADR001 | Backlog 2 (KB parser), Backlog 4 (step visualiser), Backlog 7 (reusable API) |
| Isa Deshmukh | DSHMUH001 | Backlog 3 (CNF converter), Backlog 5 (resolution algorithm) |

- GitLab: `https://gitlab.cs.uct.ac.za/hmsadr001/resvis-west-coast-vikings`
- Sprint length: 2 weeks
- Languages: Python (backend), React/TypeScript (frontend)

## What the client actually wants

Client: a trainer for a Learner Admissions committee at an educational
institution. Committee members currently formalise facts about each
student as propositional logic **by hand, on paper**: compile a knowledge
base (KB), convert it to CNF, apply resolution to check satisfiability.
ResViz replaces the pen-and-paper process with a web app that does the
same thing and — critically — **shows its work**, so members can see and
trust how a conclusion was reached (explainability was called out
explicitly as a client need).

Client-stated challenges (ResViz brief):
- Need to type propositional formulas quickly.
- Members forget what a proposition symbol means → need for annotation
  (a `symbol -> meaning` mapping). **Not yet in the backlog** — Project
  Scope's traceability table lists this as "Pending". The class diagram
  already models it (`KnowledgeBase -> Annotation`); a backlog item for
  wiring it into the UI still needs to be written.
- Resolution must not blindly compare every clause pair — clauses
  "related" to the goal should be tried first (→ Backlog 5).
- No existing DSL for writing facts, no existing API, no visualisation
  convention — the team defines all three and validates the syntax/viz
  choices with the client via a prototype before committing to major
  frontend work.

## Out of scope (Project Scope §3)

- First-order logic — propositional only.
- User accounts / persistent multi-user login. **Single-session only —
  the project dies when the session ends.** No database, no auth.
- Mobile-native support (web only).
- Optimising algorithm speed/performance.

## The vendored parser

The client provided a starting-point parser, now vendored at
[backend/src/resvis/features/knowledge_base/parser/vendor](backend/src/resvis/features/knowledge_base/parser/vendor)
(see that folder's own README for the deep dive). Short version:

- PLY-based lexer (`lexer.py`) + yacc grammar (`parser.py`).
- Input syntax is **fully parenthesized infix**, e.g.
  `((P -> Q) & (R -> S))` — every binary sub-expression needs its own
  parens, no precedence climbing. This is the de facto DSL referenced in
  Project Scope §4.
- Operators: `&` (and), `|` (or), `~` (not), `->` (implies), `<->` (iff).
- Output per formula is a binary `Node(label, left, right)` **syntax
  tree**, not a `Clause`. Getting to `Clause[]`/CNF is our own code's job.
- There's no restriction on rewriting this code (Client brief, slide 5) —
  it's a starting point, not a fixed dependency.
- Always go through the stable adapter interface
  (`knowledge_base/parser/adapter.py`) rather than importing `vendor`
  directly elsewhere — this is a direct response to Risk 3 in Assignment
  1 ("the parser could be incompatible with the format of the knowledge
  base... coded behind a stable interface to allow later change without
  affecting the whole back-end").

## Architecture

Backend: Python, feature-based, structured as an installable package
(`backend/src/resvis`) so `pytest`/imports don't depend on cwd tricks.
Frontend: React + TypeScript via Vite, feature-based under
`frontend/src/features`. Both sides mirror the same backlog-item
boundaries so a given feature's UI, API, and tests are easy to find
together — see [File structure](#file-structure) below.

No framework/library choices have been *installed* yet — `pyproject.toml`
and `package.json` declare the intended stack (FastAPI + pytest;
Vite + React + Vitest/RTL) but nothing has been run yet. That's next.

### Domain model (from the class diagram, `docs/planning/class-diagram.pdf`)

```
Parser.parse(text): Clause[]           reads KnowledgeBase, Query
                                        produces ClauseSet
KnowledgeBase       1 -> 0..* Annotation
  +formulas: String[]
Annotation
  +symbol: Char, +meaning: String
Query
  +formulas: String

CnfConverter.convert(ClauseSet): CnfClauseSet
ClauseSet            1 -> 0..* Clause
CnfClauseSet          1 -> 0..* Clause
Clause                1 -> 1..* Literal
  +literals: Literal[]
Literal
  +symbol: Char, +negated: Boolean

ResolutionEngine.solve(knowledgeBase, query): DerivationTrace
  +stepLimit: integer
DerivationTrace       1 -> 0..* ResolutionStep
  +verdict: Boolean, +steps: ResolutionStep[]
ResolutionStep
  +index: integer, +parents: Clause[2], +resolvent: Clause

ClausePrioritiser.order(DerivationTrace): ResolutionStep[]
```

Note `DerivationTrace.verdict` is modelled as `Boolean` in the diagram,
but the use cases require a third state: **proven / refuted /
indeterminate** (indeterminate when resolution hits `stepLimit` without
reaching the empty clause or saturating). Backend code should treat
`verdict` as `bool | None`, with `None` meaning indeterminate.

### Request flow (from the sequence diagram, `docs/planning/sequence-diagram.pdf`)

```
User -> React Client: enter formulas, annotations, query
React Client -> Resolution API: solve(knowledgeBase, query, strategy)
Resolution API -> Parser: parse(knowledgeBase formulas)

alt syntax error found
    Parser -> Resolution API: SyntaxError(position, message)
    Resolution API -> React Client: ErrorMsg(code, position, message)
    React Client -> User: highlight wrong formula
else all formulas valid
    Parser -> Resolution API: syntax trees(knowledgeBase)
    Resolution API -> Parser: parse(query)
    Parser -> Resolution API: syntax tree(query)
    Resolution API -> CnfConverter: convert(knowledgeBase trees)
    CnfConverter -> Resolution API: CnfClauseSet for knowledgeBase
    Resolution API -> CnfConverter: convert(query tree)
    CnfConverter -> Resolution API: CnfClauseSet for query
    Resolution API -> ResolutionEngine: solve(kb clauses, query clauses, limits)
    loop until empty clause, saturation, or limit
        ResolutionEngine: select clause pair
        ResolutionEngine: resolve and record step
    end
    ResolutionEngine -> Resolution API: derivation trace(verdict, steps)
    Resolution API -> ClausePrioritiser: order(trace)
    ClausePrioritiser -> Resolution API: ordered steps
    Resolution API -> React Client: SuccessMsg(verdict, clauses, trace)
    React Client -> User: render resolution and step controls
end
```

The `ErrorMsg(code, position, message)` shape is the API's error contract
— every syntax-error path (KB upload, query entry) should return this
same shape so the frontend has one error-handling code path.

### Use cases (`docs/planning/use-case-narratives.pdf`)

1. **Upload a knowledge base.** Create+name project → upload/type KB →
   parse into clause form → user reviews/corrects clauses → confirm →
   System activates it for the project. Invalid file format is rejected
   outright; parse errors report the affected section for correction and
   re-upload. Leaving the review screen without confirming leaves the KB
   **inactive** (not deleted, just not usable yet).
2. **Enter Proposition and run resolution algorithm.** Precondition: an
   *active* KB exists. Parse the proposition → run resolution against the
   active KB → report proven / refuted / indeterminate. No active KB →
   prompt to upload/activate one first. Invalid proposition syntax →
   reject with a correction prompt. Step/time limit reached without a
   definitive answer → indeterminate, not proven/refuted.
3. **View resolution process** (extends #2). List view of clause
   comparisons, current step highlighted; step forward/backward like a
   debugger; the comparison that proves impossibility is highlighted red;
   final conclusion is red (impossible) or green (possible). User can
   switch to an equivalent **tree view** at any point, with the same
   step controls. Both views return to the previous screen.

## Backlog (Assignment 1) — build order, priority, and DoD

| # | Name | Priority | Owner | Est. | DoD / test cases (verbatim from Assignment 1) |
|---|---|---|---|---|---|
| 1 | UI | High | Suhayl | 3d | Interface for KB input/upload, proposition entry (keyboard + symbol palette), resolution output. Tests: input KB by typing, input KB by uploading, input clause via palette + keyboard, view mock resolution output. |
| 2 | Knowledge base parser | High | Adriaan | 3d | Converts KB into clause form, output visible (console/screen). Tests: input KB, run parser, compare clause-form output to KB facts. |
| 3 | CNF converter | High | Isa | 5d | Converts clause form (KB **and** entered proposition) into CNF, output visible. Tests: run converter on parser output, verify CNF logged correctly and matches source. |
| 4 | Resolution step visualiser | Low | Adriaan | 1.5w | Step forward/backward through algorithm comparisons like a debugger; disproving comparison highlighted red; conclusion shown at the end. Tests: run algorithm, view interface, step forward/backward, verify red highlight on the disproving step if unsatisfiable. |
| 5 | Resolution algorithm | Medium | Isa | 4d | Priority-based resolution: clauses sharing elements with the user's clause checked first, then clauses referencing those elements, etc. Tests: run on CNF, check each step + final result, cross-check by hand, compare across multiple CNF inputs. |
| 6 | Enhance UX | Low | Suhayl | 1w | Smooth transitions/animations, coherent colour palette, intuitive flow. Tests: end-to-end + UAT. |
| 7 | Reusable API | High | Adriaan | 1w | Links front/backend, results display correctly and promptly, works with more than one frontend. Tests: connect FE↔BE and verify display; test API against another team's frontend. |

Build order per Project Scope §2: **1 → 2 → 3 → 7** (high priority) before
**5** (medium), then **4 → 6** (low priority, polish).

Traceability (Project Scope §5): quick typing → 1; ease of annotation →
*pending, not yet backlogged*; trace/explain the answer → 4;
goal-directed prioritisation → 5; split FE/BE + reusable API → 7;
supporting infra (parser + CNF) → 2, 3.

## Risk register highlights (Assignment 1) that shape design decisions

- **R2 (security):** the API takes free-text user input into a parser —
  treat all KB/query text as untrusted input at the router boundary.
- **R3 (requirements uncertainty — no agreed DSL/viz convention):**
  mitigated by putting the parser and CNF converter behind stable
  interfaces (see `parser/adapter.py`) and by validating the
  visualisation approach with the client via a prototype before
  committing to major frontend work.
- **R5 (performance/hangs on larger KBs):** resolution is bounded by a
  configurable step/time limit (`ResolutionEngine.stepLimit`) — report
  indeterminate instead of hanging; clauses unrelated to the goal aren't
  blindly resolved (Backlog 5); the frontend should render the derivation
  incrementally rather than all at once for large traces.

## File structure

Feature-based on both sides; each feature folder corresponds to one or
more backlog items (see inline references in each folder once code
lands). Structure currently contains file/folder scaffolding only — no
implementation yet.

```
backend/src/resvis/
  main.py                  FastAPI app wiring (planned)
  shared/                  cross-feature config/error types
  features/
    projects/              Backlog 1 backend half — project lifecycle
    knowledge_base/         Backlog 2 — parser adapter + KB/Annotation/Query models
      parser/
        adapter.py          stable interface in front of vendor/
        vendor/              client-provided PLY lexer/parser, as given
    cnf/                    Backlog 3 — Clause/Literal/ClauseSet/CnfClauseSet + converter
    resolution/             Backlog 5 — ResolutionEngine, ClausePrioritiser, DerivationTrace
backend/tests/              one test module per backlog item (1, 2, 3, 5, 7)

frontend/src/
  features/
    project/                Backlog 1 — create project
    knowledge-base/         Backlog 1/2 — upload/type KB, review/correct clauses
    proposition-input/      Backlog 1 — keyboard + symbol-palette entry
    resolution-viewer/      Backlog 4 — list view, tree view, debugger controls
    ux-theme/               Backlog 6 — polish pass
  shared/
    api/                    Backlog 7 — typed client + request/response contracts
frontend/tests/             one test module per backlog item (1, 4, 6, 7)

docs/planning/              source PDFs/docx checked in for team/tutor/client access
```

## Testing strategy

- Backend: `pytest`, one module per backlog item under `backend/tests/`.
- Frontend: `vitest` + React Testing Library, one module per backlog item
  under `frontend/tests/`.
- Assignment 1 requires every backlog item to have unit tests — the test
  module layout already reflects that 1:1 mapping; fill in real
  assertions as each feature is implemented (test files currently exist
  as empty scaffolding, per the "structure first" setup phase).
- Backlog 5's DoD explicitly calls for cross-checking the resolution
  algorithm's output against hand-worked resolution on the same CNF —
  worth keeping a small set of hand-verified fixtures for this.

## Open items before/while coding starts

1. Neither `backend/.venv` nor `frontend/node_modules` exist yet — no
   dependencies have been installed, nothing has been run. That's
   deliberate: this pass was structure-only.
2. No DSL/annotation UI decision has been validated with the client yet —
   do that before investing heavily in the symbol palette or annotation
   UI.
3. "Ease of annotation" has no backlog item yet despite being an explicit
   client need — raise this with the team/client.
4. FastAPI (backend) and Vite+React+TS+Vitest (frontend) are the intended
   stack per the config files already in place, but this hasn't been
   discussed as a team decision — confirm before installing.
