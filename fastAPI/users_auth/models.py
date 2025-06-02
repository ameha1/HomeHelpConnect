from enum import Enum
from datetime import datetime
from sqlalchemy import Column, String, Boolean, DateTime, Date, ForeignKey, Float, Text, Enum as SQLAlchemyEnum, Index, text, Integer
from sqlalchemy.orm import relationship
from typing import Optional
import uuid
from database import Base
from sqlalchemy.orm import Mapped, mapped_column
from sqlalchemy.dialects.postgresql import UUID
from typing import Dict, Any
from sqlalchemy import JSON
from sqlalchemy import func
from sqlalchemy.orm import Session
from sqlalchemy import event

class UserRole(str, Enum):
    HOMEOWNERS = "homeowners"
    SERVICEPROVIDERS = "serviceproviders"
    ADMIN = "admin"

class RegistrationStatus(str, Enum):
    PENDING = "pending"
    APPROVED = "approved"
    REJECTED = "rejected"

class BookingStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"


from passlib.context import CryptContext

pwd_context = CryptContext(schemes=["bcrypt"], deprecated="auto")

class ReportStatus(str, Enum):
    OPEN = "open"
    RESOLVED = "resolved"

class Report(Base):
    __tablename__ = "reports"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"))
    homeowner_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    provider_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    title = Column(String(255), nullable=False)
    description = Column(Text, nullable=False)
    status = Column(SQLAlchemyEnum(ReportStatus), default=ReportStatus.OPEN)
    service_title = Column(String(255), nullable=False)
    provider_name = Column(String(255), nullable=False)
    homeowner_name = Column(String(255), nullable=False)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    updated_at = Column(DateTime(timezone=True), onupdate=func.now())
    
    booking = relationship("Booking", back_populates="reports")
    homeowner = relationship("User", foreign_keys=[homeowner_id], back_populates="reports_submitted")
    provider = relationship("User", foreign_keys=[provider_id], back_populates="reports_received")


class Warning(Base):
    __tablename__ = "warnings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    report_id = Column(UUID(as_uuid=True), ForeignKey("reports.id"))
    reason = Column(Text)
    created_at = Column(DateTime(timezone=True), server_default=func.now())
    
    user = relationship("User", back_populates="warnings")
    report = relationship("Report")



class User(Base):
    __tablename__ = "users"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    email = Column(String, unique=True, index=True, nullable=False)
    password_hash = Column(String, nullable=False)
    full_name = Column(String, nullable=False)
    phone_number = Column(String)
    profile_image = Column(String)
    is_active = Column(Boolean, default=True)
    role = Column(SQLAlchemyEnum(UserRole, name="userrole", values_callable=lambda x: [e.value for e in UserRole]), nullable=False)
    created_at = Column(DateTime, default=datetime.utcnow)
    last_login = Column(DateTime)
    bio = Column(Text, nullable=True)  
    address = Column(String, nullable=True)  
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)

    status = Column(String, default="active")
    suspension_end_date = Column(DateTime(timezone=True))
    
    reports_submitted = relationship("Report", foreign_keys=[Report.homeowner_id])
    reports_received = relationship("Report", foreign_keys=[Report.provider_id])
    warnings = relationship("Warning", back_populates="user")
    
    # Notification preferences (added as JSON field)
    notification_preferences = Column(
        JSON,  # Make sure to import JSON from sqlalchemy if not already
        default={
            "emailBookingConfirmations": True,
            "emailServiceReminders": True,
            "emailPromotions": False,
            "pushNewMessages": True,
            "pushStatusUpdates": True
        },
        nullable=True
    )

    # Relationships
    serviceproviders = relationship(
        "ServiceProvider", 
        back_populates="user", 
        uselist=False,
        foreign_keys="[ServiceProvider.user_id]"
    )
    homeowner = relationship(
        "HomeOwner", 
        back_populates="user", 
        uselist=False,
        foreign_keys="[HomeOwner.user_id]"
    )

    conversations_as_user1 = relationship(
        "Conversation", 
        foreign_keys="[Conversation.user1_id]",
        back_populates="user1"
    )
    conversations_as_user2 = relationship(
        "Conversation", 
        foreign_keys="[Conversation.user2_id]",
        back_populates="user2"
    )

    admin = relationship("Admin", back_populates="user", uselist=False)
    sent_messages = relationship("Message", foreign_keys="Message.sender_id", back_populates="sender")
    received_messages = relationship("Message", foreign_keys="Message.receiver_id", back_populates="receiver")
    
    def __repr__(self):
        return f"<User {self.email} ({self.role})>"
    
    def verify_password(self, plain_password: str) -> bool:
        """Verify the provided password against the stored hash"""
        return pwd_context.verify(plain_password, self.password_hash)
    
    def update_password(self, new_password: str) -> None:
        """Update the user's password with a new hash"""
        self.password_hash = pwd_context.hash(new_password)
        self.updated_at = datetime.utcnow()


    def update_notification_preferences(self, preferences: Dict[str, Any]):
        """Helper method to update notification preferences"""
        if not self.notification_preferences:
            self.notification_preferences = {}
        self.notification_preferences.update(preferences)

