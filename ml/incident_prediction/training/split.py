import pandas as pd
from sklearn.model_selection import train_test_split
def main():
    print("Splitting data...")
    df = pd.read_csv("ml/incident_prediction/training/features_data.csv")
    X = df.drop(columns=["cve_id", "exploited"])
    y = df["exploited"]
    X_train, X_test, y_train, y_test = train_test_split(
        X, y, test_size=0.2, random_state=42, stratify=y
    )
    X_train.to_csv("ml/incident_prediction/training/X_train.csv", index=False)
    X_test.to_csv("ml/incident_prediction/training/X_test.csv", index=False)
    y_train.to_csv("ml/incident_prediction/training/y_train.csv", index=False)
    y_test.to_csv("ml/incident_prediction/training/y_test.csv", index=False)
    print("Data split.")

if __name__ == "__main__":
    main()
