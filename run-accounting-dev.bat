@echo off
setlocal

REM Starts backend + frontend dev servers from this repo.
REM Assumes:
REM - Java + Maven are installed for the backend
REM - Node + npm are installed for the frontend

set "ROOT=%~dp0"
REM Strip trailing backslash for consistency
if "%ROOT:~-1%"=="\" set "ROOT=%ROOT:~0,-1%"

echo Project root: "%ROOT%"
echo.

echo Starting backend (Spring Boot)...
set "BACKEND_DIR=%ROOT%\backend"
if not exist "%BACKEND_DIR%" (
  echo Backend folder not found: "%BACKEND_DIR%"
  pause
  exit /b 1
)
REM Use ""%VAR%"" to safely embed quotes inside the cmd /c string.
start "backend" cmd /k "cd /d ""%BACKEND_DIR%"" && mvn spring-boot:run"

echo Starting frontend (Vite)...
set "FRONTEND_DIR=%ROOT%\frontend"
if not exist "%FRONTEND_DIR%" (
  echo Frontend folder not found: "%FRONTEND_DIR%"
  pause
  exit /b 1
)
start "frontend" cmd /k "cd /d ""%FRONTEND_DIR%"" && npm run dev"

echo.
echo Dev servers launched.
echo Backend: http://localhost:8080
echo Frontend: http://localhost:5173
echo.
echo Leave these windows open. Close them to stop the servers.
pause

