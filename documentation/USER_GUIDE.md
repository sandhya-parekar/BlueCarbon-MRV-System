# BlueCarbon MRV System — User & Demonstration Guide

This guide provides instructions for demonstrating and evaluating the **Uncertainty-Aware Verification Prioritization Framework for Blockchain-Based Blue Carbon MRV Systems**, including the **Plant Growth & Blue Carbon Planner** and the **Community User & Communication System**.

---

## 1. Quick Start & Login

When opening `http://localhost:5173/`, you are presented with the **System Sign In** portal.

### Role-Based Access Options

You can log in using pre-seeded accounts or register a new community account:

1. **Instant Demo Access Buttons** (bottom of login form):
   - **Admin**: `admin@bluecarbon.org` / `Admin@123` (Full system configuration, sample data reset, ticket assignments, user management)
   - **Researcher**: `researcher@bluecarbon.org` / `Research@123` (Data ingestion, bootstrap analysis, weight tuning, botanical & biomass expert answers)
   - **Verification Officer**: `officer@bluecarbon.org` / `Officer@123` (Review High-Priority plots, approve/reject on blockchain, audit compliance answers)
   - **Community Planter**: `community@bluecarbon.org` / `Community@123` (Personalized restoration dashboard, planting projects, survival tracking, Ask an Expert)

2. **Public Community Planter Registration**:
   - Click **"Join as Community Planter"** on the login page.
   - Enter your full name, email, password, mobile number, user type (Farmer, Student, NGO, Volunteer, Individual, Other), country, state, and district.
   - Upon registration, you are securely logged in and redirected to your **Community User Dashboard** with a welcome notification.
   - *Security Note*: Public registration is strictly restricted to the `Community User` role. Administrative, Research, and Verification roles cannot be self-registered and must be provisioned by a System Administrator.

---

## 2. Role-Based Navigation Matrix

The BlueCarbon MRV System enforces strict role-based access control (RBAC) across both frontend routing and backend REST APIs:

| Navigation Item / Module | Route | Admin | Researcher | Verification Officer | Community User |
|---|---|:---:|:---:|:---:|:---:|
| **Community Dashboard** | `/community-dashboard` | — | — | — | ✅ (Primary Landing) |
| **MRV Executive Dashboard** | `/dashboard` | ✅ | ✅ | ✅ | — |
| **Environmental Data** | `/data` | ✅ | ✅ | — | — |
| **Biomass Estimation (AGB)** | `/biomass` | ✅ | ✅ | ✅ | — |
| **Uncertainty Assessment** | `/uncertainty` | ✅ | ✅ | ✅ | — |
| **Prioritization Engine** | `/prioritization` | ✅ | ✅ | ✅ | — |
| **Comparative Analysis** | `/comparative` | ✅ | ✅ | — | — |
| **Blockchain Registry** | `/blockchain` | ✅ | ✅ | ✅ | — |
| **Verification Management** | `/verification` | ✅ | — | ✅ | — |
| **Reports & Analytics** | `/reports` | ✅ | ✅ | ✅ | — |
| **Plant Growth Planner** | `/planner` | ✅ | ✅ | ✅ | ✅ |
| **Communication Centre** | `/communication` | ✅ (Full Queue) | ✅ (Scientific) | ✅ (Audit) | ✅ (My Tickets) |
| **User Profile** | `/profile` | ✅ | ✅ | ✅ | ✅ |
| **System Settings** | `/settings` | ✅ | ✅ | ✅ | ✅ |

---

## 3. Navigating Application Modules

### Page 1: Community User Dashboard (`/community-dashboard`)
*Exclusively for Community Users & Planters (Default landing page upon login)*
- **Personalized Welcome Banner**: Greets the planter by name, displays user category badge (Farmer, Student, NGO, etc.), and provides one-click action buttons to start a new project or ask an expert.
- **Personal KPI Cards**:
  - **My Projects**: Active planting sites managed by the user.
  - **Total Plants**: Cumulative seedlings planted.
  - **Surviving Plants**: Live tree count based on latest field monitoring check-ins.
  - **Overall Survival Rate**: Live survival percentage calculated across all user plots.
  - **Planting Area**: Total restoration area expressed in hectares.
  - **Living Biomass & Sequestration**: Estimated living Aboveground Biomass (Mg AGB) and Carbon Storage (t CO₂e).
