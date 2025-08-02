from fastapi import APIRouter, HTTPException
from pydantic import BaseModel
import google.generativeai as genai
import os
from dotenv import load_dotenv
import json

load_dotenv()

# Configure Gemini
api_key = os.getenv("GEMINI_API_KEY")

genai.configure(api_key=api_key)

# Try different model names
try:
    model = genai.GenerativeModel('gemini-2.5-pro')
except Exception as e:
    try:
        model = genai.GenerativeModel('gemini-pro')
    except Exception as e2:
        model = None

gemini_router = APIRouter()

class GeminiQuery(BaseModel):
    query: str
    entity_type: str

class GeminiResponse(BaseModel):
    success: bool
    entity_name: str = None
    entity_type: str = None
    confidence: float = None
    explanation: str = None

@gemini_router.post("/convert", response_model=GeminiResponse)
async def convert_natural_language(query: GeminiQuery):
    """
    Convert natural language queries to specific entity names using Gemini.
    
    Examples:
    - "I loved a movie about finance and ambition in New York" -> "The Wolf of Wall Street"
    - "A book about a wizard school" -> "Harry Potter"
    - "A TV show about friends in New York" -> "Friends"
    """
    
    if not model:
        raise HTTPException(
            status_code=503,
            detail="Gemini model not available - check API key and model configuration"
        )
    
    try:
        # Create a prompt for Gemini
        prompt = f"""
        You are a helpful assistant that converts natural language descriptions into specific entity names.
        
        Given a description and entity type, return the most likely specific entity name.
        
        Entity Type: {query.entity_type}
        Description: {query.query}
        
        Rules:
        1. Return ONLY a JSON object with these fields:
           - entity_name: The specific name of the entity
           - entity_type: The entity type (should match the input)
           - confidence: A number between 0 and 1 indicating your confidence
           - explanation: A brief explanation of why you chose this entity
        
        2. For movies, return the exact movie title
        3. For books, return the exact book title
        4. For TV shows, return the exact show title
        5. If you're not confident, set confidence to 0.3 or lower
        6. If you can't find a good match, set success to false
        
        Examples:
        - "I loved a movie about finance and ambition in New York" -> {{"entity_name": "The Wolf of Wall Street", "entity_type": "movie", "confidence": 0.9, "explanation": "This matches the description of a movie about finance and ambition set in New York"}}
        - "A book about a wizard school" -> {{"entity_name": "Harry Potter and the Sorcerer's Stone", "entity_type": "book", "confidence": 0.8, "explanation": "This is the first book in the Harry Potter series about a wizard school"}}
        - "A TV show about friends in New York" -> {{"entity_name": "Friends", "entity_type": "tv_show", "confidence": 0.9, "explanation": "This matches the description of a popular TV show about friends living in New York"}}
        
        Return only the JSON object, no other text.
        """
        
        # Get response from Gemini
        response = model.generate_content(prompt)
        
        try:
            # Extract JSON from the response
            response_text = response.text.strip()
            
            # Remove any markdown formatting if present
            if response_text.startswith("```json"):
                response_text = response_text[7:]
            if response_text.endswith("```"):
                response_text = response_text[:-3]
            
            response_text = response_text.strip()
            
            # Parse JSON
            result = json.loads(response_text)
            
            # Validate the response
            if not result.get("entity_name") or not result.get("entity_type"):
                return GeminiResponse(
                    success=False,
                    explanation="Could not extract a valid entity name from the response"
                )
            
            # Check confidence threshold
            confidence = result.get("confidence", 0)
            if confidence < 0.3:
                return GeminiResponse(
                    success=False,
                    explanation=f"Low confidence ({confidence}) in the suggested entity"
                )
            
            return GeminiResponse(
                success=True,
                entity_name=result["entity_name"],
                entity_type=result["entity_type"],
                confidence=confidence,
                explanation=result.get("explanation", "")
            )
            
        except json.JSONDecodeError as e:
            return GeminiResponse(
                success=False,
                explanation="Failed to parse Gemini response"
            )
            
    except Exception as e:
        # Handle specific error types
        error_message = str(e)
        if "429" in error_message or "quota" in error_message.lower():
            raise HTTPException(
                status_code=429,
                detail="Gemini API rate limit exceeded. Please try again later or use exact search mode."
            )
        elif "404" in error_message and "model" in error_message.lower():
            raise HTTPException(
                status_code=503,
                detail="Gemini model not available. Please check API configuration."
            )
        else:
            raise HTTPException(
                status_code=500,
                detail=f"Failed to process natural language query: {str(e)}"
            )

@gemini_router.get("/health")
async def gemini_health():
    try:
        if not model:
            raise HTTPException(
                status_code=503,
                detail="Gemini model not available - check API key and model configuration"
            )
        
        # Simple test query
        test_response = model.generate_content("Say 'Hello'")
        return {"status": "healthy", "message": "Gemini API is working"}
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Gemini API is not working: {str(e)}"
        ) 