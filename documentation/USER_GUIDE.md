# BlueCarbon MRV System — User & Demonstration Guide

This guide provides instructions for demonstrating and evaluating the **Uncertainty-Aware Verification Prioritization Framework for Blockchain-Based Blue Carbon MRV Systems**.

---

## 1. Quick Start & Login

When opening `http://localhost:5173/`, you are presented with the **System Sign In** portal.

For convenient demonstration, use the **Instant Demo Access** buttons at the bottom of the login form:
- **Admin**: `admin@bluecarbon.org` / `Admin@123` (Full system configuration, sample data reset)
- **Researcher**: `researcher@bluecarbon.org` / `Research@123` (Data ingestion, bootstrap analysis, weight tuning)
- **Verification Officer**: `officer@bluecarbon.org` / `Officer@123` (Review High-Priority plots, approve/reject on blockchain)

---

## 2. Navigating the 12 Application Modules

### Page 1: Main Dashboard (`/dashboard`)
- View overarching KPIs: 118 mangrove plots, 2,249 tree records, total AGB stock (557.46 Mg AGB), and verification status.
- Inspect the **Aboveground Biomass by Region** chart and **Priority Breakdown Donut**.
- Examine the **Recent Blockchain Registry Records** live feed.

### Page 2: Environmental Data Management (`/data`)
- **Upload CSV**: Upload raw mangrove field dendrometry data (`dataset/mangrove_field_measurements_118plots.csv`).
- **Manual Entry**: Click **"Manual Entry"** to register a new tree measurement with DBH, Height, Wood Density, and Species.
- **Validate & Clean**: Click **"Validate & Clean"** to automatically detect missing records, impute species medians, and remove duplicate tree IDs.
- **Reset Sample**: Re-seeds the standard 118-plot benchmark dataset.

### Page 3: Aboveground Biomass Estimation (`/biomass`)
- Inspect the **Chave et al. (2014)** pantropical allometric model.
- Notice the explicit ecological disclaimer: figures represent **Aboveground Biomass (AGB)** and NOT total ecosystem carbon stock.
- Filter plots by region or hydrological type (Riverine, Fringe, Basin, Overwash, Scrub).
- Click **"View Trees"** on any plot row to inspect individual tree measurements in that plot.

### Page 4: Uncertainty Assessment (`/uncertainty`)
- Evaluates 2,000 non-parametric bootstrap resampling iterations per plot.
- Displays 95% Confidence Intervals [$CI_{\text{lower}}, CI_{\text{upper}}$] and Relative Uncertainty percentage.
- Select any plot in the dropdown to view its empirical **Bootstrap Frequency Bell Curve** and **Wood Density Sensitivity Scenarios** (-20%, -10%, Baseline, +10%, +20%).

### Page 5: Verification Prioritization Engine (`/prioritization`)
- **Primary Research Contribution**: Multi-indicator percentile-normalized scoring.
- Displays ranked plots with individual scores: Uncertainty Score, Data Quality Score, Biomass Impact Score, and Composite Score.
- Shows assigned **Priority Levels** (High, Medium, Low) and **Recommended Verification Actions** (Tier-1 Mandated LiDAR, Tier-2 Remote Sensing, Tier-3 Desk Audit).
- Click **"Tune Indicator Weights"** to adjust indicator weights and dynamically recalculate plot rankings in real-time.

### Page 6: Comparative Analysis (`/comparative`)
- Evaluates 4 audit strategies under a configurable monitoring budget (default 24 plots):
  1. Proposed Composite Prioritization
  2. Uncertainty-Only Ranking
  3. Fixed-Interval Scheduling
  4. Random Selection (10,000 Monte Carlo runs)
- Move the **Audit Budget Slider** (10 to 60 plots) to see real-time updates of capture efficiency.
- Inspect the **Weight Sensitivity Analysis** table.

### Page 7: Blockchain Registry (`/blockchain`)
- Dual-mode distributed ledger explorer: **Ethereum Ganache Local Node** or **Cryptographic SHA-256 Simulation**.
- Inspect block sequence numbers, transaction hashes, plot IDs, evidence hashes, and timestamps.
- Click **"Anchor Plot On-Chain"** to manually record a new plot biomass estimation to the ledger.
- Click **"History"** on any record to view its complete immutable audit trail.

### Page 8: Verification Management (`/verification`)
- Console for the **Verification Officer** to audit high-priority plots.
- Filter by High Priority or Pending status.
- Click the audit action icons to **Approve**, **Reject**, or **Request Additional Measurements**.
- Enter audit comments and click **"Commit & Sign Decision"** to create an immutable blockchain record.

### Page 9: Reports & Analytics (`/reports`)
- Comprehensive charts: Biomass by Region, Priority Distribution, Strategy Comparison, and Sensitivity Curve.
- **Export CSV Dataset**: Downloads complete RFC 4180 CSV dataset of all 118 plots.
- **Download Official PDF Report**: Generates an executive ReportLab PDF report complete with metadata, KPI summary, prioritized plot schedule, and blockchain verification notes.

### Page 10: User Profile (`/profile`)
- Displays current user name, email, system role, organization, and assigned permissions.
- Inspects the active JSON Web Token (HS256) session.

### Page 11: System Settings (`/settings`)
- Toggle **Dark Navy Mode** or **Light Mode**.
- Verify connectivity to FastAPI, MongoDB, and Blockchain providers.
- Trigger data maintenance and sample dataset reset.

---

## 3. Presentation Demonstration Script (for Viva / Project Defense)

1. **Introduction**: Log in as Researcher and explain the problem statement: Mangrove blue carbon credits face substantial verification costs; traditional random auditing fails to catch high-risk estimation errors.
2. **Allometric Biomass & Uncertainty**: Show the Chave et al. (2014) equation and the 2,000-repetition bootstrap distribution curve. Highlight that relative uncertainty ranges from 8% to 24%.
3. **The Prioritization Engine**: Show how the framework transforms raw uncertainty, data quality anomalies, and biomass impact into percentile scores, prioritizing plots that carry the greatest carbon credit liability.
4. **Comparative Proof**: Show the Comparative Analysis page. Explain the 10,000 Monte Carlo simulation runs demonstrating that the proposed framework captures **>61%** of High-Priority plots under a 24-plot budget, compared to only **~20%** captured by random sampling.
5. **Blockchain Audit Trail**: Switch to the Verification Officer role, approve a plot with comments, and show how the transaction is immutably anchored to the blockchain registry with a cryptographic transaction hash.
6. **Executive PDF Export**: Click **"Download Official PDF Report"** to show the generated audit certificate ready for standard registries (Verra / Gold Standard).
