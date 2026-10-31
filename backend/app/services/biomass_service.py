import numpy as np
import pandas as pd
from typing import List, Dict, Any, Tuple

def calculate_tree_agb_chave(rho: float, dbh: float, height: float) -> float:
    """
    Chave et al. (2014) Pantropical allometric equation for Aboveground Biomass (AGB):
    AGB = 0.0673 * (rho * D^2 * H)^0.976
    
    Parameters:
    - rho: Wood density in g/cm3
    - dbh: Diameter at breast height (D) in cm
    - height: Total tree height (H) in metres
    
    Returns:
    - Tree AGB in kilograms (kg)
    """
    if pd.isna(rho) or pd.isna(dbh) or pd.isna(height) or rho <= 0 or dbh <= 0 or height <= 0:
        return 0.0
    return float(0.0673 * ((rho * (dbh ** 2) * height) ** 0.976))

def vectorize_calculate_agb(df: pd.DataFrame) -> pd.DataFrame:
    """
    Vectorized calculation of AGB for all tree records in a DataFrame.
    """
    df = df.copy()
    # Clean zeros or negatives
    valid_mask = (df['wood_density_g_cm3'] > 0) & (df['dbh_cm'] > 0) & (df['height_m'] > 0)
    
    agb_series = np.zeros(len(df))
    if valid_mask.any():
        rho = df.loc[valid_mask, 'wood_density_g_cm3'].values
        dbh = df.loc[valid_mask, 'dbh_cm'].values
        h = df.loc[valid_mask, 'height_m'].values
        
        # Chave et al. (2014) equation
        term = rho * (dbh ** 2) * h
        agb_vals = 0.0673 * (term ** 0.976)
        agb_series[valid_mask.values] = agb_vals
        
    df['agb_kg'] = np.round(agb_series, 2)
    return df

def aggregate_plot_biomass(trees_df: pd.DataFrame) -> pd.DataFrame:
    """
    Aggregates individual tree AGB to plot-level statistics.
    Assumes standard 0.1 hectare plot size for Mg/ha (tonnes/ha) calculation.
    """
    if 'agb_kg' not in trees_df.columns:
        trees_df = vectorize_calculate_agb(trees_df)
        
    # Group by plot_id
    grouped = trees_df.groupby('plot_id')
    
    plot_stats = grouped.agg(
        region=('region', 'first'),
        plot_type=('plot_type', 'first'),
        latitude=('latitude', 'first'),
        longitude=('longitude', 'first'),
        tree_count=('tree_id', 'count'),
        total_agb_kg=('agb_kg', 'sum'),
        mean_tree_agb_kg=('agb_kg', 'mean'),
        median_tree_agb_kg=('agb_kg', 'median'),
        std_tree_agb_kg=('agb_kg', 'std'),
        mean_dbh_cm=('dbh_cm', 'mean'),
        mean_height_m=('height_m', 'mean'),
        mean_wood_density=('wood_density_g_cm3', 'mean')
    ).reset_index()
    
    # Fill NaN std (e.g. if single tree)
    plot_stats['std_tree_agb_kg'] = plot_stats['std_tree_agb_kg'].fillna(0)
    
    # Convert plot AGB kg to Megagrams per hectare (Mg AGB / ha):
    # For a 0.1 ha plot: (total_agb_kg / 1000 kg/Mg) / 0.1 ha = total_agb_kg / 100
    plot_stats['agb_density_mg_ha'] = np.round(plot_stats['total_agb_kg'] / 100.0, 2)
    
    # Round numerical columns
    plot_stats['total_agb_kg'] = np.round(plot_stats['total_agb_kg'], 2)
    plot_stats['mean_tree_agb_kg'] = np.round(plot_stats['mean_tree_agb_kg'], 2)
    plot_stats['median_tree_agb_kg'] = np.round(plot_stats['median_tree_agb_kg'], 2)
    plot_stats['std_tree_agb_kg'] = np.round(plot_stats['std_tree_agb_kg'], 2)
    plot_stats['mean_dbh_cm'] = np.round(plot_stats['mean_dbh_cm'], 2)
    plot_stats['mean_height_m'] = np.round(plot_stats['mean_height_m'], 2)
    plot_stats['mean_wood_density'] = np.round(plot_stats['mean_wood_density'], 3)
    
    return plot_stats

def compute_regional_and_type_summary(plot_df: pd.DataFrame) -> Tuple[List[Dict[str, Any]], List[Dict[str, Any]]]:
    """
    Computes regional and plot type summaries of Aboveground Biomass (AGB).
    """
    # Regional Breakdown
    reg_grp = plot_df.groupby('region').agg(
        plot_count=('plot_id', 'count'),
        total_agb_kg=('total_agb_kg', 'sum'),
        mean_agb_kg=('total_agb_kg', 'mean'),
        median_agb_kg=('total_agb_kg', 'median'),
        mean_density_mg_ha=('agb_density_mg_ha', 'mean')
    ).reset_index()
    
    reg_summary = []
    for _, row in reg_grp.iterrows():
        reg_summary.append({
            "region": str(row['region']),
            "plot_count": int(row['plot_count']),
            "total_agb_kg": round(float(row['total_agb_kg']), 2),
            "total_agb_tonnes": round(float(row['total_agb_kg']) / 1000.0, 2),
            "mean_agb_kg": round(float(row['mean_agb_kg']), 2),
            "median_agb_kg": round(float(row['median_agb_kg']), 2),
            "mean_density_mg_ha": round(float(row['mean_density_mg_ha']), 2)
        })
        
    # Plot Type Breakdown
    type_grp = plot_df.groupby('plot_type').agg(
        plot_count=('plot_id', 'count'),
        total_agb_kg=('total_agb_kg', 'sum'),
        mean_agb_kg=('total_agb_kg', 'mean'),
        median_agb_kg=('total_agb_kg', 'median'),
        mean_density_mg_ha=('agb_density_mg_ha', 'mean')
    ).reset_index()
    
    type_summary = []
    for _, row in type_grp.iterrows():
        type_summary.append({
            "plot_type": str(row['plot_type']),
            "plot_count": int(row['plot_count']),
            "total_agb_kg": round(float(row['total_agb_kg']), 2),
            "total_agb_tonnes": round(float(row['total_agb_kg']) / 1000.0, 2),
            "mean_agb_kg": round(float(row['mean_agb_kg']), 2),
            "median_agb_kg": round(float(row['median_agb_kg']), 2),
            "mean_density_mg_ha": round(float(row['mean_density_mg_ha']), 2)
        })
        
    return reg_summary, type_summary
