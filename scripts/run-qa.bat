@echo off
setlocal
set "DIR=%GLOBAL_QA_DIR%"
if not defined GLOBAL_QA_DIR set "DIR=D:\Project\global-qa"
cd /d "%DIR%"
mvn clean verify -P api-parallel-high
endlocal
