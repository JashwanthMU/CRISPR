"""Official CISA Known Exploited Vulnerabilities catalogue client."""

from __future__ import annotations

from datetime import datetime, timezone
from typing import Any

import httpx

from backend.connectors.nvd import CVE_PATTERN, ExternalVulnerabilityDataError


CISA_KEV_URL = "https://www.cisa.gov/sites/default/files/feeds/known_exploited_vulnerabilities.json"


class CISAKEVClient:
    def __init__(self, client: httpx.Client | None = None) -> None:
        self.client = client or httpx.Client(
            headers={"User-Agent": "CRISPR-risk-platform/1.0", "Accept": "application/json"},
            timeout=30.0,
        )

    def fetch_catalog(self) -> dict[str, Any]:
        try:
            response = self.client.get(CISA_KEV_URL)
            response.raise_for_status()
            document = response.json()
        except (httpx.HTTPError, ValueError) as error:
            raise ExternalVulnerabilityDataError(str(error)) from error
        records = {}
        for row in document.get("vulnerabilities", []):
            cve = str(row.get("cveID", "")).upper()
            if not CVE_PATTERN.fullmatch(cve):
                continue
            records[cve] = {
                "cve": cve,
                "vendor_project": row.get("vendorProject"),
                "product": row.get("product"),
                "vulnerability_name": row.get("vulnerabilityName"),
                "date_added": row.get("dateAdded"),
                "due_date": row.get("dueDate"),
                "required_action": row.get("requiredAction"),
                "known_ransomware_campaign_use": row.get("knownRansomwareCampaignUse"),
                "notes": row.get("notes"),
            }
        return {
            "catalog_version": document.get("catalogVersion"),
            "date_released": document.get("dateReleased"),
            "count": len(records),
            "items": records,
            "source": "CISA Known Exploited Vulnerabilities Catalog",
            "source_url": CISA_KEV_URL,
            "fetched_at": datetime.now(timezone.utc).isoformat(),
        }
