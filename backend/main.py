import os
import io
import json
import uuid
import tempfile
from datetime import datetime, date
from contextlib import asynccontextmanager
import speech_recognition as sr
from fastapi import FastAPI, UploadFile, File, Form, HTTPException, Depends, Header
from fastapi.middleware.cors import CORSMiddleware
from fastapi.staticfiles import StaticFiles
from fastapi.responses import FileResponse, StreamingResponse
from pydub import AudioSegment
from gtts import gTTS
from pydantic import BaseModel
from typing import Optional, List
from sqlalchemy.orm import Session

from analyzer import analyze_pronunciation
from database import get_db, init_db
from models import PracticeSession, SessionCreateSchema, User, UserRegisterSchema, UserLoginSchema, AVAILABLE_BADGES
from rag_service import rag_service
from auth import hash_password, verify_password, create_access_token, decode_access_token

@asynccontextmanager
async def lifespan(app: FastAPI):
    # Initialize SQLite / PostgreSQL tables on application launch
    init_db()
    yield

app = FastAPI(
    title="AI Pronunciation Feedback Tool",
    description="Backend API for speech transcription, pronunciation comparison, database history, and phonetic feedback.",
    version="1.0.0",
    lifespan=lifespan
)

# Enable CORS for frontend integration
app.add_middleware(
    CORSMiddleware,
    allow_origins=[
        "http://localhost:3000",
        "http://127.0.0.1:3000",
        "http://localhost:5173",
        "http://127.0.0.1:5173",
    ],
    allow_origin_regex=r"https?://(localhost|127\.0\.0\.1)(:\d+)?",
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


# Predefined curated practice sentences with difficulty and phonetic guide
PRACTICE_SENTENCES = [
    {
        "id": 1,
        "category": "Beginner",
        "sentence": "Good morning, how are you doing today?",
        "phonetic": "ɡʊd ˈmɔːrnɪŋ, haʊ ɑːr juː ˈduːɪŋ təˈdeɪ?",
        "focus": "Polite greetings & natural cadence",
        "tip": "Link 'how' and 'are' smoothly."
    },
    {
        "id": 2,
        "category": "Beginner",
        "sentence": "The quick brown fox jumps over the lazy dog.",
        "phonetic": "ðə kwɪk braʊn fɑːks dʒʌmps ˈoʊvər ðə ˈleɪzi dɔːɡ.",
        "focus": "All letters of the alphabet (Pangram)",
        "tip": "Carefully pronounce the voiced 'th' in 'the'."
    },
    {
        "id": 3,
        "category": "Intermediate",
        "sentence": "I am looking forward to our meeting on Wednesday.",
        "phonetic": "aɪ æm ˈlʊkɪŋ ˈfɔːrwərd tuː ˈaʊər ˈmiːtɪŋ ɑːn ˈwɛnzdeɪ.",
        "focus": "Silent letters & scheduling vocabulary",
        "tip": "Remember 'Wednesday' has a silent 'd': say 'WENZ-day'."
    },
    {
        "id": 4,
        "category": "Intermediate",
        "sentence": "Clear pronunciation builds confidence during conversation.",
        "phonetic": "klɪr prəˌnʌnsiˈeɪʃən bɪldz ˈkɑːnfɪdəns ˈdʊrɪŋ ˌkɑːnvərˈseɪʃən.",
        "focus": "Multi-syllable word stress",
        "tip": "Stress the 4th syllable in pro-nun-ci-A-tion."
    },
    {
        "id": 5,
        "category": "Advanced",
        "sentence": "The subtle rhythm of the choir resonated throughout the cathedral.",
        "phonetic": "ðə ˈsʌtl̩ ˈrɪðəm ʌv ðə ˈkwaɪər ˈrɛzəneɪtɪd θruːˈaʊt ðə kəˈθiːdrəl.",
        "focus": "Silent letters, 'th', and 'r' combinations",
        "tip": "Silent 'b' in subtle; 'choir' starts with a 'k' sound."
    },
    {
        "id": 6,
        "category": "Tongue Twister",
        "sentence": "She sells seashells by the seashore.",
        "phonetic": "ʃiː sɛlz ˈsiːˌʃɛlz baɪ ðə ˈsiːˌʃɔːr.",
        "focus": "Differentiating 's' and 'sh' sounds",
        "tip": "Notice tongue position: 's' near front teeth, 'sh' slightly back."
    },
    {
        "id": 7,
        "category": "Tongue Twister",
        "sentence": "Peter Piper picked a peck of pickled peppers.",
        "phonetic": "ˈpiːtər ˈpaɪpər pɪkt ə pɛk ʌv ˈpɪkəld ˈpɛpərz.",
        "focus": "Crisp 'p' plosive consonants",
        "tip": "Release a clear puff of air with each 'p'."
    },
    {
        "id": 8,
        "category": "Business",
        "sentence": "Our primary objective is to maximize efficiency and achieve sustainable growth.",
        "phonetic": "ˈaʊər ˈpraɪˌmɛri əbˈdʒɛktɪv ɪz tuː ˈmæksəˌmaɪz ɪˈfɪʃənsi ænd əˈtʃiːv səˈsteɪnəbl̩ ɡroʊθ.",
        "focus": "Professional presentation fluency",
        "tip": "Keep steady pace and pause after main clauses."
    }
]

class TextAnalysisRequest(BaseModel):
    target_text: str
    spoken_text: str
    duration_sec: Optional[float] = 0.0

@app.get("/")
def read_root():
    return {
        "status": "online",
        "message": "AI Pronunciation Feedback API is running! Open /docs for Swagger UI.",
        "version": "1.0.0"
    }

@app.get("/api/sentences")
def get_sentences():
    """Returns practice sentences grouped by level and category."""
    return {"sentences": PRACTICE_SENTENCES}

@app.post("/api/analyze-text")
def analyze_text_direct(req: TextAnalysisRequest):
    """
    Analyzes spoken text against target text without requiring an audio upload.
    Ideal for real-time Web Speech API transcription.
    """
    result = analyze_pronunciation(req.target_text, req.spoken_text, req.duration_sec)
    return result

@app.post("/api/analyze-audio")
async def analyze_audio(
    audio: UploadFile = File(...),
    target_text: str = Form(...),
    duration_sec: float = Form(0.0)
):
    """
    Transcribes uploaded audio (wav/webm/mp3) using speech recognition,
    and returns word-by-word pronunciation accuracy, phonetic tips, and fluency score.
    """
    recognizer = sr.Recognizer()
    audio_bytes = await audio.read()

    # Attempt to convert or load audio into WAV format for speech_recognition
    temp_in = None
    temp_wav = None
    transcription = ""

    try:
        # Save received audio to a temporary file
        file_ext = os.path.splitext(audio.filename)[1].lower() if audio.filename else ".webm"
        if not file_ext:
            file_ext = ".webm"

        with tempfile.NamedTemporaryFile(delete=False, suffix=file_ext) as f_in:
            f_in.write(audio_bytes)
            temp_in = f_in.name

        # Convert to WAV format using pydub
        try:
            sound = AudioSegment.from_file(temp_in)
            # Resample to 16kHz mono for optimal speech recognition
            sound = sound.set_frame_rate(16000).set_channels(1)
            temp_wav = temp_in + "_converted.wav"
            sound.export(temp_wav, format="wav")
            audio_target_path = temp_wav
        except Exception as conv_err:
            # If ffmpeg is not available, try using direct file if it's already wav
            if file_ext == ".wav":
                audio_target_path = temp_in
            else:
                return {
                    "error": "AUDIO_CONVERSION_FAILED",
                    "details": f"Could not convert {file_ext} audio to WAV. Please ensure ffmpeg is installed or use browser Web Speech mode.",
                    "overall_score": 0,
                    "target_text": target_text,
                    "spoken_text": "",
                    "words": [],
                    "tips": ["Tip: Use the browser Web Speech recognition toggle if local audio conversion is unavailable."]
                }

        # Recognize speech using Google Speech Recognition
        with sr.AudioFile(audio_target_path) as source:
            recognizer.adjust_for_ambient_noise(source, duration=0.2)
            audio_data = recognizer.record(source)
            try:
                transcription = recognizer.recognize_google(audio_data, language="en-US")
            except sr.UnknownValueError:
                transcription = ""
            except sr.RequestError as req_err:
                raise HTTPException(status_code=503, detail=f"Speech Recognition service error: {str(req_err)}")

    except Exception as e:
        raise HTTPException(status_code=500, detail=f"Audio processing error: {str(e)}")
    finally:
        # Cleanup temporary files
        if temp_in and os.path.exists(temp_in):
            try:
                os.remove(temp_in)
            except OSError:
                pass
        if temp_wav and os.path.exists(temp_wav):
            try:
                os.remove(temp_wav)
            except OSError:
                pass

    if not transcription:
        return {
            "overall_score": 0,
            "accuracy_percentage": 0,
            "completeness_score": 0,
            "words_per_minute": 0,
            "fluency_feedback": "No audible speech was detected.",
            "target_text": target_text,
            "spoken_text": "(No speech detected)",
            "words": [
                {
                    "target_word": w,
                    "spoken_word": "",
                    "status": "missing",
                    "score": 0,
                    "comment": "Not heard"
                }
                for w in target_text.split()
            ],
            "tips": [
                "Make sure your microphone is close and permissions are granted.",
                "Speak loudly, clearly, and minimize background noise.",
                "Try practicing at a moderate, steady tempo."
            ],
            "summary": "We couldn't hear any clear words. Please try recording again closer to your mic."
        }

    # Analyze and score
    analysis = analyze_pronunciation(target_text, transcription, duration_sec)
    return analysis

# --- Authentication & Gamification Helpers ---

def get_current_user_optional(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)) -> Optional[User]:
    """Extracts user from Bearer token if present."""
    if not authorization or not authorization.startswith("Bearer "):
        return None
    token = authorization.split(" ")[1]
    payload = decode_access_token(token)
    if not payload:
        return None
    return db.query(User).filter(User.id == payload.get("user_id")).first()

