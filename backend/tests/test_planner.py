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

def test_list_species():
    resp = client.get("/api/v1/planner/species")
    assert resp.status_code == 200
    data = resp.json()
    assert "species" in data
    assert data["total"] >= 10
    # Check that both mangroves and non-mangroves exist
    mangroves = [s for s in data["species"] if s["is_mangrove"]]
    non_mangroves = [s for s in data["species"] if not s["is_mangrove"]]
    assert len(mangroves) > 0
    assert len(non_mangroves) > 0

def test_plant_recommendation_coastal_vs_inland():
    # Coastal request: Should recommend mangroves like Rhizophora
    coastal_resp = client.post("/api/v1/planner/recommend", json={
        "country": "India",
        "state": "West Bengal",
        "location": "Coastal",
        "soil_type": "Saline Marine Mud/Clay",
        "water_condition": "Regular Tidal Inundation",
        "planting_purpose": "Blue Carbon & Coastal Protection"
    })
    assert coastal_resp.status_code == 200
    coastal_data = coastal_resp.json()
    assert coastal_data["total_recommended"] > 0
    top_species = [r["species"]["id"] for r in coastal_data["recommendations"]]
    assert "rhizophora_mucronata" in top_species or "avicennia_marina" in top_species

    # Inland request: MUST NOT recommend mangroves!
    inland_resp = client.post("/api/v1/planner/recommend", json={
        "country": "India",
        "state": "West Bengal",
        "location": "Inland / Terrestrial",
        "soil_type": "Clay Loam",
        "water_condition": "Rainfed Only",
        "planting_purpose": "Urban Greenery & Shade"
    })
    assert inland_resp.status_code == 200
    inland_data = inland_resp.json()
    assert inland_data["total_recommended"] > 0
    for r in inland_data["recommendations"]:
        assert r["species"]["is_mangrove"] is False, f"Mangrove {r['species']['id']} was recommended for inland!"
    
    # Check unsuitable species list contains mangroves
    unsuitable_ids = [u["species_id"] for u in inland_data["unsuitable_species"]]
    assert "rhizophora_mucronata" in unsuitable_ids

def test_calculate_growth():
    resp = client.post("/api/v1/planner/calculate-growth", json={
        "species_id": "rhizophora_mucronata",
        "planting_date": "2026-07-01",
        "number_of_plants": 500,
        "care_level": "High"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert len(data["milestones"]) >= 5
    assert len(data["growth_curve"]) == 21 # Years 0 to 20
    assert data["growth_curve"][10]["height_m"] > data["growth_curve"][1]["height_m"]

def test_calculate_land():
    resp = client.post("/api/v1/planner/calculate-land", json={
        "species_id": "rhizophora_mucronata",
        "number_of_plants": 1000,
        "available_land_area": 5000.0,
        "area_unit": "sq_meters",
        "custom_spacing_m": 2.0
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "is_sufficient" in data
    assert "layout" in data
    assert data["layout"]["rows"] > 0
    assert data["layout"]["columns"] > 0
    assert data["area_per_plant_m2"] == 4.0

def test_calculate_environmental_benefits():
    resp = client.post("/api/v1/planner/calculate-benefits", json={
        "species_id": "rhizophora_mucronata",
        "number_of_plants": 1000,
        "land_area_ha": 0.5,
        "stand_age_years": 5.0,
        "survival_rate_pct": 90.0
    })
    assert resp.status_code == 200
    data = resp.json()
    q = data["quantitative_estimates"]
    assert q["above_ground_biomass_tonnes"] > 0
    assert q["living_biomass_carbon_tonnes"] > 0
    assert q["co2_equivalent_tonnes"] > 0
    assert "regulatory_and_mrv_classification" in data
    assert "mandatory_disclaimer" in data["regulatory_and_mrv_classification"]

def test_planting_projects_and_monitoring_crud():
    token = get_auth_token("admin@bluecarbon.org", "Admin@123")
    headers = {"Authorization": f"Bearer {token}"}

    # 1. List existing projects
    resp = client.get("/api/v1/planner/projects", headers=headers)
    assert resp.status_code == 200
    projs = resp.json()["projects"]
    assert len(projs) >= 1

    # 2. Create new project
    new_proj = {
        "project_name": "Test Coastal Mangrove Belt",
        "country": "India",
        "state": "Gujarat",
        "district": "Kachchh",
        "location_name": "Gulf of Kutch Tidal Mudflat",
        "species_id": "avicennia_marina",
        "species_name": "Grey Mangrove / White Mangrove",
        "scientific_name": "Avicennia marina",
        "number_of_plants": 500,
        "land_area": 3500.0,
        "area_unit": "sq_meters",
        "planting_date": "2026-08-15",
        "status": "Planning",
        "description": "Afforestation test in high-salinity tidal waters."
    }
    create_resp = client.post("/api/v1/planner/projects", json=new_proj, headers=headers)
    assert create_resp.status_code == 200
    created = create_resp.json()["project"]
    proj_id = created["id"]
    assert created["project_name"] == new_proj["project_name"]
    assert created["estimated_biomass_kg"] > 0

    # 3. Add monitoring record
    mon_record = {
        "project_id": proj_id,
        "monitoring_date": "2026-10-01",
        "plant_height_cm": 45.0,
        "surviving_plants": 460,
        "dead_plants": 40,
        "health_condition": "Good",
        "soil_condition": "Moist Saline Silt",
        "water_condition": "Regular Tidal Inundation",
        "observations": "First month post-planting census."
    }
    mon_resp = client.post("/api/v1/planner/monitoring", json=mon_record, headers=headers)
    assert mon_resp.status_code == 200
    mon_data = mon_resp.json()["record"]
    assert mon_data["survival_percentage"] == 92.0
    assert len(mon_data["recommended_actions"]) > 0

    # 4. Check project details
    detail_resp = client.get(f"/api/v1/planner/projects/{proj_id}", headers=headers)
    assert detail_resp.status_code == 200
    project_detail = detail_resp.json()
    assert project_detail["current_survival_pct"] == 92.0
    assert project_detail["latest_height_cm"] == 45.0
    assert len(project_detail["monitoring_records"]) == 1

    # 5. User impact summary
    impact_resp = client.get("/api/v1/planner/user-impact", headers=headers)
    assert impact_resp.status_code == 200
    impact = impact_resp.json()
    assert impact["total_projects"] >= 1
    assert impact["total_plants_planted"] >= 500
    assert impact["overall_survival_percentage"] > 0
    assert len(impact["plants_over_time"]) >= 1

    # 6. Delete project
    del_resp = client.delete(f"/api/v1/planner/projects/{proj_id}", headers=headers)
    assert del_resp.status_code == 200