"""
emotion_analyzer.py
Handles:
  - analyze_image_bytes  → per-face + overall emotion for static images
  - analyze_video_bytes  → timestamped emotion segments for video files
  - analyze_frame_bytes  → lightweight single-frame analysis (webcam / realtime)
"""

import base64
import cv2
import numpy as np
import os
import tempfile
from typing import Any, Dict, List, Optional, Tuple


# ── Constants ────────────────────────────────────────────────────────────────

EMOTION_COLORS: Dict[str, str] = {
    "happy":    "#FFD700",
    "sad":      "#4169E1",
    "angry":    "#DC143C",
    "fear":     "#800080",
    "surprise": "#FF8C00",
    "disgust":  "#228B22",
    "neutral":  "#808080",
}

EMOTION_ICONS: Dict[str, str] = {
    "happy":    "😊",
    "sad":      "😢",
    "angry":    "😠",
    "fear":     "😨",
    "surprise": "😲",
    "disgust":  "🤢",
    "neutral":  "😐",
}


def _deepface():
    """Lazy-import DeepFace to avoid penalising startup time."""
    from deepface import DeepFace  # noqa: PLC0415
    return DeepFace


# ── Helpers ──────────────────────────────────────────────────────────────────

def _normalise(raw: Dict[str, float]) -> Dict[str, float]:
    total = sum(raw.values()) or 1.0
    return {k: round(v / total * 100, 1) for k, v in raw.items()}


def _dominant(scores: Dict[str, float]) -> str:
    return max(scores, key=scores.get)


def _avg_scores(score_list: List[Dict[str, float]]) -> Dict[str, float]:
    if not score_list:
        return {"neutral": 100.0}
    totals: Dict[str, float] = {}
    for s in score_list:
        for k, v in s.items():
            totals[k] = totals.get(k, 0.0) + v
    n = len(score_list)
    return {k: round(v / n, 1) for k, v in totals.items()}


def _face_result(raw: Dict[str, Any], idx: int) -> Dict[str, Any]:
    emotions = _normalise(raw.get("emotion", {}))
    dominant = raw.get("dominant_emotion", _dominant(emotions))
    return {
        "face_index": idx,
        "dominant_emotion": dominant,
        "emotions": emotions,
        "region": raw.get("region", {}),
        "color":  EMOTION_COLORS.get(dominant, "#808080"),
        "icon":   EMOTION_ICONS.get(dominant,  "😐"),
    }


def _overall(faces: List[Dict[str, Any]]) -> Dict[str, Any]:
    if not faces:
        return {
            "dominant_emotion": "neutral",
            "emotions": {"neutral": 100.0},
            "color":  EMOTION_COLORS["neutral"],
            "icon":   EMOTION_ICONS["neutral"],
        }
    agg = _avg_scores([f["emotions"] for f in faces])
    dom = _dominant(agg)
    return {
        "dominant_emotion": dom,
        "emotions": agg,
        "color":  EMOTION_COLORS.get(dom, "#808080"),
        "icon":   EMOTION_ICONS.get(dom,  "😐"),
    }


def _fmt(secs: float) -> str:
    s = int(secs)
    h, m, sec = s // 3600, (s % 3600) // 60, s % 60
    return f"{h}:{m:02d}:{sec:02d}" if h else f"{m}:{sec:02d}"


def _bytes_to_bgr(data: bytes) -> Optional[np.ndarray]:
    arr = np.frombuffer(data, np.uint8)
    return cv2.imdecode(arr, cv2.IMREAD_COLOR)


# ── Public API ────────────────────────────────────────────────────────────────

def analyze_image_bytes(image_bytes: bytes) -> Dict[str, Any]:
    """Analyse emotions in a static image."""
    DeepFace = _deepface()
    img = _bytes_to_bgr(image_bytes)
    if img is None:
        raise ValueError("Cannot decode image bytes.")

    try:
        raw = DeepFace.analyze(img, actions=["emotion"], enforce_detection=False, silent=True)
    except Exception as exc:
        raise ValueError(f"DeepFace error: {exc}") from exc

    if not isinstance(raw, list):
        raw = [raw]

    faces = [_face_result(r, i) for i, r in enumerate(raw)]
    overall = _overall(faces)

    return {
        "type":       "image",
        "face_count": len(faces),
        "faces":      faces,
        "overall":    overall,
        "summary":    _image_summary(faces),
    }


