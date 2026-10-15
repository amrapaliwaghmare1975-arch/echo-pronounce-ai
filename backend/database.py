import os
from sqlalchemy import create_engine, text
from sqlalchemy.orm import declarative_base, sessionmaker

# Configurable Database URL: defaults to SQLite, or reads PostgreSQL URL from environment
DATABASE_URL = os.getenv("DATABASE_URL", "sqlite:///./pronunciation_history.db")

connect_args = {}
if DATABASE_URL.startswith("sqlite"):
    connect_args = {"check_same_thread": False}

engine = create_engine(
    DATABASE_URL,
    connect_args=connect_args,
    echo=False
)

SessionLocal = sessionmaker(autocommit=False, autoflush=False, bind=engine)

Base = declarative_base()

def get_db():
    """Dependency that provides a database session per request."""
    db = SessionLocal()
    try:
        yield db
    finally:
        db.close()

def init_db():
    """Initializes tables in database and applies automatic schema upgrades for SQLite."""
    Base.metadata.create_all(bind=engine)

    if DATABASE_URL.startswith("sqlite"):
        try:
            with engine.begin() as conn:
                res = conn.execute(text("PRAGMA table_info(practice_sessions)"))
                columns = [row[1] for row in res.fetchall()]
                if columns:
                    if "user_id" not in columns:
                        conn.execute(text("ALTER TABLE practice_sessions ADD COLUMN user_id VARCHAR(64)"))
                    if "xp_earned" not in columns:
                        conn.execute(text("ALTER TABLE practice_sessions ADD COLUMN xp_earned INTEGER DEFAULT 0"))
        except Exception as e:
            print(f"[DB Init Note] {e}")
