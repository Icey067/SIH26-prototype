import pytest
from fastapi.testclient import TestClient
from app.main import app
from app.core.database import Base, engine, SessionLocal
from data.seed_data import seed_database

@pytest.fixture(scope="session", autouse=True)
def setup_test_database():
    seed_database()
    yield

@pytest.fixture
def client():
    with TestClient(app) as test_client:
        yield test_client
