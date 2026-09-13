"""Stable response envelopes for collection APIs.

Resource payloads remain extensible while ingestion schemas are evolving, but
the collection metadata and top-level shape are part of the public contract.
"""

from typing import Any

from pydantic import BaseModel, Field


class ErrorResponse(BaseModel):
    detail: str
    data_mode: str | None = None
    fallback_used: bool | None = None


class AssetCollectionResponse(BaseModel):
    total: int = Field(ge=0)
    limit: int = Field(ge=1)
    offset: int = Field(ge=0)
    assets: list[dict[str, Any]]


class FindingCollectionResponse(BaseModel):
    total: int = Field(ge=0)
    limit: int = Field(ge=1)
    offset: int = Field(ge=0)
    findings: list[dict[str, Any]]


class ThreatIntelCollectionResponse(BaseModel):
    observations: list[dict[str, Any]]
    count: int = Field(ge=0)
    source_count: int = Field(ge=0)
