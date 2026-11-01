# An Uncertainty-Aware Verification Prioritization Framework for Blockchain-Based Blue Carbon MRV Systems

**Academic Research Project** — Master of Computer Applications (MCA) Semester III  
**Domain**: Coastal Blue Carbon Ecology • MRV Systems • Data Science • Distributed Ledger Technology  

---

## 1. Project Overview

Blue Carbon ecosystems—specifically mangrove forests—sequester carbon at rates up to ten times greater per hectare than terrestrial tropical rainforests. However, carbon crediting and verification mechanisms suffer from high audit expenditures and spatial heterogeneity. Traditional verification approaches rely on random or fixed-interval site visits, which frequently fail to inspect high-uncertainty or high-biomass plots.

This project delivers a **full-stack, uncertainty-aware Monitoring, Reporting, and Verification (MRV) system**:
1. **Pantropical Allometric Estimation**: Calculates mangrove Aboveground Biomass (AGB) using the **Chave et al. (2014)** pantropical allometric model.
2. **Empirical Uncertainty Quantification**: Executes **2,000 non-parametric bootstrap resampling iterations** per plot to construct 95% Confidence Intervals [$CI_{\text{lower}}, CI_{\text{upper}}$] and relative uncertainty metrics.
3. **Multi-Indicator Verification Prioritization Engine**: Synthesizes (1) Relative Uncertainty, (2) Data Quality Concerns, and (3) Estimated Biomass Impact into standardized percentile scores [0–100] to stratify plots into **High, Medium, and Low Priority** tiers.
4. **Comparative Strategy Simulation**: Evaluates 4 sampling strategies using **10,000 Monte Carlo simulation runs** under a configurable audit budget (default: 24 plots of 118 plots).
5. **Tamper-Evident Blockchain Registry**: Anchors biomass records, SHA-256 evidence hashes, and verification officer audit determinations onto a **Solidity smart contract** deployed to an Ethereum-compatible node (Ganache) with graceful cryptographic simulation fallback.
6. **Plant Growth & Blue Carbon Planner**: An integrated community and restoration hub allowing farmers, students, and conservationists to select native species, calculate land area & plant spacing, simulate biological growth milestones, project living biomass and blue carbon accumulation, manage restoration projects, and log field survival audits.
7. **Community User Role & Self-Registration**: Enables ordinary people, coastal farmers, students, NGOs, and environmental volunteers to register with public access, manage isolated planting sites, and interact safely without exposing executive audit operations.
8. **Communication Centre & Support Ticket System**: Multi-channel expert inquiry hub connecting community planters directly with scientific researchers and verification auditors across 10 ecological categories, with chat-style threads, image attachments, staff assignment, status progression, and notification badges.
9. **Executive PDF & CSV Reporting**: Generates formal verification audit reports via ReportLab.

---

## 2. Technology Stack

- **Frontend**: React 19, Vite 8, TypeScript, Tailwind CSS, Recharts, Lucide Icons.
- **Backend**: Python 3.14, FastAPI, Uvicorn, Pydantic v2, Motor, PyMongo, PyJWT, bcrypt, ReportLab.
- **Data Science**: NumPy, Pandas, SciPy, Scikit-learn.
- **Database**: MongoDB 8.2 (with resilient in-memory fallback store).
- **Blockchain**: Solidity v0.8.20 (`BlueCarbonMRV.sol`), Web3.py, Ganache Local RPC (or SHA-256 Cryptographic Ledger).

---

## 3. Project Structure

