"""Declarative JSON/HTTPS connector for customer and vendor REST APIs."""

import os
from urllib.parse import urljoin, urlparse

import httpx

from backend.connectors.base import ConnectionResult, Connector, SyncPage


class GenericHTTPConnector(Connector):
    def __init__(self, config: dict, credentials: dict, client: httpx.Client | None = None):
        self.config = config
        self.credentials = credentials
        base_url = config["base_url"].rstrip("/") + "/"
        parsed = urlparse(base_url)
        insecure_allowed = os.getenv("ALLOW_INSECURE_CONNECTOR_HTTP", "false").lower() == "true"
        if parsed.scheme not in ({"https", "http"} if insecure_allowed else {"https"}):
            raise RuntimeError("Connector base_url must use HTTPS")
        if parsed.username or parsed.password or not parsed.hostname:
            raise RuntimeError("Connector base_url is invalid or contains embedded credentials")
        header = config.get("auth_header", "Authorization")
        prefix = config.get("auth_prefix", "Bearer")
        token = credentials.get("token", "")
        headers = {"Accept": "application/json", "User-Agent": "CRISPR-risk-platform/1.0"}
        if token:
            headers[header] = f"{prefix} {token}".strip()
        self.base_url = base_url
        self.client = client or httpx.Client(headers=headers, timeout=float(config.get("timeout_seconds", 20)))

    def _get(self, path: str, cursor: dict | None = None) -> tuple[list[dict], dict | None]:
        parsed_path = urlparse(path)
        if parsed_path.scheme or parsed_path.netloc:
            raise RuntimeError("Connector paths must be relative to base_url")
        params = dict(self.config.get("query", {}))
        cursor_name = self.config.get("cursor_parameter", "cursor")
        if cursor and cursor.get("value") is not None:
            params[cursor_name] = cursor["value"]
        response = self.client.get(urljoin(self.base_url, path.lstrip("/")), params=params)
        if response.status_code == 429:
            raise RuntimeError(f"Connector rate limited; retry-after={response.headers.get('Retry-After', 'unknown')}")
        response.raise_for_status()
        payload = response.json()
        items_field = self.config.get("items_field", "items")
        items = payload if isinstance(payload, list) else payload.get(items_field, [])
        if not isinstance(items, list) or any(not isinstance(item, dict) for item in items):
            raise RuntimeError(f"Connector response field {items_field!r} must be a list of objects")
        next_field = self.config.get("next_cursor_field", "next_cursor")
        next_value = payload.get(next_field) if isinstance(payload, dict) else None
        return items, ({"value": next_value} if next_value not in (None, "") else None)

    def validate_credentials(self) -> ConnectionResult:
        path = self.config.get("health_path") or self.config.get("events_path")
        if not path:
            return ConnectionResult(False, message="health_path or events_path is required")
        try:
            self._get(path)
            return ConnectionResult(True, account=urlparse(self.base_url).hostname,
                                    message="HTTPS endpoint and credentials verified")
        except (httpx.HTTPError, ValueError, RuntimeError) as error:
            raise RuntimeError(f"Connector verification failed: {error}") from error

    def fetch_assets(self, cursor: dict | None = None) -> SyncPage:
        path = self.config.get("assets_path")
        if not path:
            return SyncPage([])
        items, next_cursor = self._get(path, cursor)
        return SyncPage(items, next_cursor)

    def fetch_findings(self, cursor: dict | None = None) -> SyncPage:
        path = self.config.get("events_path")
        if not path:
            return SyncPage([])
        items, next_cursor = self._get(path, cursor)
        return SyncPage(items, next_cursor)
