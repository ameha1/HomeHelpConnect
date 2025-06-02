from fastapi import FastAPI, Depends, HTTPException, File, UploadFile, Form, status, Body, Request, Query
from fastapi.responses import JSONResponse
from fastapi.middleware.cors import CORSMiddleware
from sqlalchemy.orm import Session
from sqlalchemy.sql import and_, func, case, or_  
import shutil
import os
from datetime import datetime, timedelta
from typing import Optional, List
import uuid
from fastapi.security import OAuth2PasswordBearer
from schemas import BookingCreate, ChatResponse, ChatInput, PasswordChangeRequest, UserProfileResponse,ReportCreate, ReportList, SuspendProvider, Report

# from booking_homeowner_router import router as booking_homeowner_router
# from booking_router import router as booking_router

from jose import JWTError, jwt
from typing_extensions import Annotated
from pydantic import BaseModel
from pydantic import UUID4
import math

class RatingInput(BaseModel):
    rating: int  


class RatingInput(BaseModel):
    rating: int  


SECRET_KEY = "mysecret"  
ALGORITHM = "HS256"  
oauth2_scheme = OAuth2PasswordBearer(tokenUrl="admin/login")

SUPER_ADMIN_TOKEN_EXPIRE_MINUTES = 120  
ADMIN_TOKEN_EXPIRE_MINUTES = 60         

from database import get_db, engine
from auth import hash_password, verify_password, create_access_token, get_current_admin_user, get_current_super_admin, get_current_user, get_current_user_for_messaging, create_admin_token
from models import (
    Base, 
    User, 
    ServiceProvider, 
    HomeOwner, 
    Service, 
    ProviderRegistrationRequest,
    UserRole,
    RegistrationStatus,
    Admin,
    Booking,
    BookingStatus,
    Message,
    Conversation,
    Review,
    ReportStatus,
    Warning
)

from models import Report as ReportModel
from schemas import ServiceCreate,AdminCreate,AdminResponse,Service as ServiceSchema, Token, ServiceUpdate, ConversationRead, MessageCreate, MessageRead, WarnProvider, Report
from fastapi.staticfiles import StaticFiles
import os

from chat_assistant import AiAssistant
import socketio
from starlette.middleware.cors import CORSMiddleware


app = FastAPI()

assistant = AiAssistant()

sio = socketio.AsyncServer(async_mode='asgi', cors_allowed_origins="*")
app_sio = socketio.ASGIApp(sio, app)

# Configure CORSnpm run dev
app.add_middleware(
    CORSMiddleware,
    allow_origins=["*"],
    allow_credentials=True,
    allow_methods=["*"],  
    allow_headers=["*"],
    expose_headers=["*"] 
)

# app.include_router(booking_router)
# app.include_router(booking_homeowner_router)

UPLOAD_DIR = "static/uploads"
os.makedirs(UPLOAD_DIR, exist_ok=True)


app.mount("/static", StaticFiles(directory="static"), name="static")

Base.metadata.create_all(bind=engine)

UPLOAD_DIR = "static/uploads/"
os.makedirs(UPLOAD_DIR, exist_ok=True)


@sio.event
async def connect(sid, environ, auth):
    token = auth.get("token") if auth else None
    if not token:
        print(f"Connection rejected for sid {sid}: No token provided")
        return False
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        user_id = payload.get("user_id")
        if not user_id:
            print(f"Connection rejected for sid {sid}: Invalid user_id")
            return False
        await sio.save_session(sid, {'user_id': user_id})
        sio.enter_room(sid, str(user_id))
        print(f"User {user_id} connected with sid {sid}")
        return True
    except JWTError as e:
        print(f"Connection rejected for sid {sid}: JWTError {str(e)}")
        return False

@sio.event
async def disconnect(sid):
    session = await sio.get_session(sid)
    user_id = session.get('user_id')
    if user_id:
        sio.leave_room(sid, str(user_id))
    print(f"Client disconnected: {sid}")

@sio.event
async def private_message(sid, data):
    session = await sio.get_session(sid)
    sender_id = session.get('user_id')
    if not sender_id:
        return

    receiver_id = data.get('receiverId')
    content = data.get('content')

    if not receiver_id or not content:
        print(f"Invalid message data from {sender_id}")
        return

    # Save message to database
    try:
        async with app.state.db() as db:  # Assuming db is stored in app.state
            sender = db.query(User).filter(User.id == sender_id).first()
            receiver = db.query(User).filter(User.id == receiver_id).first()
            if not sender or not receiver:
                print(f"Invalid sender or receiver: {sender_id}, {receiver_id}")
                return

            participants = sorted([sender_id, receiver_id])
            conversation = db.query(Conversation).filter(
                Conversation.user1_id == participants[0],
                Conversation.user2_id == participants[1]
            ).first()

            if not conversation:
                conversation = Conversation(
                    id=uuid.uuid4(),
                    user1_id=participants[0],
                    user2_id=participants[1],
                    created_at=datetime.utcnow(),
                    updated_at=datetime.utcnow()
                )
                db.add(conversation)
                db.commit()
                db.refresh(conversation)

            message = Message(
                id=uuid.uuid4(),
                sender_id=sender_id,
                receiver_id=receiver_id,
                content=content,
                timestamp=datetime.utcnow(),
                read=False,
                conversation_id=conversation.id
            )
            db.add(message)
            db.commit()
            db.refresh(message)

            # Prepare message payload
            message_data = {
                "id": str(message.id),
                "sender_id": str(message.sender_id),
                "receiver_id": str(message.receiver_id),
                "senderName": sender.full_name,
                "senderRole": sender.role.lower(),
                "senderImage": getattr(sender, 'profile_image', None),
                "content": message.content,
                "timestamp": message.timestamp.isoformat(),
                "read": message.read,
                "conversation_id": str(conversation.id)
            }

            # Broadcast to receiver
            await sio.emit('private_message', message_data, room=str(receiver_id))
            # Echo back to sender
            await sio.emit('private_message', message_data, room=str(sender_id))

    except Exception as e:
        print(f"Error processing message from {sender_id}: {str(e)}")



def save_upload_file(upload_file: UploadFile, destination: str) -> str:
    try:
        file_ext = os.path.splitext(upload_file.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(destination, unique_filename)
        
        with open(file_path, "wb") as buffer:
            shutil.copyfileobj(upload_file.file, buffer)
            
        return file_path
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error saving file: {str(e)}"
        )


@app.post("/register/provider/request")
async def register_provider_request(
    full_name: Annotated[str, Form(...)],
    email: Annotated[str, Form(...)],
    password: Annotated[str, Form(...)],
    phone_number: Annotated[Optional[str], Form()] = None,
    address: Annotated[Optional[str], Form()] = None,
    years_experience: Annotated[Optional[int], Form()] = None,
    id_verification: Optional[UploadFile] = File(None),
    certification: Optional[UploadFile] = File(None),
    db: Session = Depends(get_db)
):
    try:
        # Check if email exists in either User or ProviderRegistrationRequest
        if (db.query(User).filter(User.email == email).first() or
           db.query(ProviderRegistrationRequest).filter(ProviderRegistrationRequest.email == email).first()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Handle file uploads if provided
        id_path = save_upload_file(id_verification, UPLOAD_DIR) if id_verification else None
        cert_path = save_upload_file(certification, UPLOAD_DIR) if certification else None

        # Create registration request instead of direct User/ServiceProvider
        registration_request = ProviderRegistrationRequest(
            full_name=full_name,
            email=email,
            phone_number=phone_number,
            address=address,
            years_experience=years_experience,
            password_hash=hash_password(password),
            id_verification=id_path,
            certification=cert_path,
            status=RegistrationStatus.PENDING.value,
            requested_at=datetime.utcnow()
        )

        db.add(registration_request)
        db.commit()

        return JSONResponse(
            status_code=201,
            content={
                "message": "Registration request submitted successfully. Please wait for admin approval.",
                "request_id": str(registration_request.id),  # Convert UUID to string
                "needs_documents": not (id_path and cert_path),
                "redirect_to": "/login"
            }
        )
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error submitting registration request: {str(e)}"
        )

@app.post("/provider/upload-documents")
async def upload_provider_documents(
    id_verification: UploadFile = File(...),
    certification: UploadFile = File(...),
    db: Session = Depends(get_db),
    token: str = Depends(oauth2_scheme)
):
    try:
        # Verify token first
        try:
            payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
            email: str = payload.get("sub")

            if email is None:
                raise HTTPException(
                    status_code=status.HTTP_401_UNAUTHORIZED,
                    detail="Invalid authentication credentials"
                )
        except JWTError as e:
            
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail=f"Invalid token: {str(e)}"
            )

        # Get user from token
        user = db.query(ProviderRegistrationRequest).filter(ProviderRegistrationRequest.email == email).first()
        if not user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User not found"
            )
        
        # Save documents
        id_path = save_upload_file(id_verification, UPLOAD_DIR)
        cert_path = save_upload_file(certification, UPLOAD_DIR)

        # Update provider record
        provider = db.query(ProviderRegistrationRequest).filter(ProviderRegistrationRequest.id == user.id).first()
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found"
            )

        provider.id_verification = id_path
        provider.certification = cert_path
        provider.is_verified = False  # Needs admin approval
        
        db.add(provider)
        db.commit()

        return {
            "message": "Documents uploaded successfully. Please wait for admin approval.",
            "provider_id": provider.id,
            "redirect_to": "/dashboard/provider/pending_userWithDocuments"
        }
    
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error uploading documents: {str(e)}"
        )