def analyze_frame_bytes(frame_bytes: bytes) -> Dict[str, Any]:
    """
    Lightweight single-frame analysis for realtime webcam streaming.
    Returns simplified payload optimised for low latency.
    """
    DeepFace = _deepface()
    img = _bytes_to_bgr(frame_bytes)
    if img is None:
        return _no_face_frame()

    # Resize to 320px wide for speed
    h, w = img.shape[:2]
    if w > 320:
        scale = 320 / w
        img = cv2.resize(img, (320, int(h * scale)), interpolation=cv2.INTER_AREA)

    try:
        raw = DeepFace.analyze(img, actions=["emotion"], enforce_detection=False, silent=True)
    except Exception:
        return _no_face_frame()

    if not isinstance(raw, list):
        raw = [raw]

    faces = []
    for i, r in enumerate(raw):
        emotions = _normalise(r.get("emotion", {}))
        dominant = r.get("dominant_emotion", _dominant(emotions))
        region   = r.get("region", {})
        faces.append({
            "face_index":       i,
            "dominant_emotion": dominant,
            "emotions":         emotions,
            "confidence":       round(emotions.get(dominant, 0), 1),
            "region":           region,        # {x,y,w,h} in resized coords — frontend scales
            "color":            EMOTION_COLORS.get(dominant, "#808080"),
            "icon":             EMOTION_ICONS.get(dominant,  "😐"),
        })

    overall = _overall(faces)
    return {
        "type":       "frame",
        "face_count": len(faces),
        "faces":      faces,
        "overall":    overall,
    }


def _no_face_frame() -> Dict[str, Any]:
    return {
        "type":       "frame",
        "face_count": 0,
        "faces":      [],
        "overall": {
            "dominant_emotion": "neutral",
            "emotions": {"neutral": 100.0},
            "color":  EMOTION_COLORS["neutral"],
            "icon":   EMOTION_ICONS["neutral"],
        },
    }


def analyze_video_bytes(video_bytes: bytes, filename: str = "upload.mp4") -> Dict[str, Any]:
    """Analyse emotions across a video file, returning timestamped segments."""
    suffix = os.path.splitext(filename)[-1] or ".mp4"

    with tempfile.NamedTemporaryFile(suffix=suffix, delete=False) as tmp:
        tmp.write(video_bytes)
        tmp_path = tmp.name

    try:
        return _process_video(tmp_path)
    finally:
        os.unlink(tmp_path)


def _process_video(path: str) -> Dict[str, Any]:
    DeepFace = _deepface()

    cap = cv2.VideoCapture(path)
    if not cap.isOpened():
        raise ValueError("Cannot open video file.")

    fps           = cap.get(cv2.CAP_PROP_FPS) or 24.0
    total_frames  = int(cap.get(cv2.CAP_PROP_FRAME_COUNT))
    duration      = total_frames / fps

    # Adaptive sampling interval
    if duration <= 30:
        interval_s = 0.5
    elif duration <= 120:
        interval_s = 1.0
    else:
        interval_s = 2.0
    step = max(1, int(fps * interval_s))

    samples: List[Tuple[float, str, Dict[str, float]]] = []
    frame_idx = 0

    while True:
        ret, frame = cap.read()
        if not ret:
            break
        if frame_idx % step == 0:
            ts = frame_idx / fps
            # Resize for speed
            h, w = frame.shape[:2]
            if w > 480:
                scale = 480 / w
                frame = cv2.resize(frame, (480, int(h * scale)), interpolation=cv2.INTER_AREA)
            try:
                raw = DeepFace.analyze(frame, actions=["emotion"], enforce_detection=False, silent=True)
                if not isinstance(raw, list):
                    raw = [raw]
                emotions = _normalise(raw[0].get("emotion", {}))
                dominant = raw[0].get("dominant_emotion", _dominant(emotions))
            except Exception:
                emotions = {"neutral": 100.0}
                dominant = "neutral"
            samples.append((ts, dominant, emotions))
        frame_idx += 1

    cap.release()

    if not samples:
        raise ValueError("No frames could be analysed in this video.")

    segments = _build_segments(samples)
    emotion_dur: Dict[str, float] = {}
    for seg in segments:
        emotion_dur[seg["emotion"]] = emotion_dur.get(seg["emotion"], 0.0) + seg["duration_seconds"]

    total_dur = sum(emotion_dur.values()) or 1.0
    pcts = {k: round(v / total_dur * 100, 1) for k, v in emotion_dur.items()}
    dom  = _dominant(pcts)

    return {
        "type":               "video",
        "duration_seconds":   round(duration, 2),
        "duration_formatted": _fmt(duration),
        "fps":                round(fps, 2),
        "segments":           segments,
        "segment_count":      len(segments),
        "overall": {
            "dominant_emotion": dom,
            "emotions":         pcts,
            "color":  EMOTION_COLORS.get(dom, "#808080"),
            "icon":   EMOTION_ICONS.get(dom,  "😐"),
        },
        "emotional_journey": [
            {"time": s["start_formatted"], "emotion": s["emotion"],
             "icon": s["icon"], "color": s["color"]}
            for s in segments
        ],
        "summary": _video_summary(segments, dom, duration),
    }


