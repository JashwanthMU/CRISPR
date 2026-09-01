import sys
from pathlib import Path

# Add project root to path
sys.path.append(str(Path(__file__).parent))

from ml.incident_prediction.model import predict_incident

print("Testing Model Predictions:")
res = predict_incident(
    cvss=9.5,
    exploit_in_wild=True,
    patch_age_days=15,
    internet_facing=True,
    control_effectiveness=0.4,
    use_calibrated=True
)
print("Calibrated Output:")
print(res)

res_uncal = predict_incident(
    cvss=9.5,
    exploit_in_wild=True,
    patch_age_days=15,
    internet_facing=True,
    control_effectiveness=0.4,
    use_calibrated=False
)
print("Uncalibrated Output:")
print(res_uncal)
