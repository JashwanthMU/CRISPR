# Demo data provenance

`assets.json`, `bug_bounty.json`, `iam.json`, `siem_events.json`, `edr_events.json`
etc. are synthetic - built to tell a coherent NovaPay Financial Services story
for the demo, not pulled from a real environment.

`vulnerabilities.json` is a mix:
- Asset/finding metadata (asset_id, patch_age_days, source_name, etc.) is
  synthetic, same as above.
- CVE identifiers reference real, publicly disclosed vulnerabilities.
- `epss_score`, `epss_percentile`, `attack_vector`, `attack_complexity`,
  `privileges_required`, `user_interaction`, `scope`, `exploitability_score`,
  `impact_score`, and `published_date` are real values fetched from the
  public FIRST.org EPSS API and NVD API - not invented. These feed the
  XGBoost model (ml/incident_prediction/) so its likelihood output is
  computed on real vulnerability-intelligence signals, not placeholders.

Fetched using `tools/enrich_vulnerabilities.py` (one-time enrichment
utility, not part of the running application - see that file's docstring
to re-run it if the CVE list changes or scores need refreshing).