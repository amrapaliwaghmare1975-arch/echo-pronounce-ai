import json
from datetime import datetime, date, timedelta
from typing import Optional, List, Any, Dict
from sqlalchemy import Column, String, Integer, DateTime, Text, ForeignKey
from pydantic import BaseModel, Field

from database import Base

# System Badges Definition
AVAILABLE_BADGES = [
    {
        "id": "first_words",
        "name": "First Step",
        "description": "Completed your first speech practice attempt.",
        "icon": "🌱",
        "color": "emerald"
    },
    {
        "id": "accuracy_ace",
        "name": "Accuracy Ace",
        "description": "Achieved a 90%+ pronunciation score on any sentence.",
        "icon": "🎯",
        "color": "indigo"
    },
    {
        "id": "perfect_100",
        "name": "Native Master",
        "description": "Scored a flawless 100% pronunciation score.",
        "icon": "👑",
        "color": "amber"
    },
    {
        "id": "twister_tamer",
        "name": "Twister Tamer",
        "description": "Completed a Tongue Twister with 80%+ accuracy.",
        "icon": "🌪️",
        "color": "purple"
    },
    {
        "id": "speed_master",
        "name": "Natural Flow",
        "description": "Maintained an ideal natural pace of 110-160 WPM.",
        "icon": "⚡",
        "color": "blue"
    },
    {
        "id": "xp_500",
        "name": "Century Club",
        "description": "Earned over 500 XP through speech training.",
        "icon": "🏆",
        "color": "yellow"
    }
]

class User(Base):
    """SQLAlchemy model for user accounts and gamification profile."""
    __tablename__ = "users"

    id = Column(String(64), primary_key=True, index=True)
    username = Column(String(64), unique=True, index=True, nullable=False)
    email = Column(String(128), unique=True, index=True, nullable=False)
    password_hash = Column(String(256), nullable=False)
    streak_count = Column(Integer, default=1)
    last_practice_date = Column(String(32), nullable=True)  # Format: YYYY-MM-DD
    xp = Column(Integer, default=0)
    level = Column(Integer, default=1)
    created_at = Column(DateTime, default=datetime.utcnow)

    def calculate_level(self) -> int:
        """Levels up every 150 XP."""
        return max(1, (self.xp // 150) + 1)

    def update_streak(self):
        """Updates streak based on calendar day difference."""
        today_str = date.today().isoformat()
        if not self.last_practice_date:
            self.streak_count = 1
            self.last_practice_date = today_str
            return

        if self.last_practice_date == today_str:
            # Already practiced today
            return

        last_date = date.fromisoformat(self.last_practice_date)
        diff_days = (date.today() - last_date).days

        if diff_days == 1:
            # Practiced yesterday, increment streak!
            self.streak_count += 1
        elif diff_days > 1:
            # Streak broken, reset to 1
            self.streak_count = 1

        self.last_practice_date = today_str

    def get_unlocked_badges(self, sessions_list: List[Dict[str, Any]]) -> List[Dict[str, Any]]:
        """Calculates which badges this user has unlocked based on history."""
        unlocked_ids = set()

        if len(sessions_list) >= 1:
            unlocked_ids.add("first_words")
        if any(s.get("overall_score", 0) >= 90 for s in sessions_list):
            unlocked_ids.add("accuracy_ace")
        if any(s.get("overall_score", 0) == 100 for s in sessions_list):
            unlocked_ids.add("perfect_100")
        if any("twister" in s.get("category", "").lower() and s.get("overall_score", 0) >= 80 for s in sessions_list):
            unlocked_ids.add("twister_tamer")
        if any(110 <= s.get("words_per_minute", 0) <= 160 for s in sessions_list):
            unlocked_ids.add("speed_master")
        if self.xp >= 500:
            unlocked_ids.add("xp_500")

        result = []
        for b in AVAILABLE_BADGES:
            item = dict(b)
            item["unlocked"] = b["id"] in unlocked_ids
            result.append(item)
        return result

    def to_dict(self, sessions_list: Optional[List[Dict[str, Any]]] = None):
        sessions = sessions_list or []
        badges = self.get_unlocked_badges(sessions)
        next_level_xp = self.level * 150
        current_level_base = (self.level - 1) * 150
        progress_in_level = max(0, min(100, int(((self.xp - current_level_base) / 150) * 100)))

        return {
            "id": self.id,
            "username": self.username,
            "email": self.email,
            "streak_count": self.streak_count,
            "last_practice_date": self.last_practice_date,
            "xp": self.xp,
            "level": self.level,
            "next_level_xp": next_level_xp,
            "level_progress_percent": progress_in_level,
            "badges": badges,
            "badges_unlocked_count": sum(1 for b in badges if b["unlocked"]),
            "total_badges_count": len(badges)
        }

class PracticeSession(Base):
    """SQLAlchemy model representing a pronunciation practice attempt."""
    __tablename__ = "practice_sessions"

    id = Column(String(64), primary_key=True, index=True)
    user_id = Column(String(64), ForeignKey("users.id"), nullable=True, index=True)
    timestamp = Column(DateTime, default=datetime.utcnow, index=True)
    sentence = Column(Text, nullable=False)
    category = Column(String(64), default="General", index=True)
    overall_score = Column(Integer, default=0)
    accuracy_percentage = Column(Integer, default=0)
    completeness_score = Column(Integer, default=0)
    words_per_minute = Column(Integer, default=0)
    summary = Column(Text, nullable=True)
    words_count = Column(Integer, default=0)
    mispronounced_count = Column(Integer, default=0)
    spoken_text = Column(Text, nullable=True)
    xp_earned = Column(Integer, default=0)
    details_json = Column(Text, nullable=True)

    def to_dict(self):
        return {
            "id": self.id,
            "user_id": self.user_id,
            "timestamp": self.timestamp.isoformat() if self.timestamp else None,
            "sentence": self.sentence,
            "category": self.category,
            "overall_score": self.overall_score,
            "accuracy_percentage": self.accuracy_percentage,
            "completeness_score": self.completeness_score,
            "words_per_minute": self.words_per_minute,
            "summary": self.summary,
            "words_count": self.words_count,
            "mispronounced_count": self.mispronounced_count,
            "spoken_text": self.spoken_text,
            "xp_earned": self.xp_earned,
            "details": json.loads(self.details_json) if self.details_json else None
        }

# --- Pydantic Schemas ---

class UserRegisterSchema(BaseModel):
    username: str = Field(min_length=3, max_length=30)
    email: str = Field(min_length=5, max_length=128)
    password: str = Field(min_length=6, max_length=100)

class UserLoginSchema(BaseModel):
    username_or_email: str
    password: str

class SessionCreateSchema(BaseModel):
    id: Optional[str] = None
    user_id: Optional[str] = None
    sentence: str
    category: Optional[str] = "General"
    overall_score: int = Field(default=0, ge=0, le=100)
    accuracy_percentage: int = Field(default=0, ge=0, le=100)
    completeness_score: int = Field(default=0, ge=0, le=100)
    words_per_minute: int = Field(default=0, ge=0)
    summary: Optional[str] = ""
    words_count: Optional[int] = 0
    mispronounced_count: Optional[int] = 0
    spoken_text: Optional[str] = ""
    words: Optional[List[Any]] = None
