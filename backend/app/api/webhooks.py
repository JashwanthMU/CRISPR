"""HMAC-authenticated callbacks for push-based generic integrations."""

import hashlib
import hmac
import json
from uuid import UUID

from fastapi import APIRouter, Header, HTTPException, Request, status
from psycopg.types.json import Jsonb

from backend.database.connection import get_connection
from backend.security.secrets import decrypt_credentials

router = APIRouter()


@router.post("/{integration_id}", status_code=status.HTTP_202_ACCEPTED)
async def receive(
    integration_id: UUID,
    request: Request,
    x_crispr_delivery: str = Header(min_length=1, max_length=255),
    x_crispr_signature: str = Header(min_length=64, max_length=71),
):
    body = await request.body()
    with get_connection() as db:
        integration = db.execute(
            """SELECT integration_id,organization_id,name,provider,config,encrypted_credentials,enabled
               FROM integrations WHERE integration_id=%s""", (integration_id,),
        ).fetchone()
    if not integration or not integration["enabled"] or integration["provider"] != "generic_http":
        raise HTTPException(status_code=404, detail="Enabled webhook integration not found")
    credentials = decrypt_credentials(integration["encrypted_credentials"])
    secret = credentials.get("webhook_secret")
    if not secret:
        raise HTTPException(status_code=409, detail="Webhook secret is not configured")
    supplied = x_crispr_signature.removeprefix("sha256=")
    expected = hmac.new(secret.encode(), body, hashlib.sha256).hexdigest()
    if not hmac.compare_digest(supplied, expected):
        raise HTTPException(status_code=401, detail="Invalid webhook signature")
    try:
        payload = json.loads(body)
    except (ValueError, UnicodeDecodeError) as error:
        raise HTTPException(status_code=422, detail="Webhook body must be JSON") from error
    items_field = integration["config"].get("items_field", "items")
    items = payload if isinstance(payload, list) else payload.get(items_field, [])
    if not isinstance(items, list) or any(not isinstance(item, dict) for item in items):
        raise HTTPException(status_code=422, detail=f"Webhook field {items_field!r} must be a list of objects")
    digest = hashlib.sha256(body).hexdigest()
    config = integration["config"]
    with get_connection() as db:
        delivery = db.execute(
            """INSERT INTO webhook_deliveries(organization_id,integration_id,external_delivery_id,payload_hash,status)
               VALUES (%s,%s,%s,%s,'PROCESSING') ON CONFLICT(integration_id,external_delivery_id) DO NOTHING
               RETURNING delivery_id""",
            (integration["organization_id"], integration_id, x_crispr_delivery, digest),
        ).fetchone()
        if not delivery:
            return {"status": "duplicate", "delivery_id": x_crispr_delivery, "accepted": 0}
        for item in items:
            external_id = item.get(config["external_id_field"])
            observed_at = item.get(config["observed_at_field"])
            if external_id is None or observed_at is None:
                raise HTTPException(status_code=422, detail="Webhook item lacks configured ID or observation time")
            db.execute(
                """INSERT INTO telemetry_events(organization_id,source_name,external_event_id,event_type,
                     asset_id,severity,observed_at,payload) VALUES (%s,%s,%s,%s,%s,%s,%s,%s)
                   ON CONFLICT(organization_id,source_name,external_event_id) DO UPDATE SET
                     event_type=EXCLUDED.event_type,asset_id=EXCLUDED.asset_id,severity=EXCLUDED.severity,
                     observed_at=EXCLUDED.observed_at,payload=EXCLUDED.payload,ingested_at=NOW()""",
                (integration["organization_id"], integration["name"], str(external_id),
                 str(item.get(config["event_type_field"], "external_event")),
                 item.get(config["asset_id_field"]), item.get(config["severity_field"]), observed_at, Jsonb(item)),
            )
        db.execute("UPDATE webhook_deliveries SET status='SUCCEEDED',processed_at=NOW() WHERE delivery_id=%s",
                   (delivery["delivery_id"],))
    return {"status": "accepted", "delivery_id": x_crispr_delivery, "accepted": len(items)}
