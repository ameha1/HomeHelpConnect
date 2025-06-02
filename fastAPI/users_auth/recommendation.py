from pydantic import BaseModel
from sqlalchemy.orm import Session
from sqlalchemy import select
from typing import List, Dict, Optional
from uuid import UUID
# import numpy as np
from sklearn.feature_extraction.text import TfidfVectorizer # type: ignore
from sklearn.metrics.pairwise import cosine_similarity # type: ignore
from fastapi import HTTPException
from models import Service, ServiceProvider
import openai
from openai import OpenAI
import os
import json
from dotenv import load_dotenv
import uuid

# Load environment variables
load_dotenv()

# OpenAI setup
if not os.getenv("OPENAI_API_KEY"):
    raise ValueError("OPENAI_API_KEY environment variable not set")
client = OpenAI(api_key=os.getenv("OPENAI_API_KEY"))

# Pydantic models
class ServiceRequest(BaseModel):
    job_type: str
    max_budget: float = None
    location: str = None
    urgency: str = None

class ChatRequest(BaseModel):
    message: str
    session_id: Optional[str] = None

class ChatResponse(BaseModel):
    response: str
    recommendations: List['ServiceRecommendation'] = []

class RecommendationRequest(BaseModel):
    query: str
    history: List[Dict[str, str]] = []

class RecommendationResponse(BaseModel):
    response: str
    results: List['ServiceRecommendation'] = []

class ServiceRecommendation(BaseModel):
    id: UUID
    title: str
    description: str
    price: float
    provider_name: str
    rating: float
    image: str
    years_experience: int
    address: str
    score: float

class RecommendationAgent:
    def __init__(self, db: Session):
        self.db = db

    def get_services(self, job_type: str, max_budget: float = None, location: str = None):
        try:
            query = select(Service).join(ServiceProvider).where(Service.is_active == True)
            if job_type:
                query = query.where(Service.title.ilike(f"%{job_type}%") | Service.description.ilike(f"%{job_type}%"))
            if max_budget:
                query = query.where(Service.price <= max_budget)
            if location:
                query = query.where(ServiceProvider.address.ilike(f"%{location}%"))
            return self.db.execute(query).scalars().all()
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"Database query error: {str(e)}")

    def compute_content_similarity(self, services: List[Service], job_type: str):
        texts = [f"{s.title} {s.description or ''}" for s in services]
        vectorizer = TfidfVectorizer()
        tfidf_matrix = vectorizer.fit_transform(texts + [job_type])
        similarities = cosine_similarity(tfidf_matrix[-1:], tfidf_matrix[:-1])[0]
        return similarities

    def rank_services(self, services: List[Service], job_type: str, max_budget: float = None):
        if not services:
            return []
        similarities = self.compute_content_similarity(services, job_type)
        recommendations = []
        for idx, service in enumerate(services):
            score = (
                0.8 * similarities[idx] +
                0.2 * (service.provider.years_experience / 10.0 if service.provider.years_experience else 0.0)
            )
            if max_budget and service.price > max_budget:
                score *= 0.5
            recommendations.append({
                "service": service,
                "score": score
            })
        recommendations.sort(key=lambda x: x["score"], reverse=True)
        return [
            ServiceRecommendation(
                id=r["service"].id,
                title=r["service"].title,
                description=r["service"].description or "",
                price=float(r["service"].price),
                provider_name=r["service"].provider_name,
                rating=float(r["service"].rating),
                image=r["service"].image or "/placeholder-service.jpg",
                years_experience=r["service"].provider.years_experience or 0,
                address=r["service"].provider.address or "",
                score=r["score"]
            ) for r in recommendations[:5]
        ]

class ConversationalAgent:
    def __init__(self, db: Session):
        self.db = db
        self.recommendation_agent = RecommendationAgent(db)

    def extract_parameters(self, message: str):
        try:
            prompt = f"""
            Extract the following parameters from the user's message:
            - job_type (e.g., plumbing, electrical)
            - max_budget (numeric value, if mentioned)
            - location (city or area, if mentioned)
            - urgency (e.g., 'immediate', 'within_week', if mentioned)
            If a parameter is not specified, return null for it.
            Return the result as a JSON object.
            User message: "{message}"
            """
            response = client.chat.completions.create(
                model="gpt-4o-mini",
                messages=[{"role": "user", "content": prompt}],
                response_format={"type": "json_object"}
            )
            return json.loads(response.choices[0].message.content)
        except Exception as e:
            raise HTTPException(status_code=500, detail=f"OpenAI API error: {str(e)}")

    def generate_response(self, message: str, session_id: Optional[str] = None):
        if not session_id:
            session_id = str(uuid.uuid4())
        if session_id not in session_data:
            session_data[session_id] = {"history": [], "parameters": {}}
        
        params = self.extract_parameters(message)
        job_type = params.get("job_type")
        max_budget = float(params["max_budget"]) if params.get("max_budget") else None
        location = params.get("location")
        urgency = params.get("urgency")

        session_data[session_id]["parameters"] = {
            "job_type": job_type,
            "max_budget": max_budget,
            "location": location,
            "urgency": urgency
        }
        session_data[session_id]["history"].append({"role": "user", "content": message})

        recommendations = []
        if job_type:
            services = self.recommendation_agent.get_services(job_type, max_budget, location)
            recommendations = self.recommendation_agent.rank_services(services, job_type, max_budget)
            
            if recommendations:
                response_text = f"I found some great {job_type} services for you"
                if location:
                    response_text += f" in {location}"
                if max_budget:
                    response_text += f" within your ${max_budget} budget"
                response_text += ":\n"
                for idx, service in enumerate(recommendations, 1):
                    response_text += (
                        f"{idx}. {service.title} by {service.provider_name} - ${service.price}, "
                        f"Experience: {service.years_experience} years\n"
                    )
                if urgency:
                    response_text += f"\nSince you mentioned '{urgency}' urgency, I prioritized quick-response providers."
            else:
                response_text = f"Sorry, I couldn't find any {job_type} services"
                if location:
                    response_text += f" in {location}"
                if max_budget:
                    response_text += f" within ${max_budget}"
                response_text += f". Could you clarify or adjust your requirements?"
        else:
            prompt = f"""
            You are a friendly assistant for HomeHelp Connect, a platform connecting homeowners with service providers.
            Respond naturally to the user's message, providing helpful information or asking clarifying questions.
            Use the conversation history: {json.dumps(session_data[session_id]["history"])}.
            User message: "{message}"
            """
            try:
                response = client.chat.completions.create(
                    model="gpt-4o-mini",
                    messages=[{"role": "user", "content": prompt}]
                )
                response_text = response.choices[0].message.content
            except Exception as e:
                response_text = f"Sorry, I encountered an error processing your request: {str(e)}. Please try again."

        session_data[session_id]["history"].append({"role": "assistant", "content": response_text})
        
        return response_text, recommendations, session_id

# Custom in-memory session store
session_data: Dict[str, Dict] = {}