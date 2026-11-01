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

def get_auth_token(email="community@bluecarbon.org", password="Community@123"):
    resp = client.post("/api/v1/auth/login", json={"email": email, "password": password})
    assert resp.status_code == 200, resp.text
    return resp.json()["access_token"]

def get_admin_token():
    return get_auth_token("admin@bluecarbon.org", "Admin@123")

def get_researcher_token():
    return get_auth_token("researcher@bluecarbon.org", "Research@123")

def get_verifier_token():
    return get_auth_token("officer@bluecarbon.org", "Officer@123")


def test_public_community_registration_success():
    payload = {
        "name": "Sita Devi",
        "email": "sita.devi@farmernet.in",
        "password": "FarmerPassword@123",
        "confirm_password": "FarmerPassword@123",
        "mobile_number": "+91 98111 22233",
        "country": "India",
        "state": "Odisha",
        "district": "Kendrapara",
        "user_type": "Farmer",
        "organization": "Bhitarkanika Planters Collective"
    }
    resp = client.post("/api/v1/auth/register-community", json=payload)
    assert resp.status_code == 200, resp.text
    data = resp.json()
    assert data["role"] in ["community_user", "Community User"]
    assert data["name"] == "Sita Devi"
    assert data["state"] == "Odisha"
    assert data["user_type"] == "Farmer"

    # Verify welcome notification exists
    login_resp = client.post("/api/v1/auth/login", json={"email": payload["email"], "password": payload["password"]})
    assert login_resp.status_code == 200
    token = login_resp.json()["access_token"]

    notifs_resp = client.get("/api/v1/communication/notifications", headers={"Authorization": f"Bearer {token}"})
    assert notifs_resp.status_code == 200
    notifs = notifs_resp.json()["notifications"]
    assert any("Welcome to BlueCarbon MRV Community" in n["title"] for n in notifs)


def test_public_community_registration_password_mismatch():
    payload = {
        "name": "Test User",
        "email": "mismatch@example.com",
        "password": "Secret123Password",
        "confirm_password": "DifferentPassword",
        "state": "Kerala",
        "user_type": "Student"
    }
    resp = client.post("/api/v1/auth/register-community", json=payload)
    assert resp.status_code == 400
    assert "Passwords do not match" in resp.json()["detail"]


def test_privileged_roles_registration_blocked_for_public():
    # Attempting to register Admin publicly without token MUST be 403 Forbidden
    payload = {
        "name": "Attacker Admin",
        "email": "fakeadmin@bluecarbon.org",
        "password": "Password123!",
        "role": "Admin",
        "organization": "Hack Inc"
    }
    resp = client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 403
    assert "Public registration for privileged roles" in resp.json()["detail"]

    # Attempting Researcher without token MUST also be 403
    payload["role"] = "Researcher"
    payload["email"] = "fakeresearcher@bluecarbon.org"
    resp = client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 403

    # Attempting Verification Officer without token MUST also be 403
    payload["role"] = "Verification Officer"
    payload["email"] = "fakeverifier@bluecarbon.org"
    resp = client.post("/api/v1/auth/register", json=payload)
    assert resp.status_code == 403


