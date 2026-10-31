from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Auth Models ---
class UserRole(str):
    ADMIN = "Admin"
    RESEARCHER = "Researcher"
    VERIFICATION_OFFICER = "Verification Officer"

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = Field(default=UserRole.RESEARCHER)
    organization: Optional[str] = "Blue Carbon MRV Consortium"

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    organization: Optional[str] = None
    created_at: Optional[datetime] = None

class Token(BaseModel):
    access_token: str
    token_type: str = "bearer"
    user: UserResponse

# --- Data Management Models ---
class TreeMeasurementCreate(BaseModel):
    tree_id: str
    plot_id: str
    species: str
    dbh_cm: float = Field(..., gt=0)
    height_m: float = Field(..., gt=0)
    wood_density_g_cm3: float = Field(..., gt=0, le=1.5)
    region: str
    plot_type: str
    latitude: Optional[float] = None
    longitude: Optional[float] = None
    measurement_date: Optional[str] = None
    canopy_cover_pct: Optional[float] = None

class TreeMeasurementResponse(TreeMeasurementCreate):
    id: Optional[str] = None
    agb_kg: Optional[float] = None
    measurement_quality_flag: Optional[str] = "VALID"

class DatasetStatsResponse(BaseModel):
    total_trees: int
    total_plots: int
    species_distribution: Dict[str, int]
    regional_distribution: Dict[str, int]
    plot_type_distribution: Dict[str, int]
    mean_dbh_cm: float
    mean_height_m: float
    mean_wood_density: float
    data_quality_issues_detected: int

class DataValidationSummary(BaseModel):
    total_rows: int
    valid_rows: int
    missing_values_count: int
    duplicate_rows_count: int
    outliers_detected: int
    status: str
    cleaned_rows: int

# --- Biomass Models ---
class PlotBiomassResponse(BaseModel):
    plot_id: str
    region: str
    plot_type: str
    tree_count: int
    total_agb_kg: float
    mean_tree_agb_kg: float
    median_tree_agb_kg: float
    agb_density_mg_ha: float # Megagrams (tonnes) per hectare (assuming 0.1 ha plot)
    latitude: Optional[float] = None
    longitude: Optional[float] = None

class BiomassSummaryResponse(BaseModel):
    total_plots: int
    total_trees: int
    grand_total_agb_kg: float
    grand_total_agb_tonnes: float
    mean_plot_agb_kg: float
    median_plot_agb_kg: float
    allometric_equation: str = "Chave et al. (2014): AGB = 0.0673 * (rho * D^2 * H)^0.976"
    regional_breakdown: List[Dict[str, Any]]
    plot_type_breakdown: List[Dict[str, Any]]

# --- Uncertainty Models ---
class SensitivityScenario(BaseModel):
    scenario: str # e.g. "-20%", "-10%", "Baseline", "+10%", "+20%"
    rho_multiplier: float
    adjusted_agb_kg: float
    delta_agb_kg: float
    delta_percentage: float

class UncertaintyPlotResult(BaseModel):
    plot_id: str
    region: str
    plot_type: str
    estimated_agb_kg: float
    bootstrap_mean_agb_kg: float
    bootstrap_median_agb_kg: float
    lower_ci_95_kg: float
    upper_ci_95_kg: float
    ci_half_width_kg: float
    relative_uncertainty_pct: float
    bootstrap_runs: int = 2000
    sensitivity_scenarios: List[SensitivityScenario]

class UncertaintyAssessmentResponse(BaseModel):
    overall_mean_relative_uncertainty_pct: float
    overall_median_relative_uncertainty_pct: float
    min_uncertainty_pct: float
    max_uncertainty_pct: float
    plots_analyzed: int
    plots: List[UncertaintyPlotResult]

# --- Prioritization Models ---
class PrioritizationPlotItem(BaseModel):
    plot_id: str
    region: str
    plot_type: str
    estimated_agb_kg: float
    tree_count: int
    
    # Raw indicator metrics
    relative_uncertainty_pct: float
    data_quality_metric: float # Error score or anomaly penalty [0-100]
    biomass_impact_kg: float
    
    # Percentile-based normalized scores [0-100]
    uncertainty_score: float
    data_quality_score: float
    biomass_impact_score: float
    
    # Composite Score
    composite_priority_score: float
    priority_level: str # "High Priority", "Medium Priority", "Low Priority"
    priority_rank: int
    recommended_action: str
    verification_status: Optional[str] = "Pending"

class PrioritizationSummaryResponse(BaseModel):
    total_plots: int
    high_priority_count: int
    medium_priority_count: int
    low_priority_count: int
    mean_priority_score: float
    plots: List[PrioritizationPlotItem]

# --- Comparative Analysis Models ---
class StrategyMetric(BaseModel):
    strategy_name: str
    plots_selected_count: int
    high_priority_captured_count: int
    total_high_priority_target: int
    capture_efficiency_pct: float
    cumulative_biomass_captured_kg: float
    biomass_coverage_pct: float
    mean_uncertainty_of_selected: float
    selection_technique: str

class ComparativeAnalysisResponse(BaseModel):
    total_plots_evaluated: int
    monitoring_budget_plots: int
    total_high_priority_plots: int
    simulation_runs: int
    scientific_disclaimer: str
    strategies: List[StrategyMetric]
    weight_sensitivity_analysis: List[Dict[str, Any]]

# --- Blockchain Models ---
class RegisterBiomassOnChainRequest(BaseModel):
    plot_id: str
    notes: Optional[str] = None

class VerificationDecisionRequest(BaseModel):
    plot_id: str
    status: str # "Approved", "Rejected", "Additional Measurements Requested"
    comments: str

class BlockchainRecordResponse(BaseModel):
    plot_id: str
    estimated_agb_kg: float
    lower_ci_kg: float
    upper_ci_kg: float
    relative_uncertainty_pct: float
    composite_priority_score: float
    priority_level: str
    evidence_hash: str
    verification_status: str
    verification_comments: Optional[str] = ""
    tx_hash: str
    block_number: int
    timestamp: str
    mode: str # "ETHEREUM_GANACHE" or "SIMULATED_BLOCKCHAIN"

class BlockchainStatusResponse(BaseModel):
    connected: bool
    mode: str # "ETHEREUM_GANACHE" or "SIMULATED_BLOCKCHAIN"
    network_id: Optional[str] = None
    contract_address: Optional[str] = None
    current_block: int
    total_transactions_recorded: int
    ledger_integrity_verified: bool
