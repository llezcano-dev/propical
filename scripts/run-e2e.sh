#!/usr/bin/env bash
# run-e2e.sh — e2e test runner for Propical.
#
# Starts a dev server against a disposable test database, waits for it
# to become ready, runs Playwright tests, then cleans up.
#
# Usage:
#   ./scripts/run-e2e.sh                            # run all e2e specs
#   ./scripts/run-e2e.sh auth.spec.ts               # run a single spec
#   ./scripts/run-e2e.sh --keep                     # keep the dev server running after tests
#   ./scripts/run-e2e.sh visual.spec.ts --update-snapshots  # (re)generate the visual baseline
#
# --update-snapshots is a passthrough for Playwright's flag of the same name:
# it writes/replaces the "to-be" snapshot files instead of comparing against
# them. Generate the baseline from a clean main, then re-run the visual spec
# without the flag to confirm a 0-diff run.
#
# Env vars honoured (all optional):
#   E2E_PORT        default: 3001 (e2e NO usa el 3000 del dev server)
#   E2E_BASE_URL    default: http://localhost:${E2E_PORT}
#   E2E_DB_PATH     default: ./data/test.db
#   E2E_WORKERS     default: 1
set -euo pipefail

ROOT="$(cd "$(dirname "$0")/.." && pwd)"
cd "$ROOT"

PORT="${E2E_PORT:-3001}"
BASE_URL="${E2E_BASE_URL:-http://localhost:${PORT}}"
# Lo exporta para que playwright.config.ts (que lee E2E_BASE_URL) apunte al
# mismo server que este script levanta y verifica.
export E2E_BASE_URL="$BASE_URL"
DB_PATH="${E2E_DB_PATH:-./data/test.db}"
KEEP_SERVER=0
UPDATE_SNAPSHOTS=0
SPEC=""

# Parse flags
while [[ $# -gt 0 ]]; do
  case "$1" in
    --keep)             KEEP_SERVER=1; shift ;;
    --update-snapshots) UPDATE_SNAPSHOTS=1; shift ;;
    *)                  SPEC="$1"; shift ;;
  esac
done

RED='\033[0;31m'
GREEN='\033[0;32m'
CYAN='\033[0;36m'
NC='\033[0m'

log()  { echo -e "${CYAN}[e2e]${NC} $*"; }
ok()   { echo -e "${GREEN}[e2e]${NC} $*"; }
err()  { echo -e "${RED}[e2e]${NC} $*" >&2; }

cleanup() {
  if [ "$KEEP_SERVER" -eq 0 ]; then
    log "stopping dev server..."
    # Killing DEV_PID (the pnpm wrapper) orphans its child next-server,
    # which keeps holding $PORT — that's the leak that blocked port 3000
    # after every run. Kill by port too so the port is never left behind.
    kill "$DEV_PID" 2>/dev/null || true
    fuser -k "${PORT}/tcp" 2>/dev/null || true
    wait "$DEV_PID" 2>/dev/null || true
    # fuser -k is SIGKILL: the dying process takes a moment to release the
    # socket, so give it a short grace window before declaring victory.
    for _ in 1 2 3 4 5; do
      if ! ss -tlnp 2>/dev/null | grep -q ":${PORT} "; then
        ok "port ${PORT} released"
        return
      fi
      sleep 1
    done
    err "port ${PORT} still in use after cleanup"
    ss -tlnp 2>/dev/null | grep ":${PORT} "
  else
    log "dev server left running (PID $DEV_PID)"
  fi
}
trap cleanup EXIT

# ── 1. Kill any process on the port (aggressive, multi-pass) ───────
log "ensuring port ${PORT} is free..."
for attempt in 1 2 3; do
  fuser -k "${PORT}/tcp" 2>/dev/null || true
  sleep 1
done
# Double-check nothing is listening
if ss -tlnp | grep -q ":${PORT} "; then
  err "port ${PORT} is still in use — aborting"
  ss -tlnp | grep ":${PORT} "
  exit 1
fi
ok "port ${PORT} free"

# ── 2. Fresh test database ──────────────────────────────────────────
log "resetting test database..."
rm -f "${DB_PATH}" "${DB_PATH}-journal" "${DB_PATH}-wal" "${DB_PATH}-shm"

export DATABASE_URL="file:${DB_PATH}"
export NODE_ENV="development"
export JWT_SECRET="e2e-test-secret-do-not-use-in-production-32bytes"
export TEST_USER_EMAIL="e2e@propical.com.br"
export TEST_USER_PASSWORD="E2eTest123456!"
# distDir propio: Next 16 bloquea dos `next dev` sobre el mismo distDir aunque
# usen puertos distintos (lockDistDir default true). Con .next-e2e el server
# e2e tiene su propio lock + cache y convive con el dev server del usuario en
# :3000 (que sigue usando .next).
export NEXT_DIST_DIR=".next-e2e"

pnpm db:push --silent 2>&1 | tail -1
pnpm db:seed-test-user --silent 2>&1 | tail -1
ok "database ready"

# ── 3. Start dev server ─────────────────────────────────────────────
# `pnpm exec next dev` en vez de `pnpm dev` a propósito: bypasea scripts/dev.sh
# (que mata stale next-servers en :3000) para que el e2e NUNCA toque el dev
# server del usuario en :3000. El `-p $PORT` fuerza :3001 sin depender del
# fallback de Next.js ni de que :3000 esté libre/ocupado.
log "starting dev server on ${BASE_URL}..."
pnpm exec next dev -p "${PORT}" > /tmp/propical-e2e.log 2>&1 &
DEV_PID=$!

log "waiting for server on ${BASE_URL} (PID ${DEV_PID})..."
for i in $(seq 1 30); do
  if curl -s -o /dev/null "${BASE_URL}" 2>/dev/null; then
    ok "server ready after ${i}s"
    break
  fi
  if ! kill -0 "$DEV_PID" 2>/dev/null; then
    err "dev server crashed — check /tmp/propical-e2e.log:"
    tail -30 /tmp/propical-e2e.log
    exit 1
  fi
  sleep 2
done

# Verify server is on the correct port (Next.js falls back to the next free
# port if the target one is taken)
if ! curl -s -o /dev/null "${BASE_URL}" 2>/dev/null; then
  err "server did not become ready on ${BASE_URL}"
  tail -10 /tmp/propical-e2e.log
  exit 1
fi

# ── 4. Run tests ────────────────────────────────────────────────────
log "running e2e tests..."
ARGS=(--config=playwright.config.ts)
if [ -n "$SPEC" ]; then
  ARGS+=("$SPEC")
fi
if [ "$UPDATE_SNAPSHOTS" -eq 1 ]; then
  ARGS+=(--update-snapshots)
fi
npx playwright test "${ARGS[@]}"
RC=$?

if [ $RC -eq 0 ]; then
  ok "all tests passed"
else
  err "tests failed (exit code $RC)"
fi

exit $RC