class ServiceProvider(Base):
    __tablename__ = "serviceproviders"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True)
    business_name = Column(String)
    service_name = Column(String)
    address = Column(String)
    years_experience = Column(Integer)
    service_description = Column(String)
    id_verification = Column(String)
    certification = Column(String)
    is_verified = Column(Boolean, default=False)
    verification_date = Column(DateTime)
    verification_by = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    
    user = relationship("User", back_populates="serviceproviders", foreign_keys=[user_id])
    verified_by_admin = relationship("User", foreign_keys=[verification_by])
    services = relationship("Service", back_populates="provider", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<ServiceProvider {self.business_name or self.user.full_name}>"

class HomeOwner(Base):
    __tablename__ = "homeowners"

    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True)
    
    # Relationships
    user = relationship("User", back_populates="homeowner", foreign_keys=[user_id])
    bookings = relationship("Booking", back_populates="homeowner", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="homeowner", cascade="all, delete-orphan")
    
    def __repr__(self):
        return f"<HomeOwner {self.user.full_name if self.user else 'Unknown'}>"
class Service(Base):
    __tablename__ = "services"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    provider_id = Column(UUID(as_uuid=True), ForeignKey("serviceproviders.id"))
    title = Column(String, nullable=False)
    description = Column(String)
    price = Column(Integer)
    image = Column(String, nullable=True)
    rating = Column(Integer, default=0)
    provider_name = Column(String)  
    created_at = Column(DateTime, default=datetime.utcnow)
    is_active = Column(Boolean, default=True)
    
    # Relationships
    provider = relationship("ServiceProvider", back_populates="services")
    bookings = relationship("Booking", back_populates="service", cascade="all, delete-orphan")
    reviews = relationship("Review", back_populates="service", cascade="all, delete-orphan")

class Booking(Base):
    __tablename__ = "bookings"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id"))
    homeowner_id = Column(UUID(as_uuid=True), ForeignKey("homeowners.id"))
    provider_id = Column(UUID(as_uuid=True), ForeignKey("serviceproviders.id"))
    scheduled_date = Column(Date)
    scheduled_time = Column(String)
    status = Column(
        SQLAlchemyEnum(BookingStatus, values_callable=lambda x: [e.value for e in BookingStatus]),
        default=BookingStatus.PENDING,
        nullable=False
    )
    price = Column(Float)
    address = Column(String)
    notes = Column(String, nullable=True)
    service_title = Column(String)
    service_image = Column(String)
    provider_name = Column(String)
    homeowner_name = Column(String)
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    rating = Column(Integer, nullable=True)

    # Relationships
    service = relationship("Service", back_populates="bookings")
    homeowner = relationship("HomeOwner", back_populates="bookings")

    messages = relationship("Message", back_populates="booking", cascade="all, delete-orphan")

    review = relationship("Review", back_populates="booking", uselist=False, cascade="all, delete-orphan")
    reports = relationship("Report", back_populates="booking")
    # Add these fields for denormalized data
    has_review = Column(Boolean, default=False, server_default="false")
    review_rating = Column(Integer, nullable=True)

class ProviderRegistrationRequest(Base):
    __tablename__ = "provider_registration_requests"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    full_name = Column(String, nullable=False)
    email = Column(String, unique=True, nullable=False)
    phone_number = Column(String, nullable=True)
    address = Column(String, nullable=True)
    years_experience = Column(Integer, nullable=True)
    password_hash = Column(String, nullable=False)
    id_verification = Column(String, nullable=True)
    certification = Column(String, nullable=True)
    status = Column(SQLAlchemyEnum(RegistrationStatus), default=RegistrationStatus.PENDING)
    rejection_reason = Column(String, nullable=True)
    requested_at = Column(DateTime, default=datetime.utcnow)
    processed_at = Column(DateTime, nullable=True)
    processed_by = Column(UUID(as_uuid=True), ForeignKey("users.id"), nullable=True)
    
    processed_by_admin = relationship("User", foreign_keys=[processed_by])
    
    def __repr__(self):
        return f"<ProviderRegistrationRequest {self.email} ({self.status})>"

