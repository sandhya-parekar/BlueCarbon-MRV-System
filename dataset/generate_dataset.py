"""
Mangrove Field Measurements Dataset Generator for MCA Research Project:
"An Uncertainty-Aware Verification Prioritization Framework for Blockchain-Based Blue Carbon MRV Systems"

Generates 118 mangrove plots with realistic ecological parameters:
- Species-specific wood density (rho in g/cm3)
- Realistic DBH (cm) and Height (m) distributions
- Regional distributions: Sundarbans, Bhitarkanika, Pichavaram, Andaman, Gulf of Kutch
- Plot types: Riverine, Fringe, Basin, Overwash, Scrub
- Controlled data-quality anomalies (missing records, high variance, edge plots)
"""

import os
import random
import numpy as np
import pandas as pd

def generate_mangrove_dataset(output_path: str, seed: int = 42):
    np.random.seed(seed)
    random.seed(seed)

    # Mangrove species with typical wood density ranges (g/cm^3)
    species_info = {
        "Rhizophora mangle": {"rho_mean": 0.74, "rho_std": 0.04, "h_base": 12.0, "dbh_base": 24.0},
        "Avicennia marina": {"rho_mean": 0.68, "rho_std": 0.05, "h_base": 9.5, "dbh_base": 20.0},
        "Sonneratia alba": {"rho_mean": 0.54, "rho_std": 0.03, "h_base": 14.0, "dbh_base": 28.0},
        "Bruguiera gymnorhiza": {"rho_mean": 0.79, "rho_std": 0.04, "h_base": 15.5, "dbh_base": 26.0},
        "Ceriops tagal": {"rho_mean": 0.83, "rho_std": 0.03, "h_base": 7.5, "dbh_base": 14.0},
        "Xylocarpus granatum": {"rho_mean": 0.64, "rho_std": 0.04, "h_base": 13.0, "dbh_base": 22.0}
    }

    regions = [
        {"name": "Sundarbans Delta", "lat": 21.94, "lon": 88.89, "plots": 35},
        {"name": "Bhitarkanika Sanctuary", "lat": 20.72, "lon": 86.87, "plots": 25},
        {"name": "Pichavaram Estuary", "lat": 11.43, "lon": 79.79, "plots": 22},
        {"name": "Andaman Archipelago", "lat": 12.15, "lon": 92.78, "plots": 20},
        {"name": "Gulf of Kutch Marine Park", "lat": 22.48, "lon": 69.60, "plots": 16}
    ]

    plot_types = ["Riverine", "Fringe", "Basin", "Overwash", "Scrub"]
    
    plots_meta = []
    tree_records = []
    
    plot_idx = 1
    tree_counter = 1001

    for reg in regions:
        for _ in range(reg["plots"]):
            plot_id = f"PLOT-{plot_idx:03d}"
            p_type = random.choice(plot_types)
            
            # Location jitter around region center
            lat = round(reg["lat"] + np.random.uniform(-0.15, 0.15), 5)
            lon = round(reg["lon"] + np.random.uniform(-0.15, 0.15), 5)
            
            # Number of trees per plot (0.1 ha plot typically has 12 to 28 trees >= 5cm DBH)
            n_trees = int(np.random.normal(20, 4))
            n_trees = max(10, min(35, n_trees))
            
            # Inject data-quality issues in specific plots for research validation:
            # High measurement error plots, outlier DBH, or missing attributes
            is_problematic_quality = (plot_idx in [7, 18, 29, 44, 58, 73, 89, 104, 115])
            
            dominant_species = random.choice(list(species_info.keys()))
            
            for t in range(n_trees):
                tree_id = f"T-{tree_counter}"
                tree_counter += 1
                
                # 70% chance dominant species, 30% mixed
                if random.random() < 0.70:
                    spec = dominant_species
                else:
                    spec = random.choice(list(species_info.keys()))
                
                s_meta = species_info[spec]
                
                # Wood density rho (g/cm^3)
                rho = round(float(np.random.normal(s_meta["rho_mean"], s_meta["rho_std"])), 3)
                rho = max(0.40, min(0.95, rho))
                
                # DBH (cm)
                dbh = round(float(np.random.normal(s_meta["dbh_base"], 6.5)), 1)
                dbh = max(5.0, min(75.0, dbh))
                
                # Height (m) based roughly on DBH allometry: H = a * DBH^b
                height = round(float(0.8 * (dbh ** 0.65) + np.random.normal(s_meta["h_base"] * 0.4, 1.8)), 1)
                height = max(2.5, min(32.0, height))
                
                # Injected anomalies for testing missing data and data quality
                missing_val_field = None
                if is_problematic_quality and t == 0:
                    # Intentionally omit height or dbh on one tree in this plot to test validation engine
                    if plot_idx % 2 == 0:
                        height = np.nan
                        missing_val_field = "height"
                    else:
                        rho = np.nan
                        missing_val_field = "wood_density"
                
                tree_records.append({
                    "tree_id": tree_id,
                    "plot_id": plot_id,
                    "region": reg["name"],
                    "plot_type": p_type,
                    "latitude": lat,
                    "longitude": lon,
                    "species": spec,
                    "dbh_cm": dbh,
                    "height_m": height,
                    "wood_density_g_cm3": rho,
                    "measurement_date": "2026-03-15",
                    "canopy_cover_pct": round(float(np.random.uniform(55.0, 92.0)), 1),
                    "measurement_quality_flag": "FLAGGED_INCOMPLETE" if missing_val_field else "VALID"
                })
            
            plot_idx += 1

    df = pd.DataFrame(tree_records)
    df.to_csv(output_path, index=False)
    print(f"Generated {len(df)} tree records across {plot_idx - 1} plots saved to {output_path}")
    return df

if __name__ == "__main__":
    out_dir = os.path.dirname(os.path.abspath(__file__))
    out_file = os.path.join(out_dir, "mangrove_field_measurements_118plots.csv")
    generate_mangrove_dataset(out_file)
