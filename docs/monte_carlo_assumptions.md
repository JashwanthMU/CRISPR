# Monte Carlo VaR Assumptions

CRISPR implements a Monte Carlo simulation engine to compute enterprise-level Value at Risk (VaR) and Tail VaR.

## Simulation Parameters
- **Iterations**: 10,000 deterministic seeded simulations per run.
- **Seed**: Fixed random seed (`np.random.seed(42)`) for reproducible enterprise metrics.

## Statistical Distributions
- **Event Occurrence (Frequency)**: Modeled using a `Binomial(1, p)` distribution, where `p` is the computed incident probability for a given asset.
- **Loss Magnitude**: Modeled using a `Lognormal` distribution to accurately represent the long-tail nature of cyber losses.
  - $\mu$ and $\sigma$ parameters are derived using the Method of Moments from the deterministic expected loss and an assumed standard deviation ($\sigma_{	ext{loss}} = 0.5 	imes 	ext{mean\_loss}$).

## Financial Metrics Computed
1. **Mean Annual Loss**: The average loss across all 10,000 simulated years.
2. **VaR 95 (Value at Risk)**: The 95th percentile of the simulated loss distribution. (1-in-20 year loss event).
3. **VaR 99**: The 99th percentile of the simulated loss distribution. (1-in-100 year loss event).
4. **Tail VaR 95 (Expected Shortfall)**: The mathematical average of all losses that strictly exceed the VaR 95 threshold.
