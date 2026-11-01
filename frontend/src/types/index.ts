export type UserRole = 'Admin' | 'Researcher' | 'Verification Officer' | 'Community User' | 'community_user';

export const isCommunityUserRole = (role?: string): boolean => {
  if (!role) return false;
  return role === 'Community User' || role === 'community_user';
};

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization?: string;
  mobile_number?: string;
  country?: string;
  state?: string;
  district?: string;
  user_type?: 'Individual' | 'Farmer' | 'Student' | 'NGO' | 'Volunteer' | 'Other' | string;
  created_at?: string;
}

export interface AuthResponse {
  access_token: string;
  token_type: string;
  user: User;
}

export interface TreeMeasurement {
  _id?: string;
  tree_id: string;
  plot_id: string;
  species: string;
  dbh_cm: number;
  height_m: number;
  wood_density_g_cm3: number;
  region: string;
  plot_type: string;
  latitude?: number;
  longitude?: number;
  measurement_date?: string;
  canopy_cover_pct?: number;
  agb_kg?: number;
  measurement_quality_flag?: string;
}

export interface DatasetStats {
  total_trees: number;
  total_plots: number;
  species_distribution: Record<string, number>;
  regional_distribution: Record<string, number>;
  plot_type_distribution: Record<string, number>;
  mean_dbh_cm: number;
  mean_height_m: number;
  mean_wood_density: number;
  data_quality_issues_detected: number;
}

export interface RegionalSummary {
  region: string;
  plot_count: number;
  total_agb_kg: number;
  total_agb_tonnes: number;
  mean_agb_kg: number;
  median_agb_kg: number;
  mean_density_mg_ha: number;
}

export interface PlotTypeSummary {
  plot_type: string;
  plot_count: number;
  total_agb_kg: number;
  total_agb_tonnes: number;
  mean_agb_kg: number;
  median_agb_kg: number;
  mean_density_mg_ha: number;
}

export interface BiomassSummary {
  total_plots: number;
  total_trees: number;
  grand_total_agb_kg: number;
  grand_total_agb_tonnes: number;
  mean_plot_agb_kg: number;
  median_plot_agb_kg: number;
  allometric_equation: string;
  regional_breakdown: RegionalSummary[];
  plot_type_breakdown: PlotTypeSummary[];
}

export interface SensitivityScenario {
  scenario: string;
  rho_multiplier: number;
  adjusted_agb_kg: number;
  delta_agb_kg: number;
  delta_percentage: number;
}

export interface UncertaintyPlot {
  _id?: string;
  plot_id: string;
  region: string;
  plot_type: string;
  tree_count: number;
  estimated_agb_kg: number;
  bootstrap_mean_agb_kg: number;
  bootstrap_median_agb_kg: number;
  lower_ci_95_kg: number;
  upper_ci_95_kg: number;
  ci_half_width_kg: number;
  relative_uncertainty_pct: number;
  sensitivity_scenarios?: SensitivityScenario[];
}

export interface UncertaintyAssessment {
  overall_mean_relative_uncertainty_pct: number;
  overall_median_relative_uncertainty_pct: number;
  min_uncertainty_pct: number;
  max_uncertainty_pct: number;
  plots_analyzed: number;
  plots: UncertaintyPlot[];
}

export interface PrioritizationPlot {
  _id?: string;
  plot_id: string;
  region: string;
  plot_type: string;
  tree_count: number;
  estimated_agb_kg: number;
  relative_uncertainty_pct: number;
  data_quality_metric: number;
  biomass_impact_kg: number;
  uncertainty_score: number;
  data_quality_score: number;
  biomass_impact_score: number;
  composite_priority_score: number;
  priority_level: 'High Priority' | 'Medium Priority' | 'Low Priority';
  priority_rank: number;
  recommended_action: string;
  verification_status?: string;
  latitude?: number;
  longitude?: number;
  agb_density_mg_ha?: number;
}

export interface PrioritizationSummary {
  total_plots: number;
  high_priority_count: number;
  medium_priority_count: number;
  low_priority_count: number;
  mean_priority_score: number;
  plots: PrioritizationPlot[];
}

export interface StrategyMetric {
  strategy_name: string;
  selection_technique: string;
  plots_selected_count: number;
  high_priority_captured_count: number;
  total_high_priority_target: number;
  capture_efficiency_pct: number;
  cumulative_biomass_captured_kg: number;
  biomass_coverage_pct: number;
  mean_uncertainty_of_selected: number;
}

export interface WeightSensitivity {
  scenario: string;
  w_uncertainty: number;
  w_data_quality: number;
  w_biomass_impact: number;
  high_priority_captured: number;
  capture_rate_pct: number;
  mean_score: number;
}

