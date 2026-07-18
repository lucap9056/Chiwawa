#!/bin/sh
set -e

cd "$(dirname "$0")/../.."

docker build -f main/docker/Dockerfile -t chiwawa-main .
