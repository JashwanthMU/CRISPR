from cryptography.fernet import Fernet

from backend.connectors.github import GitHubConnector
from backend.security.secrets import decrypt_credentials, encrypt_credentials


def test_credentials_are_encrypted(monkeypatch):
    monkeypatch.setenv("INTEGRATION_ENCRYPTION_KEY", Fernet.generate_key().decode())
    ciphertext = encrypt_credentials({"token": "github-secret"})
    assert b"github-secret" not in ciphertext
    assert decrypt_credentials(ciphertext) == {"token": "github-secret"}


def test_github_connector_contract_and_pagination(monkeypatch):
    connector = GitHubConnector("token")
    monkeypatch.setattr(connector, "_get", lambda path, params=None: (
        ({"login": "octocat"} if path == "/user" else [{"id": i} for i in range(100)]), {}
    ))
    verification = connector.validate_credentials()
    assert verification.ok and verification.account == "octocat"
    page = connector.fetch_assets()
    assert len(page.items) == 100
    assert page.next_cursor == {"repository_page": 2}