def test_privileged_roles_registration_allowed_with_admin_token():
    admin_token = get_admin_token()
    payload = {
        "name": "Dr. Ananya Roy",
        "email": "ananya.roy@bluecarbon.org",
        "password": "Research@Safe123",
        "role": "Researcher",
        "organization": "National Institute of Oceanography"
    }
    resp = client.post(
        "/api/v1/auth/register",
        json=payload,
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert resp.status_code == 200
    assert resp.json()["role"] == "Researcher"


def test_community_user_login_and_token():
    resp = client.post("/api/v1/auth/login", json={
        "email": "community@bluecarbon.org",
        "password": "Community@123"
    })
    assert resp.status_code == 200
    data = resp.json()
    assert "access_token" in data
    user = data["user"]
    assert user["role"] in ["community_user", "Community User"]
    assert user["name"] == "Ramesh Patel (Coastal Mangrove Farmer)"
    assert user["state"] == "Gujarat"
    assert user["district"] == "Kachchh"
    assert user["user_type"] == "Farmer"


def test_community_user_rbac_blocked_from_mrv_actions():
    token = get_auth_token("community@bluecarbon.org", "Community@123")
    headers = {"Authorization": f"Bearer {token}"}

    # Attempting to register on blockchain as community user -> 403 Forbidden
    resp = client.post("/api/v1/blockchain/register", json={"plot_id": "plot_kutch_01"}, headers=headers)
    assert resp.status_code == 403

    # Attempting verification decision as community user -> 403 Forbidden
    resp = client.post("/api/v1/verification/decision", json={
        "plot_id": "plot_kutch_01",
        "status": "Approved",
        "comments": "Unauthorized approval"
    }, headers=headers)
    assert resp.status_code == 403


def test_create_support_ticket_and_initial_message():
    token = get_auth_token("community@bluecarbon.org", "Community@123")
    headers = {"Authorization": f"Bearer {token}"}

    ticket_in = {
        "subject": "Soil Salinity Test in Bhadreshwar Creek",
        "category": "Soil Conditions",
        "description": "We tested soil porewater salinity at 42 ppt. Is Avicennia marina suitable or will growth be stunted?",
        "location": "Bhadreshwar, Kachchh, Gujarat",
        "site_parameters": {
            "location": "Bhadreshwar",
            "available_land_area": 3000,
            "area_unit": "sq_meters",
            "selected_species_id": "avicennia_marina",
            "selected_species_name": "Grey Mangrove",
            "number_of_plants": 600,
            "soil_type": "Clay loam hypersaline",
            "water_availability": "Twice daily tides",
            "planting_purpose": "Erosion prevention"
        }
    }
    resp = client.post("/api/v1/communication/tickets", json=ticket_in, headers=headers)
    assert resp.status_code == 200, resp.text
    ticket = resp.json()
    assert ticket["ticket_number"].startswith("TKT-")
    assert ticket["subject"] == ticket_in["subject"]
    assert ticket["status"] == "Open"
    assert ticket["category"] == "Soil Conditions"
    assert len(ticket["messages"]) == 1
    assert ticket["messages"][0]["message"] == ticket_in["description"]


def test_list_tickets_rbac_isolation():
    comm_token = get_auth_token("community@bluecarbon.org", "Community@123")
    admin_token = get_admin_token()

    # Community user sees ONLY tickets created by themselves
    comm_resp = client.get("/api/v1/communication/tickets", headers={"Authorization": f"Bearer {comm_token}"})
    assert comm_resp.status_code == 200
    comm_tickets = comm_resp.json()["tickets"]
    assert len(comm_tickets) >= 1
    for t in comm_tickets:
        assert t["user_email"] == "community@bluecarbon.org"

    # Admin sees all tickets across the system
    admin_resp = client.get("/api/v1/communication/tickets", headers={"Authorization": f"Bearer {admin_token}"})
    assert admin_resp.status_code == 200
    admin_tickets = admin_resp.json()["tickets"]
    assert len(admin_tickets) >= len(comm_tickets)


def test_ticket_details_unauthorized_access_forbidden():
    # Login as new user Sita Devi
    sita_token = get_auth_token("sita.devi@farmernet.in", "FarmerPassword@123")
    
    # Attempt to view Ramesh Patel's ticket tkt_101
    resp = client.get(
        "/api/v1/communication/tickets/tkt_101",
        headers={"Authorization": f"Bearer {sita_token}"}
    )
    assert resp.status_code == 403
    assert "Access denied" in resp.json()["detail"]


def test_ticket_reply_and_status_progression():
    comm_token = get_auth_token("community@bluecarbon.org", "Community@123")
    researcher_token = get_researcher_token()

    # 1. Researcher replies to tkt_101
    researcher_resp = client.post(
        "/api/v1/communication/tickets/tkt_101/reply",
        json={"message": "Please ensure seedlings are placed in nursery bags for 4 weeks before intertidal outplanting."},
        headers={"Authorization": f"Bearer {researcher_token}"}
    )
    assert researcher_resp.status_code == 200
    assert researcher_resp.json()["sender_role"] == "Researcher"

    # Check that ticket status progressed to "Waiting for User"
    detail_resp = client.get(
        "/api/v1/communication/tickets/tkt_101",
        headers={"Authorization": f"Bearer {comm_token}"}
    )
    assert detail_resp.status_code == 200
    assert detail_resp.json()["status"] == "Waiting for User"

    # 2. Community user responds
    user_reply = client.post(
        "/api/v1/communication/tickets/tkt_101/reply",
        json={"message": "Thank you! We have begun bagging the propagules today."},
        headers={"Authorization": f"Bearer {comm_token}"}
    )
    assert user_reply.status_code == 200

    # Check status moved to "In Progress"
    detail_resp2 = client.get(
        "/api/v1/communication/tickets/tkt_101",
        headers={"Authorization": f"Bearer {comm_token}"}
    )
    assert detail_resp2.json()["status"] == "In Progress"


def test_ticket_status_update_and_reopen():
    researcher_token = get_researcher_token()
    comm_token = get_auth_token("community@bluecarbon.org", "Community@123")

    # Researcher marks ticket as Resolved
    resolve_resp = client.patch(
        "/api/v1/communication/tickets/tkt_101/status",
        json={"status": "Resolved", "resolution_note": "Guidance provided and confirmed by planter."},
        headers={"Authorization": f"Bearer {researcher_token}"}
    )
    assert resolve_resp.status_code == 200
    assert resolve_resp.json()["status"] == "Resolved"

    # Community user reopens the ticket
    reopen_resp = client.patch(
        "/api/v1/communication/tickets/tkt_101/status",
        json={"status": "Reopened"},
        headers={"Authorization": f"Bearer {comm_token}"}
    )
    assert reopen_resp.status_code == 200
    assert reopen_resp.json()["status"] == "Reopened"


def test_admin_ticket_assignment():
    admin_token = get_admin_token()
    comm_token = get_auth_token("community@bluecarbon.org", "Community@123")

    # Find researcher staff id
    staff_resp = client.get("/api/v1/communication/staff", headers={"Authorization": f"Bearer {admin_token}"})
    assert staff_resp.status_code == 200
    researcher_staff = next(s for s in staff_resp.json() if s["role"] == "Researcher")

    # Admin assigns ticket tkt_102 to researcher
    assign_resp = client.post(
        "/api/v1/communication/tickets/tkt_102/assign",
        json={"assigned_to_id": researcher_staff["id"], "priority": "High"},
        headers={"Authorization": f"Bearer {admin_token}"}
    )
    assert assign_resp.status_code == 200
    assigned_tkt = assign_resp.json()
    assert assigned_tkt["assigned_to_id"] == researcher_staff["id"]
    assert assigned_tkt["assigned_to_name"] == researcher_staff["name"]

    # Non-admin attempting to assign ticket MUST fail with 403
    fail_resp = client.post(
        "/api/v1/communication/tickets/tkt_102/assign",
        json={"assigned_to_id": researcher_staff["id"]},
        headers={"Authorization": f"Bearer {comm_token}"}
    )
    assert fail_resp.status_code == 403


def test_community_dashboard_isolated_metrics():
    comm_token = get_auth_token("community@bluecarbon.org", "Community@123")
    headers = {"Authorization": f"Bearer {comm_token}"}

    resp = client.get("/api/v1/community/dashboard", headers=headers)
    assert resp.status_code == 200
    data = resp.json()

    assert data["user_info"]["role"] in ["community_user", "Community User"]
    assert data["user_info"]["name"] == "Ramesh Patel (Coastal Mangrove Farmer)"
    assert data["total_projects"] >= 1
    assert data["total_plants_planted"] >= 500
    assert data["total_surviving_plants"] > 0
    assert data["overall_survival_percentage"] > 0
    assert data["total_land_area_ha"] > 0
    assert data["estimated_carbon_tonnes"] > 0
    assert len(data["my_projects"]) >= 1
    assert len(data["my_tickets"]) >= 1


def test_notifications_read_and_read_all():
    comm_token = get_auth_token("community@bluecarbon.org", "Community@123")
    headers = {"Authorization": f"Bearer {comm_token}"}

    # Fetch notifications
    list_resp = client.get("/api/v1/communication/notifications", headers=headers)
    assert list_resp.status_code == 200
    notifs = list_resp.json()["notifications"]
    assert len(notifs) > 0

    first_notif_id = notifs[0]["id"]
    mark_resp = client.patch(f"/api/v1/communication/notifications/{first_notif_id}/read", headers=headers)
    assert mark_resp.status_code == 200

    # Mark all read
    all_read_resp = client.post("/api/v1/communication/notifications/read-all", headers=headers)
    assert all_read_resp.status_code == 200

    # Verify unread count is now 0
    check_resp = client.get("/api/v1/communication/notifications?unread_only=true", headers=headers)
    assert check_resp.json()["unread_count"] == 0


def test_communication_stats():
    admin_token = get_admin_token()
    resp = client.get("/api/v1/communication/stats", headers={"Authorization": f"Bearer {admin_token}"})
    assert resp.status_code == 200
    data = resp.json()
    assert "total_tickets" in data
    assert "open_tickets" in data
    assert "by_category" in data
    assert data["total_tickets"] >= 3