```
BlueCarbon_MRV_System/
├── backend/
│   ├── app/
│   │   ├── services/
│   │   │   ├── biomass_service.py       # Chave et al. (2014) pantropical allometric equation
│   │   │   ├── uncertainty_service.py   # Bootstrap 2,000 runs, 95% CI, wood density sensitivity
│   │   │   ├── prioritization_service.py# Multi-indicator percentile prioritization engine
│   │   │   ├── comparative_service.py   # 10,000 Monte Carlo simulation runs
│   │   │   ├── blockchain_service.py    # Web3.py Ganache & Cryptographic SHA-256 ledger
│   │   │   ├── planner_service.py       # Plant Growth & Blue Carbon Planner engine
│   │   │   └── report_service.py        # ReportLab PDF & CSV generation
│   │   ├── auth.py                      # JWT Bearer tokens, bcrypt hashing & RBAC
│   │   ├── config.py                    # Environment settings
│   │   ├── database.py                  # MongoDB async connection & resilient fallback
│   │   ├── models.py                    # Pydantic data schemas & Enums
│   │   ├── seed_data.py                 # Initial data & 4-role account seeder
│   │   └── main.py                      # FastAPI application & REST endpoints (61 routes)
│   ├── tests/
│   │   ├── test_existing_modules.py     # 9 regression tests for core MRV pipeline
│   │   ├── test_planner.py              # 6 verification tests for planner engine
│   │   └── test_community_communication.py # 15 tests for community registration, tickets & RBAC
│   └── run.py                           # Backend runner script
├── frontend/
│   ├── src/
│   │   ├── components/                  # Sidebar, Header, Modals
│   │   ├── context/                     # AuthContext, ThemeContext
│   │   ├── pages/                       # 15 Application Pages (incl. CommunityDashboard, CommunicationCentre)
│   │   ├── services/                    # Typed API client
│   │   └── types/                       # Domain TypeScript interfaces
│   ├── tailwind.config.js               # Nature & Dark Navy theme config
│   ├── tsconfig.json                    # TypeScript compiler options
│   └── package.json                     # Frontend dependencies
├── blockchain/
│   ├── contracts/
│   │   └── BlueCarbonMRV.sol            # Solidity v0.8.20 smart contract
│   ├── BlueCarbonMRV_ABI.json           # Contract ABI definition
│   └── deploy_ganache.py                # Local Ganache deployment utility
├── dataset/
│   ├── generate_dataset.py              # 118 mangrove plots generator
│   └── mangrove_field_measurements_118plots.csv # 2,249 tree records benchmark dataset
├── documentation/
│   ├── ARCHITECTURE.md                  # System architecture & Mermaid flowcharts
│   ├── API_DOCUMENTATION.md             # REST API specifications
│   ├── MATHEMATICAL_FORMULATION.md      # Detailed mathematical & statistical equations
│   └── USER_GUIDE.md                    # Demonstration walkthrough & presentation script
├── requirements.txt                     # Python dependencies
├── package.json                         # Root orchestration
├── .env.example                         # Environment configuration template
└── README.md                            # Main project documentation
```

---

## 4. Quick Start (Windows PowerShell)

### Prerequisites
- Python 3.11+ (Python 3.14 detected)
- Node.js v20+ (Node.js v22 detected) & npm
- MongoDB Server running on `localhost:27017`

### Step 1: Install Python Dependencies
```powershell
pip install -r requirements.txt
```

### Step 2: Install Frontend Dependencies
```powershell
cd frontend
npm install
cd ..
```

### Step 3: Run the Complete Application

**Terminal 1 (Backend - FastAPI Server on Port 8000)**:
```powershell
cd backend
python run.py
```
*The backend automatically connects to MongoDB, seeds initial users, imports the 118 mangrove plots dataset, calculates baseline biomass and bootstrap uncertainties, and starts serving on `http://127.0.0.1:8000`.*

**Terminal 2 (Frontend - Vite Dev Server on Port 5173)**:
```powershell
cd frontend
npm run dev
```

Open your browser at: **`http://localhost:5173/`**

---

## 5. Demonstration Accounts (4 Active System Roles)

For viva presentation and demonstration, one-click login buttons are provided on the login page:

| Role | Email | Password | Primary Functions |
|---|---|---|---|
| **Community User / Planter** | `community@bluecarbon.org` | `Community@123` | Plan restoration sites, log tree growth, request expert guidance |
| **Researcher** | `researcher@bluecarbon.org` | `Research@123` | Answer plant & soil questions, CSV data upload, allometric modeling |
| **Verification Officer** | `officer@bluecarbon.org` | `Officer@123` | Audit high-priority plots, answer audit queries, approve/reject on-chain |
| **Admin** | `admin@bluecarbon.org` | `Admin@123` | Assign support requests, monitor communications, manage users & contract |

---

