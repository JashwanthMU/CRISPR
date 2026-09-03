from backend.services.risk_pipeline import _hash_inputs


def test_canonical_input_hash_is_order_independent_for_object_keys():
    left = {"assets": [{"asset_id": "A1", "payload": {"name": "API", "value": 2}}], "findings": []}
    right = {"findings": [], "assets": [{"payload": {"value": 2, "name": "API"}, "asset_id": "A1"}]}
    assert _hash_inputs(left) == _hash_inputs(right)


def test_canonical_input_hash_changes_when_financial_input_changes():
    before = {"assets": [{"asset_id": "A1", "payload": {"value_inr": 1_000_000}}], "findings": []}
    after = {"assets": [{"asset_id": "A1", "payload": {"value_inr": 2_000_000}}], "findings": []}
    assert _hash_inputs(before) != _hash_inputs(after)
