import numpy as np
import pandas as pd
from typing import Dict, List, Any

def run_comparative_verification_analysis(
    prioritized_df: pd.DataFrame,
    budget_plots: int = 24,
    n_simulations: int = 10000,
    seed: int = 42
) -> Dict[str, Any]:
    """
    Module 6: Comparative Verification Analysis
    
    Compares 4 verification sampling strategies for a given monitoring budget:
    1. Composite Prioritization (Proposed Uncertainty-Aware Engine)
    2. Uncertainty-Only Ranking (Pure bootstrap relative uncertainty)
    3. Fixed-Interval Scheduling (Systematic sampling every k-th plot)
    4. Random Selection (10,000 Monte Carlo simulation runs)
    
    Default budget: 24 plots out of 118 total (~20.3% audit budget).
    
    Note: As specified in research guidelines, this comparison measures
    ranking consistency against the composite reference ranking, not
    independently verified ground-truth biomass errors.
    """
    df = prioritized_df.copy()
    total_plots = len(df)
    budget = min(budget_plots, total_plots)
    
    # Identify Reference High-Priority Plots (top tertile / high priority label)
    high_priority_mask = df['priority_level'] == 'High Priority'
    total_high_priority = int(high_priority_mask.sum())
    high_priority_ids = set(df.loc[high_priority_mask, 'plot_id'])
    
    total_inventory_biomass_kg = float(df['estimated_agb_kg'].sum())
    
    # --- Strategy 1: Proposed Composite Prioritization ---
    # Select top `budget` plots by composite priority score
    strat1_plots = df.sort_values(by='composite_priority_score', ascending=False).head(budget)
    strat1_captured = len(set(strat1_plots['plot_id']).intersection(high_priority_ids))
    strat1_biomass = float(strat1_plots['estimated_agb_kg'].sum())
    strat1_mean_unc = float(strat1_plots['relative_uncertainty_pct'].mean())
    
    # --- Strategy 2: Uncertainty-Only Ranking ---
    # Select top `budget` plots purely by relative uncertainty percentage
    strat2_plots = df.sort_values(by='relative_uncertainty_pct', ascending=False).head(budget)
    strat2_captured = len(set(strat2_plots['plot_id']).intersection(high_priority_ids))
    strat2_biomass = float(strat2_plots['estimated_agb_kg'].sum())
    strat2_mean_unc = float(strat2_plots['relative_uncertainty_pct'].mean())
    
    # --- Strategy 3: Fixed-Interval Scheduling ---
    # Systematic sampling: every step = floor(total_plots / budget)
    step = max(1, total_plots // budget)
    fixed_indices = [i * step for i in range(budget)]
    fixed_indices = [idx for idx in fixed_indices if idx < total_plots]
    # If not enough due to rounding, append remaining
    if len(fixed_indices) < budget:
        remaining = [i for i in range(total_plots) if i not in fixed_indices]
        fixed_indices.extend(remaining[:(budget - len(fixed_indices))])
        
    strat3_plots = df.iloc[fixed_indices]
    strat3_captured = len(set(strat3_plots['plot_id']).intersection(high_priority_ids))
    strat3_biomass = float(strat3_plots['estimated_agb_kg'].sum())
    strat3_mean_unc = float(strat3_plots['relative_uncertainty_pct'].mean())
    
    # --- Strategy 4: Random Selection (10,000 Monte Carlo Simulation Runs) ---
    rng = np.random.default_rng(seed)
    
    # Vectorized Hypergeometric sampling for high-priority plots captured
    # ngood = total_high_priority, nbad = total_plots - total_high_priority, nsample = budget
    sim_captured_counts = rng.hypergeometric(
        ngood=total_high_priority,
        nbad=total_plots - total_high_priority,
        nsample=budget,
        size=n_simulations
    )
    
    sim_mean_captured = float(np.mean(sim_captured_counts))
    sim_std_captured = float(np.std(sim_captured_counts))
    sim_min_captured = int(np.min(sim_captured_counts))
    sim_max_captured = int(np.max(sim_captured_counts))
    
    # Simulate biomass captured over simulations
    biomass_array = df['estimated_agb_kg'].values
    unc_array = df['relative_uncertainty_pct'].values
    sim_biomass_samples = [np.sum(biomass_array[rng.choice(total_plots, size=budget, replace=False)]) for _ in range(1000)]
    sim_unc_samples = [np.mean(unc_array[rng.choice(total_plots, size=budget, replace=False)]) for _ in range(1000)]
    sim_biomass_captured = float(np.mean(sim_biomass_samples))
    sim_mean_unc = float(np.mean(sim_unc_samples))
    
    strategies_results = [
        {
            "strategy_name": "Proposed Composite Prioritization",
            "selection_technique": "Multi-indicator percentile optimization (Uncertainty + Data Quality + Biomass Impact)",
            "plots_selected_count": budget,
            "high_priority_captured_count": strat1_captured,
            "total_high_priority_target": total_high_priority,
            "capture_efficiency_pct": round((strat1_captured / total_high_priority * 100.0) if total_high_priority > 0 else 0.0, 2),
            "cumulative_biomass_captured_kg": round(strat1_biomass, 2),
            "biomass_coverage_pct": round((strat1_biomass / total_inventory_biomass_kg * 100.0) if total_inventory_biomass_kg > 0 else 0.0, 2),
            "mean_uncertainty_of_selected": round(strat1_mean_unc, 2)
        },
        {
            "strategy_name": "Uncertainty-Only Ranking",
            "selection_technique": "Selects highest bootstrap relative uncertainty plots without biomass impact weighting",
            "plots_selected_count": budget,
            "high_priority_captured_count": strat2_captured,
            "total_high_priority_target": total_high_priority,
            "capture_efficiency_pct": round((strat2_captured / total_high_priority * 100.0) if total_high_priority > 0 else 0.0, 2),
            "cumulative_biomass_captured_kg": round(strat2_biomass, 2),
            "biomass_coverage_pct": round((strat2_biomass / total_inventory_biomass_kg * 100.0) if total_inventory_biomass_kg > 0 else 0.0, 2),
            "mean_uncertainty_of_selected": round(strat2_mean_unc, 2)
        },
        {
            "strategy_name": "Fixed-Interval Scheduling",
            "selection_technique": "Uniform systematic interval sampling across sequential plot IDs",
            "plots_selected_count": budget,
            "high_priority_captured_count": strat3_captured,
            "total_high_priority_target": total_high_priority,
            "capture_efficiency_pct": round((strat3_captured / total_high_priority * 100.0) if total_high_priority > 0 else 0.0, 2),
            "cumulative_biomass_captured_kg": round(strat3_biomass, 2),
            "biomass_coverage_pct": round((strat3_biomass / total_inventory_biomass_kg * 100.0) if total_inventory_biomass_kg > 0 else 0.0, 2),
            "mean_uncertainty_of_selected": round(strat3_mean_unc, 2)
        },
        {
            "strategy_name": f"Random Selection (Monte Carlo N={n_simulations:,})",
            "selection_technique": f"Empirical expectation from {n_simulations:,} pseudo-random iterations",
            "plots_selected_count": budget,
            "high_priority_captured_count": round(sim_mean_captured, 1),
            "total_high_priority_target": total_high_priority,
            "capture_efficiency_pct": round((sim_mean_captured / total_high_priority * 100.0) if total_high_priority > 0 else 0.0, 2),
            "cumulative_biomass_captured_kg": round(sim_biomass_captured, 2),
            "biomass_coverage_pct": round((sim_biomass_captured / total_inventory_biomass_kg * 100.0) if total_inventory_biomass_kg > 0 else 0.0, 2),
            "mean_uncertainty_of_selected": round(sim_mean_unc, 2)
        }
    ]
    
    # Weight Sensitivity Analysis: varying indicator weights
    weight_variations = [
        {"scenario": "Equal Weighting (Baseline)", "w_unc": 0.333, "w_dq": 0.333, "w_bio": 0.334},
        {"scenario": "Uncertainty-Focused (50/25/25)", "w_unc": 0.50, "w_dq": 0.25, "w_bio": 0.25},
        {"scenario": "Data Quality-Focused (25/50/25)", "w_unc": 0.25, "w_dq": 0.50, "w_bio": 0.25},
        {"scenario": "Biomass Impact-Focused (25/25/50)", "w_unc": 0.25, "w_dq": 0.25, "w_bio": 0.50},
        {"scenario": "Zero Biomass (Pure Statistical: 50/50/0)", "w_unc": 0.50, "w_dq": 0.50, "w_bio": 0.00}
    ]
    
    weight_results = []
    for wv in weight_variations:
        scores = (
            df['uncertainty_score'] * wv['w_unc'] +
            df['data_quality_score'] * wv['w_dq'] +
            df['biomass_impact_score'] * wv['w_bio']
        )
        ranked_top = df.assign(temp_score=scores).sort_values(by='temp_score', ascending=False).head(budget)
        captured = len(set(ranked_top['plot_id']).intersection(high_priority_ids))
        weight_results.append({
            "scenario": wv['scenario'],
            "w_uncertainty": wv['w_unc'],
            "w_data_quality": wv['w_dq'],
            "w_biomass_impact": wv['w_bio'],
            "high_priority_captured": captured,
            "capture_rate_pct": round(captured / total_high_priority * 100.0, 2),
            "mean_score": round(float(scores.mean()), 2)
        })

    return {
        "total_plots_evaluated": total_plots,
        "monitoring_budget_plots": budget,
        "total_high_priority_plots": total_high_priority,
        "simulation_runs": n_simulations,
        "scientific_disclaimer": (
            "METHODOLOGICAL NOTE: This comparative analysis evaluates ranking consistency "
            "and capture efficiency relative to the composite multi-indicator reference ranking. "
            "It does not represent ground-truth biomass measurement error, which requires destructive "
            "sampling or empirical destructive harvest data."
        ),
        "strategies": strategies_results,
        "weight_sensitivity_analysis": weight_results
    }
