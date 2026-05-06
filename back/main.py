"""
EmoVision API — FastAPI backend
Endpoints:
  POST /auth/register
  POST /auth/login
  GET  /auth/me

  POST /analyze/image        — static image upload
  POST /analyze/video        — video file upload
  POST /analyze/frame        — single webcam frame (base64 JSON)  ← realtime
  GET  /health
"""

import base64
import traceback
from datetime import timedelta

from fastapi import Depends, FastAPI, File, HTTPException, UploadFile, status
from fastapi.middleware.cors import CORSMiddleware
from pydantic import BaseModel, EmailStr

from auth import create_access_token, get_current_user, hash_password, verify_password
from database import close_db, connect_db, get_db, get_settings
from emotion_analyzer import analyze_frame_bytes, analyze_image_bytes, analyze_video_bytes

# ── App ──────────────────────────────────────────────────────────────────────

app = FastAPI(title="EmoVision API", version="2.0.0")

app.add_middleware(
    CORSMiddleware,
    allow_origins=["http://localhost:3000", "http://127.0.0.1:3000"],
    allow_credentials=True,
    allow_methods=["*"],
    allow_headers=["*"],
)


@app.on_event("startup")
async def startup():
    await connect_db()


@app.on_event("shutdown")
async def shutdown():
    await close_db()


# ── Schemas ──────────────────────────────────────────────────────────────────

class RegisterRequest(BaseModel):
    name: str
    email: EmailStr
    password: str


class LoginRequest(BaseModel):
    email: EmailStr
    password: str


class FrameRequest(BaseModel):
    """Single frame from webcam as base64-encoded JPEG/PNG data URI or raw base64."""
    frame: str   # data:image/jpeg;base64,<data>  OR plain base64


# ── Auth ─────────────────────────────────────────────────────────────────────

@app.post("/auth/register")
async def register(data: RegisterRequest, db=Depends(get_db)):
    settings = get_settings()
    if await db.users.find_one({"email": data.email.lower()}):
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Email already registered.")
    if len(data.password) < 6:
        raise HTTPException(status.HTTP_400_BAD_REQUEST, "Password must be ≥ 6 characters.")

    doc = {
        "name":            data.name.strip(),
        "email":           data.email.lower(),
        "password":        hash_password(data.password),
        "analyses_count":  0,
    }
    result = await db.users.insert_one(doc)
    token  = create_access_token(
        {"sub": data.email.lower()},
        timedelta(minutes=settings.access_token_expire_minutes),
    )
    return {
        "access_token": token,
        "token_type":   "bearer",
        "user": {"id": str(result.inserted_id), "name": data.name, "email": data.email},
    }


@app.post("/auth/login")
async def login(data: LoginRequest, db=Depends(get_db)):
    settings = get_settings()
    user = await db.users.find_one({"email": data.email.lower()})
    if not user or not verify_password(data.password, user["password"]):
        raise HTTPException(status.HTTP_401_UNAUTHORIZED, "Invalid email or password.")
    token = create_access_token(
        {"sub": data.email.lower()},
        timedelta(minutes=settings.access_token_expire_minutes),
    )
    return {
        "access_token": token,
        "token_type":   "bearer",
        "user": {"id": str(user["_id"]), "name": user["name"], "email": user["email"]},
    }


@app.get("/auth/me")
async def get_me(current_user=Depends(get_current_user)):
    return {
        "id":             str(current_user["_id"]),
        "name":           current_user["name"],
        "email":          current_user["email"],
        "analyses_count": current_user.get("analyses_count", 0),
    }


# ── Analysis ─────────────────────────────────────────────────────────────────

_IMAGE_TYPES = {"image/jpeg", "image/png", "image/webp", "image/gif", "image/bmp"}
_VIDEO_TYPES = {"video/mp4", "video/mpeg", "video/quicktime", "video/x-msvideo", "video/webm"}
_IMAGE_EXTS  = {".jpg", ".jpeg", ".png", ".webp", ".bmp", ".gif"}
_VIDEO_EXTS  = {".mp4", ".mov", ".avi", ".webm", ".mpeg"}
MAX_IMAGE    = 10  * 1024 * 1024   # 10 MB
MAX_VIDEO    = 200 * 1024 * 1024   # 200 MB


def _check_type(content_type: str, filename: str, allowed_types: set, allowed_exts: set, label: str):
    if content_type in allowed_types:
        return
    ext = "." + (filename or "").rsplit(".", 1)[-1].lower()
    if ext in allowed_exts:
        return
    raise HTTPException(400, f"Unsupported {label} format.")


@app.post("/analyze/image")
async def analyze_image(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    _check_type(file.content_type or "", file.filename or "", _IMAGE_TYPES, _IMAGE_EXTS, "image")
    data = await file.read()
    if len(data) > MAX_IMAGE:
        raise HTTPException(400, "Image too large (max 10 MB).")
    try:
        result = analyze_image_bytes(data)
        result["filename"] = file.filename
        await db.users.update_one({"_id": current_user["_id"]}, {"$inc": {"analyses_count": 1}})
        return result
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    except Exception:
        traceback.print_exc()
        raise HTTPException(500, "Image analysis failed.")


@app.post("/analyze/video")
async def analyze_video(
    file: UploadFile = File(...),
    current_user=Depends(get_current_user),
    db=Depends(get_db),
):
    _check_type(file.content_type or "", file.filename or "", _VIDEO_TYPES, _VIDEO_EXTS, "video")
    data = await file.read()
    if len(data) > MAX_VIDEO:
        raise HTTPException(400, "Video too large (max 200 MB).")
    try:
        result = analyze_video_bytes(data, file.filename or "upload.mp4")
        result["filename"] = file.filename
        await db.users.update_one({"_id": current_user["_id"]}, {"$inc": {"analyses_count": 1}})
        return result
    except ValueError as exc:
        raise HTTPException(422, str(exc))
    except Exception:
        traceback.print_exc()
        raise HTTPException(500, "Video analysis failed.")


@app.post("/analyze/frame")
async def analyze_frame(
    body: FrameRequest,
    current_user=Depends(get_current_user),
):
    """
    Realtime single-frame endpoint for webcam streaming.
    Accepts base64 data URI (data:image/jpeg;base64,...) or plain base64.
    Returns lightweight emotion payload — optimised for frequent polling.
    """
    try:
        frame_b64 = body.frame
        if "," in frame_b64:                          # strip data URI prefix
            frame_b64 = frame_b64.split(",", 1)[1]
        frame_bytes = base64.b64decode(frame_b64)
        return analyze_frame_bytes(frame_bytes)
    except Exception:
        traceback.print_exc()
        raise HTTPException(500, "Frame analysis failed.")


# ── Health ────────────────────────────────────────────────────────────────────

@app.get("/health")
async def health():
    return {"status": "ok", "service": "EmoVision API", "version": "2.0.0"}