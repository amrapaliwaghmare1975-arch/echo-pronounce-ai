@echo off
title EchoPronounce AI Launcher
echo ========================================================
echo        Starting EchoPronounce AI Speech Coach
echo ========================================================
echo.

echo [1/2] Launching FastAPI Backend on port 8000...
start "EchoPronounce Backend" cmd /k "cd /d c:\Users\DELL\Desktop\SUHA\pronunciation-tool\backend && python -m uvicorn main:app --reload --port 8000"

echo [2/2] Launching React Frontend on port 3000...
start "EchoPronounce Frontend" cmd /k "cd /d c:\Users\DELL\Desktop\SUHA\pronunciation-tool\frontend && npm.cmd run dev"

echo.
echo Waiting 4 seconds for servers to start...
timeout /t 4 >nul

echo Opening browser at http://localhost:3000...
start http://localhost:3000

echo.
echo ========================================================
echo   Both servers are now running! Keep windows open.
echo ========================================================
