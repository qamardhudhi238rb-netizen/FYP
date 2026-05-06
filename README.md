# EmoVision

EmoVision is a lightweight web application for real-time facial expression and emotion analysis. It provides:

- Live webcam emotion detection (browser → backend analysis)
- Image and video upload analysis
- Visual HUD, emotion breakdown and mood history

This repo contains a Python FastAPI backend that uses DeepFace for emotion analysis, and a React/Next frontend for the UI.

## Features

- Low-latency single-frame analysis for webcam streaming
- Per-face bounding boxes and confidence scores
- Aggregate "overall" emotion and emotional journey for videos
- In-memory processing (no media stored)

## Repo structure

- `back/` — FastAPI backend and emotion analysis logic
- `front/` — Next.js frontend and React components
- `env/` — optional local Python virtual environment (not tracked)
- `run.bat` — helper script for Windows

## Prerequisites

- Python 3.10+ (recommended 3.11)
- Node 18+ / npm
- A webcam for live testing
- Optional: ffmpeg (for some video workflows)

## Setup (backend)

1. Create and activate a Python virtual environment (or use the provided `env/`):

```powershell
python -m venv .venv
.\.venv\Scripts\Activate.ps1    # PowerShell
# or
.\.venv\Scripts\activate.bat    # cmd
```

2. Install Python dependencies:

```bash
pip install -r back/requirements.txt
```

3. Run the backend (development):

```bash
cd back
python -m uvicorn main:app --reload
```

The API will be served at `http://127.0.0.1:8000` by default.

## Setup (frontend)

1. Install frontend dependencies:

```bash
cd front
npm install
```

2. Run the dev server:

```bash
npm run dev
```

Open the Next app at `http://localhost:3000` and visit the Live Emotion Detection view.

## Environment / Configuration

- Backend: environment variables can be defined in `.env` (not committed) for tokens or settings.
- Frontend: token is stored in cookies (`emo_token`) for authenticated endpoints.

## Notes about realtime analysis

- The backend resizes frames for speed before DeepFace analysis; frontend overlays map to the resized analyzer coordinates.
- The frontend includes a single in-flight analysis loop (no overlapping requests) to prevent network saturation.
- DeepFace accuracy and face detection vary by lighting and camera angle.

## Troubleshooting

- If the camera permission is denied, check browser site settings and allow access.
- If DeepFace fails during startup, ensure dependencies (TensorFlow, OpenCV) installed correctly in the Python environment.
- For low FPS, check CPU usage and consider running GPU-accelerated libraries or reducing capture interval in `front/components/RealtimeCamera.tsx`.

## Docker

A `Dockerfile` and `docker-compose.yaml` are present for local containerised runs. Adjust service configs before production use.

## Contributing

Contributions are welcome. Open an issue or submit a PR. Keep changes small and focused.

## License

MIT — see LICENSE (add one if you want to apply a license).
