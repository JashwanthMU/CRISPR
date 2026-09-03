"""Contracts shared by real external platform connectors."""

from abc import ABC, abstractmethod
from dataclasses import dataclass, field
from typing import Any

from backend.data_access import load_findings


@dataclass(frozen=True)
class ConnectionResult:
    ok: bool
    account: str | None = None
    message: str = ""


@dataclass(frozen=True)
class SyncPage:
    items: list[dict[str, Any]] = field(default_factory=list)
    next_cursor: dict[str, Any] | None = None


class Connector(ABC):
    @abstractmethod
    def validate_credentials(self) -> ConnectionResult: ...

    @abstractmethod
    def fetch_assets(self, cursor: dict | None = None) -> SyncPage: ...

    @abstractmethod
    def fetch_findings(self, cursor: dict | None = None) -> SyncPage: ...

    def healthcheck(self) -> ConnectionResult:
        return self.validate_credentials()


# Compatibility for the original database-backed source adapters.
def fetch_source(source_type: str, filename: str = "") -> list[dict]:
    return load_findings(source_type)


def source_info(name: str, source_type: str, filename: str = "") -> dict:
    findings = fetch_source(source_type)
    return {"name": name, "status": "connected", "count": len(findings)}
