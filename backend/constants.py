INDIA_PENALTIES = {
    "cert_in_non_reporting": 500_000,
    "rbi_non_reporting":      500_000,
    "rbi_major_violation":  10_000_000,
    "sebi_non_compliance":    100_000,
    "dpdp_breach":        250_000_000,
}

DOWNTIME_COST_PER_HOUR = {
    "payment_server": 1_000_000,
    "database":         700_000,
    "api_gateway":      800_000,
    "web_app":          200_000,
    "endpoint":          50_000,
}

FRAMEWORKS = ["ISO_27001", "NIST_CSF", "CIS_CONTROLS", "RBI_CSF", "SEBI_CSCRF"]