@echo off
setlocal
set "DIR=%GLOBAL_LIVE_DIR%"
if not defined GLOBAL_LIVE_DIR set "DIR=D:\Project\global-live"
cd /d "%DIR%"
mvn clean verify -P api-parallel-high
endlocal