# --- Authentication Endpoints ---

@app.post("/api/auth/register")
def register_user(req: UserRegisterSchema, db: Session = Depends(get_db)):
    """Registers a new user and returns an access token."""
    # Check if username or email is already taken
    existing_user = db.query(User).filter(
        (User.username == req.username) | (User.email == req.email)
    ).first()
    if existing_user:
        raise HTTPException(status_code=400, detail="Username or Email already registered.")

    user_id = f"user_{uuid.uuid4().hex[:12]}"
    new_user = User(
        id=user_id,
        username=req.username,
        email=req.email,
        password_hash=hash_password(req.password),
        streak_count=1,
        last_practice_date=date.today().isoformat(),
        xp=50,  # 50 welcome XP!
        level=1
    )
    db.add(new_user)
    db.commit()
    db.refresh(new_user)

    token = create_access_token(new_user.id, new_user.username)
    return {
        "token": token,
        "user": new_user.to_dict([])
    }

@app.post("/api/auth/login")
def login_user(req: UserLoginSchema, db: Session = Depends(get_db)):
    """Authenticates user and returns an access token."""
    user = db.query(User).filter(
        (User.username == req.username_or_email) | (User.email == req.username_or_email)
    ).first()
    if not user or not verify_password(user.password_hash, req.password):
        raise HTTPException(status_code=401, detail="Invalid username or password.")

    user.update_streak()
    db.commit()

    # Load sessions for badges
    sessions = db.query(PracticeSession).filter(PracticeSession.user_id == user.id).all()
    sessions_dict = [s.to_dict() for s in sessions]

    token = create_access_token(user.id, user.username)
    return {
        "token": token,
        "user": user.to_dict(sessions_dict)
    }

