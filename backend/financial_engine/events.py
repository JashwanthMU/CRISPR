"""Evidence-supplied annual business-event loss simulation.

This engine never derives event frequency from a CVE classifier. Shared shock
groups explicitly model simultaneous incidents; their probabilities must match.
"""

from typing import Literal

import numpy as np
from pydantic import BaseModel, ConfigDict, Field, model_validator


class RiskEvent(BaseModel):
    model_config = ConfigDict(extra="forbid", allow_inf_nan=False)

    event_id: str = Field(min_length=1, max_length=120)
    category: Literal["ransomware", "data_breach", "service_outage", "fraud", "other"]
    annual_probability: float = Field(ge=0, le=1)
    mean_loss_inr: float = Field(ge=0, le=1e15)
    loss_coefficient_of_variation: float = Field(ge=0, le=10)
    frequency_evidence: str = Field(min_length=3, max_length=2000)
    loss_evidence: str = Field(min_length=3, max_length=2000)
    shock_group: str | None = Field(default=None, min_length=1, max_length=120)
    control_probability_reduction: float = Field(default=0, ge=0, le=1)
    control_evidence: str | None = Field(default=None, min_length=3, max_length=2000)

    @model_validator(mode="after")
    def evidence_required(self):
        if self.control_probability_reduction and not self.control_evidence:
            raise ValueError("Nonzero control effects require control_evidence")
        return self


class EventPortfolio(BaseModel):
    model_config = ConfigDict(extra="forbid")

    events: list[RiskEvent] = Field(min_length=1, max_length=100)
    iterations: int = Field(default=10000, ge=1000, le=100000)
    seed: int = Field(default=42, ge=0, le=2**32 - 1)

    @model_validator(mode="after")
    def validate_groups(self):
        if len({event.event_id for event in self.events}) != len(self.events):
            raise ValueError("Duplicate event_id would double-count losses")
        groups = {}
        for event in self.events:
            if event.shock_group:
                signature = (event.annual_probability, event.control_probability_reduction)
                if event.shock_group in groups and groups[event.shock_group] != signature:
                    raise ValueError("Shared shock events require identical probability and control effect")
                groups[event.shock_group] = signature
        return self


def simulate_events(portfolio: EventPortfolio) -> dict:
    rng = np.random.default_rng(portfolio.seed)
    n = portfolio.iterations
    baseline = np.zeros(n)
    residual = np.zeros(n)
    shocks = {}
    event_results = []
    for event in sorted(portfolio.events, key=lambda row: row.event_id):
        key = ("group", event.shock_group) if event.shock_group else ("event", event.event_id)
        if key not in shocks:
            shocks[key] = rng.random(n)
        uniforms = shocks[key]
        sigma = np.sqrt(np.log1p(event.loss_coefficient_of_variation**2))
        if event.loss_coefficient_of_variation == 0:
            loss = np.full(n, event.mean_loss_inr)
        elif event.mean_loss_inr:
            loss = rng.lognormal(np.log(event.mean_loss_inr) - sigma**2 / 2, sigma, n)
        else:
            loss = np.zeros(n)
        p = event.annual_probability
        residual_p = p * (1 - event.control_probability_reduction)
        baseline += (uniforms < p) * loss
        residual += (uniforms < residual_p) * loss
        event_results.append({
            **event.model_dump(),
            "baseline_eal_inr": p * event.mean_loss_inr,
            "residual_eal_inr": residual_p * event.mean_loss_inr,
            "residual_probability": residual_p,
            "eal_sensitivity_to_probability": event.mean_loss_inr,
            "eal_sensitivity_to_mean_loss": residual_p,
        })

    def summary(values):
        mean = float(values.mean())
        standard_error = float(values.std(ddof=1) / np.sqrt(n))
        # Fixed-size worst 5% avoids including every zero when VaR equals zero.
        tail_size = max(1, int(np.ceil(n * 0.05)))
        return {
            "simulated_mean_inr": mean,
            "var_95_inr": float(np.quantile(values, 0.95)),
            "var_99_inr": float(np.quantile(values, 0.99)),
            "expected_shortfall_95_inr": float(np.partition(values, n - tail_size)[-tail_size:].mean()),
            "mean_mc_standard_error_inr": standard_error,
            "mean_mc_interval_95_inr": [max(0, mean - 1.96 * standard_error), mean + 1.96 * standard_error],
            "nonzero_simulations": int(np.count_nonzero(values)),
            "convergence": [{"iterations": size, "mean_inr": float(values[:size].mean())}
                            for size in (n // 4, n // 2, n)],
        }

    return {
        "model": "annual-business-events-v1",
        "baseline": {"analytic_eal_inr": sum(e["baseline_eal_inr"] for e in event_results), **summary(baseline)},
        "residual": {"analytic_eal_inr": sum(e["residual_eal_inr"] for e in event_results), **summary(residual)},
        "events": event_results,
        "simulation": {"iterations": n, "seed": portfolio.seed},
        "assumptions": [
            "At most one incident per business event per year (Bernoulli)",
            "Shared shock groups have simultaneous occurrences; groups are independent",
            "Conditional loss severities are independent lognormal draws",
            "Event losses are additive; submit disjoint loss components to avoid double-counting",
            "Control effects reduce occurrence probability, not conditional loss severity",
            "Intervals measure Monte Carlo sampling error, not evidence uncertainty; sparse events need more samples",
        ],
        "formulas": {"eal": "annual_probability * mean_loss_inr",
                     "residual_probability": "annual_probability * (1 - control_probability_reduction)"},
    }
