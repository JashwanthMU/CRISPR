import pandas as pd
import joblib
from sklearn.calibration import CalibratedClassifierCV
def main():
    print("Calibrating model...")
    X_train = pd.read_csv("ml/incident_prediction/training/X_train.csv")
    y_train = pd.read_csv("ml/incident_prediction/training/y_train.csv")
    model = joblib.load("ml/incident_prediction/training/model.pkl")
    calibrated = CalibratedClassifierCV(model, method='sigmoid', cv="prefit")
    calibrated.fit(X_train, y_train)
    joblib.dump(calibrated, "ml/incident_prediction/training/calibrated_model.pkl")
    print("Model calibrated.")

if __name__ == "__main__":
    main()