export interface ComparativeAnalysis {
  total_plots_evaluated: number;
  monitoring_budget_plots: number;
  total_high_priority_plots: number;
  simulation_runs: number;
  scientific_disclaimer: string;
  strategies: StrategyMetric[];
  weight_sensitivity_analysis: WeightSensitivity[];
}

export interface BlockchainRecord {
  _id?: string;
  plot_id: string;
  estimated_agb_kg: number;
  lower_ci_kg: number;
  upper_ci_kg: number;
  relative_uncertainty_pct: number;
  composite_priority_score: number;
  priority_level: string;
  evidence_hash: string;
  verification_status: string;
  verification_comments?: string;
  tx_hash: string;
  block_number: number;
  timestamp: string;
  mode: 'ETHEREUM_GANACHE' | 'SIMULATED_BLOCKCHAIN';
  contract_address?: string;
  verified_by?: string;
}

export interface BlockchainStatus {
  connected: boolean;
  mode: 'ETHEREUM_GANACHE' | 'SIMULATED_BLOCKCHAIN';
  provider_url?: string;
  account?: string;
  contract_address?: string;
  current_block: number;
  total_transactions_recorded: number;
  ledger_integrity_verified: boolean;
}

export interface DashboardAnalytics {
  kpi: {
    total_plots: number;
    total_trees: number;
    total_agb_tonnes: number;
    average_agb_kg: number;
    high_priority_plots: number;
    medium_priority_plots: number;
    low_priority_plots: number;
    average_relative_uncertainty_pct: number;
    verification_completion_pct: number;
    blockchain_transactions_count: number;
    blockchain_mode: string;
  };
  regional_biomass: RegionalSummary[];
  plot_type_biomass: PlotTypeSummary[];
  priority_distribution: Array<{ name: string; count: number; color: string }>;
}

// ==============================================================================
// Plant Growth & Blue Carbon Planner Types
// ==============================================================================

export interface PlantSpecies {
  id: string;
  common_name: string;
  scientific_name: string;
  family: string;
  category: string;
  is_mangrove: boolean;
  native_regions: string[];
  suitable_states: string[];
  suitable_districts?: string[];
  suitable_locations: string[];
  suitable_soil_types: string[];
  suitable_land_types: string[];
  suitable_water_conditions: string[];
  salinity_tolerance_ppt: {
    min: number;
    max: number;
    optimal_min: number;
    optimal_max: number;
  };
  tidal_frequency: string;
  planting_purposes: string[];
  recommended_spacing_m: number;
  min_spacing_m: number;
  max_spacing_m: number;
  wood_density_g_cm3: number;
  carbon_fraction: number;
  root_to_shoot_ratio: number;
  growth_rate_category: string;
  mature_height_m: number;
  canopy_spread_m: number;
  lifespan_years: number;
  suitable_planting_season: string;
  care_instructions: string;
  growth_milestones: {
    germination_establishment: string;
    initial_establishment_days: number;
    early_growth: string;
    early_growth_months: number;
    sapling_stage: string;
    sapling_stage_years: number;
    developing_tree: string;
    developing_tree_years: number;
    maturity: string;
    maturity_years: number;
  };
  coastal_protection_rating: string;
  wave_attenuation_capacity: string;
  biodiversity_benefits: string;
  soil_stabilisation_benefits: string;
  water_quality_benefits: string;
}

export interface PlantRecommendationItem {
  species: PlantSpecies;
  suitability_score: number;
  compatibility_notes: string;
}

export interface UnsuitableSpeciesItem {
  species_id: string;
  common_name: string;
  scientific_name: string;
  reason: string;
}

export interface PlantRecommendationResponse {
  query: Record<string, any>;
  total_recommended: number;
  recommendations: PlantRecommendationItem[];
  unsuitable_species: UnsuitableSpeciesItem[];
  summary: string;
}

export interface GrowthMilestone {
  stage: string;
  timeframe: string;
  estimated_days?: number;
  estimated_months?: number;
  estimated_years?: number;
  expected_height_cm: number;
  survival_expectation_pct: number;
  description: string;
  critical_care: string;
}

export interface GrowthCurvePoint {
  year: number;
  height_m: number;
  dbh_cm: number;
  biomass_per_tree_kg: number;
  total_biomass_tonnes: number;
  carbon_tonnes: number;
}

export interface GrowthCalculationResult {
  species_id: string;
  species_name: string;
  scientific_name: string;
  planting_date: string;
  number_of_plants: number;
  growth_speed_factor: number;
  milestones: GrowthMilestone[];
  growth_curve: GrowthCurvePoint[];
  scientific_reference: string;
}

