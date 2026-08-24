"""CRISPR demo data seeder.

Run with: python backend/ingestion/seed.py
"""

import json
from pathlib import Path


DATA_DIR = Path(__file__).resolve().parents[2] / "data/demo"


def load_json(filename: str) -> list[dict]:
    with (DATA_DIR / filename).open(encoding="utf-8") as file:
        return json.load(file)


def seed_all() -> None:
    assets = load_json("assets.json")
    datasets = {
        "bug bounty findings": load_json("bug_bounty.json"),
        "vulnerabilities": load_json("vulnerabilities.json"),
        "XDR events": load_json("xdr_events.json"),
        "SIEM events": load_json("siem_events.json"),
        "IAM findings": load_json("iam.json"),
        "threat intel findings": load_json("threat_intel.json"),
    }
    summary = ", ".join(f"{len(items)} {name}" for name, items in datasets.items())
    print(f"Seeded: {len(assets)} assets, {summary}")


if __name__ == "__main__":
    seed_all()
