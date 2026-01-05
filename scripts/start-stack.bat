@echo off
setlocal
rem Usage: start-stack.bat [API_URL]
rem Example: start-stack.bat http://10.13.60.136:4000

set "API_URL=%~1"
if not defined API_URL set "API_URL=http://10.13.60.136:4000"

echo [INFO] Starting Backend...
start "web-v2 backend" cmd /c "cd /d backend && npm run start"

echo [INFO] Building Frontend with VITE_API_URL=%API_URL% ...
set "VITE_API_URL=%API_URL%"
npm run build

echo [INFO] Starting Frontend Preview...
start "web-v2 frontend" cmd /c "set VITE_API_URL=%API_URL% && npm run build && npx serve dist -l 5173"

echo [INFO] Done. Backend and Frontend are starting in separate windows.
echo [INFO] Backend: listening on PORT from backend/.env or default 4000
echo [INFO] Frontend: http://localhost:5173 (10.13.60.136:5173)

endlocal
