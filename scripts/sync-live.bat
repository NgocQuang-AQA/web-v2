@echo off
setlocal
set "DIR=%GLOBAL_LIVE_DIR%"
if not defined GLOBAL_LIVE_DIR set "DIR=D:\Project\global-live"
if not exist "%DIR%\" (
  echo folder_not_found: %DIR%
  endlocal
  exit /b 1
)

cd /d "%DIR%"
if not exist "update-test-data.bat" (
  echo script_not_found: update-test-data.bat
  endlocal
  exit /b 1
)

call "update-test-data.bat"
set "EXIT_CODE=%ERRORLEVEL%"
endlocal & exit /b %EXIT_CODE%
