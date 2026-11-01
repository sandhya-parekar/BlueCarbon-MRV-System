# BlueCarbon MRV System — REST API Documentation

FastAPI interactive OpenAPI documentation is automatically available at:
- **Swagger UI**: `http://127.0.0.1:8000/docs`
- **ReDoc**: `http://127.0.0.1:8000/redoc`

Base URL: `http://127.0.0.1:8000/api/v1`

---

## 1. Authentication & Users

- `POST /auth/register-community` — Public self-registration endpoint for Community Users / Planters.
  - **Request Body**:
    ```json
    {
      "full_name": "Ramesh Patel",
      "email": "ramesh@example.org",
      "password": "SecretPassword123",
      "confirm_password": "SecretPassword123",
      "mobile_number": "+91 98765 43210",
      "country": "India",
      "state": "Gujarat",
      "district": "Kutch",
      "user_type": "Farmer",
      "organization": "Kutch Mangrove Care"
    }
    ```
  - **Validation**: Enforces password matching, minimum 6 characters, and uniqueness of email. Automatically assigns role `"Community User"`. Generates a welcome notification in the user's inbox upon registration.
  - **Response**: `UserResponse` with auto-generated ID, hashed password security, and metadata.

- `POST /auth/register` — Provision internal administrative, researcher, or verification officer accounts.
  - **Authorization**: Requires Bearer JWT from an authenticated user with `Admin` role when assigning privileged roles (`Admin`, `Researcher`, `Verification Officer`). Throws `403 Forbidden` for unauthorized callers.
- `POST /auth/login` — Authenticate and receive a JWT Bearer token.
  - **Request**: Form data with `username` (email) and `password`.
  - **Response**: `{ "access_token": "<jwt>", "token_type": "bearer", "user": { ... } }`.
- `GET /auth/me` — Retrieve current authenticated user profile, assigned role, location, and permissions.

### Pre-Seeded Demonstration Accounts
| Role | Email | Password | Primary Responsibilities |
|---|---|---|---|
| **Admin** | `admin@bluecarbon.org` | `Admin@123` | Full system governance, staff ticket assignments, sample data reset |
| **Researcher** | `researcher@bluecarbon.org` | `Research@123` | Data ingestion, bootstrap uncertainty, scientific planting & biomass guidance |
| **Verification Officer** | `officer@bluecarbon.org` | `Officer@123` | Audit High-Priority plots, blockchain signing, verification advice |
| **Community Planter** | `community@bluecarbon.org` | `Community@123` | Planting projects, survival tracking, Ask an Expert inquiries |

---

## 2. Environmental Data Management
- `GET /data/trees` — Paginated list of tree records (supports `plot_id`, `species`, `region` filters).
- `POST /data/trees` — Add single tree measurement manually.
- `POST /data/upload-csv` — Ingest raw mangrove CSV, validate columns, and recalculate AGB.
- `GET /data/stats` — Summary metrics (mean DBH, height, species frequency, quality flags).
- `POST /data/clean-and-validate` — Impute missing values and remove duplicates.
- `POST /data/reset-sample` — Reset to default 118-plot benchmark dataset.

---

## 3. Aboveground Biomass (AGB) Estimation
- `GET /biomass/summary` — Grand total AGB (kg & tonnes), plot averages, and regional breakdowns using Chave et al. (2014) pantropical allometric model.
- `GET /biomass/plots` — Plot-level biomass metrics with sorting and filtering.
- `GET /biomass/plots/{plot_id}` — Single plot metadata and associated tree records.

---

## 4. Uncertainty Assessment
- `GET /uncertainty/summary` — Full 2,000-repetition bootstrap uncertainty across all 118 plots.
- `GET /uncertainty/plot/{plot_id}` — Plot bootstrap distribution frequency curve and wood density sensitivity (-20%, -10%, Baseline, +10%, +20%).

---

## 5. Verification Prioritization Engine
- `GET /prioritization/summary` — Composite multi-indicator priority scores, percentile ranks, and High/Medium/Low categories.
- `POST /prioritization/recalculate` — Dynamically tune indicator weights (`w_uncertainty`, `w_data_quality`, `w_biomass_impact`).

