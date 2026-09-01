import pandas as pd
import numpy as np
def main():
    print("Acquiring data from NVD and EPSS...")
    # Mock data acquisition
    df = pd.DataFrame({
        "cve_id": [f"CVE-2023-{i}" for i in range(1000)],
        "cvss": np.random.uniform(3.0, 10.0, 1000),
        "epss_score": np.random.uniform(0.01, 0.99, 1000),
        "patch_age_days": np.random.randint(0, 365, 1000),
        "attack_vector": np.random.choice([0, 1, 2, 3], 1000),
        "exploited": np.random.choice([0, 1], 1000, p=[0.8, 0.2])
    })
    df.to_csv("ml/incident_prediction/training/raw_data.csv", index=False)
    print("Data acquired.")

if __name__ == "__main__":
    main()
