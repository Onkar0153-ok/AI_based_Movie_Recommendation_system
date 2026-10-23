import sys
import argparse
import getpass
from pathlib import Path

# Add backend directory to sys.path
sys.path.insert(0, str(Path(__file__).resolve().parent))

from app.db.database import SessionLocal, engine, Base
from app.models.models import User, UserPreference
from app.core.security import get_password_hash

def bootstrap_admin(email: str = None, name: str = None, password: str = None):
    Base.metadata.create_all(bind=engine)
    db = SessionLocal()
    try:
        if not email:
            print("--- CineMatch AI: Administrator Bootstrap ---")
            email = input("Admin Email: ").strip()
        if not name:
            name = input("Admin Full Name: ").strip()
        if not password:
            password = getpass.getpass("Admin Password: ").strip()

        if not email or "@" not in email:
            print("Error: A valid email address is required.")
            sys.exit(1)
        if not name:
            name = "Administrator"
        if len(password) < 6:
            print("Error: Password must be at least 6 characters long.")
            sys.exit(1)

        email_clean = email.lower().strip()
        existing = db.query(User).filter(User.email == email_clean).first()
        if existing:
            if existing.role == "admin":
                print(f"Notice: User '{email_clean}' is already an administrator. Updating password...")
                existing.password_hash = get_password_hash(password)
                existing.is_active = True
                db.commit()
                print(f"Successfully updated password for administrator '{email_clean}'.")
                return
            else:
                existing.role = "admin"
                existing.password_hash = get_password_hash(password)
                existing.is_active = True
                db.commit()
                print(f"Successfully promoted '{email_clean}' to administrator.")
                return

        new_admin = User(
            name=name,
            email=email_clean,
            password_hash=get_password_hash(password),
            role="admin",
            is_active=True
        )
        db.add(new_admin)
        db.commit()
        db.refresh(new_admin)

        # Initialize UserPreference
        pref = UserPreference(
            user_id=new_admin.id,
            preferred_genres="[]",
            preferred_languages="[]",
            preferred_moods="[]",
            minimum_rating=0.0
        )
        db.add(pref)
        db.commit()

        print("\n=======================================================")
        print(f"Administrator account successfully created!")
        print(f"Email: {email_clean}")
        print(f"Role : admin")
        print("=======================================================\n")
    finally:
        db.close()

if __name__ == "__main__":
    parser = argparse.ArgumentParser(description="Bootstrap initial CineMatch AI admin account.")
    parser.add_argument("--email", type=str, help="Admin email address")
    parser.add_argument("--name", type=str, help="Admin name")
    parser.add_argument("--password", type=str, help="Admin password")
    args = parser.parse_args()

    bootstrap_admin(email=args.email, name=args.name, password=args.password)
