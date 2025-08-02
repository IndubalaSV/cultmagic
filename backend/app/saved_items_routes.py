from fastapi import APIRouter, HTTPException, status, Depends
from fastapi.security import HTTPBearer, HTTPAuthorizationCredentials
from sqlalchemy.orm import Session
from pydantic import BaseModel
from typing import List
from datetime import datetime
from .database import get_db, User, SavedItem
from .auth import verify_token
import os
from dotenv import load_dotenv

load_dotenv()

saved_items_router = APIRouter()
security = HTTPBearer()

# Pydantic models
class SavedItemCreate(BaseModel):
    item_id: str
    item_name: str
    item_type: str
    item_image: str = ""  # Make optional with default empty string
    item_description: str = ""  # Make optional with default empty string
    favorited: bool = False  # Add favorited field with default False

class SavedItemResponse(BaseModel):
    id: int
    item_id: str
    item_name: str
    item_type: str
    item_image: str
    item_description: str
    favorited: bool
    saved_at: datetime
    
    class Config:
        from_attributes = True

# Add item to saved list
@saved_items_router.post("/save", response_model=SavedItemResponse)
async def save_item(
    item: SavedItemCreate,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    try:
        # Validate input data
        if not item.item_id or not item.item_name:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="item_id and item_name are required"
            )
        
        token = credentials.credentials
        username = verify_token(token)
        if username is None:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Could not validate credentials"
            )
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Authentication error: {str(e)}"
        )
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    try:
        # Check if item is already saved
        existing_item = db.query(SavedItem).filter(
            SavedItem.user_id == user.id,
            SavedItem.item_id == item.item_id
        ).first()
        
        if existing_item:
            # Update the existing item's favorited status if it changed
            if existing_item.favorited != item.favorited:
                existing_item.favorited = item.favorited
                db.commit()
                db.refresh(existing_item)
            # Convert to proper response format
            return SavedItemResponse(
                id=existing_item.id,
                item_id=existing_item.item_id,
                item_name=existing_item.item_name,
                item_type=existing_item.item_type,
                item_image=existing_item.item_image,
                item_description=existing_item.item_description,
                favorited=existing_item.favorited,
                saved_at=existing_item.saved_at
            )
        
        # Create new saved item
        saved_item = SavedItem(
            user_id=user.id,
            item_id=item.item_id,
            item_name=item.item_name,
            item_type=item.item_type,
            item_image=item.item_image,
            item_description=item.item_description,
            favorited=item.favorited
        )
        
        db.add(saved_item)
        db.commit()
        db.refresh(saved_item)
        
        # Convert to proper response format
        return SavedItemResponse(
            id=saved_item.id,
            item_id=saved_item.item_id,
            item_name=saved_item.item_name,
            item_type=saved_item.item_type,
            item_image=saved_item.item_image,
            item_description=saved_item.item_description,
            favorited=saved_item.favorited,
            saved_at=saved_item.saved_at
        )
        
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Database error: {str(e)}"
        )

# Get all saved items for user
@saved_items_router.get("/list", response_model=List[SavedItemResponse])
async def get_saved_items(
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    username = verify_token(token)
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    saved_items = db.query(SavedItem).filter(SavedItem.user_id == user.id).all()
    
    # Convert to proper response format
    return [
        SavedItemResponse(
            id=item.id,
            item_id=item.item_id,
            item_name=item.item_name,
            item_type=item.item_type,
            item_image=item.item_image,
            item_description=item.item_description,
            favorited=item.favorited,
            saved_at=item.saved_at
        ) for item in saved_items
    ]

# Remove item from saved list
@saved_items_router.delete("/remove/{item_id}")
async def remove_saved_item(
    item_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    username = verify_token(token)
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    # Find and delete the saved item
    saved_item = db.query(SavedItem).filter(
        SavedItem.user_id == user.id,
        SavedItem.item_id == item_id
    ).first()
    
    if not saved_item:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Saved item not found"
        )
    
    db.delete(saved_item)
    db.commit()
    
    return {"message": "Item removed from saved list"}

# Check if item is saved
@saved_items_router.get("/check/{item_id}")
async def check_if_saved(
    item_id: str,
    credentials: HTTPAuthorizationCredentials = Depends(security),
    db: Session = Depends(get_db)
):
    token = credentials.credentials
    username = verify_token(token)
    if username is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Could not validate credentials"
        )
    
    user = db.query(User).filter(User.username == username).first()
    if user is None:
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="User not found"
        )
    
    saved_item = db.query(SavedItem).filter(
        SavedItem.user_id == user.id,
        SavedItem.item_id == item_id
    ).first()
    
    return {"is_saved": saved_item is not None} 