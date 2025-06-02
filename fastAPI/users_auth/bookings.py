from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session, joinedload
from typing import List
from datetime import datetime
from sqlalchemy import or_
from uuid import UUID

from schemas import (
    BookingCreate,
    BookingResponse,
    BookingUpdate,
    BookingListResponse,
    AvailabilityCheck,
    AvailabilityResponse,
    BookingStats
)
from models import User, BookingStatus
from booking import booking
from database import get_db
from auth import get_current_user
from models import Booking, Service, HomeOwner, User, ServiceProvider, BookingStatus, Review
from booking import review

router = APIRouter(prefix="/bookings", tags=["bookings"])

@router.post("/", response_model=BookingResponse)
def create_booking(
    booking_data: BookingCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify homeowner
    if current_user.role != "homeowners":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only homeowners can create bookings"
        )
    
    homeowner = db.query(HomeOwner).filter(HomeOwner.user_id == current_user.id).first()
    if not homeowner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Homeowner profile not found"
        )
    
    # Get service details
    service = db.query(Service).options(
        joinedload(Service.provider).joinedload(ServiceProvider.user)
    ).filter(Service.id == booking_data.service_id).first()
    
    if not service:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Service not found"
        )
    
    # Create booking with properly formatted status
    db_booking = Booking(
        service_id=booking_data.service_id,
        homeowner_id=homeowner.id,
        provider_id=service.provider_id,
        scheduled_date=booking_data.scheduled_date,
        scheduled_time=booking_data.scheduled_time,
        address=booking_data.address,
        notes=booking_data.notes,
        status=BookingStatus.PENDING.value,  # Fixed: using enum value
        price=service.price,
        service_title=service.title,
        service_image=service.image,
        provider_name=service.provider.user.full_name,
        homeowner_name=current_user.full_name,
    )
    
    db.add(db_booking)
    db.commit()
    db.refresh(db_booking)
    return db_booking

@router.get("/homeowner/", response_model=BookingListResponse)
def get_homeowner_bookings(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    homeowner = db.query(HomeOwner).filter(HomeOwner.user_id == current_user.id).first()
    if not homeowner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Homeowner profile not found"
        )
    
    # Get upcoming bookings (pending/confirmed AND future date OR completed but not past date)
    upcoming = db.query(Booking).options(
        joinedload(Booking.service)
    ).filter(
        Booking.homeowner_id == homeowner.id,
        Booking.status.in_([BookingStatus.PENDING.value, BookingStatus.CONFIRMED.value]),
        Booking.scheduled_date >= datetime.now().date()
    ).order_by(Booking.scheduled_date).offset(skip).limit(limit).all()
    
    # Get past bookings (completed OR cancelled OR past date)
    past = db.query(Booking).options(
        joinedload(Booking.service)
    ).filter(
        Booking.homeowner_id == homeowner.id,
        or_(
            Booking.status.in_([BookingStatus.COMPLETED.value, BookingStatus.CANCELLED.value]),
            Booking.scheduled_date < datetime.now().date()
        )
    ).order_by(Booking.scheduled_date.desc()).offset(skip).limit(limit).all()
    
    return {"upcoming": upcoming, "past": past}

# Update the provider bookings endpoint
@router.get("/provider/", response_model=BookingListResponse)
def get_provider_bookings(
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "serviceproviders":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only service providers can access these bookings"
        )
    
    provider = db.query(ServiceProvider).filter(ServiceProvider.user_id == current_user.id).first()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider profile not found"
        )
    
    print(f"Fetching bookings for provider_id: {provider.id}, user_id: {current_user.id}")  # Debugging
    bookings = booking.get_bookings_for_provider(db, provider_id=provider.id, skip=skip, limit=limit)
    print(f"Retrieved {len(bookings['upcoming'])} upcoming, {len(bookings['past'])} past bookings")  # Debugging
    return bookings

@router.patch("/{booking_id}/status", response_model=BookingResponse)
def update_booking_status(
    booking_id: str,
    status_update: BookingUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    return booking.update_booking_status(
        db,
        booking_id=booking_id,
        status=status_update.status,
        user_id=current_user.id,
        user_role=current_user.role
    )

@router.post("/availability", response_model=AvailabilityResponse)
def check_availability(
    availability: AvailabilityCheck,
    db: Session = Depends(get_db)
):
    return booking.check_availability(
        db,
        service_id=availability.service_id,
        date=availability.date,
        duration=availability.duration
    )

@router.get("/provider/stats", response_model=BookingStats)
def get_provider_stats(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "serviceproviders":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only service providers can access these stats"
        )
    
    provider = db.query(ServiceProvider).filter(ServiceProvider.user_id == current_user.id).first()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider profile not found"
        )
    
    return booking.get_stats_for_provider(db, provider_id=provider.id)


from schemas import ReviewCreate, ReviewResponse

# Add these endpoints to bookings.py
@router.post("/{booking_id}/reviews", response_model=ReviewResponse)
def create_review(
    booking_id: UUID,
    review_data: ReviewCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify homeowner
    if current_user.role != "homeowners":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only homeowners can create reviews"
        )
    
    homeowner = db.query(HomeOwner).filter(HomeOwner.user_id == current_user.id).first()
    if not homeowner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Homeowner profile not found"
        )
    
    # Check if booking exists and is completed
    booking = db.query(Booking).filter(
        Booking.id == booking_id,
        Booking.homeowner_id == homeowner.id,
        Booking.status == BookingStatus.COMPLETED.value
    ).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found or not eligible for review"
        )
    
    # Check if review already exists
    existing_review = db.query(Review).filter(
        Review.booking_id == booking_id
    ).first()
    
    if existing_review:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Review already exists for this booking"
        )
    
    # Create review
    db_review = Review(
        booking_id=booking_id,
        service_id=booking.service_id,
        homeowner_id=homeowner.id,
        rating=review_data.rating,
        review_text=review_data.review_text
    )
    
    db.add(db_review)
    db.commit()
    db.refresh(db_review)
    
    # Return response with homeowner name
    return {
        **db_review.__dict__,
        "homeowner_name": current_user.full_name
    }

@router.get("/services/{service_id}/reviews", response_model=List[ReviewResponse])
def get_service_reviews(
    service_id: str,
    skip: int = 0,
    limit: int = 100,
    db: Session = Depends(get_db)
):
    # Get reviews with homeowner information
    reviews = db.query(Review).options(
        joinedload(Review.homeowner).joinedload(HomeOwner.user)
    ).filter(
        Review.service_id == service_id
    ).offset(skip).limit(limit).all()
    
    # Format the response with homeowner name
    return [{
        "id": review.id,
        "booking_id": review.booking_id,
        "service_id": review.service_id,
        "homeowner_id": review.homeowner_id,
        "rating": review.rating,
        "review_text": review.review_text,
        "created_at": review.created_at,
        "homeowner_name": review.homeowner.user.full_name if review.homeowner and review.homeowner.user else "Anonymous"
    } for review in reviews]