import os
from openai import AsyncOpenAI
from dotenv import load_dotenv
import logging

load_dotenv()

class AiAssistant:
    def __init__(self):  # Corrected __init__ method name
        self.api_key = os.getenv("OPENAI_API_KEY")
        if not self.api_key:
            raise ValueError("OPENAI_API_KEY is required")
        self.client = AsyncOpenAI(api_key=self.api_key)  # Ensure client is initialized
        self.model = "gpt-3.5-turbo"
        self.system_prompt = """
        You are an AI assistant for HomeHelp Connect, a platform that connects homeowners 
        with skilled professionals for household services like plumbing, electrical work, 
        cleaning, and maintenance.... Your responses should focus on explaining:

        1. How HomeHelp Connect works
        2. How to find and book professionals
        3. The platform's features (Recommendation Assistant, Booking, messaging, Review and Ratings, payment integration)
        4. Safety and verification procedures

        Be friendly and professional, and always direct users to official platform features.
        """

    async def generate_response(self, user_message: str) -> str:
        """Generate response with HomeHelp Connect focus"""
        try:
            response = await self.client.chat.completions.create(
                model=self.model,
                messages=[
                    {"role": "system", "content": self.system_prompt},
                    {"role": "user", "content": user_message}
                ],
                max_tokens=200,
                temperature=0.7
            )
            return response.choices[0].message.content  # Ensure response handling is correct
        except Exception as e:
            logging.error(f"API error: {str(e)}")
            return "I'm unable to respond right now. Please try the Help Center at support@homehelpconnect.example"
