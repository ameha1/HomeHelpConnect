from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from uuid import UUID
from datetime import datetime
import models
from database import get_db
from auth import get_current_user

router = APIRouter(
    prefix="/bookings",
    tags=["Bookings"]
)

class BookingStatusUpdate(BaseModel):
    status: str

@router.patch("/{booking_id}/status", response_model=None)
async def update_booking_status(
    booking_id: UUID,
    status_update: BookingStatusUpdate,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Update the status of a booking. Providers can mark as 'awaiting_homeowner_confirmation' instead of 'completed'.
    """
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    # Ensure the user is the provider for this booking
    service = db.query(models.Service).filter(models.Service.id == booking.service_id).first()
    if not service or service.provider_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to update this booking"
        )

    valid_provider_statuses = ["confirmed", "cancelled", "awaiting_homeowner_confirmation"]
    if status_update.status not in valid_provider_statuses:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail=f"Invalid status for provider. Must be one of {valid_provider_statuses}"
        )

    # Prevent providers from directly marking as 'completed'
    if status_update.status == "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Providers cannot mark bookings as completed directly. Use 'awaiting_homeowner_confirmation'."
        )

    booking.status = status_update.status
    booking.updated_at = datetime.utcnow()
    db.commit()
    db.refresh(booking)

    return {"message": "Booking status updated successfully"}