@app.get("/provider/status")
async def check_provider_status(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != UserRole.SERVICEPROVIDERS.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only service providers can access this endpoint"
        )
    
    provider = db.query(ServiceProvider).filter(ServiceProvider.user_id == current_user.id).first()
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found"
        )
    
    return {
        "is_verified": provider.is_verified,
        "needs_documents": not (provider.id_verification and provider.certification)
    }


# Admin Registration Endpoint
@app.post("/register/admin/")
async def register_admin(
    admin_data: AdminCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)  # Only super admins can create new admins
):
    try:
        # Check if email exists
        if db.query(User).filter(User.email == admin_data.email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Create base User
        new_user = User(
            email=admin_data.email,
            password_hash=hash_password(admin_data.password),
            full_name=admin_data.full_name,
            role=UserRole.ADMIN.value,
            is_active=True
        )
        db.add(new_user)
        db.flush()  # Flush to get the user ID

        # Create Admin
        new_admin = Admin(
            user_id=new_user.id,
            is_super_admin=admin_data.is_super_admin
        )

        db.add(new_admin)
        db.commit()

        return {
            "message": "Admin created successfully",
            "user_id": new_user.id,
            "admin_id": new_admin.id,
            "is_super_admin": new_admin.is_super_admin
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating admin: {str(e)}"
        )
    
#admin login endpoint
@app.post("/admin/login")
async def admin_login(
    credentials: dict = Body(...),
    db: Session = Depends(get_db)
):
    try:
        email = credentials.get("email")
        password = credentials.get("password")

        if not email or not password:
            raise HTTPException(
                status_code=status.HTTP_422_UNPROCESSABLE_ENTITY,
                detail="Email and password are required"
            )

        user = db.query(User).filter(User.email == email).first()
        if not user or user.role != UserRole.ADMIN.value:
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid admin credentials"
            )

        if not verify_password(password, user.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Invalid admin credentials"
            )

        admin = db.query(Admin).filter(Admin.user_id == user.id).first()
        if not admin:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="User is not an admin"
            )

        # Create token with proper expiration
        access_token = create_admin_token(
            email=user.email,
            user_id=user.id,
            is_super_admin=admin.is_super_admin
        )
        
        return {
            "access_token": access_token,
            "token_type": "bearer",
            "expires_in": SUPER_ADMIN_TOKEN_EXPIRE_MINUTES * 60 if admin.is_super_admin else ADMIN_TOKEN_EXPIRE_MINUTES * 60,
            "admin": {
                "id": admin.id,
                "email": user.email,
                "full_name": user.full_name,
                "is_super_admin": admin.is_super_admin
            }
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Login failed: {str(e)}"
        )
    
#Fetch available admins
@app.get("/admins", response_model=List[AdminResponse])
async def get_all_admins(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_super_admin)  # Only super admins can access
):
    """
    Fetch all admin users from the database
    Requires super admin privileges
    """
    try:
        # Query all admin users with their related User information
        admins = db.query(Admin).join(User).all()
        
        return [
            {
                "id": admin.id,
                "email": admin.user.email,
                "full_name": admin.user.full_name,
                "is_super_admin": admin.is_super_admin,
                "created_at": admin.user.created_at
            }
            for admin in admins
        ]
    
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching admins: {str(e)}"
        )

# Admin Approval Endpoints
@app.get("/admin/registration-requests")
async def get_registration_requests(
    status: Optional[str] = None,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    try:
        query = db.query(ProviderRegistrationRequest)
        if status:
            query = query.filter(ProviderRegistrationRequest.status == status)
        requests = query.order_by(ProviderRegistrationRequest.requested_at.desc()).all()
        return requests
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching requests: {str(e)}"
        )

# approval endpoint
@app.post("/admin/registration-requests/{request_id}/approve")
async def approve_registration(
    request_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    try:
        # Get the registration request
        registration_request = db.query(ProviderRegistrationRequest).filter(
            ProviderRegistrationRequest.id == request_id,
            ProviderRegistrationRequest.status == RegistrationStatus.PENDING.value
        ).first()

        if not registration_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found or already processed"
            )

        # Check if documents are provided
        if not registration_request.id_verification or not registration_request.certification:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Cannot approve provider without ID verification and certification documents"
            )

        # Create base User first
        new_user = User(
            email=registration_request.email,
            password_hash=registration_request.password_hash,
            full_name=registration_request.full_name,
            phone_number=registration_request.phone_number,
            role=UserRole.SERVICEPROVIDERS.value,
            is_active=True
        )
        db.add(new_user)
        db.flush()  # Flush to get the user ID

        # Create ServiceProvider linked to the User
        new_provider = ServiceProvider(
            user_id=new_user.id,
            business_name=registration_request.full_name,
            address=registration_request.address,
            years_experience=registration_request.years_experience,
            id_verification=registration_request.id_verification,
            certification=registration_request.certification,
            is_verified=True,
            verification_date=datetime.utcnow(),
            verification_by=current_user.id
        )

        # Update request status
        registration_request.status = RegistrationStatus.APPROVED.value
        registration_request.processed_at = datetime.utcnow()
        registration_request.processed_by = current_user.id

        db.add(new_provider)
        db.add(registration_request)
        db.commit()

        # Get updated list of pending requests
        pending_requests = db.query(ProviderRegistrationRequest).filter(
            ProviderRegistrationRequest.status == RegistrationStatus.PENDING.value
        ).all()

        return {
            "message": "Registration approved successfully",
            "user_id": new_user.id,
            "provider_id": new_provider.id,
            "updatedRequests": pending_requests  # Return fresh list
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error approving registration: {str(e)}"
        )

# rejection endpoint 
@app.post("/admin/registration-requests/{request_id}/reject")
async def reject_registration(
    request_id: str,
    reason: str = Body(..., embed=True),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    try:
        registration_request = db.query(ProviderRegistrationRequest).filter(
            ProviderRegistrationRequest.id == request_id,
            ProviderRegistrationRequest.status == RegistrationStatus.PENDING.value
        ).first()

        if not registration_request:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Request not found or already processed"
            )

        registration_request.status = RegistrationStatus.REJECTED.value
        registration_request.rejection_reason = reason
        registration_request.processed_at = datetime.utcnow()
        registration_request.processed_by = current_user.id

        db.add(registration_request)
        db.commit()

        # Get updated list of pending requests
        pending_requests = db.query(ProviderRegistrationRequest).filter(
            ProviderRegistrationRequest.status == RegistrationStatus.PENDING.value
        ).all()

        return {
            "message": "Registration rejected successfully",
            "updatedRequests": pending_requests  # Return fresh list
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error rejecting registration: {str(e)}"
        )

# Homeowner Registration 
@app.post("/register/homeowner/")
async def register_homeowner(
    full_name: Annotated[str, Form(...)],
    email: Annotated[str, Form(...)],
    password: Annotated[str, Form(...)],
    phone_number: Annotated[Optional[str], Form()] = None,
    address: Annotated[Optional[str], Form()] = None,
    db: Session = Depends(get_db)
):
    try:
        if db.query(User).filter(User.email == email).first():
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Email already registered"
            )

        # Create base User - use lowercase 'homeowner'
        new_user = User(
            email=email,
            password_hash=hash_password(password),
            full_name=full_name,
            phone_number=phone_number,
            address=address,  # Address now stored in User table
            role=UserRole.HOMEOWNERS.value,
            is_active=True
        )
        db.add(new_user)
        db.flush()

        # Create HomeOwner (without address)
        new_homeowner = HomeOwner(
            user_id=new_user.id
            # No address field here anymore
        )

        db.add(new_homeowner)
        db.commit()

        return {
            "message": "Homeowner created successfully",
            "user_id": new_user.id,
            "homeowner_id": new_homeowner.id
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating user: {str(e)}"
        )

