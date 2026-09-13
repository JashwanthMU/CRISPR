import pandas as pd
import joblib
from sklearn.metrics import roc_auc_score, brier_score_loss
def main():
    print("Evaluating model...")
    X_test = pd.read_csv("ml/incident_prediction/training/X_test.csv")
    y_test = pd.read_csv("ml/incident_prediction/training/y_test.csv")
    calibrated = joblib.load("ml/incident_prediction/training/calibrated_model.pkl")
    preds = calibrated.predict_proba(X_test)[:, 1]
    auc = roc_auc_score(y_test, preds)
    brier = brier_score_loss(y_test, preds)
    print(f"ROC-AUC: {auc:.4f}")
    print(f"Brier Score: {brier:.4f}")

if __name__ == "__main__":
    main()
