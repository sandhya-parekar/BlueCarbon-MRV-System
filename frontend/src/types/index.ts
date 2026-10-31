export type UserRole = 'Admin' | 'Researcher' | 'Verification Officer';

export interface User {
  id: string;
  name: string;
  email: string;
  role: UserRole;
  organization?: string;
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
