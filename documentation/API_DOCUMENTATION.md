# BlueCarbon MRV System — REST API Documentation

FastAPI interactive OpenAPI documentation is automatically available at:
- **Swagger UI**: `http://127.0.0.1:8000/docs`
- **ReDoc**: `http://127.0.0.1:8000/redoc`

Base URL: `http://127.0.0.1:8000/api/v1`

---

## 1. Authentication & Users
- `POST /auth/register` — Register a new researcher or verification officer.
- `POST /auth/login` — Authenticate and receive a JWT Bearer token.
- `GET /auth/me` — Retrieve current authenticated user profile.

### Pre-Seeded Demonstration Accounts
| Role | Email | Password |
|---|---|---|
| **Admin** | `admin@bluecarbon.org` | `Admin@123` |
| **Researcher** | `researcher@bluecarbon.org` | `Research@123` |
| **Verification Officer** | `officer@bluecarbon.org` | `Officer@123` |

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
- `GET /biomass/summary` — Grand total AGB (kg & tonnes), plot averages, and regional breakdowns.
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