---

## 6. Comparative Verification Analysis
- `GET /comparative/analysis` — Monte Carlo simulation (10,000 runs) comparing Composite Prioritization, Uncertainty-Only, Fixed-Interval, and Random Selection under configurable audit budget.

---

## 7. Blockchain Registry
- `GET /blockchain/status` — Network mode (`ETHEREUM_GANACHE` vs `SIMULATED_BLOCKCHAIN`), contract address, block height.
- `GET /blockchain/records` — Immutable transaction ledger.
- `GET /blockchain/history/{plot_id}` — Complete historical audit trail for a specific plot.
- `POST /blockchain/register` — Anchor a plot biomass estimation on-chain.

---

## 8. Verification Management
- `GET /verification/tasks` — Plots queued for officer review.
- `POST /verification/decision` — Submit official audit decision (`Approved`, `Rejected`, `Additional Measurements Requested`) with blockchain signature.

---

## 9. Reports & Analytics
- `GET /analytics/dashboard` — Complete dashboard KPIs and distribution data.
- `GET /reports/csv` — Download complete CSV export of plots, uncertainties, and priority scores.
- `GET /reports/pdf` — Download formal executive PDF audit report generated via ReportLab.

---

## 10. Plant Growth & Blue Carbon Planner
- `GET /planner/species` — List native mangrove and terrestrial tree species reference catalog.
- `GET /planner/species/{species_id}` — Detailed botanical, ecological, and allometric parameters for a single species.
- `POST /planner/species` — (Admin) Add or update species reference record.
- `POST /planner/recommend` — Ecological recommendation engine evaluating country, state, district, soil, land, water, and purpose compatibility.
- `POST /planner/calculate-growth` — Simulate biological development milestones and 20-year allometric height and carbon curves.
- `POST /planner/calculate-land` — Calculate plant spacing, usable vs buffer area, capacity, and planting grid layout.
- `POST /planner/calculate-benefits` — Quantify Aboveground Biomass (AGB), Belowground Biomass (BGB), Soil Organic Carbon (SOC), CO₂ equivalent, wave energy attenuation, and sediment trapping with 95% bootstrap confidence intervals.
- `GET /planner/calendar` — Retrieve 12-month seasonal planting windows, maintenance tasks, and checklists.
- `GET /planner/projects` — List user's community planting projects (Admins can view all).
- `GET /planner/projects/{project_id}` — Get single project details with attached monitoring history.
- `POST /planner/projects` — Create a new planting project with automated initial biomass and carbon estimates.
- `PUT /planner/projects/{project_id}` — Update an existing planting project.
- `DELETE /planner/projects/{project_id}` — Delete a planting project and its monitoring logs.
- `GET /planner/monitoring` — List field monitoring check-in records.
- `POST /planner/monitoring` — Record plant height, surviving vs dead counts, health condition, and receive auto-generated care recommendations.
- `DELETE /planner/monitoring/{record_id}` — Delete a monitoring record.
- `GET /planner/user-impact` — Aggregated user planting impact metrics, survival percentages, and time series for dashboard integration.

---

## 11. Communication Centre & Support Tickets

- `POST /communication/tickets` — Submit a new support ticket / question to experts.
  - **Request Body**:
    ```json
    {
      "subject": "Rhizophora propagule yellowing in saline tidal flat",
      "category": "Plant Diseases",
      "description": "After 4 weeks in field, lower leaves are turning yellow with brown spots.",
      "location": "Kori Creek, Kutch, Gujarat",
      "attachment_url": "https://example.com/photos/seedling.jpg",
      "site_parameters": {
        "land_area": 1.5,
        "selected_species": "Rhizophora mucronata",
        "plant_count": 2500,
        "soil_type": "Saline Coastal Mud",
        "water_condition": "Tidal Inundation",
        "planting_purpose": "Coastal Defense"
      }
    }
    ```
  - **Allowed Categories**: `Plant Selection`, `Mangrove Planting`, `Soil Conditions`, `Land Requirements`, `Water Requirements`, `Plant Growth`, `Plant Diseases`, `Carbon Benefits`, `Technical Assistance`, `Planting Assistance`, `Other`.
  - **Automatic Behaviors**: Generates a sequential ticket number (e.g. `TKT-0104`), initializes ticket status to `Open`, creates the first message in the conversation thread, and creates in-app notification alerts for available staff.

