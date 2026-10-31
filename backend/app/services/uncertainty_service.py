import numpy as np
import pandas as pd
from typing import Dict, List, Any

def run_bootstrap_for_plot(tree_agb_array: np.ndarray, n_bootstraps: int = 2000, seed: int = 42) -> Dict[str, float]:
    """
    High-performance vectorized non-parametric bootstrap resampling for tree AGB.
    Resamples tree biomass with replacement 2,000 times to estimate uncertainty.
    
    Returns:
    - mean_agb: Mean of bootstrap sums
    - median_agb: Median of bootstrap sums
    - lower_ci_95: 2.5th percentile
    - upper_ci_95: 97.5th percentile
    - ci_half_width: (upper_ci_95 - lower_ci_95) / 2
    - relative_uncertainty_pct: (ci_half_width / estimated_agb) * 100
    """
    n_trees = len(tree_agb_array)
    if n_trees == 0:
        return {
            "bootstrap_mean_agb_kg": 0.0,
            "bootstrap_median_agb_kg": 0.0,
            "lower_ci_95_kg": 0.0,
            "upper_ci_95_kg": 0.0,
            "ci_half_width_kg": 0.0,
            "relative_uncertainty_pct": 0.0
        }
        
    rng = np.random.default_rng(seed)
    # Generate random resample index matrix: shape (n_bootstraps, n_trees)
    resample_indices = rng.integers(0, n_trees, size=(n_bootstraps, n_trees))
    # Resampled sums: shape (n_bootstraps,)
    resampled_sums = np.sum(tree_agb_array[resample_indices], axis=1)
    
    boot_mean = float(np.mean(resampled_sums))
    boot_median = float(np.median(resampled_sums))
    lower_ci = float(np.percentile(resampled_sums, 2.5))
    upper_ci = float(np.percentile(resampled_sums, 97.5))
    half_width = (upper_ci - lower_ci) / 2.0
    
    point_est = float(np.sum(tree_agb_array))
    rel_uncertainty = (half_width / point_est * 100.0) if point_est > 0 else 0.0
    
    return {
        "bootstrap_mean_agb_kg": round(boot_mean, 2),
        "bootstrap_median_agb_kg": round(boot_median, 2),
        "lower_ci_95_kg": round(lower_ci, 2),
        "upper_ci_95_kg": round(upper_ci, 2),
        "ci_half_width_kg": round(half_width, 2),
        "relative_uncertainty_pct": round(rel_uncertainty, 2)
    }

def run_wood_density_sensitivity(plot_trees_df: pd.DataFrame) -> List[Dict[str, Any]]:
    """
    Calculates AGB sensitivity to wood density perturbations:
    Scenarios: -20%, -10%, Baseline (0%), +10%, +20%
    """
    scenarios = [
        {"name": "-20%", "multiplier": 0.80},
        {"name": "-10%", "multiplier": 0.90},
        {"name": "Baseline (0%)", "multiplier": 1.00},
        {"name": "+10%", "multiplier": 1.10},
        {"name": "+20%", "multiplier": 1.20}
    ]
    
    valid_mask = (plot_trees_df['wood_density_g_cm3'] > 0) & (plot_trees_df['dbh_cm'] > 0) & (plot_trees_df['height_m'] > 0)
    if not valid_mask.any():
        return []
        
    dbh = plot_trees_df.loc[valid_mask, 'dbh_cm'].values
    h = plot_trees_df.loc[valid_mask, 'height_m'].values
    base_rho = plot_trees_df.loc[valid_mask, 'wood_density_g_cm3'].values
    
    # Baseline AGB
    base_agb = float(np.sum(0.0673 * ((base_rho * (dbh ** 2) * h) ** 0.976)))
    
    results = []
    for sc in scenarios:
        mult = sc["multiplier"]
        adj_rho = base_rho * mult
        adj_agb = float(np.sum(0.0673 * ((adj_rho * (dbh ** 2) * h) ** 0.976)))
        delta_kg = adj_agb - base_agb
        delta_pct = (delta_kg / base_agb * 100.0) if base_agb > 0 else 0.0
        
        results.append({
            "scenario": sc["name"],
            "rho_multiplier": mult,
            "adjusted_agb_kg": round(adj_agb, 2),
            "delta_agb_kg": round(delta_kg, 2),
            "delta_percentage": round(delta_pct, 2)
        })
        
    return results

def assess_uncertainty_all_plots(trees_df: pd.DataFrame, n_bootstraps: int = 2000) -> pd.DataFrame:
    """
    Computes 2,000-repetition bootstrap uncertainty and sensitivity for every plot in the dataset.
    """
    # Group trees by plot_id
    plots = trees_df['plot_id'].unique()
    uncertainty_rows = []
    
    for idx, p_id in enumerate(plots):
        p_trees = trees_df[trees_df['plot_id'] == p_id]
        reg = p_trees['region'].iloc[0] if len(p_trees) > 0 else "Unknown"
        p_type = p_trees['plot_type'].iloc[0] if len(p_trees) > 0 else "Unknown"
        
        tree_agbs = p_trees['agb_kg'].dropna().values
        estimated_agb = float(np.sum(tree_agbs))
        
        boot_res = run_bootstrap_for_plot(tree_agbs, n_bootstraps=n_bootstraps, seed=42 + idx)
        sensitivity = run_wood_density_sensitivity(p_trees)
        
        uncertainty_rows.append({
            "plot_id": p_id,
            "region": reg,
            "plot_type": p_type,
            "tree_count": len(p_trees),
            "estimated_agb_kg": round(estimated_agb, 2),
            "bootstrap_mean_agb_kg": boot_res["bootstrap_mean_agb_kg"],
            "bootstrap_median_agb_kg": boot_res["bootstrap_median_agb_kg"],
            "lower_ci_95_kg": boot_res["lower_ci_95_kg"],
            "upper_ci_95_kg": boot_res["upper_ci_95_kg"],
            "ci_half_width_kg": boot_res["ci_half_width_kg"],
            "relative_uncertainty_pct": boot_res["relative_uncertainty_pct"],
            "sensitivity_scenarios": sensitivity
        })
        
    return pd.DataFrame(uncertainty_rows)
