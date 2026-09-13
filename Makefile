.PHONY: help dev frontend bug-bounty build up down logs migrate test test-backend test-frontend audit

PYTHON ?= python3
COMPOSE ?= docker compose

help:
	@echo "CRISPR development commands"
	@echo "  make up             Build and start the complete stack"
	@echo "  make test           Run backend tests and frontend build"
	@echo "  make migrate        Apply database migrations"
	@echo "  make audit          Run the technical audit in demo mode"

dev:
	$(PYTHON) -m uvicorn backend.app.main:app --reload --port 8000

frontend:
	npm --prefix frontend run dev

bug-bounty:
	npm --prefix bug-bounty run dev

build:
	$(COMPOSE) build

up:
	$(COMPOSE) up -d --build

down:
	$(COMPOSE) down

logs:
	$(COMPOSE) logs --tail=100 backend worker

migrate:
	$(COMPOSE) exec backend alembic upgrade head

test: test-backend test-frontend

test-backend:
	$(PYTHON) -m pytest backend -q

test-frontend:
	npm --prefix frontend run build

audit:
	CRISPR_DATA_MODE=demo $(PYTHON) tools/audits/sih_jury_audit.py
