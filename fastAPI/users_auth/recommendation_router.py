from fastapi import APIRouter, Depends, HTTPException
from sqlalchemy.orm import Session
from recommendation import ChatRequest, ChatResponse, RecommendationRequest, RecommendationResponse, ConversationalAgent
from database import get_db
import os

router = APIRouter()

@router.post("/chat", response_model=ChatResponse)
async def chat(request: ChatRequest, db: Session = Depends(get_db)):
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY environment variable not set")
    
    agent = ConversationalAgent(db)
    response_text, recommendations, session_id = agent.generate_response(request.message, request.session_id)
    return ChatResponse(response=response_text, recommendations=recommendations)

@router.post("/api/recommendations/", response_model=RecommendationResponse)
async def recommendations(request: RecommendationRequest, db: Session = Depends(get_db)):
    if not os.getenv("OPENAI_API_KEY"):
        raise HTTPException(status_code=500, detail="OPENAI_API_KEY environment variable not set")
    
    agent = ConversationalAgent(db)
    response_text, recommendations, _ = agent.generate_response(request.query)
    return RecommendationResponse(response=response_text, results=recommendations)