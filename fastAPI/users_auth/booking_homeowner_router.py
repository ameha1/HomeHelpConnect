from fastapi import APIRouter, Depends, HTTPException, status
from sqlalchemy.orm import Session
from pydantic import BaseModel
from uuid import UUID
import models
from database import get_db
from auth import get_current_user
from datetime import datetime
import uuid

router = APIRouter(
    prefix="/bookings",
    tags=["Bookings"]
)

class BookingConfirmation(BaseModel):
    confirmed: bool
    dispute_reason: str | None = None

@router.post("/{booking_id}/confirm", response_model=None)
async def confirm_booking_completion(
    booking_id: UUID,
    confirmation: BookingConfirmation,
    db: Session = Depends(get_db),
    current_user: models.User = Depends(get_current_user)
):
    """
    Homeowner confirms or disputes a booking marked as 'awaiting_homeowner_confirmation'.
    """
    booking = db.query(models.Booking).filter(models.Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(status_code=status.HTTP_404_NOT_FOUND, detail="Booking not found")

    # Ensure the user is the homeowner for this booking
    if booking.homeowner_id != current_user.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to confirm this booking"
        )

    # Ensure the booking is in the correct state
    if booking.status != "awaiting_homeowner_confirmation":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Booking is not awaiting homeowner confirmation"
        )

    if confirmation.confirmed:
        # Confirm the booking
        booking.status = "completed"
        booking.updated_at = datetime.utcnow()
        db.commit()
        db.refresh(booking)
        return {"message": "Booking confirmed as completed"}
    else:
        # Dispute the booking
        if not confirmation.dispute_reason:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Dispute reason is required when disputing a booking"
            )

        # Create a report for the dispute
        report = models.Report(
            id=uuid.uuid4(),
            booking_id=booking_id,
            user_id=booking.homeowner_id,
            service_id=booking.service_id,
            title="Disputed Service Completion",
            reason=confirmation.dispute_reason,
            status="pending",
            created_at=datetime.utcnow(),
            updated_at=datetime.utcnow()
        )
        db.add(report)
        db.commit()
        return {"message": "Dispute submitted. A report has been created for review."}