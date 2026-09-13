import joblib
import json
import shutil
def main():
    print("Exporting model artifacts...")
    # In a real pipeline, we'd convert the model to a portable format.
    # Here we just copy the artifact over for demonstration.
    try:
        shutil.copy("ml/incident_prediction/training/calibrated_model.pkl", "ml/incident_prediction/portable/calibrated_model.pkl")
        print("Model exported.")
    except Exception as e:
        print(f"Export skipped due to missing directory: {e}")

if __name__ == "__main__":
    main()
