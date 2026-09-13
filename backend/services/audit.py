"""Durable security and platform audit events."""

from uuid import UUID, uuid4

from psycopg.types.json import Jsonb

from backend.database.connection import get_connection


def record_audit_event(
    organization_id: UUID | str | None,
    actor_id: UUID | str | None,
    action: str,
    resource_type: str,
    resource_id: str | None = None,
    details: dict | None = None,
    ip_address: str | None = None,
) -> None:
    with get_connection() as connection:
        connection.execute(
            """
            INSERT INTO audit_events (
                audit_event_id, organization_id, actor_id, action,
                resource_type, resource_id, details, ip_address
            ) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
            """,
            (
                uuid4(), organization_id, actor_id, action, resource_type,
                resource_id, Jsonb(details or {}), ip_address,
            ),
        )
