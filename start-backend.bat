@echo off
echo Starting VideoParser Backend...

:: Start Redis if not running
"C:\Program Files\Redis\redis-cli.exe" ping >nul 2>&1
if errorlevel 1 (
    echo Starting Redis...
    start /B "C:\Program Files\Redis\redis-server.exe"
    timeout /t 2 /nobreak >nul
) else (
    echo Redis: already running
)

cd /d %~dp0backend
uvicorn main:app --reload --port 8000
