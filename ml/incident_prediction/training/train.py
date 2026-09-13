import pandas as pd
from xgboost import XGBClassifier
import joblib
def main():
    print("Training model...")
    X_train = pd.read_csv("ml/incident_prediction/training/X_train.csv")
    y_train = pd.read_csv("ml/incident_prediction/training/y_train.csv")
    model = XGBClassifier(max_depth=6, learning_rate=0.1, n_estimators=100)
    model.fit(X_train, y_train)
    joblib.dump(model, "ml/incident_prediction/training/model.pkl")
    print("Model trained.")

if __name__ == "__main__":
    main()
