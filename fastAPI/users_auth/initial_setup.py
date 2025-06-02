from sqlalchemy import create_engine, text
from sqlalchemy.orm import sessionmaker
from auth import hash_password
import sys
from models import Base, User, Admin  # Import the models

DATABASE_URL = "postgresql://postgres:12345@localhost:5432/homehelpConnect_DB"  # Replace with your actual database URL
engine = create_engine(DATABASE_URL)
Session = sessionmaker(bind=engine)

def create_tables():
    Base.metadata.create_all(bind=engine)

def create_admin():
    session = Session()
    try:
        # Check if admin exists using ORM
        admin_exists = session.query(User).filter_by(role='admin').first()
        
        if admin_exists:
            print("Admin already exists")
            return

        # Create admin user using ORM
        admin_user = User(
            email="homehelp@connect.com",
            password_hash=hash_password("Pass@123"),  # Change this in production!
            full_name="Super Admin",
            role="admin",
            is_active=True
        )
        session.add(admin_user)
        session.flush()  # This generates the ID
        
        # Create admin record using ORM
        admin = Admin(
            user_id=admin_user.id,
            is_super_admin=True
        )
        session.add(admin)
        
        session.commit()
        print("Super admin created successfully")
    except Exception as e:
        session.rollback()
        print(f"Error: {str(e)}", file=sys.stderr)
        raise
    finally:
        session.close()

if __name__ == "__main__":
    create_tables()
    create_admin()