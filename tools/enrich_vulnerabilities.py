"""
Enrich data/demo/vulnerabilities.json with real EPSS scores and NVD CVSS
vector sub-metrics, so the XGBoost model gets real values for the features
it was trained on instead of placeholder defaults.

Run this from the repo root:
    python scripts/enrich_vulnerabilities.py

Requires internet access (calls api.first.org and services.nvd.nist.gov).
Safe to re-run - it overwrites the enrichment fields each time, so scores
stay current.
"""
import json
import time
import urllib.request
from pathlib import Path

VULNS_PATH = Path(__file__).resolve().parents[1] / "data" / "demo" / "vulnerabilities.json"

# CVSS v3 vector component encodings - match whatever encoding the training
# notebook used. These are the common numeric encodings; verify against
# your training feature-engineering code before trusting them blindly.
AV_MAP = {"NETWORK": 0, "ADJACENT_NETWORK": 1, "LOCAL": 2, "PHYSICAL": 3}
AC_MAP = {"LOW": 0, "HIGH": 1}
PR_MAP = {"NONE": 0, "LOW": 1, "HIGH": 2}
UI_MAP = {"NONE": 0, "REQUIRED": 1}
SCOPE_MAP = {"UNCHANGED": 0, "CHANGED": 1}


def fetch_epss(cve_ids: list[str]) -> dict:
    """Real EPSS scores from FIRST.org's public API."""
    joined = ",".join(cve_ids)
    url = f"https://api.first.org/data/v1/epss?cve={joined}"
    with urllib.request.urlopen(url, timeout=15) as resp:
        data = json.load(resp)
    return {row["cve"]: row for row in data.get("data", [])}


def fetch_nvd(cve_id: str) -> dict | None:
    """Real CVSS v3 vector + exploitability/impact scores from NVD."""
    url = f"https://services.nvd.nist.gov/rest/json/cves/2.0?cveId={cve_id}"
    try:
        with urllib.request.urlopen(url, timeout=15) as resp:
            data = json.load(resp)
        vuln = data["vulnerabilities"][0]["cve"]
        metrics = vuln.get("metrics", {})
        cvss_key = next((k for k in ("cvssMetricV31", "cvssMetricV30") if k in metrics), None)
        if not cvss_key:
            return None
        m = metrics[cvss_key][0]
        cvss_data = m["cvssData"]
        published = vuln.get("published", "")[:10]
        return {
            "attack_vector": AV_MAP.get(cvss_data.get("attackVector"), -1),
            "attack_complexity": AC_MAP.get(cvss_data.get("attackComplexity"), -1),
            "privileges_required": PR_MAP.get(cvss_data.get("privilegesRequired"), -1),
            "user_interaction": UI_MAP.get(cvss_data.get("userInteraction"), -1),
            "scope": SCOPE_MAP.get(cvss_data.get("scope"), -1),
            "exploitability_score": m.get("exploitabilityScore", 0.0),
            "impact_score": m.get("impactScore", 0.0),
            "published_date": published,
        }
    except Exception as e:
        print(f"  NVD lookup failed for {cve_id}: {e}")
        return None


def main():
    findings = json.load(open(VULNS_PATH))
    cve_ids = [f["cve"] for f in findings if f.get("cve")]

    print(f"Fetching EPSS scores for {len(cve_ids)} CVEs...")
    epss_data = fetch_epss(cve_ids)

    for f in findings:
        cve = f.get("cve")
        if not cve:
            continue

        epss_row = epss_data.get(cve)
        if epss_row:
            f["epss_score"] = float(epss_row["epss"])
            f["epss_percentile"] = float(epss_row["percentile"])
        else:
            print(f"  No EPSS data found for {cve}")

        print(f"Fetching NVD data for {cve}...")
        nvd_row = fetch_nvd(cve)
        if nvd_row:
            f.update(nvd_row)
        time.sleep(6)  # NVD's public rate limit is strict without an API key

    json.dump(findings, open(VULNS_PATH, "w"), indent=2)
    print(f"\nDone. Wrote enriched data to {VULNS_PATH}")


if __name__ == "__main__":
    main()