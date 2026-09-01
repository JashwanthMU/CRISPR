import pandas as pd
def main():
    print("Extracting features...")
    df = pd.read_csv("ml/incident_prediction/training/prepared_data.csv")
    # Feature engineering
    df["risk_score"] = df["cvss"] * df["epss_score"]
    df.to_csv("ml/incident_prediction/training/features_data.csv", index=False)
    print("Features extracted.")

if __name__ == "__main__":
    main()