# Authentication Endpoints
@app.post("/signin/", response_model=Token)
def signin(
    email: Annotated[str, Form(...)],
    password: Annotated[str, Form(...)],
    role: Annotated[UserRole, Form(...)],
    db: Session = Depends(get_db)
):
    # First check if user exists in registration requests
    registration_request = db.query(ProviderRegistrationRequest).filter(
        ProviderRegistrationRequest.email == email,
        ProviderRegistrationRequest.status == RegistrationStatus.PENDING.value
    ).first()

    if registration_request:
        # Verify password matches the registration request
        if not verify_password(password, registration_request.password_hash):
            raise HTTPException(
                status_code=status.HTTP_401_UNAUTHORIZED,
                detail="Incorrect password"
            )
        
        # Check if the requested role matches
        if role != UserRole.SERVICEPROVIDERS:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Pending registration is for service provider role only"
            )
        
        # Return limited access token with pending status
        return JSONResponse(
            status_code=200,
            content={
                "access_token": create_access_token(
                    data={
                        "sub": registration_request.email,
                        "temp_user_id": str(registration_request.id),  # Convert to string
                        "role": UserRole.SERVICEPROVIDERS.value,
                        "is_pending": True
                    }
                ),
                "token_type": "bearer",
                "role": UserRole.SERVICEPROVIDERS.value,
                "is_pending": True,
                "needs_documents": not (registration_request.id_verification and registration_request.certification),
                "redirect_to": "dashboard/provider/pending_user",
            }
        )

    # If not in registration requests, check the User table
    user = db.query(User).filter(User.email == email).first()
    if not user:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="User not found"
        )
    
    # Verify role matches
    if user.role != role.value:  # Compare with .value
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="User does not have this role"
        )
    
    if not verify_password(password, user.password_hash):
        raise HTTPException(
            status_code=status.HTTP_401_UNAUTHORIZED,
            detail="Incorrect password"
        )
    
    # For service providers, check verification status
    if role == UserRole.SERVICEPROVIDERS:
        provider = db.query(ServiceProvider).filter(ServiceProvider.user_id == user.id).first()
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider record not found"
            )
        
        needs_docs = not (provider.id_verification and provider.certification)
        
        if needs_docs or not provider.is_verified:
            return JSONResponse(
                status_code=200,
                content={
                    "access_token": create_access_token(
                        data={
                            "sub": user.email,
                            "user_id": str(user.id),  # Convert to string
                            "role": user.role
                        }
                    ),
                    "token_type": "bearer",
                    "role": role.value,
                    "user_id": str(user.id),  # Convert to string
                    "redirect_to": "register/upload-documents",
                    "needs_verification": True,
                    "needs_documents": needs_docs
                }
            )
    
    # Generate token with user details
    access_token = create_access_token(
        data={
            "sub": user.email,
            "user_id": str(user.id),  # Convert to string
            "role": user.role
        }
    )

    # Determine dashboard URL based on role
    dashboard_url = (
        "/dashboard/provider" if role == UserRole.SERVICEPROVIDERS.value
        else "/dashboard/homeowner"
    )

    return {
        "access_token": access_token,
        "token_type": "bearer",
        "role": role.value,
        "user_id": str(user.id),  # Convert to string
        "redirect_to": dashboard_url,
        "documents_verified": False,
    }

# Service Endpoints
@app.post("/services/", response_model=ServiceSchema)
async def create_service(
    title: str = Form(...),
    description: str = Form(...),
    price: float = Form(...),
    image: UploadFile = File(None),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
                # Verify the user is a service provider
        if current_user.role != UserRole.SERVICEPROVIDERS.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only service providers can create services"
            )

        # Get the provider record
        provider = db.query(ServiceProvider).filter(
            ServiceProvider.user_id == current_user.id
        ).first()
        
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Provider record not found"
            )

        # Verify provider is approved
        if not provider.is_verified:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Provider account not yet approved"
            )

        # Handle image upload
        image_url = None
        if image:
            # Generate unique filename
            file_ext = os.path.splitext(image.filename)[1]
            unique_filename = f"{uuid.uuid4()}{file_ext}"
            file_path = os.path.join(UPLOAD_DIR, unique_filename)
            
            # Save the file
            with open(file_path, "wb") as buffer:
                shutil.copyfileobj(image.file, buffer)
            
            image_url = f"/static/uploads/{unique_filename}"

        # Create the service
        db_service = Service(
            title=title,
            description=description,
            price=price,
            provider_id=provider.id,
            image=image_url,
            rating=0,
            provider_name=current_user.full_name,
            created_at=datetime.utcnow()
        )
        
        db.add(db_service)
        db.commit()
        db.refresh(db_service)
        
        return db_service
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating service: {str(e)}"
        )
    

@app.delete("/services/{service_id}")
async def delete_service(
    service_id: UUID4,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # Get the service to delete
        db_service = db.query(Service).filter(Service.id == service_id).first()
        if not db_service:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Service not found"
            )

        # Verify the current user owns this service
        provider = db.query(ServiceProvider).filter(
            ServiceProvider.user_id == current_user.id,
            ServiceProvider.id == db_service.provider_id
        ).first()
        
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to delete this service"
            )

        db.delete(db_service)
        db.commit()
        
        return {"message": "Service deleted successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error deleting service: {str(e)}"
        )

@app.patch("/services/{service_id}", response_model=ServiceSchema)
async def update_service(
    service_id: int,
    service_update: ServiceUpdate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    try:
        # Get the service to update
        db_service = db.query(Service).filter(Service.id == service_id).first()
        if not db_service:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Service not found"
            )

        # Verify the current user owns this service
        provider = db.query(ServiceProvider).filter(
            ServiceProvider.user_id == current_user.id,
            ServiceProvider.id == db_service.provider_id
        ).first()
        
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="You don't have permission to update this service"
            )

        # Update only the fields that were provided
        update_data = service_update.dict(exclude_unset=True)
        for field, value in update_data.items():
            setattr(db_service, field, value)

        db.add(db_service)
        db.commit()
        db.refresh(db_service)
        
        return db_service
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating service: {str(e)}"
        )

@app.get("/services/", response_model=List[ServiceSchema])
async def read_services(
    db: Session = Depends(get_db),
    skip: int = 0,
    limit: int = 100
):
    try:
        services = db.query(Service).offset(skip).limit(limit).all()
        return services  # FastAPI will automatically use ServiceSchema to serialize
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching services: {str(e)}"
        )
    

@app.get("/services/{service_id}", response_model=ServiceSchema)
async def read_service(
    service_id: int,
    db: Session = Depends(get_db)
):
    try:
        service = db.query(Service).filter(Service.id == service_id).first()
        if not service:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Service not found"
            )
        return ServiceSchema.from_orm(service)
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching service: {str(e)}"
        )


