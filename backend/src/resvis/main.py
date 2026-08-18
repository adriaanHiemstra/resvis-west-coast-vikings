"""FastAPI app entry point.

Run with: uvicorn resvis.main:app --reload
Then open: http://127.0.0.1:8000/docs
"""

from fastapi import FastAPI

from resvis.features.knowledge_base.router import router as knowledge_base_router

app = FastAPI(title="ResViz API")

app.include_router(knowledge_base_router)


@app.get("/health")
def health() -> dict[str, str]:
    """Quick check that the server is actually up and reachable."""
    return {"status": "ok"}
