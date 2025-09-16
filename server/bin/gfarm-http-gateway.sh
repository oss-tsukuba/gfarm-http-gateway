#!/bin/bash
set -eu

DIR=$(realpath $(dirname $0))
source "${DIR}/gfarm-http-gateway-common.sh"

#WORKERS="--workers $(nproc)"

if ! command -v gfwhoami >/dev/null 2>&1; then
    echo "[ERROR] gfwhoami not found. Please install gfarm and ensure it is in PATH." >&2
    exit 1
fi

CONF_FILE="gfarm-http-gateway.conf"
if [ -z "${GFARM_HTTP_TMPDIR:-}" ] && [ -f "$CONF_FILE" ]; then
    GFARM_HTTP_TMPDIR=$(grep -E '^GFARM_HTTP_TMPDIR=' "$CONF_FILE" | cut -d= -f2- || true)
fi

if [ -n "${GFARM_HTTP_TMPDIR:-}" ] && [ -d "$GFARM_HTTP_TMPDIR" ]; then
    echo "Cleaning up temporary files in $GFARM_HTTP_TMPDIR"
    rm -rf "${GFARM_HTTP_TMPDIR:?}/"*
fi

cd "$SRC_DIR"
PYTHONPATH="$API_DIR" exec "$UVICORN" "$APP" --proxy-headers "$@"
