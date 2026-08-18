# ResViz backend

Python/FastAPI service that parses a propositional-logic knowledge base and a
proposition, converts both to CNF, runs priority-based resolution, and
returns a step-by-step derivation trace for the frontend debugger view.

## Setup

```bash
cd backend
python3 -m venv .venv
source .venv/bin/activate
pip install -e ".[dev]"
```

## Run

```bash
uvicorn resvis.main:app --reload
```

## Test

```bash
pytest
```

See [../CLAUDE.md](../CLAUDE.md) for full project context, and
[src/resvis/features](src/resvis/features) for how backlog items map to
feature modules.
