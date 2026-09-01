import numpy as np

def run_monte_carlo(assets_risk_data: list, num_simulations=10000, seed=42) -> dict:
    """
    10,000 deterministic seeded simulations for enterprise VaR.
    assets_risk_data: list of dicts with 'incident_probability' and 'loss_magnitude_inr'
    """
    np.random.seed(seed)
    
    # We will simulate the total loss for the enterprise
    # For each asset, an incident occurs with Bernoulli(p)
    # If it occurs, the loss is drawn from a log-normal distribution with mean = loss_magnitude
    
    total_losses = np.zeros(num_simulations)
    
    for asset in assets_risk_data:
        p = asset.get("incident_probability", asset.get("likelihood", 0.0))
        mean_loss = asset.get("loss_magnitude_inr", 0.0)
        
        if p > 0 and mean_loss > 0:
            # Simple assumption: lognormal loss where mean=mean_loss, std_dev = mean_loss * 0.5
            std_loss = mean_loss * 0.5
            # Convert to lognormal parameters
            var_loss = std_loss**2
            mu = np.log(mean_loss**2 / np.sqrt(var_loss + mean_loss**2))
            sigma = np.sqrt(np.log(var_loss / (mean_loss**2) + 1))
            
            occurrences = np.random.binomial(1, p, num_simulations)
            losses = np.random.lognormal(mu, sigma, num_simulations)
            total_losses += occurrences * losses

    mean_annual_loss = np.mean(total_losses)
    var_95 = np.percentile(total_losses, 95)
    var_99 = np.percentile(total_losses, 99)
    
    # Tail Value at Risk (Expected Shortfall) at 95%
    tail_losses = total_losses[total_losses >= var_95]
    tvar_95 = np.mean(tail_losses) if len(tail_losses) > 0 else 0
    
    return {
        "mean_annual_loss": round(mean_annual_loss),
        "var_95": round(var_95),
        "var_99": round(var_99),
        "tail_value_at_risk_95": round(tvar_95)
    }