- **My Planting Projects Grid**: Interactive project cards showing location, species, seedling count, planting date, and status badges.
- **Growth Milestones Feed**: Real-time timeline of recent biological milestones and monitoring records.
- **My Assistance Requests**: Quick summary table of submitted support tickets with live status indicators (`Open`, `In Progress`, `Waiting for User`, `Resolved`).
- **Recent Notifications**: Alert feed with unread badges.

### Page 2: Main MRV Dashboard (`/dashboard`)
*For Admin, Researcher, and Verification Officer*
- Overarching KPIs: 118 mangrove plots, 2,249 tree records, total AGB stock (557.46 Mg AGB), and verification status.
- **Aboveground Biomass by Region** chart and **Priority Breakdown Donut**.
- **Recent Blockchain Registry Records** live feed.
- **My Planting Impact Card**: Summary of community restoration impact with cumulative planting growth and 5-year carbon accumulation projection charts.

### Page 3: Environmental Data Management (`/data`)
- **Upload CSV**: Upload raw mangrove field dendrometry data (`dataset/mangrove_field_measurements_118plots.csv`).
- **Manual Entry**: Click **"Manual Entry"** to register a new tree measurement with DBH, Height, Wood Density, and Species.
- **Validate & Clean**: Detect missing records, impute species medians, and remove duplicate tree IDs.
- **Reset Sample**: Re-seeds the standard 118-plot benchmark dataset.

### Page 4: Aboveground Biomass Estimation (`/biomass`)
- Inspect the **Chave et al. (2014)** pantropical allometric model.
- Explicit ecological disclaimer: figures represent **Aboveground Biomass (AGB)** and NOT total ecosystem carbon stock.
- Filter plots by region or hydrological type (Riverine, Fringe, Basin, Overwash, Scrub).
- Click **"View Trees"** on any plot row to inspect individual tree measurements in that plot.

### Page 5: Uncertainty Assessment (`/uncertainty`)
- Evaluates 2,000 non-parametric bootstrap resampling iterations per plot.
- Displays 95% Confidence Intervals [$CI_{\text{lower}}, CI_{\text{upper}}$] and Relative Uncertainty percentage.
- Select any plot to view its empirical **Bootstrap Frequency Bell Curve** and **Wood Density Sensitivity Scenarios** (-20%, -10%, Baseline, +10%, +20%).

### Page 6: Verification Prioritization Engine (`/prioritization`)
- Multi-indicator percentile-normalized scoring: Uncertainty Score, Data Quality Score, Biomass Impact Score, and Composite Score.
- Shows assigned **Priority Levels** (High, Medium, Low) and **Recommended Verification Actions** (Tier-1 Mandated LiDAR, Tier-2 Remote Sensing, Tier-3 Desk Audit).
- Click **"Tune Indicator Weights"** to adjust indicator weights and dynamically recalculate plot rankings in real-time.

### Page 7: Comparative Analysis (`/comparative`)
- Evaluates 4 audit strategies under a configurable monitoring budget (default 24 plots):
  1. Proposed Composite Prioritization
  2. Uncertainty-Only Ranking
  3. Fixed-Interval Scheduling
  4. Random Selection (10,000 Monte Carlo runs)
- Move the **Audit Budget Slider** (10 to 60 plots) to see real-time updates of capture efficiency (>61% capture for proposed framework vs ~20% for random sampling).

### Page 8: Blockchain Registry (`/blockchain`)
- Dual-mode distributed ledger explorer: **Ethereum Ganache Local Node** or **Cryptographic SHA-256 Simulation**.
- Inspect block sequence numbers, transaction hashes, plot IDs, evidence hashes, and timestamps.
- Click **"Anchor Plot On-Chain"** to record a new plot biomass estimation to the ledger.
- Click **"History"** on any record to view its complete immutable audit trail.

