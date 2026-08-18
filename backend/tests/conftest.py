import pytest
from fastapi.testclient import TestClient

from resvis.main import app


@pytest.fixture
def client() -> TestClient:
    """A fake HTTP client that talks directly to our FastAPI app in
    memory, no real network/server required - this is what lets tests
    send actual requests through the router, same as curl or the /docs
    page would, but fast and without needing uvicorn running.
    """
    return TestClient(app)