def _build_segments(samples: List[Tuple[float, str, Dict[str, float]]]) -> List[Dict[str, Any]]:
    if not samples:
        return []

    segs: List[Dict[str, Any]] = []
    cur_emo   = samples[0][1]
    cur_start = samples[0][0]
    cur_scrs  = [samples[0][2]]

    for ts, emo, scrs in samples[1:]:
        if emo == cur_emo:
            cur_scrs.append(scrs)
        else:
            segs.append(_make_seg(cur_emo, cur_start, ts, cur_scrs))
            cur_emo, cur_start, cur_scrs = emo, ts, [scrs]

    segs.append(_make_seg(cur_emo, cur_start, samples[-1][0], cur_scrs))
    return _merge_short(segs)


def _make_seg(emo: str, start: float, end: float, scrs: List[Dict]) -> Dict[str, Any]:
    avg = _avg_scores(scrs)
    return {
        "emotion":          emo,
        "start_seconds":    round(start, 2),
        "end_seconds":      round(end, 2),
        "start_formatted":  _fmt(start),
        "end_formatted":    _fmt(end),
        "duration_seconds": round(end - start, 2),
        "confidence":       round(avg.get(emo, 0), 1),
        "emotion_scores":   avg,
        "color":            EMOTION_COLORS.get(emo, "#808080"),
        "icon":             EMOTION_ICONS.get(emo,  "😐"),
    }


def _merge_short(segs: List[Dict], min_dur: float = 0.5) -> List[Dict]:
    if len(segs) <= 1:
        return segs
    out = [segs[0]]
    for seg in segs[1:]:
        if seg["duration_seconds"] < min_dur:
            out[-1]["end_seconds"]    = seg["end_seconds"]
            out[-1]["end_formatted"]  = seg["end_formatted"]
            out[-1]["duration_seconds"] = out[-1]["end_seconds"] - out[-1]["start_seconds"]
        else:
            out.append(seg)
    return out


def _image_summary(faces: List[Dict]) -> str:
    if not faces:
        return "No faces detected in the image."
    n = len(faces)
    if n == 1:
        emo  = faces[0]["dominant_emotion"]
        conf = faces[0]["emotions"].get(emo, 0)
        return f"1 face detected — {emo} ({conf:.0f}% confidence)."
    counts: Dict[str, int] = {}
    for f in faces:
        counts[f["dominant_emotion"]] = counts.get(f["dominant_emotion"], 0) + 1
    parts = [f"{v} {k}" for k, v in counts.items()]
    return f"{n} faces detected: {', '.join(parts)}."


def _video_summary(segs: List[Dict], dominant: str, duration: float) -> str:
    peak = max(segs, key=lambda s: s["confidence"]) if segs else None
    peak_str = f" Peak emotional intensity ({peak['emotion']}) at {peak['start_formatted']}." if peak else ""
    return (
        f"Analysed {_fmt(duration)} of video across {len(segs)} emotional segment(s). "
        f"Dominant emotion: {dominant}.{peak_str}"
    )