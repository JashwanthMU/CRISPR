"""Backend tests opt into fixtures; the application defaults to live data."""

import os


os.environ.setdefault("CRISPR_DATA_MODE", "demo")
