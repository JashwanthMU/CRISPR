from backend.connectors.cisa_kev import CISAKEVClient, CISA_KEV_URL


class Response:
    def raise_for_status(self):
        return None

    def json(self):
        return {
            "catalogVersion": "2026.09.11",
            "dateReleased": "2026-09-11T00:00:00Z",
            "vulnerabilities": [{
                "cveID": "CVE-2024-12345",
                "vendorProject": "Vendor",
                "product": "Product",
                "vulnerabilityName": "Example",
                "dateAdded": "2026-09-10",
                "dueDate": "2026-10-01",
                "requiredAction": "Apply mitigation",
                "knownRansomwareCampaignUse": "Known",
            }],
        }


class Client:
    def get(self, url):
        assert url == CISA_KEV_URL
        return Response()


def test_cisa_kev_catalog_is_normalized_with_source_provenance():
    result = CISAKEVClient(Client()).fetch_catalog()
    assert result["count"] == 1
    assert result["items"]["CVE-2024-12345"]["known_ransomware_campaign_use"] == "Known"
    assert result["source_url"] == CISA_KEV_URL
