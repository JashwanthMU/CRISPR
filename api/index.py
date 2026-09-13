"""Vercel Python Function entrypoint for the CRISPR FastAPI API.

Vercel discovers the ASGI application exported as ``app`` and routes the
same-origin ``/api/*`` requests from the Vite frontend to it.
"""

from backend.app.main import app


__all__ = ["app"]
