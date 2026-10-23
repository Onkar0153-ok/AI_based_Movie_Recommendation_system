@echo off
title CineMatch AI - Frontend Dev Server
echo ===================================================
echo   Starting CineMatch AI Frontend (Vite + React)
echo ===================================================

cd /d "%~dp0frontend"

REM Verify .env exists
if not exist ".env" (
    echo Notice: .env not found, copying from .env.example...
    copy .env.example .env >nul
)

echo Starting Vite on http://localhost:5173
npm run dev

pause
