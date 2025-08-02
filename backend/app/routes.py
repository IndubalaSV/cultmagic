# app/routes.py
import requests
import os
import logging
from fastapi import APIRouter, HTTPException, Depends
from pydantic import BaseModel
from typing import Optional
from dotenv import load_dotenv
from app.auth import get_current_user
from app.database import UserPreference, get_db

logger = logging.getLogger(__name__)

async def get_current_user_optional():
    try:
        return await get_current_user()
    except:
        return None

# Load environment variables
load_dotenv()

recommendation_router = APIRouter()

QLOO_API_BASE = os.getenv("QLOO_API_BASE_URL", "https://hackathon.api.qloo.com")
QLOO_API_KEY = os.getenv("QLOO_API_KEY")
HEADERS = {
    "accept": "application/json",
    "x-api-key": QLOO_API_KEY
}

class PreferenceInput(BaseModel):
    book_name: Optional[str] = None
    movie_name: Optional[str] = None
    place_name: Optional[str] = None
    age: Optional[str] = None  # Must match one of the accepted enums when provided
    gender: Optional[str] = None  # "male" or "female" when provided

class SearchInput(BaseModel):
    query: str
    entity_type: str  # "book", "movie", "tv_show", "place"


def fetch_entity_id(name: str, entity_type: str) -> Optional[str]:
    if not QLOO_API_KEY:
        logger.warning("QLOO_API_KEY not found in environment variables")
        return None
        
    try:
        response = requests.get(
            f"{QLOO_API_BASE}/search",
            params={"query": name, "types": f"urn:entity:{entity_type}"},
            headers=HEADERS
        )
        
        if response.ok:
            data = response.json()
            # Check if the response has 'results' key (new format)
            if 'results' in data and len(data['results']) > 0:
                return data['results'][0].get('entity_id')
            # Check if the response is a direct array (old format)
            elif isinstance(data, list) and len(data) > 0 and "entity_id" in data[0]:
                return data[0]["entity_id"]
        
        return None
    except Exception:
        return None


def get_insights(entity_ids: list[str], age: str, gender: str, domain: str) -> list:
    joined_ids = ",".join(entity_ids)
    
    try:
        params = {
            "filter.type": f"urn:entity:{domain}",
            "signal.interests.entities": joined_ids,
            "signal.demographics.age": age,
            "signal.demographics.gender": gender,
            "feature.explainability": "true",
            "take": "10"
        }
        
        response = requests.get(
            f"{QLOO_API_BASE}/v2/insights",
            params=params,
            headers=HEADERS
        )
        
        if response.ok:
            data = response.json()
            # Handle the expected API response format
            if 'results' in data and 'entities' in data['results']:
                return data['results']['entities']
        
        return []
    except Exception:
        return []


def get_popular_books(entity_ids: list[str], age: str, gender: str) -> list:
    # For best sellers, we'll get general popular books without user-specific signals
    try:
        params = {
            "filter.type": "urn:entity:book",
            "filter.popularity.min": "0.95",
            "feature.explainability": "true",
            "take": "10"
        }
        
        
        response = requests.get(
            f"{QLOO_API_BASE}/v2/insights",
            params=params,
            headers=HEADERS
        )
        
        if response.ok:
            data = response.json()
            # Handle the expected API response format
            if 'results' in data and 'entities' in data['results']:
                return data['results']['entities']
        
        return []
    except Exception:
        return []


