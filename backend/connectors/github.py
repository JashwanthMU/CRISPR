"""GitHub REST connector with explicit pagination and rate-limit errors."""

import json
from urllib.error import HTTPError, URLError
from urllib.parse import urlencode
from urllib.request import Request, urlopen

from backend.connectors.base import ConnectionResult, Connector, SyncPage


class GitHubConnector(Connector):
    def __init__(self, token: str, organization: str | None = None, api_url: str = "https://api.github.com"):
        self.token = token
        self.organization = organization
        self.api_url = api_url.rstrip("/")

    def _get(self, path: str, params: dict | None = None) -> tuple[object, dict]:
        url = f"{self.api_url}{path}"
        if params:
            url += "?" + urlencode(params)
        request = Request(url, headers={
            "Accept": "application/vnd.github+json",
            "Authorization": f"Bearer {self.token}",
            "X-GitHub-Api-Version": "2022-11-28",
            "User-Agent": "CRISPR-risk-platform/1.0",
        })
        try:
            with urlopen(request, timeout=20) as response:
                return json.load(response), dict(response.headers.items())
        except HTTPError as error:
            remaining = error.headers.get("X-RateLimit-Remaining")
            message = f"GitHub API returned HTTP {error.code}"
            if error.code == 403 and remaining == "0":
                message += f"; rate limit resets at {error.headers.get('X-RateLimit-Reset', 'unknown')}"
            raise RuntimeError(message) from error
        except URLError as error:
            raise RuntimeError(f"GitHub API unavailable: {error.reason}") from error

    def validate_credentials(self) -> ConnectionResult:
        user, _ = self._get("/user")
        if not isinstance(user, dict) or not user.get("login"):
            return ConnectionResult(False, message="GitHub returned an invalid identity response")
        return ConnectionResult(True, account=user["login"], message="Credentials verified with GitHub")

    def fetch_assets(self, cursor: dict | None = None) -> SyncPage:
        page = int((cursor or {}).get("repository_page", 1))
        path = f"/orgs/{self.organization}/repos" if self.organization else "/user/repos"
        items, _ = self._get(path, {"per_page": 100, "page": page, "sort": "updated"})
        if not isinstance(items, list):
            raise RuntimeError("GitHub repository response was not a list")
        return SyncPage(items, {"repository_page": page + 1} if len(items) == 100 else None)

    def fetch_findings(self, cursor: dict | None = None) -> SyncPage:
        # Dependabot alerts are fetched per repository by the worker because this
        # endpoint needs the repository owner/name and may be disabled per repo.
        return SyncPage([])

    def fetch_dependabot_alerts(self, full_name: str, page: int = 1) -> SyncPage:
        items, _ = self._get(
            f"/repos/{full_name}/dependabot/alerts", {"per_page": 100, "page": page, "state": "open"}
        )
        if not isinstance(items, list):
            raise RuntimeError("GitHub Dependabot response was not a list")
        return SyncPage(items, {"page": page + 1} if len(items) == 100 else None)