@app.get("/provider/services", response_model=List[ServiceSchema])
async def get_provider_services(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all services for the current provider
    """
    try:
        # Verify the user is a service provider
        if current_user.role != UserRole.SERVICEPROVIDERS.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only service providers can access this endpoint"
            )

        # Get the provider record
        provider = db.query(ServiceProvider).filter(
            ServiceProvider.user_id == current_user.id
        ).first()
        
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found"
            )

        # Get all services for this provider
        services = db.query(Service).filter(
            Service.provider_id == provider.id
        ).order_by(Service.created_at.desc()).all()

        return services
    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching provider services: {str(e)}"
        )


@app.get("/auth/validate")
async def validate_token(
    current_user: User = Depends(get_current_admin_user)
):
    return {
        "valid": True,
        "user_id": current_user.id,
        "email": current_user.email
    }

@app.get("/admins/me")
async def get_current_admin(
    current_user: User = Depends(get_current_admin_user)
):
    return {
        "id": current_user.id,
        "email": current_user.email,
        "full_name": current_user.full_name,
        "is_super_admin": current_user.admin.is_super_admin
    }

@app.get("/providers")
async def get_providers(
    verified: bool = True,
    limit: int = 6,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    try:
        providers = db.query(ServiceProvider).filter(
            ServiceProvider.is_verified == verified
        ).limit(limit).all()
        
        return [
            {
                "id": p.id,
                "full_name": p.user.full_name,
                "email": p.user.email,
                "phone_number": p.user.phone_number,
                "years_experience": p.years_experience,
                "is_verified": p.is_verified,
                "created_at": p.user.created_at.isoformat()
            }
            for p in providers
        ]
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching providers: {str(e)}"
        )

@app.get("/reports")
async def get_reports(
    status: str = "open",
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    
    try:
        return []
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching reports: {str(e)}"
        )
    
@app.post("/bookings/{booking_id}/rate")
async def rate_booking(
    booking_id: int,
    rating_input: RatingInput,
    db: Session = Depends(get_db)
):
    # Validate rating range
    if not 1 <= rating_input.rating <= 5:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Rating must be between 1 and 5"
        )

    # Get the booking
    booking = db.query(Booking).filter(Booking.id == booking_id).first()
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found."
        )

    # Check if booking is eligible for rating
    if booking.status != "completed":
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Only completed bookings can be rated."
        )

    # Update booking rating
    booking.rating = rating_input.rating
    db.add(booking)
    
    # Update service average rating
    service = db.query(Service).filter(Service.id == booking.service_id).first()
    if service:
        # Get all non-null ratings for this service
        ratings = db.query(Booking.rating).filter(
            Booking.service_id == service.id,
            Booking.rating.isnot(None)
        ).all()
        
        if ratings:
            # Calculate new average
            avg_rating = sum(r[0] for r in ratings) / len(ratings)
            service.rating = math.ceil(avg_rating * 10) / 10  # Round to 1 decimal place
            db.add(service)
    
    db.commit()
    
    return {
        "message": "Rating submitted successfully!",
        "booking_id": booking_id,
        "service_id": booking.service_id,
        "new_rating": rating_input.rating,
        "service_avg_rating": service.rating if service else None
    }

async def get_current_homeowner(
    token: Annotated[str, Depends(oauth2_scheme)],
    db: Session = Depends(get_db)
):
    credentials_exception = HTTPException(
        status_code=status.HTTP_401_UNAUTHORIZED,
        detail="Could not validate credentials",
        headers={"WWW-Authenticate": "Bearer"},
    )
    try:
        payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
        email: str = payload.get("sub")
        if email is None:
            raise credentials_exception
    except JWTError:
        raise credentials_exception
    
    user = db.query(User).filter(User.email == email).first()
    if user is None:
        raise credentials_exception
    
    if user.role != UserRole.HOMEOWNERS.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only homeowners can access this endpoint"
        )
    
    homeowner = db.query(HomeOwner).filter(HomeOwner.user_id == user.id).first()
    if not homeowner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Homeowner record not found"
        )
    
    return homeowner
 
# chatAssistant endpoint
@app.post("/chat/", response_model=ChatResponse)
async def chat_with_bot(input: ChatInput):
    """
    Endpoint to interact with the HomeHelp Connect Chat Assistant.
    Receives a user message and returns the chatbot's response.
    """
    try:
        response_text = await assistant.generate_response(input.message)
        return {"response": response_text}
    except ValueError as ve:
        raise HTTPException(status_code=400, detail=str(ve))
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error generating response: {e}")


@app.post("/admin/refresh")
async def refresh_token(
    current_admin: User = Depends(get_current_admin_user),
    db: Session = Depends(get_db)
):
    admin = db.query(Admin).filter(Admin.user_id == current_admin.id).first()
    if not admin:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Admin record not found"
        )

    new_token = create_admin_token(
        email=current_admin.email,
        user_id=current_admin.id,
        is_super_admin=admin.is_super_admin
    )
    
    return {
        "access_token": new_token,
        "token_type": "bearer"
    }

@app.get("/auth/validate-admin")
async def validate_admin_token(
    current_user: User = Depends(get_current_admin_user)
):
    return {
        "valid": True,
        "user_id": current_user.id,
        "email": current_user.email,
        "is_super_admin": current_user.admin.is_super_admin
    }


import bookings

app.include_router(bookings.router)


import uvicorn
from recommendation_router import router as recommendation_router
app.include_router(recommendation_router)

if __name__ == "__main__":
    uvicorn.run(app, host="0.0.0.0", port=8000)


class UserBase(BaseModel):
    id: UUID4
    name: str
    email: str
    image: Optional[str] = None
    user_type: str

    class Config:
        from_attributes = True

class MessageBase(BaseModel):
    id: UUID4
    sender_id: UUID4
    receiver_id: UUID4
    conversation_id: Optional[UUID4] = None
    sender_name: str
    sender_role: Optional[str] = None
    sender_image: Optional[str] = None
    content: str
    timestamp: datetime
    read: bool

    class Config:
        from_attributes = True

class ConversationBase(BaseModel):
    id: UUID4
    user1_id: UUID4
    user2_id: UUID4
    created_at: datetime
    updated_at: datetime

    class Config:
        from_attributes = True

class MessageCreate(BaseModel):
    receiverId: UUID4  # Changed to UUID4 type
    content: str

class Contact(BaseModel):
    id: UUID4  # Changed to UUID4 type
    service_provider_id: Optional[UUID4] = None
    name: str
    email: str
    image: Optional[str] = None
    lastMessage: Optional[str] = None
    lastMessageTime: Optional[datetime] = None
    unread: bool

class CreateContactRequest(BaseModel):
    contact_id: UUID4  # Changed to UUID4 type
    name: Optional[str] = None
    email: Optional[str] = None
    image: Optional[str] = None


from fastapi import FastAPI, WebSocket, WebSocketDisconnect
from fastapi.middleware.cors import CORSMiddleware
from typing import Dict


class ConnectionManager:
    def __init__(self):
        self.active_connections: Dict[str, WebSocket] = {}

    async def connect(self, websocket: WebSocket, user_id: str):
        await websocket.accept()
        self.active_connections[user_id] = websocket

    def disconnect(self, user_id: str):
        if user_id in self.active_connections:
            del self.active_connections[user_id]

    async def send_personal_message(self, message: str, user_id: str):
        if user_id in self.active_connections:
            await self.active_connections[user_id].send_text(message)

    async def broadcast(self, message: str):
        for connection in self.active_connections.values():
            await connection.send_text(message)


manager = ConnectionManager()

# In main.py
# @app.websocket("/ws/socket.io")
# async def websocket_endpoint(websocket: WebSocket):
#     try:
#         # Extract token from query parameters (e.g., ws://.../ws/socket.io?token=xxx)
#         token = websocket.query_params.get("token")
#         if not token:
#             await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
#             return
#         payload = jwt.decode(token, SECRET_KEY, algorithms=[ALGORITHM])
#         user_id = payload.get("user_id")
#         if not user_id:
#             await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
#             return
#     except JWTError:
#         await websocket.close(code=status.WS_1008_POLICY_VIOLATION)
#         return
    
#     await manager.connect(websocket, user_id)
#     try:
#         while True:
#             data = await websocket.receive_text()
#             message = json.loads(data)
            
#             if message.get("type") == "join":
#                 # Handle user joining
#                 await manager.send_personal_message(
#                     json.dumps({"type": "status", "message": "Connected"}),
#                     user_id
#                 )
#             elif message.get("type") == "message":
#                 # Handle regular messages
#                 await manager.broadcast(json.dumps(message))
#     except WebSocketDisconnect:
#         manager.disconnect(user_id)



# API Endpoints
@app.post("/messages/contacts", response_model=Contact)
async def create_contact(
    contact_data: CreateContactRequest,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user_for_messaging)
):
    """
    Create a new messaging contact between the current user and a service provider.
    contact_data.contact_id refers to the serviceprovider's ID (not user ID).
    """
    try:
        # 1. Get the ServiceProvider record first
        contact_provider = db.query(ServiceProvider).filter(
            ServiceProvider.id == contact_data.contact_id
        ).first()

        if not contact_provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Service provider not found"
            )

        # 2. Get the associated User record
        contact_user = contact_provider.user
        if not contact_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="User account not found for this provider"
            )

        # 3. Check if a message thread already exists
        existing_contact = db.query(Message).filter(
            ((Message.sender_id == current_user.id) & (Message.receiver_id == contact_user.id)) |
            ((Message.sender_id == contact_user.id) & (Message.receiver_id == current_user.id))
        ).first()

        if existing_contact:
            return {
                "id": contact_user.id,
                "service_provider_id": contact_provider.id,  # Include provider ID
                "name": contact_user.full_name,
                "email": contact_user.email,
                "image": contact_user.profile_image,
                "lastMessage": None,
                "lastMessageTime": None,
                "unread": False
            }

        # 4. Create welcome message (using user IDs)
        welcome_message = Message(
            sender_id=current_user.id,
            receiver_id=contact_user.id,  # User ID, not provider ID
            content="Hello! Your messaging connection has been established.",
            timestamp=datetime.utcnow(),
            read=False
        )

        db.add(welcome_message)
        db.commit()

        return {
            "id": contact_user.id,
            "service_provider_id": contact_provider.id,
            "name": contact_user.full_name,
            "email": contact_user.email,
            "image": contact_user.profile_image,
            "lastMessage": welcome_message.content,
            "lastMessageTime": welcome_message.timestamp.isoformat(),
            "unread": False
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error creating contact: {str(e)}"
        )
    

from uuid import uuid4, UUID  # Add this import at the top of your file
import json

@app.post("/messages/initiate", response_model=dict)
async def initiate_conversation(
    provider_user_id: str = Body(..., embed=True, alias="provider_id"),
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)  # Ensure this returns a User, not ServiceProvider
):
    """
    Initialize a conversation with a service provider using their ServiceProvider.id
    """
    try:
        # Look up ServiceProvider and ensure their user is a service provider
        provider = db.query(ServiceProvider).filter(ServiceProvider.id == provider_user_id).first()

        if not provider or not provider.user or provider.user.role != UserRole.SERVICEPROVIDERS.value:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider user not found or not a valid service provider"
            )

        provider_user = provider.user

        # Check if conversation (messages) already exist
        existing_message = db.query(Message).filter(
            ((Message.sender_id == current_user.id) & (Message.receiver_id == provider_user.id)) |
            ((Message.sender_id == provider_user.id) & (Message.receiver_id == current_user.id))
        ).first()

        if existing_message:
            return {
                "message": "Conversation already exists",
                "provider": {
                    "id": provider_user.id,
                    "name": provider_user.full_name,
                    "email": provider_user.email,
                    "image": provider_user.profile_image
                }
            }

        # Create welcome message
        welcome_message = Message(
            id=str(uuid4()),
            sender_id=current_user.id,
            receiver_id=provider_user.id,
            content="Hello! I'd like to discuss your services.",
            timestamp=datetime.utcnow(),
            read=False
        )
        db.add(welcome_message)
        db.commit()

        return {
            "message": "Conversation initiated successfully",
            "provider": {
                "id": provider_user.id,
                "name": provider_user.full_name,
                "email": provider_user.email,
                "image": provider_user.profile_image
            }
        }

    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error initiating conversation: {str(e)}"
        )

        
@app.get("/messages/conversations", response_model=List[dict])
async def get_user_conversations(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all conversations for the current user using UUIDs
    """
    try:
        conversations = db.query(Conversation).filter(
            (Conversation.user1_id == current_user.id) |
            (Conversation.user2_id == current_user.id)
        ).order_by(Conversation.updated_at.desc()).all()

        result = []
        for conv in conversations:
            other_user_id = conv.user1_id if conv.user2_id == current_user.id else conv.user2_id
            other_user = db.query(User).filter(User.id == other_user_id).first()
            
            last_message = db.query(Message).filter(
                Message.conversation_id == conv.id
            ).order_by(Message.timestamp.desc()).first()

            unread_count = db.query(Message).filter(
                Message.conversation_id == conv.id,
                Message.receiver_id == current_user.id,
                Message.read == False
            ).count()

            result.append({
                "id": str(conv.id),
                "other_user": {
                    "id": str(other_user.id),
                    "name": other_user.full_name,
                    "email": other_user.email,
                    "image": getattr(other_user, 'profile_image', None)
                },
                "last_message": last_message.content if last_message else None,
                "last_message_time": last_message.timestamp.isoformat() if last_message else None,
                "unread_count": unread_count
            })

        return result
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching conversations: {str(e)}"
        )


