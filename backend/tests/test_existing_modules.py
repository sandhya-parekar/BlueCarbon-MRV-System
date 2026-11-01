import sys
import os
import pytest
from fastapi.testclient import TestClient

sys.path.insert(0, os.path.dirname(os.path.dirname(os.path.abspath(__file__))))
from app.main import app
from app.seed_data import seed_initial_data

client = TestClient(app)

@pytest.fixture(scope="module", autouse=True)
def setup_data():
    import asyncio
    asyncio.run(seed_initial_data())

def get_auth_token(email="admin@bluecarbon.org", password="Admin@123"):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]

def test_health():
    resp = client.get("/health")
    assert resp.status_code == 200
    assert resp.json()["status"] == "healthy"

def test_login_and_me():
    token = get_auth_token()
    me_resp = client.get("/api/v1/auth/me", headers={"Authorization": f"Bearer {token}"})
    assert me_resp.status_code == 200
    assert me_resp.json()["email"] == "admin@bluecarbon.org"

def test_data_management():
    resp = client.get("/api/v1/data/trees?limit=10")
    assert resp.status_code == 200
    assert resp.json()["total"] > 0
    assert len(resp.json()["trees"]) > 0

    stats_resp = client.get("/api/v1/data/stats")
    assert stats_resp.status_code == 200
    stats = stats_resp.json()
    assert stats["total_trees"] > 0
    assert stats["total_plots"] > 0

def test_biomass_module():
    resp = client.get("/api/v1/biomass/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_plots"] > 0
    assert data["grand_total_agb_kg"] > 0

def test_uncertainty_module():
    resp = client.get("/api/v1/uncertainty/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["plots_analyzed"] > 0
    assert data["overall_mean_relative_uncertainty_pct"] > 0

def test_prioritization_module():
    resp = client.get("/api/v1/prioritization/summary")
    assert resp.status_code == 200
    data = resp.json()
    assert data["total_plots"] > 0
    assert data["high_priority_count"] > 0

def test_blockchain_module():
    resp = client.get("/api/v1/blockchain/status")
    assert resp.status_code == 200
    assert "current_block" in resp.json()

    records_resp = client.get("/api/v1/blockchain/records")
    assert records_resp.status_code == 200
    assert len(records_resp.json()) > 0

def test_verification_module():
    resp = client.get("/api/v1/verification/tasks")
    assert resp.status_code == 200
    assert len(resp.json()) > 0

def test_analytics_dashboard():
    resp = client.get("/api/v1/analytics/dashboard")
    assert resp.status_code == 200
    data = resp.json()
    assert "kpi" in data
    assert data["kpi"]["total_plots"] > 0