@app.get("/api/auth/me")
def get_me(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Returns the authenticated user profile with badges and XP progress."""
    user = get_current_user_optional(authorization, db)
    if not user:
        raise HTTPException(status_code=401, detail="Not authenticated or token expired.")

    sessions = db.query(PracticeSession).filter(PracticeSession.user_id == user.id).all()
    sessions_dict = [s.to_dict() for s in sessions]
    return {"user": user.to_dict(sessions_dict)}

@app.get("/api/gamification/badges")
def get_badges(authorization: Optional[str] = Header(None), db: Session = Depends(get_db)):
    """Returns all badges and the unlock status for the current user."""
    user = get_current_user_optional(authorization, db)
    sessions_dict = []
    if user:
        sessions = db.query(PracticeSession).filter(PracticeSession.user_id == user.id).all()
        sessions_dict = [s.to_dict() for s in sessions]
        return {"badges": user.get_unlocked_badges(sessions_dict)}
    
    # Return all locked if guest
    result = [dict(b, unlocked=False) for b in AVAILABLE_BADGES]
    return {"badges": result}

# --- Database Practice History & XP Award Endpoints ---

@app.get("/api/history")
def get_practice_history(
    limit: int = 50,
    category: Optional[str] = None,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Retrieves previous practice attempts, filtered by user if authenticated.
    """
    user = get_current_user_optional(authorization, db)
    query = db.query(PracticeSession).order_by(PracticeSession.timestamp.desc())

    if user:
        query = query.filter((PracticeSession.user_id == user.id) | (PracticeSession.user_id.is_(None)))
    if category and category.lower() != "all":
        query = query.filter(PracticeSession.category.ilike(category))

    sessions = query.limit(limit).all()
    return {"history": [s.to_dict() for s in sessions]}

@app.post("/api/history")
def save_practice_history(
    session_in: SessionCreateSchema,
    authorization: Optional[str] = Header(None),
    db: Session = Depends(get_db)
):
    """
    Saves a practice session, calculates XP reward, and updates user streaks.
    """
    session_id = session_in.id or f"session_{uuid.uuid4().hex[:12]}"
    user = get_current_user_optional(authorization, db)
    if not user and session_in.user_id:
        user = db.query(User).filter(User.id == session_in.user_id).first()

    # Calculate XP reward
    earned_xp = 20  # Base XP per speech attempt
    if session_in.overall_score >= 90:
        earned_xp += 30  # Accuracy bonus
    if session_in.completeness_score == 100:
        earned_xp += 10  # Full sentence bonus

    # Store word breakdown details as JSON
    details_json_str = None
    if session_in.words:
        try:
            details_json_str = json.dumps(session_in.words)
        except Exception:
            details_json_str = None

    db_session = PracticeSession(
        id=session_id,
        user_id=user.id if user else None,
        sentence=session_in.sentence,
        category=session_in.category or "General",
        overall_score=session_in.overall_score,
        accuracy_percentage=session_in.accuracy_percentage,
        completeness_score=session_in.completeness_score,
        words_per_minute=session_in.words_per_minute,
        summary=session_in.summary or "",
        words_count=session_in.words_count or 0,
        mispronounced_count=session_in.mispronounced_count or 0,
        spoken_text=session_in.spoken_text or "",
        xp_earned=earned_xp,
        details_json=details_json_str
    )

    merged = db.merge(db_session)

    user_progress = None
    if user:
        user.xp += earned_xp
        user.level = user.calculate_level()
        user.update_streak()
        db.commit()
        db.refresh(user)
        # Fetch sessions for badges update
        user_sessions = db.query(PracticeSession).filter(PracticeSession.user_id == user.id).all()
        user_progress = user.to_dict([s.to_dict() for s in user_sessions])
    else:
        db.commit()

    db.refresh(merged)
    response_data = merged.to_dict()
    response_data["xp_earned"] = earned_xp
    response_data["user_progress"] = user_progress
    return response_data


@app.delete("/api/history/{session_id}")
def delete_practice_history_item(
    session_id: str,
    db: Session = Depends(get_db)
):
    """
    Deletes an individual practice attempt record by ID.
    """
    item = db.query(PracticeSession).filter(PracticeSession.id == session_id).first()
    if not item:
        raise HTTPException(status_code=404, detail="Practice session not found.")
    db.delete(item)
    db.commit()
    return {"success": True, "deleted_id": session_id}

@app.delete("/api/history")
def clear_all_practice_history(db: Session = Depends(get_db)):
    """
    Clears all practice history records from the database.
    """
    deleted_count = db.query(PracticeSession).delete()
    db.commit()
    return {"success": True, "deleted_count": deleted_count}

@app.get("/api/history/stats")
def get_practice_history_stats(db: Session = Depends(get_db)):
    """
    Returns aggregated stats: total attempts, average score, best score.
    """
    sessions = db.query(PracticeSession).all()
    total = len(sessions)
    if total == 0:
        return {
            "total_attempts": 0,
            "average_score": 0,
            "best_score": 0
        }
    avg_score = round(sum(s.overall_score for s in sessions) / total)
    best_score = max(s.overall_score for s in sessions)
    return {
        "total_attempts": total,
        "average_score": avg_score,
        "best_score": best_score
    }

# --- RAG Phonetic Knowledge Base & Coaching Endpoints ---

class RagCoachingRequest(BaseModel):
    words: List[str]
    target_sentence: Optional[str] = ""

@app.post("/api/rag/coaching")
def get_rag_coaching(req: RagCoachingRequest):
    """
    RAG endpoint: Retrieves targeted mouth & tongue positioning instructions,
    airflow mechanics, and minimal-pair contrast drills for the provided mispronounced words.
    """
    return rag_service.generate_coaching(req.words, req.target_sentence)

@app.get("/api/rag/guide/{sound}")
def get_rag_phoneme_guide(sound: str):
    """
    RAG endpoint: Returns the complete articulation card for a specific sound (e.g. 'th_unvoiced', 's_vs_sh', 'r_vs_l').
    """
    guide = rag_service.get_guide_by_sound(sound)
    if not guide:
        raise HTTPException(status_code=404, detail=f"No articulation guide found for sound '{sound}'")
    return guide

@app.get("/api/rag/knowledge-base")
def list_rag_guides():
    """
    RAG endpoint: Lists all available phonetic articulation guides in the knowledge base.
    """
    return {
        "count": len(rag_service.documents),
        "guides": rag_service.documents
    }

@app.get("/api/tts")
def get_tts(text: str):
    """
    Generates reference native speaker audio for the target sentence using Google TTS.
    """
    if not text.strip():
        raise HTTPException(status_code=400, detail="Text cannot be empty.")
    
    try:
        tts = gTTS(text=text, lang='en', tld='com')
        fp = io.BytesIO()
        tts.write_to_fp(fp)
        fp.seek(0)
        return StreamingResponse(fp, media_type="audio/mpeg")
    except Exception as e:
        raise HTTPException(status_code=500, detail=f"TTS generation failed: {str(e)}")

# Mount frontend directory if it exists
frontend_dir = os.path.abspath(os.path.join(os.path.dirname(__file__), "..", "frontend"))
if os.path.exists(frontend_dir):
    app.mount("/static", StaticFiles(directory=frontend_dir), name="static")

    @app.get("/app")
    def serve_frontend():
        return FileResponse(os.path.join(frontend_dir, "index.html"))
