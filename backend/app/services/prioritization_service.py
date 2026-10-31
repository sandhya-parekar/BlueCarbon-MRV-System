import numpy as np
import pandas as pd
from scipy.stats import rankdata
from typing import Dict, List, Any

def compute_data_quality_metric(trees_df: pd.DataFrame, plot_id: str) -> float:
    """
    Computes a raw data-quality concern metric [0-100] for a given plot based on:
    - Missing or incomplete tree measurements
    - High DBH variance / abnormal coefficient of variation (CV)
    - Measurement quality flags
    - Canopy cover anomalies
    """
    plot_trees = trees_df[trees_df['plot_id'] == plot_id]
    if len(plot_trees) == 0:
        return 50.0
        
    concern_score = 10.0 # Baseline normal measurement error
    
    # 1. Check flagged quality or missing fields
    flagged_count = (plot_trees['measurement_quality_flag'] != 'VALID').sum()
    null_count = plot_trees[['dbh_cm', 'height_m', 'wood_density_g_cm3']].isna().sum().sum()
    concern_score += (flagged_count * 18.0) + (null_count * 15.0)
    
    # 2. Check coefficient of variation (CV) of DBH
    dbh_vals = plot_trees['dbh_cm'].dropna()
    if len(dbh_vals) > 2 and dbh_vals.mean() > 0:
        cv_dbh = dbh_vals.std() / dbh_vals.mean()
        if cv_dbh > 0.45: # High structural heterogeneity or irregular recording
            concern_score += 20.0 * min(2.0, cv_dbh)
            
    # 3. Tree count sample size sufficiency
    if len(plot_trees) < 14:
        concern_score += 15.0 # Low sample count penalty
        
    return min(100.0, max(5.0, float(concern_score)))

def calculate_percentile_scores(series: pd.Series) -> pd.Series:
    """
    Calculates percentile-based scores [0 to 100] using rankdata.
    Rank 1 has the lowest percentile (~0), highest rank has 100.
    """
    n = len(series)
    if n <= 1:
        return pd.Series([50.0] * n, index=series.index)
    ranks = rankdata(series, method='average')
    percentiles = (ranks - 1.0) / (n - 1.0) * 100.0
    return pd.Series(percentiles, index=series.index)

def generate_verification_prioritization(
    uncertainty_df: pd.DataFrame,
    trees_df: pd.DataFrame,
    weight_uncertainty: float = 0.3333,
    weight_data_quality: float = 0.3333,
    weight_biomass_impact: float = 0.3333
) -> pd.DataFrame:
    """
    Core Research Engine:
    An Uncertainty-Aware Verification Prioritization Framework.
    
    Indicators:
    1. Relative Uncertainty (%) -> normalized via percentile ranking
    2. Data Quality Concerns -> normalized via percentile ranking
    3. Estimated Biomass Impact (kg) -> normalized via percentile ranking
    
    Composite Priority Score:
    Equal-weighted or customizable weighted sum of the 3 percentile indicators.
    """
    df = uncertainty_df.copy()
    
    # 1. Raw Data Quality Concern Metric
    raw_dq = [compute_data_quality_metric(trees_df, p_id) for p_id in df['plot_id']]
    df['data_quality_metric'] = raw_dq
    
    # 2. Raw Biomass Impact
    df['biomass_impact_kg'] = df['estimated_agb_kg']
    
    # 3. Percentile-based normalization [0 to 100]
    df['uncertainty_score'] = np.round(calculate_percentile_scores(df['relative_uncertainty_pct']), 2)
    df['data_quality_score'] = np.round(calculate_percentile_scores(df['data_quality_metric']), 2)
    df['biomass_impact_score'] = np.round(calculate_percentile_scores(df['biomass_impact_kg']), 2)
    
    # 4. Composite Priority Score
    composite = (
        (df['uncertainty_score'] * weight_uncertainty) +
        (df['data_quality_score'] * weight_data_quality) +
        (df['biomass_impact_score'] * weight_biomass_impact)
    )
    df['composite_priority_score'] = np.round(composite, 2)
    
    # 5. Ranking (Rank 1 = highest priority)
    df = df.sort_values(by='composite_priority_score', ascending=False).reset_index(drop=True)
    df['priority_rank'] = df.index + 1
    
    # 6. Categorization into High, Medium, Low Priority
    # Equal third tertiles or threshold >= 66.67
    n_plots = len(df)
    high_cutoff = int(n_plots / 3)
    med_cutoff = int(2 * n_plots / 3)
    
    def assign_level_and_action(row, rank_idx):
        if rank_idx < high_cutoff or row['composite_priority_score'] >= 66.0:
            level = "High Priority"
            action = "Tier-1 Mandated: On-Site Intensive LiDAR & Terrestrial Re-Measurement"
        elif rank_idx < med_cutoff or row['composite_priority_score'] >= 33.0:
            level = "Medium Priority"
            action = "Tier-2 Recommended: SAR/UAV Multi-Spectral Remote Sensing Cross-Audit"
        else:
            level = "Low Priority"
            action = "Tier-3 Standard: Desk Audit & Automated Statistical Consistency Validation"
        return level, action

    levels = []
    actions = []
    for idx, row in df.iterrows():
        lvl, act = assign_level_and_action(row, idx)
        levels.append(lvl)
        actions.append(act)
        
    df['priority_level'] = levels
    df['recommended_action'] = actions
    
    return df
