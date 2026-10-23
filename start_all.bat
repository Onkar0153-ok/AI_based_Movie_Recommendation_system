@echo off
title CineMatch AI - Full-Stack Launcher
echo ========================================================
echo   Launching CineMatch AI: Backend and Frontend Servers
echo ========================================================

start "CineMatch AI - Backend" cmd /k "%~dp0run_backend.bat"
timeout /t 2 /nobreak >nul
start "CineMatch AI - Frontend" cmd /k "%~dp0run_frontend.bat"

echo.
echo Both servers have been launched in dedicated terminal windows!
echo Backend API : http://127.0.0.1:8000 (Docs: http://127.0.0.1:8000/api/docs)
echo Frontend UI : http://localhost:5173
echo.
