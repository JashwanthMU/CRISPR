"""NVD CVE API 2.0 and FIRST EPSS enrichment for asset-mapped CVEs."""

from __future__ import annotations

import os
import re
import time
from datetime import datetime, timezone
from typing import Any

import httpx


NVD_API_URL = "https://services.nvd.nist.gov/rest/json/cves/2.0"
EPSS_API_URL = "https://api.first.org/data/v1/epss"
CVE_PATTERN = re.compile(r"^CVE-\d{4}-\d{4,}$", re.IGNORECASE)

AV_MAP = {"NETWORK": 0, "ADJACENT_NETWORK": 1, "ADJACENT": 1, "LOCAL": 2, "PHYSICAL": 3}
AC_MAP = {"LOW": 0, "HIGH": 1}
PR_MAP = {"NONE": 0, "LOW": 1, "HIGH": 2}
UI_MAP = {"NONE": 0, "REQUIRED": 1, "PASSIVE": 1, "ACTIVE": 1}
SCOPE_MAP = {"UNCHANGED": 0, "CHANGED": 1}
CWE_FLAG_MAP = {
    "CWE-78": "flag_rce", "CWE-94": "flag_rce", "CWE-77": "flag_rce",
    "CWE-502": "flag_rce", "CWE-89": "flag_sqli", "CWE-79": "flag_xss",
    "CWE-120": "flag_buffer_overflow", "CWE-121": "flag_buffer_overflow",
    "CWE-122": "flag_buffer_overflow", "CWE-787": "flag_buffer_overflow",
    "CWE-125": "flag_buffer_overflow", "CWE-269": "flag_priv_escalation",
    "CWE-284": "flag_priv_escalation", "CWE-863": "flag_priv_escalation",
    "CWE-862": "flag_priv_escalation", "CWE-400": "flag_dos",
    "CWE-401": "flag_dos", "CWE-22": "flag_dir_traversal",
    "CWE-23": "flag_dir_traversal",
}
ALL_FLAGS = tuple(sorted(set(CWE_FLAG_MAP.values())))


class ExternalVulnerabilityDataError(RuntimeError):
    pass


class NVDClient:
    def __init__(self, client: httpx.Client | None = None) -> None:
        self.api_key = os.getenv("NVD_API_KEY", "").strip()
        headers = {
            "User-Agent": os.getenv("NVD_USER_AGENT", "CRISPR-risk-platform/1.0"),
            "Accept": "application/json",
        }
        if self.api_key:
            headers["apiKey"] = self.api_key
        self.client = client or httpx.Client(headers=headers, timeout=30.0)
        configured_interval = os.getenv("NVD_REQUEST_INTERVAL_SECONDS", "").strip()
        self.request_interval_seconds = float(
            configured_interval or ("0.7" if self.api_key else "6.0")
        )
        self._last_nvd_request = 0.0

    def _get_json(
        self, url: str, params: dict[str, str], *, apply_nvd_throttle: bool = False
    ) -> dict[str, Any]:
        for attempt in range(4):
            try:
                if apply_nvd_throttle:
                    elapsed = time.monotonic() - self._last_nvd_request
                    if elapsed < self.request_interval_seconds:
                        time.sleep(self.request_interval_seconds - elapsed)
                response = self.client.get(url, params=params)
                if apply_nvd_throttle:
                    self._last_nvd_request = time.monotonic()
                if response.status_code == 429 or response.status_code >= 500:
                    if attempt == 3:
                        response.raise_for_status()
                    retry_after = response.headers.get("Retry-After")
                    time.sleep(float(retry_after) if retry_after else 2 ** attempt)
                    continue
                response.raise_for_status()
                return response.json()
            except (httpx.HTTPError, ValueError) as error:
                if attempt == 3:
                    raise ExternalVulnerabilityDataError(str(error)) from error
                time.sleep(2 ** attempt)
        raise ExternalVulnerabilityDataError("External vulnerability API request failed")

    def fetch_cve(self, cve_id: str) -> dict[str, Any]:
        cve_id = cve_id.upper()
        if not CVE_PATTERN.fullmatch(cve_id):
            raise ValueError(f"Invalid CVE identifier: {cve_id}")
        document = self._get_json(
            NVD_API_URL, {"cveId": cve_id}, apply_nvd_throttle=True
        )
        vulnerabilities = document.get("vulnerabilities", [])
        if len(vulnerabilities) != 1:
            raise ExternalVulnerabilityDataError(f"NVD returned no unique record for {cve_id}")
        return parse_nvd_cve(vulnerabilities[0]["cve"])

    def fetch_epss(self, cve_ids: list[str]) -> dict[str, dict[str, float]]:
        output: dict[str, dict[str, float]] = {}
        for start in range(0, len(cve_ids), 100):
            batch = [cve.upper() for cve in cve_ids[start:start + 100]]
            document = self._get_json(EPSS_API_URL, {"cve": ",".join(batch)})
            for row in document.get("data", []):
                output[row["cve"].upper()] = {
                    "epss_score": float(row["epss"]),
                    "epss_percentile": float(row["percentile"]),
                    "epss_date": row.get("date"),
                }
        return output


