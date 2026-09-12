from ai.assistant import query_engine


def test_drawer_presets_route_to_distinct_intents():
    prompts = {
        "Explain my highest-risk finding": "top_risk",
        "Show exposed assets": "exposed_assets",
        "Why did risk increase?": "risk_increase",
        "Summarize today's security activity": "security_activity",
    }

    assert {query_engine.route_intent(prompt) for prompt in prompts} == set(prompts.values())
    for prompt, expected in prompts.items():
        assert query_engine.route_intent(prompt) == expected


def test_exposed_asset_fallback_uses_current_inventory(monkeypatch):
    monkeypatch.setattr(
        query_engine,
        "load_assets",
        lambda organization_id: [
            {"asset_id": "A-1", "name": "Public API", "internet_facing": True},
            {"asset_id": "A-2", "name": "Internal DB", "internet_facing": False},
        ],
    )

    answer, data = query_engine._answer_exposed_assets(organization_id="org-1")

    assert "1 of 2 assets" in answer
    assert "Public API" in answer
    assert data["exposed_assets"][0]["asset_id"] == "A-1"


def test_general_security_fallbacks_are_unique_when_llm_is_offline(monkeypatch):
    monkeypatch.setattr(query_engine, "chat", lambda **kwargs: None)
    questions = ["What is phishing?", "Explain ransomware", "What is SQL injection?", "Explain CVSS"]

    answers = [query_engine._answer_general(question)[0] for question in questions]

    assert len(set(answers)) == len(questions)
    assert all("₹" not in answer for answer in answers)
    assert all(query_engine._answer_general(question)[2] == "template" for question in questions)
