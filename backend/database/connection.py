"""PostgreSQL access for the CRISPR prototype."""

import os
from contextlib import contextmanager
from typing import Iterator

import psycopg
from psycopg.rows import dict_row


DATABASE_URL = os.getenv(
    "DATABASE_URL", "postgresql://crispr:crispr@127.0.0.1:5432/crispr"
)


@contextmanager
def get_connection() -> Iterator[psycopg.Connection]:
    with psycopg.connect(DATABASE_URL, row_factory=dict_row) as connection:
        yield connection


def init_database() -> None:
    with get_connection() as connection:
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS users (
                user_id UUID PRIMARY KEY,
                name VARCHAR(120) NOT NULL,
                email VARCHAR(255) NOT NULL UNIQUE,
                password_hash TEXT NOT NULL,
                role VARCHAR(16) NOT NULL CHECK (role IN ('REPORTER', 'SECURITY')),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS bug_bounty_reports (
                report_id UUID PRIMARY KEY,
                reporter_name VARCHAR(120) NOT NULL,
                reporter_email VARCHAR(255) NOT NULL,
                title VARCHAR(240) NOT NULL,
                asset_id VARCHAR(32) NOT NULL,
                weakness VARCHAR(120) NOT NULL,
                severity VARCHAR(16) NOT NULL
                    CHECK (severity IN ('CRITICAL', 'HIGH', 'MEDIUM', 'LOW')),
                description TEXT NOT NULL,
                impact TEXT NOT NULL,
                reproduction_steps TEXT NOT NULL,
                remediation TEXT,
                cve VARCHAR(32),
                status VARCHAR(16) NOT NULL DEFAULT 'SUBMITTED'
                    CHECK (status IN ('SUBMITTED', 'ACCEPTED', 'REJECTED')),
                triage_notes TEXT,
                reviewed_by VARCHAR(120),
                created_at TIMESTAMPTZ NOT NULL DEFAULT NOW(),
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        connection.execute(
            """
            ALTER TABLE bug_bounty_reports
            ADD COLUMN IF NOT EXISTS reporter_user_id UUID REFERENCES users(user_id)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_bug_bounty_reports_status
            ON bug_bounty_reports (status)
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS assets (
                asset_id VARCHAR(32) PRIMARY KEY,
                payload JSONB NOT NULL,
                updated_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        connection.execute(
            """
            CREATE TABLE IF NOT EXISTS findings (
                finding_id VARCHAR(64) PRIMARY KEY,
                source_type VARCHAR(40) NOT NULL,
                source_name VARCHAR(120) NOT NULL,
                asset_id VARCHAR(32) NOT NULL,
                payload JSONB NOT NULL,
                first_seen DATE,
                ingested_at TIMESTAMPTZ NOT NULL DEFAULT NOW()
            )
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_findings_source_type
            ON findings (source_type)
            """
        )
        connection.execute(
            """
            CREATE INDEX IF NOT EXISTS idx_findings_asset_id
            ON findings (asset_id)
            """
        )
