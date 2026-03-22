#!/usr/bin/env bash
set -euo pipefail

BACKEND_IMAGE="${BACKEND_IMAGE:-sncp/backend:latest}"
DB_SOURCE_IMAGE="${DB_SOURCE_IMAGE:-postgres:16}"
REDIS_SOURCE_IMAGE="${REDIS_SOURCE_IMAGE:-redis:7-alpine}"
PYTHON_IMAGE="${PYTHON_IMAGE:-python:3.11-slim}"
DB_TARGET_IMAGE="${DB_TARGET_IMAGE:-sncp/postgres:16}"
REDIS_TARGET_IMAGE="${REDIS_TARGET_IMAGE:-sncp/redis:7-alpine}"
OUTPUT_TAR="${OUTPUT_TAR:-sncp-offline-images.tar}"

SCRIPT_DIR="$(cd "$(dirname "${BASH_SOURCE[0]}")" && pwd)"
BACKEND_DIR="$(cd "${SCRIPT_DIR}/.." && pwd)"

docker pull "${DB_SOURCE_IMAGE}"
docker pull "${REDIS_SOURCE_IMAGE}"
docker pull "${PYTHON_IMAGE}"

docker build \
  --build-arg "PYTHON_IMAGE=${PYTHON_IMAGE}" \
  -t "${BACKEND_IMAGE}" \
  "${BACKEND_DIR}"

docker tag "${DB_SOURCE_IMAGE}" "${DB_TARGET_IMAGE}"
docker tag "${REDIS_SOURCE_IMAGE}" "${REDIS_TARGET_IMAGE}"

docker save \
  -o "${OUTPUT_TAR}" \
  "${BACKEND_IMAGE}" \
  "${DB_TARGET_IMAGE}" \
  "${REDIS_TARGET_IMAGE}"

echo "Wrote ${OUTPUT_TAR}"
