# Control-to-Risk Mappings

CRISPR uses a versioned telemetry model to distribute risk weightings across different security domains. 

## V1 Telemetry Weightings
Configured in `backend/risk_engine/incident_model.py`. The overall incident probability is a weighted sum of normalized telemetry scores:
- **Vulnerability Risk (XGBoost)**: `35%`
- **IAM Risk (MFA, permissions)**: `25%`
- **SIEM / EDR (Active threats)**: `20%`
- **CSPM / Exposure (Cloud posture)**: `20%`

## Framework Alignments
Controls map functionally to risk reduction equations:
- **MFA / IAM**: Directly reduces the IAM telemetry risk component and scales the overall control effectiveness.
- **EDR / SIEM**: Directly mitigates threat actor success rate, reducing the SIEM/EDR component.
- **Patch Management**: Reduces vulnerability patch age, heavily influencing the XGBoost prediction.
