"""Maps controls to compliance frameworks. Member 5."""

FRAMEWORK_CONTROLS = {
    "ISO_27001": {"MFA": "A.9.4", "Patching": "A.12.6", "Segmentation": "A.13.1", "EDR": "A.12.2", "Backup": "A.12.3"},
    "NIST_CSF": {"MFA": "PR.AC-7", "Patching": "PR.IP-12", "Segmentation": "PR.AC-5", "EDR": "DE.CM-4", "Backup": "PR.IP-4"},
    "CIS_CONTROLS": {"MFA": "CIS-6", "Patching": "CIS-7", "Segmentation": "CIS-12", "EDR": "CIS-10", "Backup": "CIS-11"},
    "RBI_CSF": {"MFA": "IAM-3", "Patching": "VM-2", "Segmentation": "NS-4", "EDR": "EP-1", "Backup": "BC-2"},
    "SEBI_CSCRF": {"MFA": "AC-2", "Patching": "CM-3", "Segmentation": "SC-7", "EDR": "SI-3", "Backup": "CP-9"},
}

COMPLIANCE_SCORES = {
    "ISO_27001": 76, "NIST_CSF": 82, "CIS_CONTROLS": 85, "RBI_CSF": 72, "SEBI_CSCRF": 81,
}

FRAMEWORK_LABELS = {
    "ISO_27001": "ISO 27001", "NIST_CSF": "NIST CSF", "CIS_CONTROLS": "CIS Controls",
    "RBI_CSF": "RBI CSF", "SEBI_CSCRF": "SEBI CSCRF",
}


def get_compliance_summary() -> list:
    return [
        {
            "framework": k, "label": FRAMEWORK_LABELS.get(k, k), "score": v,
            "controls": FRAMEWORK_CONTROLS[k],
            "status": "adequate" if v >= 80 else "needs_improvement" if v >= 70 else "critical",
        }
        for k, v in COMPLIANCE_SCORES.items()
    ]


def get_gaps() -> list:
    return [
        {"framework": "RBI_CSF", "control": "MFA", "control_ref": "IAM-3",
         "gap": "42% privileged accounts without MFA", "impact_inr": 4_860_000, "impact_lakh": 48.6, "priority": "HIGH"},
        {"framework": "NIST_CSF", "control": "Patching", "control_ref": "PR.IP-12",
         "gap": "21-day patch lag on critical CVE", "impact_inr": 3_100_000, "impact_lakh": 31.0, "priority": "HIGH"},
        {"framework": "ISO_27001", "control": "Segmentation", "control_ref": "A.13.1",
         "gap": "Payment environment not fully segmented", "impact_inr": 3_870_000, "impact_lakh": 38.7, "priority": "MEDIUM"},
        {"framework": "RBI_CSF", "control": "EDR", "control_ref": "EP-1",
         "gap": "EDR coverage incomplete on non-critical endpoints", "impact_inr": 2_500_000, "impact_lakh": 25.0, "priority": "MEDIUM"},
        {"framework": "SEBI_CSCRF", "control": "Backup", "control_ref": "CP-9",
         "gap": "Immutable backups not enforced for payment DB", "impact_inr": 900_000, "impact_lakh": 9.0, "priority": "LOW"},
    ]