def _primary_metric(metrics: dict[str, list[dict]]) -> dict | None:
    for key in ("cvssMetricV31", "cvssMetricV30"):
        candidates = metrics.get(key, [])
        if candidates:
            return next((row for row in candidates if row.get("type") == "Primary"), candidates[0])
    return None


def _english(rows: list[dict]) -> str:
    return next((row.get("value", "") for row in rows if row.get("lang") == "en"), "")


def parse_nvd_cve(cve: dict[str, Any]) -> dict[str, Any]:
    """Normalize authoritative NVD fields without inventing missing metrics."""
    cve_id = str(cve.get("id", "")).upper()
    if not CVE_PATTERN.fullmatch(cve_id):
        raise ExternalVulnerabilityDataError("Malformed CVE record returned by NVD")
    weaknesses = sorted({
        item.get("value")
        for weakness in cve.get("weaknesses", [])
        for item in weakness.get("description", [])
        if item.get("value", "").startswith("CWE-")
    })
    flags = {name: 0 for name in ALL_FLAGS}
    for cwe_id in weaknesses:
        if cwe_id in CWE_FLAG_MAP:
            flags[CWE_FLAG_MAP[cwe_id]] = 1

    result: dict[str, Any] = {
        "cve": cve_id,
        "title": f"{cve_id}: {_english(cve.get('descriptions', []))[:180]}",
        "description": _english(cve.get("descriptions", [])),
        "published_date": str(cve.get("published", ""))[:10] or None,
        "nvd_last_modified": cve.get("lastModified"),
        "vuln_status": cve.get("vulnStatus"),
        "cwe_ids": weaknesses,
        "references": [row.get("url") for row in cve.get("references", []) if row.get("url")],
        "exploited_in_wild": bool(cve.get("cisaExploitAdd")),
        "nvd_source_identifier": cve.get("sourceIdentifier"),
        "nvd_url": f"https://nvd.nist.gov/vuln/detail/{cve_id}",
        "nvd_retrieved_at": datetime.now(timezone.utc).isoformat(),
        **flags,
    }
    metric = _primary_metric(cve.get("metrics", {}))
    if metric:
        data = metric.get("cvssData", {})
        result.update({
            "cvss": data.get("baseScore"),
            "severity": str(data.get("baseSeverity", metric.get("baseSeverity", ""))).upper(),
            "cvss_vector": data.get("vectorString"),
            "attack_vector": AV_MAP.get(data.get("attackVector"), -1),
            "attack_complexity": AC_MAP.get(data.get("attackComplexity"), -1),
            "privileges_required": PR_MAP.get(data.get("privilegesRequired"), -1),
            "user_interaction": UI_MAP.get(data.get("userInteraction"), -1),
            "scope": SCOPE_MAP.get(data.get("scope"), -1),
            "exploitability_score": metric.get("exploitabilityScore"),
            "impact_score": metric.get("impactScore"),
            "cvss_source": metric.get("source"),
            "cvss_type": metric.get("type"),
        })
    return result
