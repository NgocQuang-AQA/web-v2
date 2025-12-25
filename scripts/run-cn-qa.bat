@echo off
setlocal
set "DIR=%GLOBAL_CN_DIR%"
if not defined GLOBAL_CN_DIR set "DIR=D:\Project\global-cn"
cd /d "%DIR%"
mvn clean verify -P api-parallel-high
endlocal
