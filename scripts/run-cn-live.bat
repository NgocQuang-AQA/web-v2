@echo off
setlocal
set "DIR=%GLOBAL_CN_LIVE_DIR%"
if not defined GLOBAL_CN_LIVE_DIR set "DIR=D:\Project\globalcn-live"
cd /d "%DIR%"
mvn clean verify -P api-parallel-high
endlocal
