@echo off

echo Starting FastAPI backend...
start cmd /k "cd backend && env\Scripts\activate && uvicorn main:app --reload"

echo Starting Next.js frontend...
start cmd /k "cd front && npm run dev"

echo Both servers are running...
pause