@app.get("/messages/contacts", response_model=List[Contact])
async def get_contacts(
    current_user: User = Depends(get_current_user_for_messaging),
    db: Session = Depends(get_db)
):
    """
    Get all contacts (users with whom the current user has exchanged messages)
    with their last message and unread count.
    """
    # Get distinct users who have sent or received messages
    sent_contacts = db.query(Message.receiver_id).filter(Message.sender_id == current_user.id).distinct()
    received_contacts = db.query(Message.sender_id).filter(Message.receiver_id == current_user.id).distinct()
    
    contact_ids = {contact[0] for contact in sent_contacts} | {contact[0] for contact in received_contacts}
    
    contacts = []
    for contact_id in contact_ids:
        user = db.query(User).filter(User.id == contact_id).first()
        if not user:
            continue
            
        # Get service provider ID if contact is a service provider
        service_provider_id = None
        if user.role == UserRole.SERVICEPROVIDERS.value:
            provider = db.query(ServiceProvider).filter(
                ServiceProvider.user_id == user.id
            ).first()
            if provider:
                service_provider_id = provider.id
        
        # Get the last message between current user and this contact
        last_message = db.query(Message).filter(
            ((Message.sender_id == current_user.id) & (Message.receiver_id == contact_id)) |
            ((Message.sender_id == contact_id) & (Message.receiver_id == current_user.id))
        ).order_by(Message.timestamp.desc()).first()
        
        # Count unread messages from this contact
        unread_count = db.query(Message).filter(
            (Message.sender_id == contact_id) &
            (Message.receiver_id == current_user.id) &
            (Message.read == False)
        ).count()
        
        contacts.append(Contact(
            id=user.id,
            service_provider_id=service_provider_id,
            name=user.full_name,
            email=user.email,
            image=user.profile_image,
            lastMessage=last_message.content if last_message else None,
            lastMessageTime=last_message.timestamp if last_message else None,
            unread=unread_count > 0
        ))
    
    # Sort contacts by last message time (most recent first)
    contacts.sort(key=lambda x: x.lastMessageTime or datetime.min, reverse=True)
    return contacts



@app.get("/messages/conversation/{contact_id}", response_model=List[MessageBase])
async def get_conversation(
    contact_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get the conversation between current user and specified contact.
    Marks all unread messages from this contact as read.
    Returns messages with sender role information.
    """
    try:
        # Convert contact_id to UUID if it's a valid UUID string
        # try:
        #     contact_uuid = UUID(contact_id)
        #     contact_id = str(contact_uuid)  # Ensure consistent string format
        # except ValueError:
        #     pass  # Not a UUID, proceed with original string

        # 1. First, check in the User table for a HOMEOWNER with matching id
        contact_user = db.query(User).filter(
            (User.id == contact_id) & (User.role == UserRole.HOMEOWNERS.value)
        ).first()

        # 2. If not found, check in ServiceProvider by id or user_id
        if not contact_user:
            provider = db.query(ServiceProvider).filter(
                (ServiceProvider.id == contact_id) |
                (ServiceProvider.user_id == contact_id)
            ).first()
            if provider:
                contact_user = db.query(User).filter(User.id == provider.user_id).first()

        # 3. If still not found, fallback to general User table lookup
        if not contact_user:
            contact_user = db.query(User).filter(User.id == contact_id).first()

        # 4. Finally, check HomeOwner table by id or user_id
        if not contact_user:
            homeowner = db.query(HomeOwner).filter(
                (HomeOwner.id == contact_id) |
                (HomeOwner.user_id == contact_id)
            ).first()
            if homeowner:
                contact_user = db.query(User).filter(User.id == homeowner.user_id).first()

        if not contact_user:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Contact not found"
            )

        # Get all messages between current user and the contact
        messages = db.query(Message).filter(
            ((Message.sender_id == current_user.id) & (Message.receiver_id == contact_user.id)) |
            ((Message.sender_id == contact_user.id) & (Message.receiver_id == current_user.id))
        ).order_by(Message.timestamp.asc()).all()

        # Mark messages from this contact as read
        db.query(Message).filter(
            (Message.sender_id == contact_user.id) &
            (Message.receiver_id == current_user.id) &
            (Message.read == False)
        ).update({"read": True})
        db.commit()

        # Format response with sender info and role
        response = []
        for message in messages:
            sender = db.query(User).filter(User.id == message.sender_id).first()
            if not sender:
                continue

            # Determine sender role
            if sender.role == UserRole.HOMEOWNERS.value:
                sender_role = "homeowner"
            elif sender.role == UserRole.SERVICEPROVIDERS.value:
                sender_role = "serviceprovider"
            else:
                sender_role = "admin"

            response.append({
                "id": str(message.id),
                "sender_id": str(message.sender_id),
                "receiver_id": str(message.receiver_id),
                "sender_name": sender.full_name,
                "sender_role": sender_role,
                "sender_image": getattr(sender, 'profile_image', None),
                "content": message.content,
                "timestamp": message.timestamp.isoformat(),
                "read": message.read
            })

        return response

    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching conversation: {str(e)}"
        )



@app.post("/messages/send", response_model=MessageBase)
async def send_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        receiver_id = uuid.UUID(message_data.receiverId) if isinstance(message_data.receiverId, str) else message_data.receiverId
        receiver_user = db.query(User).filter(User.id == receiver_id).first()
        if not receiver_user:
            raise HTTPException(status_code=404, detail="Receiver not found")

        participants = sorted([current_user.id, receiver_id])
        conversation = db.query(Conversation).filter(
            Conversation.user1_id == participants[0],
            Conversation.user2_id == participants[1]
        ).first()

        if not conversation:
            conversation = Conversation(
                id=uuid.uuid4(),
                user1_id=participants[0],
                user2_id=participants[1],
                created_at=datetime.utcnow(),
                updated_at=datetime.utcnow()
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)

        new_message = Message(
            id=uuid.uuid4(),
            sender_id=current_user.id,
            receiver_id=receiver_user.id,
            content=message_data.content,
            timestamp=datetime.utcnow(),
            read=False,
            conversation_id=conversation.id
        )
        db.add(new_message)
        db.commit()
        db.refresh(new_message)

        sender = db.query(User).filter(User.id == current_user.id).first()
        message_data = {
            "id": str(new_message.id),
            "sender_id": str(new_message.sender_id),
            "receiver_id": str(new_message.receiver_id),
            "sender_name": sender.full_name,
            "sender_role": sender.role.lower(),
            "sender_image": getattr(sender, 'profile_image', None),
            "content": new_message.content,
            "timestamp": new_message.timestamp.isoformat(),
            "read": new_message.read,
            "conversation_id": str(conversation.id)
        }

        # Emit via Socket.IO
        await sio.emit('private_message', message_data, room=str(receiver_user.id))
        await sio.emit('private_message', message_data, room=str(current_user.id))

        return MessageBase(**message_data)

    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error sending message: {str(e)}")

    

@app.post("/messages/", response_model=MessageRead)
async def create_message(
    message_data: MessageCreate,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Convert UUID strings to UUID objects if needed
        receiver_id = uuid.UUID(message_data.receiverId) if isinstance(message_data.receiverId, str) else message_data.receiverId
        
        # Find or create conversation
        participants = sorted([current_user.id, receiver_id])
        conversation = db.query(Conversation).filter(
            Conversation.user1_id == participants[0],
            Conversation.user2_id == participants[1]
        ).first()

        if not conversation:
            conversation = Conversation(
                user1_id=participants[0],
                user2_id=participants[1]
            )
            db.add(conversation)
            db.commit()
            db.refresh(conversation)
        
        # Create message
        message = Message(
            content=message_data.content,
            sender_id=current_user.id,
            receiver_id=receiver_id,
            conversation_id=conversation.id
        )
        
        db.add(message)
        
        # Update conversation last message time
        # conversation.last_message_at = datetime.utcnow()
        
        db.commit()
        db.refresh(message)
        
        return message
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid UUID format: {str(e)}")
    except Exception as e:
        db.rollback()
        raise HTTPException(status_code=500, detail=f"Error creating message: {str(e)}")

# Update other endpoints similarly to handle UUID properly
@app.get("/messages/", response_model=List[MessageRead])
async def get_messages(
    other_user_id: str,  # This can stay as str since we'll parse it
    booking_id: Optional[str] = None,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Parse the UUID from string
        other_user_uuid = uuid.UUID(other_user_id)
        
        # Find the conversation between these two users
        participants = sorted([current_user.id, other_user_uuid])
        conversation = db.query(Conversation).filter(
            Conversation.user1_id == participants[0],
            Conversation.user2_id == participants[1]
        ).first()

        if not conversation:
            return []
        
        query = db.query(Message).filter(
            Message.conversation_id == conversation.id
        )
        
        if booking_id:
            booking_uuid = uuid.UUID(booking_id)
            query = query.filter(Message.booking_id == booking_uuid)
        
        messages = query.order_by(Message.created_at.asc()).all()
        
        # Mark messages as read
        for message in messages:
            if message.receiver_id == current_user.id and not message.is_read:
                message.is_read = True
        db.commit()
        
        return messages
    except ValueError as e:
        raise HTTPException(status_code=400, detail=f"Invalid UUID format: {str(e)}")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Error fetching messages: {str(e)}")

@app.put("/messages/{message_id}/read")
async def mark_message_as_read(
    message_id: str,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    message = db.query(Message).filter(
        Message.id == message_id,
        Message.receiver_id == current_user.id
    ).first()

    if not message:
        raise HTTPException(status_code=404, detail="Message not found")
    
    message.is_read = True
    db.commit()
    
    return {"status": "success"}

@app.get("/messages/unread-count")
async def get_unread_message_count(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    count = db.query(Message).filter(
        Message.receiver_id == current_user.id,
        Message.is_read == False
    ).count()
    
    return {"count": count}

# User Profile Endpoints

@app.get("/users/me/profile")
async def get_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's profile information"""
    try:
        profile_data = {
            "fullName": current_user.full_name,
            "email": current_user.email,
            "phone": current_user.phone_number,
            "address": current_user.address,
            "bio": current_user.bio,
            # "avatar": current_user.profile_image 
        }
        
        return profile_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching profile: {str(e)}"
        )


