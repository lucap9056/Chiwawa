#!/bin/sh
set -e

cd "$(dirname "$0")/../.."

docker build -f dashboard/docker/Dockerfile -t chiwawa-dashboard .