class Admin(Base):
    __tablename__ = "admins"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    user_id = Column(UUID(as_uuid=True), ForeignKey("users.id"), unique=True)
    is_super_admin = Column(Boolean, default=False)
    
    user = relationship("User", back_populates="admin", foreign_keys=[user_id])
    
    def __repr__(self):
        return f"<Admin {self.user.full_name if self.user else 'Unknown'}>"
    


class Message(Base):
    __tablename__ = 'messages'
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    sender_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    receiver_id = Column(UUID(as_uuid=True), ForeignKey('users.id'), nullable=False)
    booking_id = Column(UUID(as_uuid=True), ForeignKey('bookings.id'), nullable=True)
    conversation_id = Column(UUID(as_uuid=True), ForeignKey('conversations.id'), nullable=True)  # 👈 Add this line
    content = Column(Text, nullable=False)
    timestamp = Column(DateTime, default=datetime.utcnow)
    read = Column(Boolean, default=False)
    
    # Relationships
    sender = relationship("User", foreign_keys=[sender_id], back_populates="sent_messages")
    receiver = relationship("User", foreign_keys=[receiver_id], back_populates="received_messages")
    booking = relationship("Booking", back_populates="messages")
    conversation = relationship("Conversation", back_populates="messages")  # 👈 Add this line



class Conversation(Base):
    __tablename__ = "conversations"
    
    id = Column(UUID(as_uuid=True), primary_key=True, default=uuid.uuid4)
    user1_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    user2_id = Column(UUID(as_uuid=True), ForeignKey("users.id"))
    created_at = Column(DateTime, default=datetime.utcnow)
    updated_at = Column(DateTime, default=datetime.utcnow, onupdate=datetime.utcnow)
    
    # Relationships
    user1 = relationship("User", foreign_keys=[user1_id])
    user2 = relationship("User", foreign_keys=[user2_id])
    messages = relationship("Message", back_populates="conversation")


class Review(Base):
    __tablename__ = "reviews"
    
    id = Column(UUID(as_uuid=True), primary_key=True, server_default=text("gen_random_uuid()"))
    booking_id = Column(UUID(as_uuid=True), ForeignKey("bookings.id"), nullable=False)
    service_id = Column(UUID(as_uuid=True), ForeignKey("services.id"), nullable=False)
    homeowner_id = Column(UUID(as_uuid=True), ForeignKey("homeowners.id"), nullable=False)
    rating = Column(Integer, nullable=False)
    review_text = Column(Text, nullable=True)
    created_at = Column(DateTime, default=datetime.utcnow)
    
    # Relationships
    booking = relationship("Booking", back_populates="review")
    service = relationship("Service", back_populates="reviews")
    homeowner = relationship("HomeOwner", back_populates="reviews")
    
    def __repr__(self):
        return f"<Review {self.rating} stars for Booking {self.booking_id}>"
    

    @staticmethod
    def update_service_rating(session, service_id):
        """Update the average rating and review count for the service"""
        # Calculate new average rating and count
        result = session.query(
            func.avg(Review.rating).label('rating'),
            func.count(Review.id).label('review_count')
        ).filter(
            Review.service_id == service_id
        ).first()
        
        # Update the service
        service = session.query(Service).get(service_id)
        if service and result.rating is not None:
            service.rating = round(float(result.rating), 1)
            service.review_count = result.review_count

# Set up event listeners
@event.listens_for(Session, 'after_flush')
def after_flush(session, context):
    """After flush handler to update service ratings"""
    # Get all service_ids that need updating
    service_ids = set()
    
    # Create a set of all service IDs from new, dirty, and deleted reviews
    for instance in session.new:
        if isinstance(instance, Review):
            service_ids.add(instance.service_id)
    
    for instance in session.dirty:
        if isinstance(instance, Review):
            service_ids.add(instance.service_id)
    
    for instance in session.deleted:
        if isinstance(instance, Review):
            service_ids.add(instance.service_id)
    
    # If we have services to update, register an after_commit handler
    if service_ids:
        @event.listens_for(session, 'after_commit', once=True)
        def after_commit(session):
            # Create a new session to avoid conflicts with the flushed session
            new_session = Session(bind=session.bind)
            try:
                for service_id in service_ids:
                    Review.update_service_rating(new_session, service_id)
                new_session.commit()
            except Exception as e:
                new_session.rollback()
                raise e
            finally:
                new_session.close()
   