#!/bin/sh
set -e

cd "$(dirname "$0")/.."

bunx protoc -I=proto/v1 --ts_proto_out=main/src/models --ts_proto_opt=exportCommonSymbols=true proto/v1/*.proto
bunx protoc -I=proto/v1 --ts_proto_out=dashboard/src/models --ts_proto_opt=exportCommonSymbols=true proto/v1/*.proto

cp proto/v1/protocol.ts main/src/lib/cache/protocol.ts
cp proto/v1/protocol.ts dashboard/src/services/cache/protocol.ts
