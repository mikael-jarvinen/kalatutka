#!/bin/sh
# refresh-entrypoint.sh — run scripts/refresh.mjs once on boot, then loop on
# REFRESH_INTERVAL_HOURS. A simple sleep loop is plenty: this container's
# only job is the refresh, and the loop gives us "fetch on start" for free.

set -eu

INTERVAL_HOURS="${REFRESH_INTERVAL_HOURS:-4}"
# Convert to seconds with awk so we can accept fractional hours (e.g. 0.05 for
# a 3-minute test cycle).
INTERVAL_SECONDS=$(awk -v h="$INTERVAL_HOURS" 'BEGIN { printf "%d", h * 3600 }')

if [ "$INTERVAL_SECONDS" -lt 60 ]; then
  echo "[entrypoint] REFRESH_INTERVAL_HOURS=$INTERVAL_HOURS resolves to <60s; clamping to 60s"
  INTERVAL_SECONDS=60
fi

echo "[entrypoint] starting; interval=${INTERVAL_HOURS}h (${INTERVAL_SECONDS}s); out_dir=${SIIKASAA_OUT_DIR:-unset}"

while :; do
  if node /app/scripts/refresh.mjs; then
    echo "[entrypoint] refresh ok; sleeping ${INTERVAL_SECONDS}s"
  else
    echo "[entrypoint] refresh failed (exit $?); sleeping ${INTERVAL_SECONDS}s and retrying"
  fi
  sleep "$INTERVAL_SECONDS"
done
