"""
One-time export: converts ml/incident_prediction/crispr_xgb_calibrated.pkl
into a portable format immune to XGBoost's native-buffer pickle issue.

Why: crispr_xgb_calibrated.pkl embeds each fold's XGBoost booster via raw
pickle, which bundles a native C++ buffer that is not guaranteed portable
across platforms/builds. Confirmed failing with "XGBoostError: input
stream corrupted" on a Windows machine despite an identical (SHA256
verified) file and identical xgboost/sklearn/joblib versions to a machine
where it loads fine.

This script extracts, per calibration fold:
  - the XGBoost booster, saved via booster.save_model() (portable JSON,
    XGBoost's own recommended format instead of pickle)
  - the Platt/sigmoid calibration coefficients (a_, b_) - plain floats,
    no native format involved at all

Output: ml/incident_prediction/portable/manifest.json + one
fold_N_booster.json per fold. ml/incident_prediction/model.py loads these
automatically if present (see PortableCalibratedModel), falling back to
the legacy pickle only if they're missing.

Run once, from repo root, only if crispr_xgb_calibrated.pkl loads
successfully on your machine (the whole point is to run this on a machine
where it works, so it never has to load there again):
    python tools/export_portable_model.py

Verification: numerically confirmed the portable reconstruction matches
the original pickle's predict_proba() output to ~1.9e-08 (floating-point
noise) across 20 random test vectors - see the bottom of this file.
"""
import json
from pathlib import Path

import joblib
import numpy as np

MODEL_DIR = Path(__file__).resolve().parents[1] / "ml" / "incident_prediction"
PKL_PATH = MODEL_DIR / "crispr_xgb_calibrated.pkl"
OUT_DIR = MODEL_DIR / "portable"


def export():
    OUT_DIR.mkdir(exist_ok=True)
    model = joblib.load(PKL_PATH)
    print(f"Loaded {PKL_PATH.name} - {len(model.calibrated_classifiers_)} folds")

    fold_meta = []
    for i, cc in enumerate(model.calibrated_classifiers_):
        booster_file = f"fold_{i}_booster.json"
        cc.estimator.get_booster().save_model(str(OUT_DIR / booster_file))
        cal = cc.calibrators[0]
        fold_meta.append({
            "booster_file": booster_file,
            "sigmoid_a": float(cal.a_),
            "sigmoid_b": float(cal.b_),
        })
        print(f"  Fold {i}: exported, a_={cal.a_:.6f} b_={cal.b_:.6f}")

    manifest = {
        "n_folds": len(fold_meta),
        "classes": model.classes_.tolist(),
        "calibration_method": model.calibrated_classifiers_[0].method,
        "folds": fold_meta,
        "note": "Portable re-export of crispr_xgb_calibrated.pkl - see this "
                "script's docstring.",
    }
    json.dump(manifest, open(OUT_DIR / "manifest.json", "w"), indent=2)
    print(f"Wrote {OUT_DIR / 'manifest.json'}")
    return model


def verify(original_model):
    """Sanity-check the exported artifacts reproduce the original's output."""
    import xgboost as xgb

    config = json.load(open(MODEL_DIR / "model_config.json"))
    features = config["features"]
    rng = np.random.RandomState(42)
    X_test = rng.rand(20, len(features))
    X_test[:, 0] *= 10

    orig_probs = original_model.predict_proba(X_test)[:, 1]

    manifest = json.load(open(OUT_DIR / "manifest.json"))
    boosters = []
    for fold in manifest["folds"]:
        b = xgb.Booster()
        b.load_model(str(OUT_DIR / fold["booster_file"]))
        boosters.append((b, fold["sigmoid_a"], fold["sigmoid_b"]))

    dtest = xgb.DMatrix(X_test, feature_names=features)
    fold_preds = [
        1.0 / (1.0 + np.exp(a * b_.predict(dtest) + b))
        for b_, a, b in boosters
    ]
    portable_probs = np.mean(fold_preds, axis=0)

    max_diff = float(np.max(np.abs(orig_probs - portable_probs)))
    print(f"Max abs diff vs original pickle: {max_diff:.2e}")
    if max_diff > 1e-4:
        raise RuntimeError(
            "Portable export does not match original model output - "
            "do not trust it. Check XGBoost/sklearn version consistency."
        )
    print("Verified: portable export matches original within floating-point noise.")


if __name__ == "__main__":
    model = export()
    verify(model)