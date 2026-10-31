# Mathematical & Statistical Formulation

**Project**: An Uncertainty-Aware Verification Prioritization Framework for Blockchain-Based Blue Carbon MRV Systems  
**Academic Level**: MCA Semester III Research Project

---

## 1. Aboveground Biomass (AGB) Allometric Model

Individual tree Aboveground Biomass ($AGB$) is estimated using the pantropical allometric equation formulated by **Chave et al. (2014)**:

$$AGB_i = 0.0673 \times \left( \rho_i \times D_i^2 \times H_i \right)^{0.976}$$

Where:
- $AGB_i$: Aboveground biomass of tree $i$ in kilograms ($\text{kg}$).
- $\rho_i$: Species-specific wood density in grams per cubic centimetre ($\text{g/cm}^3$).
- $D_i$: Diameter at breast height ($DBH$, measured at $1.3\,\text{m}$) in centimetres ($\text{cm}$).
- $H_i$: Total tree height in metres ($\text{m}$).

### Plot-Level Aggregation
For plot $j$ containing $n_j$ measured trees within a standard $0.1\,\text{ha}$ Permanent Sample Plot (PSP):

$$AGB_{\text{plot}, j} = \sum_{i=1}^{n_j} AGB_{i, j}$$

Biomass stock density in Megagrams per hectare ($\text{Mg/ha}$ or tonnes/ha):

$$Density_j = \frac{AGB_{\text{plot}, j}}{1000 \times 0.1} = \frac{AGB_{\text{plot}, j}}{100} \quad (\text{Mg AGB / ha})$$

> **Important Boundary Note**: This model quantifies **Aboveground Biomass (AGB)** only. It deliberately isolates AGB from Belowground Biomass (BGB) and Soil Organic Carbon (SOC) pools to prevent misleading carbon credit over-crediting.

---

## 2. Non-Parametric Bootstrap Uncertainty Assessment

To quantify parameter and measurement uncertainty without assuming a normal distribution, the framework executes non-parametric bootstrap resampling with $B = 2,000$ iterations per plot:

For each resample $b \in \{1, 2, \dots, B\}$:
1. Draw a sample of size $n_j$ with replacement from the set of tree biomass values $\{AGB_{1,j}, \dots, AGB_{n_j,j}\}$.
2. Compute the resampled plot sum:
   $$AGB_j^{*(b)} = \sum_{k=1}^{n_j} AGB_{k, j}^{*(b)}$$

### 95% Bootstrap Confidence Interval
From the empirical bootstrap distribution $\{AGB_j^{*(1)}, \dots, AGB_j^{*(B)}\}$, calculate the empirical percentiles:
- Lower 95% Confidence Limit ($CI_{\text{lower}}$): $2.5^{\text{th}}$ percentile ($P_{2.5}$).
- Upper 95% Confidence Limit ($CI_{\text{upper}}$): $97.5^{\text{th}}$ percentile ($P_{97.5}$).

### Relative Uncertainty Calculation
The relative half-width uncertainty percentage ($U_j$) is defined as:

$$U_j = \left( \frac{CI_{\text{upper}, j} - CI_{\text{lower}, j}}{2 \times AGB_{\text{plot}, j}} \right) \times 100\%$$

---

## 3. Wood Density ($\rho$) Sensitivity Perturbation Analysis

To assess inventory vulnerability to species wood density misidentification or anatomical variation, alternative perturbation scenarios $s \in \{-20\%, -10\%, 0\%, +10\%, +20\%\}$ are simulated:

$$\rho_{i}^{(s)} = \rho_i \times (1 + \delta_s), \quad \delta_s \in \{-0.20, -0.10, 0.00, +0.10, +0.20\}$$

$$AGB_j^{(s)} = \sum_{i=1}^{n_j} 0.0673 \times \left( \rho_i^{(s)} \times D_i^2 \times H_i \right)^{0.976}$$

$$\Delta AGB_j^{(s)} = AGB_j^{(s)} - AGB_j^{(\text{baseline})}$$

---

## 4. Verification Prioritization Engine (Core Research Framework)

The core contribution is a multi-indicator composite priority scoring engine synthesizing three indicators:
1. **Relative Uncertainty ($I_1$)**: $U_j$
2. **Data Quality Concerns ($I_2$)**: Measurement flags, missing data penalties, and DBH coefficient of variation:
   $$Q_j = 10 + 18 \cdot N_{\text{flags}} + 15 \cdot N_{\text{missing}} + 20 \cdot \min(2, CV_{DBH})$$
3. **Estimated Biomass Impact ($I_3$)**: Total plot biomass $AGB_{\text{plot}, j}$ (reflecting financial and carbon credit liability)

### Percentile-Based Score Normalization
Each raw indicator is transformed into a standardized percentile rank score $S_{k, j} \in [0, 100]$ across all $N=118$ plots:

$$S_{k, j} = \left( \frac{\text{Rank}(I_{k, j}) - 1}{N - 1} \right) \times 100, \quad k \in \{1, 2, 3\}$$

### Composite Verification Priority Score
The composite priority score $P_j$ is computed as the weighted sum (default equal weights $w_1 = w_2 = w_3 = \frac{1}{3}$):

$$P_j = \frac{S_{1, j} + S_{2, j} + S_{3, j}}{3}$$

### Stratified Priority Categorization
Plots are ranked in descending order of $P_j$ and classified into three tiers:
- **High Priority (Tier-1)**: Top tertile ($P_j \ge 66.0$). Mandated action: *On-Site Intensive LiDAR & Terrestrial Re-Measurement*.
- **Medium Priority (Tier-2)**: Middle tertile ($33.0 \le P_j < 66.0$). Mandated action: *SAR/UAV Multi-Spectral Remote Sensing Cross-Audit*.
- **Low Priority (Tier-3)**: Bottom tertile ($P_j < 33.0$). Mandated action: *Desk Audit & Automated Statistical Consistency Validation*.

---

## 5. Comparative Verification Simulation (Monte Carlo $N=10,000$)

Under a constrained monitoring budget $M = 24$ plots ($~20.3\%$ sampling intensity of $118$ plots), four strategies are evaluated:
1. **Proposed Composite Prioritization**: Top $M$ plots by composite score $P_j$.
2. **Uncertainty-Only Ranking**: Top $M$ plots by pure relative uncertainty $U_j$.
3. **Fixed-Interval Scheduling**: Systematic sampling every $k = \lfloor N / M \rfloor$ plots.
4. **Random Selection**: Monte Carlo simulation drawing $M$ plots uniformly at random $10,000$ times.

Capture count for random selection follows the hypergeometric distribution:
$$X \sim \text{Hypergeometric}(K, N-K, M)$$
Where $K$ is the total number of reference High-Priority plots.

> **Methodological Disclaimer**: This comparison quantifies **ranking consistency and capture efficiency relative to the composite multi-indicator reference ranking**, not independently verified empirical ground-truth error.