## 6. The 15 Application Pages

1. **Login & Public Registration**: Nature-themed authentication with public sign-up for Community Planters and instant 1-click test credentials for all 4 roles.
2. **Community Planter Dashboard**: Personalized dashboard displaying user-specific planting projects, total trees planted, surviving plants & progress bar, planting area, CO₂ equivalent tonnes, assistance requests, and unread notification alerts.
3. **Communication Centre**: Complete messaging and ticket management hub with (1) Ask an Expert form, (2) My Tickets with chat-style threads and attachments, (3) Real-time notifications with unread counts, and (4) Staff Queue for ticket assignment.
4. **Main Dashboard**: Executive real-time KPIs, regional biomass distribution, priority ratio, live blockchain transactions, and community restoration metrics.
5. **Environmental Data Management**: Ingest mangrove tree measurement CSVs, add manual measurements, and validate/clean data.
6. **Biomass Estimation**: Chave et al. (2014) pantropical allometric equations ($AGB = 0.0673 \times (\rho \times D^2 \times H)^{0.976}$), regional summaries, and tree-level inspections.
7. **Uncertainty Assessment**: 2,000 bootstrap resampling runs, 95% Confidence Intervals, empirical frequency curve, and wood-density sensitivity scenarios.
8. **Verification Prioritization**: Composite multi-indicator percentile engine (Uncertainty + Data Quality + Biomass Impact), High/Medium/Low tiers, and dynamic weight tuning.
9. **Comparative Analysis**: 10,000 Monte Carlo simulation runs demonstrating >61% capture efficiency versus ~20% random selection.
10. **Blockchain Registry**: Dual-mode ledger explorer (Ethereum Ganache / Simulated Cryptographic SHA-256), block explorer, evidence hashes, and on-chain anchoring.
11. **Verification Tasks**: Verification Officer workspace to review evidence, issue official decisions, and sign audit logs on-chain.
12. **Reports & Analytics**: Comprehensive analytics charts, RFC 4180 CSV export, and ReportLab PDF executive audit report generator.
13. **Plant Growth & Blue Carbon Planner**: Complete community & restoration planning hub with 8 distinct interactive sections:
    - **Plant Selection**: Ecological matching by country, state, district, soil, land type, water condition, and purpose.
    - **Growth Calculator**: Species-specific biological milestones (germination, establishment, sapling, developing tree, maturity) with interactive 20-year height and carbon curves.
    - **Land Area Calculator**: Spacing requirements, pathway buffers, plant capacity, area sufficiency check, and visual grid layout simulation.
    - **Environmental Benefits**: Allometric estimation of living biomass, living carbon, soil organic carbon (SOC), CO₂ equivalent, wave energy attenuation %, sediment trapped (mm/yr).
    - **My Planting Projects**: Full CRUD project workspace with status tracking (Planning, Ready, Planted, Growing, Monitoring, Completed).
    - **Plant Growth Monitoring**: Log quarterly audits with height (cm), survival %, dead count, condition, photo upload, interactive progress charts, and auto-generated care recommendations.
    - **Planting Calendar**: 12-month calendar of optimal seasonal windows and maintenance checklists.
    - **Educational Guide**: Beginner-friendly illustrated guide on mangrove blue carbon superpowers, shoreline defense, planting techniques, and survival pitfall avoidance.
    - **Request Planting Assistance**: Instant modal to request researcher guidance with prefilled site parameters.
14. **User Profile**: User details, role, geographic district/state, category, and active JWT session token inspector.
15. **Settings**: Theme switcher (Dark Navy / Light), system health checks, and sample data re-seed trigger.

---

## 7. Mathematical Standard & Boundary Definition

- **Allometric Equation**: Chave et al. (2014) Pantropical allometric equation for mangrove Aboveground Biomass:
  $$AGB = 0.0673 \times (\rho \times D^2 \times H)^{0.976}$$
- **Carbon Accounting Disclaimer**: All calculated values strictly quantify **Aboveground Biomass (AGB)** and are deliberately segregated from Belowground Biomass (BGB) and Soil Organic Carbon (SOC).

---

## 8. License

This project is licensed under the MIT License for academic research and educational demonstration.
