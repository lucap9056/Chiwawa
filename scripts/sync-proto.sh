#!/bin/sh
set -e

cd "$(dirname "$0")/.."

sync_models() {
  service="$1"
  plugin="$service/node_modules/.bin/protoc-gen-ts_proto"

  if [ ! -x "$plugin" ]; then
    echo "sync-proto: skipping $service models (run 'bun install' in $service first)"
    return
  fi

  bunx protoc -I=proto/v1 --plugin=protoc-gen-ts_proto="$plugin" \
    --ts_proto_out="$service/src/models" --ts_proto_opt=exportCommonSymbols=true \
    proto/v1/*.proto
}

sync_models main
sync_models dashboard

cp proto/v1/protocol.ts main/src/lib/cache/protocol.ts
cp proto/v1/protocol.ts dashboard/src/services/cache/protocol.ts
