dev:
	uvicorn backend.app.main:app --reload --port 8000

frontend:
	cd frontend && npm run dev

docker:
	docker-compose up --build

seed:
	python backend/ingestion/seed.py

test:
	pytest backend/tests/ -v