- `GET /communication/tickets` — List support tickets with role-based filtering:
  - **Community Users**: Strictly scoped to tickets created by the logged-in user.
  - **Researchers**: Receives tickets assigned to them or unassigned ecological/botanical/carbon categories.
  - **Verification Officers**: Receives tickets assigned to them or verification/evidence categories.
  - **Admins**: Receives all tickets across the entire system.
  - **Query Parameters**: `status` (e.g., `Open`, `In Progress`, `Resolved`), `category`.

- `GET /communication/tickets/{ticket_id}` — Retrieve detailed ticket information and its complete conversation thread (messages chronologically sorted with author details and attachments). Validates that the caller is either the ticket owner or authorized staff.

- `POST /communication/tickets/{ticket_id}/reply` — Post a reply to an ongoing ticket thread.
  - **Request Body**:
    ```json
    {
      "message": "We inspected the photo. This indicates hypersalinity and sediment stagnation. Introduce tidal flush channels immediately.",
      "attachment_url": "https://example.com/guide/salinity-care.png"
    }
    ```
  - **Automatic State Transitions**:
    - When staff replies: Ticket status transitions to `Waiting for User`.
    - When community user replies: Ticket status transitions to `In Progress`.
    - Dispatches reciprocal in-app notifications to ticket participants.

- `PATCH /communication/tickets/{ticket_id}/status` — Update ticket status.
  - **Request Body**:
    ```json
    {
      "status": "Resolved",
      "resolution_notes": "Provided tidal flushing instructions and recommended salt-tolerant infill species."
    }
    ```
  - **Allowed Statuses**: `Open`, `Assigned`, `In Progress`, `Waiting for User`, `Resolved`, `Closed`, `Reopened`.
  - **Reopening Rule**: Community users can reopen a ticket previously marked `Resolved` if further guidance is needed, which resets status to `Reopened` and notifies assigned staff.

- `POST /communication/tickets/{ticket_id}/assign` — (Admin only) Assign ticket to a staff member.
  - **Request Body**:
    ```json
    {
      "assigned_to_id": "res_1",
      "assigned_to_name": "Dr. Sunita Rao (Mangrove Ecologist)"
    }
    ```
  - **Behavior**: Transitions status to `Assigned` (if currently `Open`) and dispatches a notification to the assigned staff member.

- `GET /communication/staff` — List active staff members available for ticket assignment with their current workload metrics (`active_tickets` count).

- `GET /communication/notifications` — Retrieve the authenticated user's notification alerts with timestamps, read/unread status, and contextual links.

- `PATCH /communication/notifications/{notif_id}/read` — Mark a single notification as read.

- `POST /communication/notifications/read-all` — Mark all notifications as read for the authenticated user.

- `GET /communication/stats` — Overall communication metrics:
  - Total tickets, open, in progress, waiting for user, resolved, closed.
  - Ticket distribution breakdown by category.
  - Average response time in hours.

---

## 12. Community User Dashboard

- `GET /community/dashboard` — Retrieve aggregated dashboard metrics for the authenticated Community User.
  - **Response Structure**:
    ```json
    {
      "user_name": "Ramesh Patel",
      "user_type": "Farmer",
      "total_projects": 3,
      "total_plants_planted": 8500,
      "surviving_plants": 7480,
      "survival_rate": 88.0,
      "estimated_land_area_ha": 3.4,
      "estimated_biomass_mg": 12.45,
      "estimated_carbon_tco2e": 21.72,
      "active_tickets_count": 1,
      "unread_notifications_count": 2,
      "recent_projects": [...],
      "recent_monitoring": [...],
      "recent_tickets": [...]
    }
    ```
  - **Strict Data Isolation**: Guarantees that only projects, monitoring entries, and support tickets belonging to `current_user["id"]` are aggregated. Does not expose confidential MRV commercial data.
