from pydantic import BaseModel, EmailStr, Field, SecretStr, HttpUrl
from typing import Optional, Union, List
import re
from datetime import datetime, date
from enum import Enum
from uuid import UUID
from pydantic import UUID4

class UserCreate(BaseModel):
    full_name: str
    role: str
    email: EmailStr
    phone_number: str
    address: str
    years_experience: str
    password: str

class UserLogin(BaseModel):
    email: EmailStr
    password: str
    role: str

class Token(BaseModel):
    access_token: str
    token_type: str
    role: str
    user_id: UUID  # Changed to UUID
    redirect_to: str
    documents_verified: Optional[bool] = None

class ServiceBase(BaseModel):
    title: str
    description: str
    price: float
    image: str

class ServiceCreate(ServiceBase):
    provider_id: UUID  # Changed to UUID

from pydantic import ConfigDict

class Service(BaseModel):
    id: UUID  # Changed to UUID
    title: str
    description: str
    price: int
    image: str
    rating: int
    provider_name: str
    created_at: datetime
    provider_id: UUID  # Changed to UUID
    
    model_config = ConfigDict(from_attributes=True)

class ServiceUpdate(BaseModel):
    title: Optional[str] = None
    description: Optional[str] = None
    price: Optional[int] = None
    image: Optional[str] = None
    is_active: Optional[bool] = None
    
    model_config = ConfigDict(from_attributes=True)

class AdminCreate(BaseModel):
    full_name: str
    email: EmailStr
    password: str
    is_super_admin: bool = False

class AdminResponse(BaseModel):
    id: UUID  # Changed to UUID
    email: str
    full_name: str
    is_super_admin: bool
    created_at: datetime

class BookingStatus(str, Enum):
    PENDING = "pending"
    CONFIRMED = "confirmed"
    COMPLETED = "completed"
    CANCELLED = "cancelled"

class BookingBase(BaseModel):
    service_id: UUID  # Changed to UUID
    scheduled_date: date
    scheduled_time: str
    address: str
    notes: Optional[str] = None

class BookingCreate(BookingBase):
    service_title: Optional[str] = None
    provider_name: Optional[str] = None
    homeowner_name: Optional[str] = None

class BookingResponse(BaseModel):
    id: UUID  # Changed to UUID
    service_id: UUID  # Changed to UUID
    homeowner_id: UUID  # Changed to UUID
    provider_id: UUID  # Changed to UUID
    scheduled_date: date
    scheduled_time: str
    status: str
    price: float
    address: str
    notes: Optional[str] = None
    service_title: str
    service_image: Optional[str] = None
    provider_name: str
    homeowner_name: str
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class BookingUpdate(BaseModel):
    status: Optional[BookingStatus] = None
    scheduled_date: Optional[date] = None
    scheduled_time: Optional[str] = None
    address: Optional[str] = None
    notes: Optional[str] = None

    class Config:
        from_attributes = True
        json_encoders = {
            datetime: lambda v: v.isoformat(),
            date: lambda v: v.isoformat()
        }

class BookingListResponse(BaseModel):
    upcoming: List[BookingResponse]
    past: List[BookingResponse]

class AvailabilityCheck(BaseModel):
    service_id: UUID  # Changed to UUID
    date: date
    duration: int  # in minutes

class TimeSlot(BaseModel):
    start_time: str
    end_time: str
    available: bool

class AvailabilityResponse(BaseModel):
    date: date
    slots: List[TimeSlot]

class BookingStats(BaseModel):
    total: int
    pending: int
    confirmed: int
    completed: int
    cancelled: int
    revenue: float

class ChatInput(BaseModel):
    message: str

class ChatResponse(BaseModel):
    response: str

class MessageBase(BaseModel):
    content: str
    receiver_id: UUID  # Changed to UUID
    booking_id: Optional[UUID] = None  # Changed to UUID

class MessageCreate(MessageBase):
    pass

class MessageRead(MessageBase):
    id: UUID  # Changed to UUID
    sender_id: UUID  # Changed to UUID
    is_read: bool
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class ConversationRead(BaseModel):
    id: UUID  # Changed to UUID
    participant1_id: UUID  # Changed to UUID
    participant2_id: UUID  # Changed to UUID
    last_message_at: datetime
    created_at: datetime
    updated_at: datetime

    model_config = ConfigDict(from_attributes=True)

class PasswordChangeRequest(BaseModel):
    password: str
    new_password: str
    confirm_password: Optional[str]


class UserProfileResponse(BaseModel):
    id: str
    email: str
    full_name: Optional[str] = None
    avatar_url: Optional[str] = None

class ReviewBase(BaseModel):
    rating: int = Field(..., ge=1, le=5)
    review_text: Optional[str] = None

class ReviewCreate(ReviewBase):
    pass

class ReviewResponse(ReviewBase):
    id: UUID
    booking_id: UUID
    service_id: UUID
    homeowner_id: UUID
    homeowner_name: str
    created_at: datetime
    homeowner_name: str 
    
    model_config = ConfigDict(from_attributes=True)








from pydantic import BaseModel, UUID4
from datetime import datetime
from enum import Enum
from typing import Optional, List

# Define ReportStatus enum to match SQLAlchemy model
class ReportStatus(str, Enum):
    OPEN = "open"
    RESOLVED = "resolved"

# Schema for creating a report
class ReportCreate(BaseModel):
    booking_id: UUID4
    title: str
    description: str

    class Config:
        from_attributes = True

# Schema for report response
class Report(BaseModel):
    id: UUID4
    booking_id: UUID4
    homeowner_id: UUID4
    provider_id: UUID4
    title: str
    description: str
    status: ReportStatus
    service_title: str
    provider_name: str
    homeowner_name: str
    created_at: datetime
    updated_at: Optional[datetime] = None

    class Config:
        from_attributes = True

# Schema for listing reports
class ReportList(BaseModel):
    reports: List[Report]
    total_count: int

    class Config:
        from_attributes = True

class ReportAction(BaseModel):
    message: Optional[str] = None

class WarnProvider(ReportAction):
    warning_message: Optional[str] = None

class SuspendProvider(ReportAction):
    suspension_reason: Optional[str] = None
    suspension_days: int = 7

class EmailCheck(BaseModel):
    email: EmailStr

class PasswordReset(BaseModel):
    email: EmailStr

class PasswordResetConfirm(BaseModel):
    token: str
    new_password: str