### Page 9: Verification Management (`/verification`)
- Console for the **Verification Officer** to audit high-priority plots.
- Filter by High Priority or Pending status.
- Audit actions: **Approve**, **Reject**, or **Request Additional Measurements**.
- Enter audit comments and click **"Commit & Sign Decision"** to create an immutable blockchain record.

### Page 10: Reports & Analytics (`/reports`)
- Comprehensive charts: Biomass by Region, Priority Distribution, Strategy Comparison, and Sensitivity Curve.
- **Export CSV Dataset**: Downloads complete RFC 4180 CSV dataset of all 118 plots.
- **Download Official PDF Report**: Generates an executive ReportLab PDF report complete with metadata, KPI summary, prioritized plot schedule, and blockchain verification notes.

### Page 11: Plant Growth & Blue Carbon Planner (`/planner`)
Complete restoration planning and growth monitoring suite organized into 8 tabs:
1. **Plant Selection**: Ecological recommendation engine filtering native mangrove vs terrestrial species based on coastal/inland setting, soil type, and salinity. Strictly bars mangroves from inland/freshwater soils.
2. **Growth Calculator**: Biological development milestones with 20-year allometric height and carbon curves.
3. **Land Area Calculator**: Spacing, pathway buffers, area sufficiency checks, and interactive visual grid layout.
4. **Environmental Benefits**: Estimates AGB, BGB, Living Carbon, Soil Organic Carbon (SOC), CO₂e, wave reduction %, and sediment trapping with clear methodological transparency.
5. **My Planting Projects**: Interactive project manager connected to the database to create, edit, and track restoration plots.
6. **Plant Growth Monitoring**: Log quarterly field audits recording height, survival counts, health status, and receive automated care advisories.
7. **Planting Calendar**: 12-month calendar tailored for coastal and terrestrial forestry.
8. **Educational Guide**: Beginner-friendly guide covering mangrove blue carbon superpowers and common restoration pitfalls.
- **"Request Planting Assistance" Button**: Located in the hero section. Clicking this opens a guided modal pre-populating site parameters (species, land area, seedlings, soil, water condition) and automatically submits an expert assistance request directly to the scientific team.

### Page 12: Communication Centre (`/communication`)
Complete two-way communication system connecting Community Planters with Researchers, Verification Officers, and Admins across 4 dedicated views:
1. **Ask an Expert**:
   - 10 structured categories: *Plant Selection*, *Mangrove Planting*, *Soil Conditions*, *Land Requirements*, *Water Requirements*, *Plant Growth*, *Plant Diseases*, *Carbon Benefits*, *Technical Assistance*, and *Other*.
   - Submit subject, detailed description, optional location, and optional image/attachment URL.
2. **Tickets & Messages**:
   - Dual-pane conversation manager with real-time search and status filtering (`All`, `Open`, `In Progress`, `Waiting for User`, `Resolved`, `Closed`).
   - Interactive chat-style conversation thread showing sender avatar, role badge, timestamp, message text, and image attachment preview.
   - Reply directly in the conversation; replies automatically update ticket status (`Waiting for User` when staff replies; `In Progress` when community replies).
   - Reopen resolved tickets with justification or close completed tickets.
   - (Admin View): Staff assignment dropdown to delegate tickets directly to Researchers or Verification Officers.
3. **Notifications Panel**:
   - Real-time notification inbox alerting users of ticket assignments, staff replies, status transitions, and verification outcomes.
   - Filter by `All` vs `Unread`.
   - Single-click **"Mark as read"** and **"Mark all as read"** actions.
4. **Staff Queue (Staff & Admin Only)**:
   - High-level KPIs: Total Tickets, Open Inquiries, In Progress, Resolved Tickets, and Average Response Time.
   - Staff directory cards displaying active team members and their current ticket workload.

