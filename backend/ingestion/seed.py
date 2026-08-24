"""CRISPR demo data seeder.

Run with: python backend/ingestion/seed.py
"""

import sys
from pathlib import Path


PROJECT_ROOT = Path(__file__).resolve().parents[2]
if str(PROJECT_ROOT) not in sys.path:
    sys.path.insert(0, str(PROJECT_ROOT))

from backend.database.connection import init_database
from backend.ingestion.store import refresh_demo_sources


def seed_all() -> None:
    init_database()
    counts = refresh_demo_sources()
    summary = ", ".join(f"{count} {source}" for source, count in counts.items())
    print(f"Seeded PostgreSQL: {summary}")


if __name__ == "__main__":
    seed_all()
