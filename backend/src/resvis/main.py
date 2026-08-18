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
# correct. Matched by regex rather than one exact URL, since Vercel
# gives every deployment (production, git-branch, and each individual
# build) its own unique subdomain that changes over time - this covers
# all of them for our project specifically, without allowing arbitrary
# other sites.
app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:5173"],
    allow_origin_regex=r"https://resvis-west-coast-vikings.*\.vercel\.app",
    allow_methods=["*"],
    allow_headers=["*"],
)

app.include_router(knowledge_base_router)


@app.get("/health")
def health() -> dict[str, str]:
    """Quick check that the server is actually up and reachable."""
    return {"status": "ok"}
