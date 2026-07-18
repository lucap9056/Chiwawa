@echo off
setlocal

cd /d "%~dp0.."

call bunx protoc -I=proto/v1 --ts_proto_out=main/src/models --ts_proto_opt=exportCommonSymbols=true proto/v1/models.proto
if errorlevel 1 exit /b 1

call bunx protoc -I=proto/v1 --ts_proto_out=dashboard/src/models --ts_proto_opt=exportCommonSymbols=true proto/v1/models.proto
if errorlevel 1 exit /b 1

copy /y proto\v1\protocol.ts main\src\lib\cache\protocol.ts >nul
copy /y proto\v1\protocol.ts dashboard\src\services\cache\protocol.ts >nul

endlocal
