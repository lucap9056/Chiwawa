@echo off
setlocal

cd /d "%~dp0.."

if exist "main\node_modules\.bin\protoc-gen-ts_proto.exe" (
  call bunx protoc -I=proto/v1 --plugin=protoc-gen-ts_proto=main/node_modules/.bin/protoc-gen-ts_proto.exe --ts_proto_out=main/src/models --ts_proto_opt=exportCommonSymbols=true proto/v1/models.proto
  if errorlevel 1 exit /b 1
) else (
  echo sync-proto: skipping main models ^(run "bun install" in main first^)
)

if exist "dashboard\node_modules\.bin\protoc-gen-ts_proto.exe" (
  call bunx protoc -I=proto/v1 --plugin=protoc-gen-ts_proto=dashboard/node_modules/.bin/protoc-gen-ts_proto.exe --ts_proto_out=dashboard/src/models --ts_proto_opt=exportCommonSymbols=true proto/v1/models.proto
  if errorlevel 1 exit /b 1
) else (
  echo sync-proto: skipping dashboard models ^(run "bun install" in dashboard first^)
)

copy /y proto\v1\protocol.ts main\src\lib\cache\protocol.ts >nul
copy /y proto\v1\protocol.ts dashboard\src\services\cache\protocol.ts >nul

endlocal