export interface LandAreaLayout {
  rows: number;
  columns: number;
  spacing_row_m: number;
  spacing_col_m: number;
  plot_length_m: number;
  plot_width_m: number;
  pattern: string;
}

export interface LandAreaCalculationResult {
  species_id: string;
  species_name: string;
  scientific_name: string;
  spacing_m: number;
  area_per_plant_m2: number;
  requested_plants: number;
  available_area_input: number;
  unit: string;
  available_area_m2: number;
  buffer_percentage: number;
  usable_area_m2: number;
  buffer_area_m2: number;
  total_required_area_m2: number;
  total_required_in_unit: number;
  max_plants_capacity: number;
  is_sufficient: boolean;
  sufficiency_status: string;
  area_difference_m2: number;
  area_difference_in_unit: number;
  layout: LandAreaLayout;
  recommendation: string;
}

export interface QuantitativeEstimates {
  above_ground_biomass_tonnes: number;
  below_ground_biomass_tonnes: number;
  total_living_biomass_tonnes: number;
  living_biomass_carbon_tonnes: number;
  soil_organic_carbon_tonnes: number;
  total_carbon_storage_tonnes: number;
  co2_equivalent_tonnes: number;
  annual_co2e_sequestration_rate_tonnes_yr: number;
  confidence_interval_95: {
    lower_bound_co2e_tonnes: number;
    upper_bound_co2e_tonnes: number;
    relative_uncertainty_pct: number;
  };
}

export interface EcosystemServices {
  coastal_wave_attenuation: {
    rating: string;
    wave_energy_reduction_pct: number;
    description: string;
  };
  sediment_stabilisation: {
    sediment_trapped_rate: string;
    soil_erosion_mitigation: string;
    details: string;
  };
  biodiversity_and_habitat: {
    key_species_supported: string[];
    details: string;
  };
  water_quality_enhancement: {
    details: string;
  };
}

export interface EnvironmentalBenefitsResult {
  species_id: string;
  species_name: string;
  scientific_name: string;
  is_mangrove: boolean;
  stand_parameters: {
    initial_plants: number;
    survival_rate_pct: number;
    surviving_plants: number;
    stand_age_years: number;
    land_area_ha: number;
    estimated_mean_height_m: number;
    estimated_mean_dbh_cm: number;
  };
  quantitative_estimates: QuantitativeEstimates;
  ecosystem_services: EcosystemServices;
  scientific_assumptions_and_transparency: {
    allometric_formula: string;
    wood_density_rho: string;
    carbon_fraction_cf: string;
    root_to_shoot_ratio: string;
    soil_carbon_rate: string;
    uncertainty_method: string;
  };
  regulatory_and_mrv_classification: {
    stage_1_estimated_potential: { status: string; description: string };
    stage_2_measured_carbon: { status: string; description: string };
    stage_3_verified_carbon: { status: string; description: string };
    stage_4_issued_carbon_credits: { status: string; description: string };
    mandatory_disclaimer: string;
  };
}

export type ProjectStatus = 'Planning' | 'Ready for planting' | 'Planted' | 'Growing' | 'Monitoring' | 'Completed';

export interface PlantingProject {
  id: string;
  user_id: string;
  user_name: string;
  user_email: string;
  project_name: string;
  country: string;
  state: string;
  district?: string;
  location_name: string;
  species_id: string;
  species_name: string;
  scientific_name: string;
  number_of_plants: number;
  land_area: number;
  area_unit: 'sq_meters' | 'sq_feet' | 'acres' | 'hectares';
  planting_date: string;
  status: ProjectStatus;
  description?: string;
  soil_type?: string;
  water_condition?: string;
  photos: string[];
  estimated_biomass_kg: number;
  estimated_carbon_kg: number;
  estimated_co2e_kg: number;
  current_survival_pct: number;
  total_monitoring_logs: number;
  latest_height_cm?: number;
  created_at: string;
  updated_at: string;
  monitoring_records?: PlantMonitoringRecord[];
}

export interface PlantMonitoringRecord {
  id: string;
  project_id: string;
  user_id: string;
  monitoring_date: string;
  plant_height_cm: number;
  surviving_plants: number;
  dead_plants: number;
  survival_percentage: number;
  health_condition: 'Excellent' | 'Good' | 'Fair' | 'Poor' | 'Critical';
  soil_condition: string;
  water_condition: string;
  photo_url?: string;
  observations?: string;
  recommended_actions: string[];
  recorded_by: string;
  created_at: string;
}

export interface CalendarEvent {
  month: string;
  season: string;
  activity_type: string;
  title: string;
  description: string;
  action_items: string[];
}

