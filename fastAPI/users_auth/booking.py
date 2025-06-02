from datetime import datetime, date, time, timedelta
from typing import List, Optional, Dict
from sqlalchemy.orm import Session, joinedload
from fastapi import HTTPException, status
from models import Booking, Service, HomeOwner, User, ServiceProvider, BookingStatus
from sqlalchemy import func

from schemas import (
    BookingCreate, 
    BookingResponse, 
    BookingUpdate,
    AvailabilityCheck,
    AvailabilityResponse,
    TimeSlot,
    BookingStats
)
from base import CRUDBase

class CRUDBooking(CRUDBase[Booking, BookingCreate, BookingUpdate]):
  
    from sqlalchemy.orm import joinedload

    def create_booking(
        self, db: Session, *, obj_in: BookingCreate, homeowner_id: int
        ) -> Booking:
            # Get the service with provider info
            service = db.query(Service).options(
                joinedload(Service.provider).joinedload(ServiceProvider.user)
            ).filter(Service.id == obj_in.service_id).first()
            
            if not service:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Service not found"
                )
            
            # Get the homeowner with user info
            homeowner = db.query(HomeOwner).options(
                joinedload(HomeOwner.user)
            ).filter(HomeOwner.id == homeowner_id).first()
            
            if not homeowner:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Homeowner not found"
                )
            
            # Create the booking with all required fields
            db_obj = Booking(
                service_id=obj_in.service_id,
                homeowner_id=homeowner_id,
                scheduled_date=obj_in.scheduled_date,
                scheduled_time=obj_in.scheduled_time,
                status=BookingStatus.PENDING,
                price=service.price,
                address=obj_in.address,
                notes=obj_in.notes,
                service_title=service.title,
                service_image=service.image if service else None,
                provider_name=service.provider.user.full_name,
                provider_id=service.provider_id,
                homeowner_name=homeowner.user.full_name
            )
        
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
            return db_obj

    def get_bookings_for_provider(
        self, db: Session, provider_id: int, skip: int = 0, limit: int = 100
    ) -> Dict[str, List[Booking]]:
        now = datetime.now().date()
        
        provider = db.query(ServiceProvider).options(
            joinedload(ServiceProvider.services)
        ).filter(ServiceProvider.id == provider_id).first()
        
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found"
            )
        
        service_ids = [service.id for service in provider.services]
        
        upcoming = db.query(self.model).options(
            joinedload(Booking.service)  # Ensure service is loaded if needed
        ).filter(
            Booking.service_id.in_(service_ids),
            Booking.scheduled_date >= now
        ).order_by(Booking.scheduled_date).offset(skip).limit(limit).all()
        
        past = db.query(self.model).options(
            joinedload(Booking.service)  # Ensure service is loaded if needed
        ).filter(
            Booking.service_id.in_(service_ids),
            Booking.scheduled_date < now
        ).order_by(Booking.scheduled_date.desc()).offset(skip).limit(limit).all()
        
        return {"upcoming": upcoming, "past": past}
    
        
        
    # def get_bookings_for_provider(
    #         self, db: Session, provider_id: int, skip: int = 0, limit: int = 100
    #     ) -> List[Booking]:
    #         now = datetime.now().date()
            
    #         # Get provider's services
    #         provider = db.query(ServiceProvider).filter(ServiceProvider.id == provider_id).first()
    #         if not provider:
    #             raise HTTPException(
    #                 status_code=status.HTTP_404_NOT_FOUND,
    #                 detail="Provider not found"
    #             )
            
    #         service_ids = [service.id for service in provider.services]
            
    #         # Get upcoming bookings
    #         upcoming = db.query(self.model).filter(
    #             Booking.service_id.in_(service_ids),
    #             Booking.scheduled_date >= now
    #         ).order_by(Booking.scheduled_date).offset(skip).limit(limit).all()
            
    #         # Get past bookings
    #         past = db.query(self.model).filter(
    #             Booking.service_id.in_(service_ids),
    #             Booking.scheduled_date < now
    #         ).order_by(Booking.scheduled_date.desc()).offset(skip).limit(limit).all()
            
    #         return {"upcoming": upcoming, "past": past}

    def update_booking_status(
            self, db: Session, *, booking_id: int, status: BookingStatus, user_id: int, user_role: str
        ) -> Booking:
            db_obj = db.query(self.model).filter(Booking.id == booking_id).first()
            if not db_obj:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Booking not found"
                )
            
            # Verify user has permission to update this booking
            if user_role == "homeowners":
                if db_obj.homeowner.user_id != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Not authorized to update this booking"
                    )
                # Homeowners can only cancel
                if status != BookingStatus.CANCELLED:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Homeowners can only cancel bookings"
                    )
            elif user_role == "serviceproviders":
                if db_obj.service.provider.user_id != user_id:
                    raise HTTPException(
                        status_code=status.HTTP_403_FORBIDDEN,
                        detail="Not authorized to update this booking"
                    )
            else:
                raise HTTPException(
                    status_code=status.HTTP_403_FORBIDDEN,
                    detail="Only homeowners and service providers can update bookings"
                )
            
            # Update status
            db_obj.status = status
            if status == BookingStatus.COMPLETED:
                db_obj.completed_at = datetime.now()
            
            db.add(db_obj)
            db.commit()
            db.refresh(db_obj)
            return db_obj

    def check_availability(
            self, db: Session, *, service_id: int, date: date, duration: int
        ) -> AvailabilityResponse:
            service = db.query(Service).filter(Service.id == service_id).first()
            if not service:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Service not found"
                )
            
            # Get all bookings for this service on the requested date
            bookings = db.query(Booking).filter(
                Booking.service_id == service_id,
                Booking.scheduled_date == date,
                Booking.status.in_([BookingStatus.PENDING, BookingStatus.CONFIRMED])
            ).all()
            
            # Generate time slots (every 30 minutes from 8am to 6pm)
            start_time = time(8, 0)
            end_time = time(18, 0)
            slot_duration = timedelta(minutes=30)
            total_slots = int((datetime.combine(date, end_time) - datetime.combine(date, start_time)) / slot_duration)
            
            slots = []
            current_time = datetime.combine(date, start_time)
            
            for _ in range(total_slots):
                slot_end = current_time + timedelta(minutes=duration)
                
                # Check if this slot is available
                available = True
                for booking in bookings:
                    booking_time = datetime.combine(
                        booking.scheduled_date,
                        time.fromisoformat(booking.scheduled_time)
                    )
                    booking_end = booking_time + timedelta(minutes=service.duration)
                    
                    if not (slot_end <= booking_time or current_time >= booking_end):
                        available = False
                        break
                
                slots.append(TimeSlot(
                    start_time=current_time.time().isoformat(timespec='minutes'),
                    end_time=slot_end.time().isoformat(timespec='minutes'),
                    available=available
                ))
                
                current_time += slot_duration
            
            return AvailabilityResponse(date=date, slots=slots)

    def get_stats_for_provider(
            self, db: Session, provider_id: int
        ) -> BookingStats:
            provider = db.query(ServiceProvider).filter(ServiceProvider.id == provider_id).first()
            if not provider:
                raise HTTPException(
                    status_code=status.HTTP_404_NOT_FOUND,
                    detail="Provider not found"
                )
            
            service_ids = [service.id for service in provider.services]
            
            # Get all bookings for these services
            bookings = db.query(Booking).filter(Booking.service_id.in_(service_ids)).all()
            
            stats = BookingStats(
                total=len(bookings),
                pending=sum(1 for b in bookings if b.status == BookingStatus.PENDING),
                confirmed=sum(1 for b in bookings if b.status == BookingStatus.CONFIRMED),
                completed=sum(1 for b in bookings if b.status == BookingStatus.COMPLETED),
                cancelled=sum(1 for b in bookings if b.status == BookingStatus.CANCELLED),
                revenue=sum(b.price for b in bookings if b.status == BookingStatus.COMPLETED)
            )
            
            return stats