@app.get("/users/me", response_model=dict)
async def get_current_user_profile(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get current user's profile information"""
    try:
        profile_data = {
            "full_name": current_user.full_name,
            "bussinessName": current_user.full_name if current_user.role == UserRole.SERVICEPROVIDERS.value else None,
            "email": current_user.email,
            "phone": current_user.phone_number,
            "address": current_user.address,
            "bio": current_user.bio,
            # "avatar": current_user.avatar
        }
        
        print(profile_data)
        # Add role-specific data
        if current_user.role == UserRole.HOMEOWNERS.value:
            homeowner = db.query(User).filter(User.id == current_user.id).first()
            if homeowner:
                profile_data.update({
                    "address": homeowner.address
                })
        elif current_user.role == UserRole.SERVICEPROVIDERS.value:
            provider = db.query(ServiceProvider).filter(ServiceProvider.user_id == current_user.id).first()
            if provider:
                profile_data.update({
                    "bussinessName": provider.business_name,
                    "years_experience": provider.years_experience
                })
                
        return profile_data
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching profile: {str(e)}"
        )

@app.patch("/users/me")
async def update_user_profile(
    profile_data: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user profile information"""
    try:
        # Update basic user info
        update_fields = {}
        if 'full_name' in profile_data:
            update_fields['full_name'] = profile_data['full_name']
        if 'phone_number' in profile_data:
            update_fields['phone_number'] = profile_data['phone_number']
        if 'bio' in profile_data:
            update_fields['bio'] = profile_data['bio']
        if 'address' in profile_data:
            update_fields['address'] = profile_data['address']

        if update_fields:
            db.query(User).filter(User.id == current_user.id).update(update_fields)
        
        print(profile_data)
        # Update role-specific info

        if current_user.role == UserRole.HOMEOWNERS.value and 'address' in profile_data:
            db.query(User).filter(User.id == current_user.id).update({
                "address": profile_data['address']
            })
        elif current_user.role == UserRole.SERVICEPROVIDERS.value:
            provider_updates = {}
            if 'business_name' in profile_data:
                provider_updates['business_name'] = profile_data['business_name']
            if 'years_experience' in profile_data:
                provider_updates['years_experience'] = profile_data['years_experience']
                
            if provider_updates:
                db.query(ServiceProvider).filter(ServiceProvider.user_id == current_user.id).update(provider_updates)
        
        db.commit()
        
        return {"message": "Profile updated successfully"}
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating profile: {str(e)}"
        )

# Password Management Endpoints

@app.post("/change-password")
async def change_password(
    request: PasswordChangeRequest,
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    # Verify current password
    if not current_user.verify_password(request.password):
        raise HTTPException(status_code=400, detail="Current password is incorrect")
    
    # Update to new password
    current_user.update_password(request.new_password)
    db.commit()
    
    return {"message": "Password updated successfully"}

# Notification Preferences Endpoints
@app.get("/users/notification-preferences", response_model=dict)
async def get_notification_preferences(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Get user's notification preferences"""
    try:
        # Default preferences if none exist
        default_prefs = {
            "emailBookingConfirmations": True,
            "emailServiceReminders": True,
            "emailPromotions": False,
            "pushNewMessages": True,
            "pushStatusUpdates": True
        }
        
        # Get existing preferences from user record
        preferences = current_user.notification_preferences or {}
        
        # Merge with defaults
        return {**default_prefs, **preferences}
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching preferences: {str(e)}"
        )

@app.patch("/users/notification-preferences")
async def update_notification_preferences(
    preferences: dict = Body(...),
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Update user's notification preferences"""
    try:
        # Validate preferences
        valid_keys = {
            "emailBookingConfirmations", "emailServiceReminders", "emailPromotions",
            "pushNewMessages", "pushStatusUpdates"
        }
        
        if not all(key in valid_keys for key in preferences.keys()):
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="Invalid preference keys"
            )
        
        # Get current preferences
        current_prefs = current_user.notification_preferences or {}
        
        # Merge with new preferences
        updated_prefs = {**current_prefs, **preferences}
        
        # Update user record
        db.query(User).filter(User.id == current_user.id).update({
            "notification_preferences": updated_prefs
        })
        db.commit()
        
        return {"message": "Preferences updated successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error updating preferences: {str(e)}"
        )

# Avatar Management Endpoints
@app.post("/users/avatar")
async def upload_avatar(
    avatar: UploadFile = File(..., description="Avatar image file"),  # Changed parameter name to 'avatar'
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    try:
        # Validate file type
        allowed_types = ["image/jpeg", "image/png", "image/gif"]
        if avatar.content_type not in allowed_types:
            raise HTTPException(
                status_code=400,
                detail="Only JPEG, PNG or GIF images are allowed"
            )

        # Validate file size (max 2MB)
        max_size = 2 * 1024 * 1024  # 2MB
        contents = await avatar.read()
        if len(contents) > max_size:
            raise HTTPException(
                status_code=400,
                detail="File size exceeds 2MB limit"
            )

        # Generate unique filename
        file_ext = os.path.splitext(avatar.filename)[1]
        unique_filename = f"{uuid.uuid4()}{file_ext}"
        file_path = os.path.join(UPLOAD_DIR, "avatars", unique_filename)
        
        # Create avatars directory if it doesn't exist
        os.makedirs(os.path.dirname(file_path), exist_ok=True)
        
        # Save file
        with open(file_path, "wb") as buffer:
            buffer.write(contents)
        
        # Update user record with new avatar path
        avatar_url = f"/static/uploads/avatars/{unique_filename}"
        db.query(User).filter(User.id == current_user.id).update({
            "profile_image": avatar_url
        })
        db.commit()
        
        return {
            "message": "Avatar uploaded successfully",
            "avatar_url": avatar_url
        }
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=500,
            detail=f"Error uploading avatar: {str(e)}"
        )


