"""FastAPI app entry point.

Run with: uvicorn resvis.main:app --reload
Then open: http://127.0.0.1:8000/docs
"""

from fastapi import FastAPI
from fastapi.middleware.cors import CORSMiddleware

from resvis.features.knowledge_base.router import router as knowledge_base_router

app = FastAPI(title="ResViz API")

# Allows the deployed frontend (and local dev) to actually call this
# API from a browser - without this, the browser blocks the request
# before it even reaches our routes, regardless of anything else being
# correct. Add each teammate's Vercel preview URL here too if you end
# up testing against those instead of the shared production one.
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:5173",
        "https://resvis-west-coast-vikings-pzpz-p9t7o3uc7.vercel.app",
    ],
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(knowledge_base_router)


@app.get("/health")
def health() -> dict[str, str]:
    """Quick check that the server is actually up and reachable."""
    return {"status": "ok"}
