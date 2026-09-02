import pandas as pd

FEATURES = [
    "cvss_score", "epss_score", "epss_percentile", "days_since_published",
    "severity_encoded", "is_cert_in", "attack_vector", "attack_complexity",
    "privileges_required", "user_interaction", "scope",
    "exploitability_score", "impact_score", "flag_rce", "flag_sqli",
    "flag_xss", "flag_buffer_overflow", "flag_priv_escalation", "flag_dos",
    "flag_dir_traversal",
]

def main():
    print("Extracting features...")
    df = pd.read_csv("ml/incident_prediction/training/prepared_data.csv")
    required = {"cve_id", "exploited", *FEATURES}
    missing = sorted(required - set(df.columns))
    if missing:
        raise ValueError(f"Prepared real-source data is missing: {', '.join(missing)}")
    df[["cve_id", *FEATURES, "exploited"]].to_csv(
        "ml/incident_prediction/training/features_data.csv", index=False
    )
    print("Features extracted.")

if __name__ == "__main__":
    main()