from models import Review
from schemas import ReviewCreate, ReviewResponse

# Add this class to booking.py
class CRUDReview(CRUDBase[Review, ReviewCreate, ReviewCreate]):
    def create_review(
        self, db: Session, *, booking_id: int, homeowner_id: int, obj_in: ReviewCreate
    ) -> Review:
        # Check if booking exists and is completed
        booking = db.query(Booking).filter(
            Booking.id == booking_id,
            Booking.homeowner_id == homeowner_id,
            Booking.status == BookingStatus.COMPLETED
        ).first()
        
        if not booking:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Booking not found or not eligible for review"
            )
        
        # Check if review already exists
        existing_review = db.query(self.model).filter(
            Review.booking_id == booking_id
        ).first()
        
        if existing_review:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Review already exists for this booking"
            )
        
        # Create review
        db_obj = Review(
            booking_id=booking_id,
            service_id=booking.service_id,
            homeowner_id=homeowner_id,
            rating=obj_in.rating,
            review_text=obj_in.review_text
        )
        
        db.add(db_obj)
        db.commit()
        db.refresh(db_obj)
        
        # Update service average rating
        self._update_service_rating(db, booking.service_id)
        
        return db_obj
    
    def get_reviews_for_service(
        self, db: Session, service_id: int, skip: int = 0, limit: int = 100
    ) -> List[Review]:
        return db.query(self.model).options(
            joinedload(Review.homeowner).joinedload(HomeOwner.user)
        ).filter(
            Review.service_id == service_id
        ).order_by(
            Review.created_at.desc()
        ).offset(skip).limit(limit).all()
    
    def _update_service_rating(self, db: Session, service_id: int):
        # Calculate new average rating
        avg_rating = db.query(
            func.avg(Review.rating)
        ).filter(
            Review.service_id == service_id
        ).scalar()
        
        # Update service
        service = db.query(Service).filter(Service.id == service_id).first()
        if service:
            service.average_rating = avg_rating or 0
            db.add(service)
            db.commit()

review = CRUDReview(Review)


booking = CRUDBooking(Booking)