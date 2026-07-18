#!/bin/sh
set -e

cd "$(dirname "$0")/../.."

if [ "$#" -eq 0 ]; then
  set -- chiwawa-dashboard
fi

TAG_ARGS=""
for tag in "$@"; do
  TAG_ARGS="$TAG_ARGS -t $tag"
done

docker build -f dashboard/docker/Dockerfile $TAG_ARGS .