@app.get("/users/{user_id}/profile", response_model=UserProfileResponse)
async def get_user_profile(user_id: str, db: Session = Depends(get_db)):
    try:
        # Get user from database
        user = db.query(User).filter(User.id == user_id).first()
        
        if not user:
            raise HTTPException(status_code=404, detail="User not found")
        
        # Construct the avatar URL - adjust this based on your storage solution
        avatar_url = None
        if user.profile_image:
            # Example for S3: f"https://your-bucket.s3.amazonaws.com/{user.avatar_path}"
            # For local storage: f"{settings.BASE_URL}/static/avatars/{user.avatar_path}"
         
            avatar_url = f"{user.profile_image}"
        
        return {
            "id": str(user.id),
            "email": user.email,
            "full_name": user.full_name,
            "avatar_url": avatar_url
        }
        
    except Exception as e:
        raise HTTPException(status_code=500, detail=str(e))


@app.delete("/users/avatar")
async def delete_avatar(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """Remove user's avatar"""
    try:
        if not current_user.avatar:
            raise HTTPException(
                status_code=status.HTTP_400_BAD_REQUEST,
                detail="No avatar to delete"
            )
        
        # Delete file from storage
        avatar_path = current_user.avatar.replace("/static/uploads/", UPLOAD_DIR)
        if os.path.exists(avatar_path):
            os.remove(avatar_path)
        
        # Update user record
        db.query(User).filter(User.id == current_user.id).update({
            "avatar": None
        })
        db.commit()
        
        return {"message": "Avatar removed successfully"}
    except HTTPException:
        raise
    except Exception as e:
        db.rollback()
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error removing avatar: {str(e)}"
        )


# Dashboard Statistics Endpoints
@app.get("/bookings/stats")
async def get_booking_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get booking statistics for the current homeowner
    """
    try:
        # Get the homeowner record for the current user
        homeowner = db.query(HomeOwner).filter(
            HomeOwner.user_id == current_user.id
        ).first()
        
        if not homeowner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Homeowner record not found"
            )

        # Count total bookings using homeowner_id
        total_bookings = db.query(Booking).filter(
            Booking.homeowner_id == homeowner.id
        ).count()

        # Count active bookings (pending or confirmed) using homeowner_id
        active_bookings = db.query(Booking).filter(
            Booking.homeowner_id == homeowner.id,
            Booking.status.in_([BookingStatus.PENDING.value, BookingStatus.CONFIRMED.value])
        ).count()

        return {
            "total_bookings": total_bookings,
            "active_bookings": active_bookings
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching booking stats: {str(e)}"
        )

@app.get("/reviews/stats")
async def get_review_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get review statistics for the current homeowner
    """
    try:
        # Get the homeowner record for the current user
        homeowner = db.query(HomeOwner).filter(
            HomeOwner.user_id == current_user.id
        ).first()
        
        if not homeowner:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Homeowner record not found"
            )

        # Count reviews given by this homeowner using homeowner_id
        reviews_given = db.query(Review).filter(
            Review.homeowner_id == homeowner.id
        ).count()

        return {
            "reviews_given": reviews_given
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching review stats: {str(e)}"
        )



@app.get("/reviews/provider")
async def get_provider_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all reviews for services provided by the current service provider
    """
    try:
        # Verify the user is a service provider
        if current_user.role != UserRole.SERVICEPROVIDERS.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only service providers can access this endpoint"
            )

        # Get the provider record
        provider = db.query(ServiceProvider).filter(
            ServiceProvider.user_id == current_user.id
        ).first()
        
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found"
            )

        # Get all reviews for this provider's services
        reviews = db.query(Review).join(
            Booking, Review.booking_id == Booking.id
        ).join(
            Service, Booking.service_id == Service.id
        ).filter(
            Service.provider_id == provider.id
        ).order_by(
            Review.created_at.desc()
        ).all()

        # Format response with homeowner info
        result = []
        for review in reviews:
            homeowner = db.query(HomeOwner).filter(
                HomeOwner.id == review.homeowner_id
            ).first()
            
            if not homeowner:
                continue
                
            homeowner_user = db.query(User).filter(
                User.id == homeowner.user_id
            ).first()
            
            booking = db.query(Booking).filter(
                Booking.id == review.booking_id
            ).first()
            
            service = db.query(Service).filter(
                Service.id == booking.service_id if booking else None
            ).first()
            
            result.append({
                "id": str(review.id),
                "booking_id": str(review.booking_id),
                "service_id": str(booking.service_id) if booking else None,
                "homeowner_id": str(review.homeowner_id),
                "homeowner_name": homeowner_user.full_name if homeowner_user else "Homeowner",
                "service_title": service.title if service else "Service",
                "rating": review.rating,
                "comment": review.review_text,
                "created_at": review.created_at.isoformat(),
                "homeowner_avatar": homeowner_user.profile_image if homeowner_user else None
            })

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching reviews: {str(e)}"
        )




@app.get("/messages/stats")
async def get_message_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get message statistics for the current homeowner
    """
    try:
        # Messages still use user_id since they're between users
        # Count unread messages
        unread_messages = db.query(Message).filter(
            Message.receiver_id == current_user.id,
            Message.read == False
        ).count()

        return {
            "unread_messages": unread_messages
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching message stats: {str(e)}"
        )

@app.get("/messages/stats")
async def get_message_stats(
    current_user: User = Depends(get_current_user),
    db: Session = Depends(get_db)
):
    """
    Get message statistics for the current homeowner
    """
    try:
        # Count unread messages
        unread_messages = db.query(Message).filter(
            Message.receiver_id == current_user.id,
            Message.read == False
        ).count()

        return {
            "unread_messages": unread_messages
        }
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching message stats: {str(e)}"
        )
    



