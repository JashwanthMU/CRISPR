# assistant.py
from fastapi import APIRouter
from pydantic import BaseModel
router = APIRouter()
class QueryRequest(BaseModel):
    question: str
@router.post("/query")
def query(request: QueryRequest):
    return {"answer": "Member 4 not yet merged", "intent": "stub"}
