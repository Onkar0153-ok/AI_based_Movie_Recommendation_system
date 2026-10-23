@echo off
title CineMatch AI - Backend Server
echo ===================================================
echo   Starting CineMatch AI Backend (FastAPI + Uvicorn)
echo ===================================================

cd /d "%~dp0backend"

REM Check if venv exists, activate if present
if exist "venv\Scripts\activate.bat" (
    echo Activating Python virtual environment...
    call venv\Scripts\activate.bat
)

REM Verify .env exists
if not exist ".env" (
    echo Notice: .env not found, copying from .env.example...
    copy .env.example .env >nul
)

REM Start Uvicorn Server
echo Running API on http://127.0.0.1:8000 (Swagger docs: http://127.0.0.1:8000/api/docs)
python -m uvicorn app.main:app --host 127.0.0.1 --port 8000 --reload

pause
