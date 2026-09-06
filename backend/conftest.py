"""Backend tests opt into fixtures; the application defaults to live data."""

import os


# Pytest is a separate process from the application server. The deterministic
# engine tests intentionally exercise labelled fixtures, so their mode must not
# depend on the container's production CRISPR_DATA_MODE value. Tests that verify
# the live boundary override this value explicitly with monkeypatch.
os.environ["CRISPR_DATA_MODE"] = "demo"