export interface UserPlantingImpact {
  total_projects: number;
  total_plants_planted: number;
  total_surviving_plants: number;
  overall_survival_percentage: number;
  total_land_area_ha: number;
  total_land_area_sq_m: number;
  estimated_biomass_tonnes: number;
  estimated_carbon_storage_tonnes: number;
  estimated_co2e_tonnes: number;
  projects_by_status: Record<string, number>;
  species_distribution: Record<string, number>;
  plants_over_time: Array<{
    period: string;
    project_name: string;
    plants_added: number;
    cumulative_planted: number;
  }>;
  carbon_accumulation_trajectory: Array<{
    year: string;
    estimated_biomass_tonnes: number;
    estimated_carbon_tonnes: number;
    estimated_co2e_tonnes: number;
  }>;
  data_notice?: string;
}

// ==============================================================================
// COMMUNITY & COMMUNICATION SYSTEM TYPES
// ==============================================================================

export interface CommunityRegisterPayload {
  name: string;
  email: string;
  password: string;
  confirm_password: string;
  mobile_number?: string;
  country?: string;
  state: string;
  district?: string;
  user_type?: string;
  organization?: string;
}

export type TicketCategory =
  | 'Plant Selection'
  | 'Mangrove Planting'
  | 'Soil Conditions'
  | 'Land Requirements'
  | 'Water Requirements'
  | 'Plant Growth'
  | 'Plant Diseases'
  | 'Carbon Benefits'
  | 'Technical Assistance'
  | 'Planting Assistance'
  | 'Verification Inquiry'
  | 'Other';

export type TicketStatus =
  | 'Open'
  | 'Assigned'
  | 'In Progress'
  | 'Waiting for User'
  | 'Resolved'
  | 'Closed'
  | 'Reopened';

export interface SiteParameters {
  location?: string;
  available_land_area?: number;
  area_unit?: string;
  selected_species_id?: string;
  selected_species_name?: string;
  number_of_plants?: number;
  soil_type?: string;
  water_availability?: string;
  planting_purpose?: string;
}

export interface TicketMessage {
  id: string;
  ticket_id: string;
  sender_id: string;
  sender_name: string;
  sender_role: string;
  message: string;
  attachment_url?: string;
  created_at: string;
}

export interface SupportTicket {
  id: string;
  ticket_number: string;
  user_id: string;
  user_name: string;
  user_email: string;
  user_type?: string;
  subject: string;
  category: TicketCategory;
  description: string;
  location?: string;
  attachment_url?: string;
  planting_project_id?: string;
  site_parameters?: SiteParameters;
  status: TicketStatus;
  priority: 'Low' | 'Medium' | 'High' | 'Urgent';
  assigned_to_id?: string;
  assigned_to_name?: string;
  assigned_to_role?: string;
  created_at: string;
  updated_at: string;
  resolved_at?: string;
  resolution_note?: string;
  message_count?: number;
  last_message?: string;
  last_message_at?: string;
  messages?: TicketMessage[];
}

export interface SupportTicketCreatePayload {
  subject: string;
  category: TicketCategory;
  description: string;
  location?: string;
  attachment_url?: string;
  planting_project_id?: string;
  site_parameters?: SiteParameters;
}

export interface StaffMember {
  id: string;
  name: string;
  email: string;
  role: string;
  organization?: string;
  active_tickets_count: number;
}

export interface NotificationItem {
  id: string;
  user_id: string;
  title: string;
  message: string;
  type: string;
  link?: string;
  is_read: boolean;
  created_at: string;
}

export interface CommunityDashboardData {
  user_info: {
    id: string;
    name: string;
    email: string;
    role: string;
    user_type: string;
    location: string;
  };
  total_projects: number;
  total_plants_planted: number;
  total_surviving_plants: number;
  overall_survival_percentage: number;
  total_land_area_sq_m: number;
  total_land_area_ha: number;
  estimated_carbon_tonnes: number;
  estimated_co2e_tonnes: number;
  my_projects: PlantingProject[];
  my_tickets: SupportTicket[];
  active_tickets_count: number;
  unread_notifications_count: number;
  recent_notifications: NotificationItem[];
  growth_milestones_summary: Array<{
    project_name: string;
    date: string;
    stage: string;
    height_cm: number;
    survival_pct: number;
    health: string;
  }>;
}

export interface CommunicationStats {
  total_tickets: number;
  open_tickets: number;
  assigned_tickets: number;
  in_progress_tickets: number;
  waiting_user_tickets: number;
  resolved_tickets: number;
  closed_tickets: number;
  unassigned_tickets: number;
  by_category: Record<string, number>;
  average_response_time: string;
}
