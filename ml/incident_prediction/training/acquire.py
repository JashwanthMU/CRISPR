"""Build a training table from explicitly supplied public-source exports.

There is deliberately no random/synthetic fallback. The command records the
SHA-256 digest of every source file so a training run can be audited.
"""

import argparse
import hashlib
import json
from datetime import datetime, timezone
from pathlib import Path

import pandas as pd


MODEL_FEATURES = {
    "cvss_score", "epss_score", "epss_percentile", "days_since_published",
    "severity_encoded", "is_cert_in", "attack_vector", "attack_complexity",
    "privileges_required", "user_interaction", "scope",
    "exploitability_score", "impact_score", "flag_rce", "flag_sqli",
    "flag_xss", "flag_buffer_overflow", "flag_priv_escalation", "flag_dos",
    "flag_dir_traversal",
}


def _sha256(path: Path) -> str:
    digest = hashlib.sha256()
    with path.open("rb") as source:
        for chunk in iter(lambda: source.read(1024 * 1024), b""):
            digest.update(chunk)
    return digest.hexdigest()


def _required_columns(frame: pd.DataFrame, required: set[str], source: str) -> None:
    missing = sorted(required - set(frame.columns))
    if missing:
        raise ValueError(f"{source} is missing required columns: {', '.join(missing)}")


def build_dataset(nvd_path: Path, epss_path: Path, kev_path: Path) -> pd.DataFrame:
    nvd = pd.read_csv(nvd_path, low_memory=False)
    nvd_required = {"cve_id", *(MODEL_FEATURES - {"epss_score", "epss_percentile"})}
    _required_columns(nvd, nvd_required, "normalized NVD/CERT-In CSV")

    epss = pd.read_csv(epss_path, comment="#", compression="infer")
    _required_columns(epss, {"cve", "epss", "percentile"}, "EPSS CSV")
    epss = epss.rename(columns={
        "cve": "cve_id",
        "epss": "epss_score",
        "percentile": "epss_percentile",
    })

    with kev_path.open(encoding="utf-8") as source:
        kev_document = json.load(source)
    kev_ids = {
        row["cveID"]
        for row in kev_document.get("vulnerabilities", [])
        if row.get("cveID")
    }
    if not kev_ids:
        raise ValueError("CISA KEV JSON contains no vulnerabilities[].cveID values")

    dataset = nvd.merge(
        epss[["cve_id", "epss_score", "epss_percentile"]],
        on="cve_id",
        how="inner",
        validate="one_to_one",
    )
    dataset["exploited"] = dataset["cve_id"].isin(kev_ids).astype(int)
    if dataset.empty or dataset["exploited"].sum() == 0:
        raise ValueError("Joined data has no rows or no positive KEV labels")
    return dataset


def main() -> None:
    parser = argparse.ArgumentParser()
    parser.add_argument("--nvd", type=Path, required=True)
    parser.add_argument("--epss", type=Path, required=True)
    parser.add_argument("--kev", type=Path, required=True)
    parser.add_argument("--output", type=Path, required=True)
    args = parser.parse_args()

    for path in (args.nvd, args.epss, args.kev):
        if not path.is_file():
            raise FileNotFoundError(path)

    dataset = build_dataset(args.nvd, args.epss, args.kev)
    args.output.parent.mkdir(parents=True, exist_ok=True)
    dataset.to_csv(args.output, index=False)
    manifest = {
        "generated_at": datetime.now(timezone.utc).isoformat(),
        "rows": len(dataset),
        "positive_kev_rows": int(dataset["exploited"].sum()),
        "inputs": {
            "nvd": {"path": str(args.nvd), "sha256": _sha256(args.nvd)},
            "epss": {"path": str(args.epss), "sha256": _sha256(args.epss)},
            "cisa_kev": {"path": str(args.kev), "sha256": _sha256(args.kev)},
        },
        "synthetic_rows": 0,
    }
    manifest_path = args.output.with_suffix(args.output.suffix + ".manifest.json")
    manifest_path.write_text(json.dumps(manifest, indent=2), encoding="utf-8")
    print(f"Wrote {len(dataset):,} real-source rows to {args.output}")
    print(f"Wrote provenance manifest to {manifest_path}")


if __name__ == "__main__":
    main()
