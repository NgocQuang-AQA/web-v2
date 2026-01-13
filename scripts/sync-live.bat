@echo off
setlocal
set "DIR=%GLOBAL_LIVE_DIR%"
if not defined GLOBAL_LIVE_DIR set "DIR=D:\Project\global-live"

if not exist "%DIR%\" (
  echo folder_not_found: %DIR%
  endlocal & exit /b 1
)

set "UPDATER_DIR=%DIR%\tools\test-data-updater"
if not exist "%UPDATER_DIR%\" (
  echo folder_not_found: %UPDATER_DIR%
  endlocal & exit /b 1
)

cd /d "%UPDATER_DIR%"

if not exist ".venv" (
  py -m venv .venv
)

.venv\Scripts\python -m pip install -r requirements.txt
.venv\Scripts\python update_test_data.py

set "EXIT_CODE=%ERRORLEVEL%"
endlocal & exit /b %EXIT_CODE%
