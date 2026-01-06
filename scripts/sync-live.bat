@echo off
setlocal
set "DIR=%GLOBAL_LIVE_DIR%"
if not defined GLOBAL_LIVE_DIR set "DIR=D:\Project\global-live"
cd /d "%DIR%"
set "REPO_SCRIPT=%~dp0update-test-data"
if exist "update-test-data.bat" (
  call "update-test-data.bat"
) else if exist "update-test-data.cmd" (
  call "update-test-data.cmd"
) else if exist "update-test-data.sh" (
  where bash >nul 2>nul
  if %ERRORLEVEL%==0 (
    bash "update-test-data.sh"
  ) else (
    echo bash_not_found
    exit /b 1
  )
) else if exist "update-test-data" (
  "update-test-data"
) else if exist "%REPO_SCRIPT%.bat" (
  call "%REPO_SCRIPT%.bat"
) else if exist "%REPO_SCRIPT%.cmd" (
  call "%REPO_SCRIPT%.cmd"
) else if exist "%REPO_SCRIPT%.sh" (
  where bash >nul 2>nul
  if %ERRORLEVEL%==0 (
    bash "%REPO_SCRIPT%.sh"
  ) else (
    echo bash_not_found
    exit /b 1
  )
) else if exist "%REPO_SCRIPT%" (
  where bash >nul 2>nul
  if %ERRORLEVEL%==0 (
    bash "%REPO_SCRIPT%"
  ) else (
    "%REPO_SCRIPT%"
  )
) else (
  echo script_not_found
  exit /b 1
)
endlocal