@recommendation_router.post("/search")
async def search_entities(search_input: SearchInput):
    """Search for entities by name and type"""
    try:
        # try to get the entity ID
        entity_id = fetch_entity_id(search_input.query, search_input.entity_type)
        
        if entity_id:
            # Get details for the found entity
            params = {
                "filter.type": f"urn:entity:{search_input.entity_type}",
                "filter.entity_id": entity_id,
                "feature.explainability": "true",
                "take": "1"
            }
            
            response = requests.get(
                f"{QLOO_API_BASE}/v2/insights",
                params=params,
                headers=HEADERS
            )
            
            if response.ok:
                data = response.json()
                if 'results' in data and 'entities' in data['results']:
                    return {"results": data['results']['entities']}
        
        # If no entity found, try direct search
        try:
            response = requests.get(
                f"{QLOO_API_BASE}/search",
                params={"query": search_input.query, "types": f"urn:entity:{search_input.entity_type}"},
                headers=HEADERS
            )
            
            if response.ok:
                data = response.json()
                # Convert search results to entity format
                if 'results' in data and len(data['results']) > 0:
                     entities = []
                     for result in data['results'][:5]:  # Limit to 5 results
                         entity_id = result.get('entity_id')
                         
                         # Get full details from insights API if we have an entity_id
                         full_details = None
                         if entity_id:
                             try:
                                 insights_response = requests.get(
                                     f"{QLOO_API_BASE}/v2/insights",
                                     params={
                                         "filter.type": f"urn:entity:{search_input.entity_type}",
                                         "filter.entity_id": entity_id,
                                         "feature.explainability": "true",
                                         "take": "1"
                                     },
                                     headers=HEADERS
                                 )
                                 
                                 if insights_response.ok:
                                     insights_data = insights_response.json()
                                     if 'results' in insights_data and 'entities' in insights_data['results'] and len(insights_data['results']['entities']) > 0:
                                         full_details = insights_data['results']['entities'][0]
                             except Exception as e:
                                 pass
                         
                         # Use full details if available, otherwise use search result
                         details = full_details if full_details else result
                                                  
                         # Try to get image from various possible fields
                         image_url = (
                             details.get('image_url') or 
                             details.get('image') or 
                             details.get('cover_image') or
                             (details.get('properties', {}).get('image', {}).get('url') if details.get('properties') else None)
                         )
                         
                         entity = {
                             "entity_id": details.get('entity_id'),
                             "name": details.get('name', search_input.query),
                             "type": search_input.entity_type,
                             "image": image_url,
                             "image_url": image_url,  # Add both for compatibility
                             "rating": details.get('rating'),
                             "rating_count": details.get('rating_count'),
                             "author": details.get('author'),
                             "properties": {
                                 "short_description": details.get('short_description') or details.get('properties', {}).get('short_description'),
                                 "description": details.get('description') or details.get('properties', {}).get('description'),
                                 "publication_year": details.get('publication_year') or details.get('properties', {}).get('publication_year'),
                                 "publication_date": details.get('publication_date') or details.get('properties', {}).get('publication_date'),
                                 "genre": details.get('genre') or details.get('properties', {}).get('genre'),
                                 "page_count": details.get('page_count') or details.get('properties', {}).get('page_count'),
                                 "language": details.get('language') or details.get('properties', {}).get('language'),
                                 "publisher": details.get('publisher') or details.get('properties', {}).get('publisher'),
                                 "isbn13": details.get('isbn13') or details.get('properties', {}).get('isbn13'),
                                 "format": details.get('format') or details.get('properties', {}).get('format'),
                                 "image": {
                                     "url": image_url
                                 } if image_url else None
                             },
                             "external": {
                                 "goodreads": details.get('goodreads_id') or details.get('external', {}).get('goodreads')
                             } if (details.get('goodreads_id') or details.get('external', {}).get('goodreads')) else None
                         }
                         entities.append(entity)
                     return {"results": entities}
        
        except Exception as search_error:
            pass
        
        return {"results": []}
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Search failed: {str(e)}")

@recommendation_router.post("/recommendations")
async def get_recommendations(preference: PreferenceInput, current_user: Optional[dict] = Depends(get_current_user_optional)):
    # Get user preferences and favorites from database if user is authenticated
    user_preferences = {}
    favorite_entities = []
    
    if current_user:
        from app.database import SessionLocal, SavedItem
        db = SessionLocal()
        try:
            # Get user preferences
            user_pref = db.query(UserPreference).filter(UserPreference.user_id == current_user["id"]).first()
            if user_pref:
                user_preferences = {
                    "book_name": user_pref.book_name,
                    "movie_name": user_pref.movie_name,
                    "place_name": user_pref.place_name,
                    "age": user_pref.age,
                    "gender": user_pref.gender
                }
            
            # Get user's favorite items (saved items with favorited=True)
            saved_items = db.query(SavedItem).filter(
                SavedItem.user_id == current_user["id"],
                SavedItem.favorited == True
            ).all()
            favorite_entities = [item.item_id for item in saved_items if item.item_id]
            
        finally:
            db.close()
    
    # Use provided values or user preferences - no fallbacks
    book_name = preference.book_name or user_preferences.get("book_name")
    movie_name = preference.movie_name or user_preferences.get("movie_name")
    place_name = preference.place_name or user_preferences.get("place_name")
    age = preference.age or user_preferences.get("age")
    gender = preference.gender or user_preferences.get("gender")
    
    entity_ids = []

    # Use main preferences for recommendations
    if book_name:
        book_id = fetch_entity_id(book_name, "book")
        if book_id:
            entity_ids.append(book_id)

    if movie_name:
        movie_id = fetch_entity_id(movie_name, "movie")
        if movie_id:
            entity_ids.append(movie_id)

    if place_name:
        place_id = fetch_entity_id(place_name, "place")
        if place_id:
            entity_ids.append(place_id)

    # Add favorites as additional signals
    if favorite_entities:
        entity_ids.extend(favorite_entities)

    if not entity_ids:
        # If no API key is set, return empty results instead of error
        if not QLOO_API_KEY:
            return {
                "book_recs": [],
                "popular_books": [],
                "movie_recs": [],
                "tv_show_recs": [],
                "message": "API key not configured. Please set QLOO_API_KEY in your .env file."
            }
        
        # If user has no preferences set, return empty results with helpful message
        return {
            "book_recs": [],
            "popular_books": [],
            "movie_recs": [],
            "tv_show_recs": [],
            "message": "No preferences found. Please set your preferences first."
        }

    # Get insights for each content type
    book_recs = get_insights(entity_ids, age, gender, "book")
    popular_books = get_popular_books(entity_ids, age, gender)
    movie_recs = get_insights(entity_ids, age, gender, "movie")
    tv_show_recs = get_insights(entity_ids, age, gender, "tv_show")

    return {
        "book_recs": book_recs,
        "popular_books": popular_books,
        "movie_recs": movie_recs,
        "tv_show_recs": tv_show_recs
    }