@app.get("/reviews/provider")
async def get_provider_reviews(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Get all reviews for services provided by the current service provider
    """
    try:
        # Verify the user is a service provider
        if current_user.role != UserRole.SERVICEPROVIDERS.value:
            raise HTTPException(
                status_code=status.HTTP_403_FORBIDDEN,
                detail="Only service providers can access this endpoint"
            )

        # Get the provider record
        provider = db.query(ServiceProvider).filter(
            ServiceProvider.user_id == current_user.id
        ).first()
        
        if not provider:
            raise HTTPException(
                status_code=status.HTTP_404_NOT_FOUND,
                detail="Provider not found"
            )

        # Get all reviews for this provider's services
        reviews = db.query(Review).join(
            Booking, Review.booking_id == Booking.id
        ).join(
            Service, Booking.service_id == Service.id
        ).filter(
            Service.provider_id == provider.id
        ).order_by(
            Review.created_at.desc()
        ).all()

        # Format response with homeowner info
        result = []
        for review in reviews:
            homeowner = db.query(HomeOwner).filter(
                HomeOwner.id == review.homeowner_id
            ).first()
            
            if not homeowner:
                continue
                
            homeowner_user = db.query(User).filter(
                User.id == homeowner.user_id
            ).first()
            
            booking = db.query(Booking).filter(
                Booking.id == review.booking_id
            ).first()
            
            service = db.query(Service).filter(
                Service.id == booking.service_id if booking else None
            ).first()
            
            result.append({
                "id": str(review.id),
                "booking_id": str(review.booking_id),
                "service_id": str(booking.service_id) if booking else None,
                "homeowner_id": str(review.homeowner_id),
                "homeowner_name": homeowner_user.full_name if homeowner_user else "Homeowner",
                # "service_title": service.title if service else "Service",
                "rating": review.rating,
                "comment": review.review_text,
                "created_at": review.created_at.isoformat(),
            #     "homeowner_avatar": homeowner_user.profile_image if homeowner_user else None
            })

        return result

    except HTTPException:
        raise
    except Exception as e:
        raise HTTPException(
            status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
            detail=f"Error fetching reviews: {str(e)}"
        )






async def get_report_or_404(db: Session, report_id: str):
    
    report = db.query(ReportModel).filter(ReportModel.id == report_id).first()
    if not report:
        raise HTTPException(status_code=404, detail="Report not found")
    return report






class WarningResponse(BaseModel):
    id: str
    report_id: str
    user_id: str
    reason: str
    created_at: str

    class Config:
        orm_mode = True
        from_attributes = True










#Report functionality Endpoints
@app.post("/reports", response_model=Report, status_code=status.HTTP_201_CREATED)
async def create_report(
    report_data: ReportCreate,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    # Verify that the current user is a homeowner
    if current_user.role != UserRole.HOMEOWNERS.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only homeowners can create reports"
        )

    # Get the homeowner record for the current user
    homeowner = db.query(HomeOwner).filter(
        HomeOwner.user_id == current_user.id
    ).first()
    
    if not homeowner:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Homeowner record not found"
        )

    # Verify booking exists and is completed
    booking = db.query(Booking).filter(
        Booking.id == report_data.booking_id,
        Booking.status == "completed"
    ).first()
    
    if not booking:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Booking not found or not completed"
        )
    
    # Check if the booking belongs to the homeowner
    if booking.homeowner_id != homeowner.id:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Not authorized to report this booking"
        )
    
    # Get the provider's user record
    provider = db.query(ServiceProvider).filter(
        ServiceProvider.id == booking.provider_id
    ).first()
    
    if not provider:
        raise HTTPException(
            status_code=status.HTTP_404_NOT_FOUND,
            detail="Provider not found"
        )

    # Check for existing report
    existing_report = db.query(ReportModel).filter(
        ReportModel.booking_id == report_data.booking_id
    ).first()
    
    if existing_report:
        raise HTTPException(
            status_code=status.HTTP_409_CONFLICT,
            detail="Report already exists for this booking"
        )
    
    # Create report
    report = ReportModel(
        id=uuid.uuid4(),
        booking_id=report_data.booking_id,
        homeowner_id=current_user.id,
        provider_id=provider.user_id,
        title=report_data.title,
        description=report_data.description,
        service_title=booking.service_title,
        provider_name=booking.provider_name,
        homeowner_name=current_user.full_name
    )
    
    db.add(report)
    db.commit()
    db.refresh(report)
    
    return report


@app.get("/get/reports")
async def get_reports(
    status: Optional[str] = None,  # Make status optional
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_admin_user)
):
    try:
        query = db.query(ReportModel)
        if status:
            query = query.filter(ReportModel.status == status)
        reports = query.order_by(ReportModel.created_at.desc()).all()
        
        if not reports:
            print("No reports found in DB!")  # Debug log
        
        return [
            {
                "id": str(report.id),
                "title": report.title,
                "description": report.description,
                "status": report.status,
                "created_at": report.created_at.isoformat(),
                "booking_id": str(report.booking_id),
                "homeowner_name": report.homeowner_name,
                "provider_name": report.provider_name,
                "service_title": report.service_title
            }
            for report in reports
        ]
    except Exception as e:
        raise HTTPException(
            status_code=500,
            detail=f"Error fetching reports: {str(e)}"
        )



@app.get("/reports/{report_id}", response_model=Report)
async def get_report_details(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can view report details"
        )
    
    report = await get_report_or_404(db, report_id)
    return report


@app.post("/reports/{report_id}/dismiss", response_model=dict)
async def dismiss_report(
    report_id: str,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can dismiss reports"
        )
    
    report = await get_report_or_404(db, report_id)
    
    if report.status == ReportStatus.RESOLVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Report already resolved"
        )
    
    report.status = ReportStatus.RESOLVED
    db.commit()
    
    await notify_user(
        user_id=report.homeowner_id,
        title="Report Resolved",
        message=f"Your report about '{report.service_title}' has been reviewed"
    )
    
    return {"message": "Report dismissed successfully"}

@app.post("/reports/{report_id}/warn", response_model=dict)
async def warn_provider(
    report_id: str,
    data: WarnProvider,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can warn providers"
        )
    
    report = await get_report_or_404(db, report_id)
    
    if report.status == ReportStatus.RESOLVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Report already resolved"
        )
    
    from models import Warning
    report.status = ReportStatus.RESOLVED
    
    warning = Warning(
        id=uuid.uuid4(),
        user_id=report.provider_id,
        report_id=report.id,
        reason=data.warning_message or "Behavior reported by homeowner"
    )
    
    db.add(warning)
    db.commit()
    
    await notify_user(
        user_id=report.provider_id,
        title="Warning Received",
        message=data.warning_message or "You have received a warning based on a homeowner report"
    )
    
    return {
        "message": "Provider warned successfully",
        "warning_id": warning.id
    }

@app.post("/reports/{report_id}/suspend", response_model=dict)
async def suspend_provider(
    report_id: str,
    data: SuspendProvider,
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    if current_user.role != "admin":
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only admins can suspend providers"
        )
    
    report = await get_report_or_404(db, report_id)
    
    if report.status == ReportStatus.RESOLVED:
        raise HTTPException(
            status_code=status.HTTP_400_BAD_REQUEST,
            detail="Report already resolved"
        )
    
    report.status = ReportStatus.RESOLVED
    
    provider = db.query(User).filter(User.id == report.provider_id).first()
    if not provider:
        raise HTTPException(status_code=404, detail="Provider not found")
    
    suspension_end = datetime.utcnow() + timedelta(days=data.suspension_days)
    provider.status = "suspended"
    provider.suspension_end_date = suspension_end
    
    upcoming_bookings = db.query(Booking).filter(
        Booking.service.has(provider_id=report.provider_id),
        Booking.status.in_(["pending", "confirmed"])
    ).all()
    
    for booking in upcoming_bookings:
        booking.status = "cancelled"
        booking.cancellation_reason = "Provider suspended"
        
        await notify_user(
            user_id=booking.homeowner_id,
            title="Booking Cancelled",
            message=f"Your booking for '{booking.service.title}' was cancelled due to provider suspension"
        )
    
    db.commit()
    
    await notify_user(
        user_id=report.provider_id,
        title="Account Suspended",
        message=data.suspension_reason or "Your account has been temporarily suspended"
    )
    
    return {
        "message": "Provider suspended successfully",
        "suspension_end_date": suspension_end.isoformat(),
        "cancelled_bookings": len(upcoming_bookings)
    }


@app.get("/warnings/provider", response_model=List[WarningResponse])
async def get_provider_warnings(
    db: Session = Depends(get_db),
    current_user: User = Depends(get_current_user)
):
    """
    Retrieve all warnings issued to the authenticated provider.
    """
    if current_user.role != UserRole.SERVICEPROVIDERS.value:
        raise HTTPException(
            status_code=status.HTTP_403_FORBIDDEN,
            detail="Only providers can access this endpoint"
        )

    # Fetch warnings for the current provider
    warnings = db.query(Warning).filter(
        Warning.user_id == current_user.id
    ).all()

    # Transform warnings into response format
    warning_responses = [
        WarningResponse(
            id=str(warning.id),
            report_id=str(warning.report_id),
            user_id=str(warning.user_id),
            reason=warning.reason or "",
            created_at=warning.created_at.isoformat()
        )
        for warning in warnings
    ]

    return warning_responses



async def notify_admins(report: Report):
    pass

async def notify_user(user_id: str, title: str, message: str):
    pass




# Add these imports at the top

from schemas import EmailCheck, PasswordReset, PasswordResetConfirm

from jose import JWTError, jwt
from typing_extensions import Annotated
from pydantic import BaseModel
from pydantic import UUID4
import math

# from fastapi_mail import FastMail, MessageSchema, ConnectionConfig
# from pydantic import EmailStr
# import os
# from dotenv import load_dotenv

# # Load environment variables
# load_dotenv()

# # Email configuration
# conf = ConnectionConfig(
#     MAIL_USERNAME=os.getenv("MAIL_USERNAME"),
#     MAIL_PASSWORD=os.getenv("MAIL_PASSWORD"),
#     MAIL_FROM=os.getenv("MAIL_FROM"),
#     MAIL_PORT=int(os.getenv("MAIL_PORT", "587")),
#     MAIL_SERVER=os.getenv("MAIL_SERVER", "smtp.gmail.com"),
#     MAIL_STARTTLS=True,
#     MAIL_SSL_TLS=False,
#     USE_CREDENTIALS=True
# )

# # password reset api
# @app.post("/auth/forgot-password")
# async def forgot_password(email: str, db: Session = Depends(get_db)):
#     # Check if email exists
#     user = db.query(User).filter(User.email == email).first()
#     if not user:
#         raise HTTPException(status_code=404, detail="Email not found")

#     # Generate reset token
#     token = secrets.token_urlsafe(32)
#     reset_link = f"http://localhost:3000/forgot-password/reset?token={token}"

#     # Store token in database (you'll need to implement this)
#     await store_reset_token(email, token)

#     # Send email
#     message = MessageSchema(
#         subject="Password Reset Request",
#         recipients=[email],
#         body=f"Click the following link to reset your password: {reset_link}",
#         subtype="html"
#     )

#     try:
#         fm = FastMail(conf)
#         await fm.send_message(message)
#         return {"message": "Password reset email sent"}
#     except Exception as e:
#         raise HTTPException(status_code=500, detail=f"Failed to send email: {str(e)}")

# @app.post("/auth/reset-password")
# async def reset_password(token: str, new_password: str):
#     # Verify token and get user email
#     email = await verify_reset_token(token)
#     if not email:
#         raise HTTPException(status_code=400, detail="Invalid or expired token")

#     # Update password
#     hashed_password = bcrypt.hashpw(new_password.encode(), bcrypt.gensalt())
#     await update_user_password(email, hashed_password)

#     # Delete used token
#     await delete_reset_token(token)

#     return {"message": "Password reset successful"}

# @app.post("/auth/check-email")
# async def check_email(
#     email_data: EmailCheck,
#     db: Session = Depends(get_db)
# ):
#     try:
#         # Check if email exists in User table
#         user = db.query(User).filter(User.email == email_data.email).first()
#         return {"exists": user is not None}
#     except Exception as e:
#         raise HTTPException(
#             status_code=status.HTTP_500_INTERNAL_SERVER_ERROR,
#             detail=f"Error checking email: {str(e)}"
#         )