### Page 13: User Profile (`/profile`)
- Displays current user name, email, system role, organization, location, and assigned permissions.
- Inspects the active JSON Web Token (HS256) session.

### Page 14: System Settings (`/settings`)
- Toggle **Dark Navy Mode** or **Light Mode**.
- Verify connectivity to FastAPI, MongoDB, and Blockchain providers.
- Trigger data maintenance and sample dataset reset.

---

## 4. Presentation Demonstration Script (for Viva / Project Defense)

### Part 1: Executive & Scientific MRV Pipeline
1. **Introduction & Scientific Context**:
   - Log in as **Researcher** (`researcher@bluecarbon.org`).
   - Explain the core problem: Mangrove blue carbon credits face substantial verification costs; traditional random auditing fails to catch high-risk estimation errors.
2. **Allometric Biomass & Uncertainty**:
   - Navigate to `/biomass` to show the Chave et al. (2014) pantropical allometric model.
   - Navigate to `/uncertainty` to show the 2,000-iteration non-parametric bootstrap resampling curve and 95% Confidence Intervals.
3. **Prioritization Engine**:
   - Navigate to `/prioritization`. Explain how raw uncertainty, data quality flags, and biomass impact combine into percentile-normalized scores.
   - Click **"Tune Indicator Weights"** to show real-time rank adjustments.
4. **Comparative Proof**:
   - Navigate to `/comparative`. Demonstrate that the proposed framework captures **>61%** of High-Priority plots under a 24-plot budget, compared to only **~20%** captured by random sampling across 10,000 Monte Carlo runs.
5. **Blockchain Audit Trail**:
   - Log in as **Verification Officer** (`officer@bluecarbon.org`).
   - Go to `/verification`, review a High-Priority plot, approve it with audit notes, and inspect the transaction hash anchored in the `/blockchain` registry.

### Part 2: Community Restoration & Communication System
6. **Community Planter Experience**:
   - Log out and log in as **Community Planter** (`community@bluecarbon.org` / `Community@123`), or click **"Join as Community Planter"** to demonstrate live public registration.
   - Walk through the **Community User Dashboard** (`/community-dashboard`):
     - Highlight the personalized welcome banner and role badge ("Farmer").
     - Show the 6 personal KPI cards (My Projects, Total Plants, Surviving Plants, Survival Rate %, Land Area, Carbon Storage).
     - Point out the project list and field monitoring history.
7. **Plant Growth Planner & Assistance Request**:
   - Navigate to `/planner`.
   - In **Plant Selection**, demonstrate that coastal criteria recommend *Rhizophora mucronata*, while inland settings bar mangroves with an informative botanical explanation.
   - Click **"Request Planting Assistance"** in the top hero header.
   - Fill in site details (or use the pre-filled parameters) and click **"Submit Request to Experts"**. Show that this immediately creates a support ticket in the Communication Centre.
8. **Interactive Communication Centre**:
   - Navigate to `/communication`.
   - Open the **Tickets & Messages** tab and select the newly created ticket or the pre-seeded ticket `TKT-0101` (*Rhizophora seedling yellowing in Kutch saline soil*).
   - Review the chat-style conversation thread with image attachment.
   - Type a reply as the community user: *"Thank you! I will increase tidal flushing as recommended."*
9. **Staff Response & Ticket Assignment**:
   - Log in as **Admin** (`admin@bluecarbon.org`).
   - Navigate to `/communication` -> **Staff Queue** tab to inspect workload distribution across staff.
   - In **Tickets & Messages**, show how an Admin can reassign any ticket to **Dr. Sunita Rao (Mangrove Ecologist)**.
   - Show how the Researcher can answer scientific inquiries while the Verification Officer handles audit questions.
   - Demonstrate the **Notification Bell** badge updating dynamically with unread notifications.
10. **Executive PDF Export**:
    - Navigate to `/reports` and click **"Download Official PDF Report"** to show the generated audit certificate ready for standard registries.
