from fastapi import APIRouter
from pydantic import BaseModel
router = APIRouter()

class QueryRequest(BaseModel):
    question: str

@router.post("/query")
def query(req: QueryRequest):
    return {"answer": f"AI Advisor coming soon — Member 4 is building this. You asked: {req.question}", "intent": "stub"}