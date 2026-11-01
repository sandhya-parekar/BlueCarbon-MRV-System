from enum import Enum
from pydantic import BaseModel, EmailStr, Field
from typing import Optional, List, Dict, Any
from datetime import datetime

# --- Auth Models ---
class UserRole(str, Enum):
    ADMIN = "Admin"
    RESEARCHER = "Researcher"
    VERIFICATION_OFFICER = "Verification Officer"
    COMMUNITY_USER = "community_user"
    COMMUNITY_USER_DISPLAY = "Community User"

class UserCreate(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    role: str = Field(default=UserRole.RESEARCHER)
    organization: Optional[str] = "Blue Carbon MRV Consortium"
    mobile_number: Optional[str] = None
    country: Optional[str] = "India"
    state: Optional[str] = None
    district: Optional[str] = None
    user_type: Optional[str] = None

class CommunityUserRegister(BaseModel):
    name: str = Field(..., min_length=2, max_length=100)
    email: EmailStr
    password: str = Field(..., min_length=6)
    confirm_password: str = Field(..., min_length=6)
    mobile_number: Optional[str] = Field(default="", max_length=20)
    country: str = Field(default="India", max_length=100)
    state: str = Field(..., min_length=2, max_length=100)
    district: Optional[str] = Field(default="", max_length=100)
    user_type: str = Field(default="Farmer") # Individual, Farmer, Student, NGO, Volunteer, Other
    organization: Optional[str] = Field(default="Community Restoration Group")

class UserLogin(BaseModel):
    email: EmailStr
    password: str

class UserResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    organization: Optional[str] = None
    mobile_number: Optional[str] = None
    country: Optional[str] = "India"
    state: Optional[str] = None
    district: Optional[str] = None
    user_type: Optional[str] = None
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

# --- Plant Growth & Blue Carbon Planner Models ---

class PlantSpeciesModel(BaseModel):
    id: str
    common_name: str
    scientific_name: str
    family: str
    category: str
    is_mangrove: bool
    native_regions: List[str]
    suitable_states: List[str]
    suitable_districts: Optional[List[str]] = None
    suitable_locations: List[str]
    suitable_soil_types: List[str]
    suitable_land_types: List[str]
    suitable_water_conditions: List[str]
    salinity_tolerance_ppt: Dict[str, float]
    tidal_frequency: str
    planting_purposes: List[str]
    recommended_spacing_m: float
    min_spacing_m: float
    max_spacing_m: float
    wood_density_g_cm3: float
    carbon_fraction: float
    root_to_shoot_ratio: float
    growth_rate_category: str
    mature_height_m: float
    canopy_spread_m: float
    lifespan_years: int
    suitable_planting_season: str
    care_instructions: str
    growth_milestones: Dict[str, Any]
    coastal_protection_rating: str
    wave_attenuation_capacity: str
    biodiversity_benefits: str
    soil_stabilisation_benefits: str
    water_quality_benefits: str

class PlantSpeciesCreate(BaseModel):
    id: str
    common_name: str
    scientific_name: str
    family: str
    category: str
    is_mangrove: bool = False
    native_regions: List[str]
    suitable_states: List[str]
    suitable_locations: List[str]
    suitable_soil_types: List[str]
    suitable_land_types: List[str]
    suitable_water_conditions: List[str]
    salinity_tolerance_ppt: Dict[str, float]
    tidal_frequency: str
    planting_purposes: List[str]
    recommended_spacing_m: float = 2.5
    min_spacing_m: float = 2.0
    max_spacing_m: float = 3.5
    wood_density_g_cm3: float = 0.65
    carbon_fraction: float = 0.48
    root_to_shoot_ratio: float = 0.35
    growth_rate_category: str = "Moderate"
    mature_height_m: float = 15.0
    canopy_spread_m: float = 6.0
    lifespan_years: int = 50
    suitable_planting_season: str
    care_instructions: str
    growth_milestones: Dict[str, Any]
    coastal_protection_rating: str = "Moderate"
    wave_attenuation_capacity: str
    biodiversity_benefits: str
    soil_stabilisation_benefits: str
    water_quality_benefits: str

class PlantRecommendationRequest(BaseModel):
    country: str = "India"
    state: Optional[str] = None
    district: Optional[str] = None
    location: Optional[str] = None # Coastal, Riverbank / Estuarine, Inland / Terrestrial, Urban, Island
    soil_type: Optional[str] = None
    land_type: Optional[str] = None
    water_condition: Optional[str] = None
    planting_purpose: Optional[str] = None
    land_area: Optional[float] = None
    number_of_plants: Optional[int] = None

class GrowthCalculationRequest(BaseModel):
    species_id: str
    planting_date: str
    number_of_plants: int = 100
    initial_height_cm: Optional[float] = None
    soil_condition: str = "Good"
    sunlight_exposure: str = "Full Sun"
    water_availability: str = "Optimal"
    care_level: str = "Moderate"

class LandAreaCalculationRequest(BaseModel):
    species_id: str
    number_of_plants: int = Field(..., gt=0)
    available_land_area: float = Field(..., gt=0)
    area_unit: str = "sq_meters" # sq_meters, sq_feet, acres, hectares
    custom_spacing_m: Optional[float] = None
    pathway_buffer_pct: float = 12.0

class EnvironmentalBenefitsRequest(BaseModel):
    species_id: str
    number_of_plants: int = Field(..., gt=0)
    land_area_ha: float = Field(..., gt=0)
    stand_age_years: float = Field(default=5.0, gt=0, le=50)
    survival_rate_pct: float = Field(default=85.0, ge=0, le=100)

class PlantingProjectCreate(BaseModel):
    project_name: str = Field(..., min_length=3, max_length=150)
    country: str = "India"
    state: str
    district: Optional[str] = ""
    location_name: str
    species_id: str
    species_name: str
    scientific_name: str
    number_of_plants: int = Field(..., gt=0)
    land_area: float = Field(..., gt=0)
    area_unit: str = "sq_meters"
    planting_date: str # YYYY-MM-DD
    status: str = Field(default="Planning") # Planning, Ready for planting, Planted, Growing, Monitoring, Completed
    description: Optional[str] = ""
    soil_type: Optional[str] = ""
    water_condition: Optional[str] = ""
    photos: List[str] = []

class PlantingProjectUpdate(BaseModel):
    project_name: Optional[str] = None
    status: Optional[str] = None
    number_of_plants: Optional[int] = None
    land_area: Optional[float] = None
    area_unit: Optional[str] = None
    planting_date: Optional[str] = None
    description: Optional[str] = None
    soil_type: Optional[str] = None
    water_condition: Optional[str] = None
    photos: Optional[List[str]] = None

class PlantingProjectResponse(PlantingProjectCreate):
    id: str
    user_id: str
    user_name: str
    user_email: str
    estimated_biomass_kg: float
    estimated_carbon_kg: float
    estimated_co2e_kg: float
    current_survival_pct: float
    total_monitoring_logs: int
    latest_height_cm: Optional[float] = None
    created_at: str
    updated_at: str

class PlantMonitoringRecordCreate(BaseModel):
    project_id: str
    monitoring_date: str # YYYY-MM-DD
    plant_height_cm: float = Field(..., gt=0)
    surviving_plants: int = Field(..., ge=0)
    dead_plants: int = Field(default=0, ge=0)
    health_condition: str = Field(..., description="Excellent, Good, Fair, Poor, Critical")
    soil_condition: str
    water_condition: str
    photo_url: Optional[str] = None
    observations: Optional[str] = None

class PlantMonitoringRecordResponse(PlantMonitoringRecordCreate):
    id: str
    user_id: str
    survival_percentage: float
    recommended_actions: List[str]
    recorded_by: str
    created_at: str

class UserPlantingImpactResponse(BaseModel):
    total_projects: int
    total_plants_planted: int
    total_surviving_plants: int
    overall_survival_percentage: float
    total_land_area_ha: float
    total_land_area_sq_m: float
    estimated_biomass_tonnes: float
    estimated_carbon_storage_tonnes: float
    estimated_co2e_tonnes: float
    projects_by_status: Dict[str, int]
    species_distribution: Dict[str, int]
    plants_over_time: List[Dict[str, Any]]
    carbon_accumulation_trajectory: List[Dict[str, Any]]

# --- Support Ticket & Communication Models ---

class TicketCategory(str, Enum):
    PLANT_SELECTION = "Plant Selection"
    MANGROVE_PLANTING = "Mangrove Planting"
    SOIL_CONDITIONS = "Soil Conditions"
    LAND_REQUIREMENTS = "Land Requirements"
    WATER_REQUIREMENTS = "Water Requirements"
    PLANT_GROWTH = "Plant Growth"
    PLANT_DISEASES = "Plant Diseases"
    CARBON_BENEFITS = "Carbon Benefits"
    TECHNICAL_ASSISTANCE = "Technical Assistance"
    PLANTING_ASSISTANCE = "Planting Assistance"
    VERIFICATION_INQUIRY = "Verification Inquiry"
    OTHER = "Other"

class TicketStatus(str, Enum):
    OPEN = "Open"
    ASSIGNED = "Assigned"
    IN_PROGRESS = "In Progress"
    WAITING_USER = "Waiting for User"
    RESOLVED = "Resolved"
    CLOSED = "Closed"
    REOPENED = "Reopened"

class TicketMessageCreate(BaseModel):
    message: str = Field(..., min_length=1, max_length=5000)
    attachment_url: Optional[str] = None

class TicketMessageResponse(BaseModel):
    id: str
    ticket_id: str
    sender_id: str
    sender_name: str
    sender_role: str
    message: str
    attachment_url: Optional[str] = None
    created_at: str

class SiteParameters(BaseModel):
    location: Optional[str] = None
    available_land_area: Optional[float] = None
    area_unit: Optional[str] = "sq_meters"
    selected_species_id: Optional[str] = None
    selected_species_name: Optional[str] = None
    number_of_plants: Optional[int] = None
    soil_type: Optional[str] = None
    water_availability: Optional[str] = None
    planting_purpose: Optional[str] = None

class SupportTicketCreate(BaseModel):
    subject: str = Field(..., min_length=3, max_length=250)
    category: str = Field(default="Other")
    description: str = Field(..., min_length=5, max_length=5000)
    location: Optional[str] = None
    attachment_url: Optional[str] = None
    planting_project_id: Optional[str] = None
    site_parameters: Optional[SiteParameters] = None
    priority: Optional[str] = "Medium"

class SupportTicketAssign(BaseModel):
    assigned_to_id: str = Field(..., min_length=1)
    priority: Optional[str] = None

class SupportTicketStatusUpdate(BaseModel):
    status: str
    resolution_note: Optional[str] = None

class SupportTicketResponse(BaseModel):
    id: str
    ticket_number: Optional[str] = "TKT-0000"
    user_id: str
    user_name: str
    user_email: str
    user_type: Optional[str] = None
    subject: str
    category: str
    description: str
    location: Optional[str] = None
    attachment_url: Optional[str] = None
    planting_project_id: Optional[str] = None
    site_parameters: Optional[Dict[str, Any]] = None
    status: str
    priority: str = "Medium"
    assigned_to_id: Optional[str] = None
    assigned_to_name: Optional[str] = None
    assigned_to_role: Optional[str] = None
    created_at: str
    updated_at: str
    resolved_at: Optional[str] = None
    resolution_note: Optional[str] = None
    message_count: Optional[int] = None
    last_message: Optional[str] = None
    last_message_at: Optional[str] = None
    messages: Optional[List[TicketMessageResponse]] = None

class NotificationResponse(BaseModel):
    id: str
    user_id: str
    title: str
    message: str
    type: Optional[str] = "ticket"
    category: Optional[str] = None
    link: Optional[str] = None
    related_id: Optional[str] = None
    is_read: bool = False
    created_at: str

class StaffMemberResponse(BaseModel):
    id: str
    name: str
    email: str
    role: str
    organization: Optional[str] = None
    active_tickets_count: int = 0

class CommunityDashboardResponse(BaseModel):
    user_info: Dict[str, Any]
    total_projects: int
    total_plants_planted: int
    total_surviving_plants: int
    overall_survival_percentage: float
    total_land_area_sq_m: float
    total_land_area_ha: float
    estimated_carbon_tonnes: float
    estimated_co2e_tonnes: float
    my_projects: List[Dict[str, Any]]
    my_tickets: List[Dict[str, Any]]
    active_tickets_count: int
    unread_notifications_count: int
    recent_notifications: List[NotificationResponse]
    growth_milestones_summary: List[Dict[str, Any]]
