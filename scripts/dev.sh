#!/usr/bin/env bash
# dev.sh — dev server local en :3000 (default; override con PORT o -p).
#
# Mata un next-server stale dejado por un `pnpm dev` anterior, así el server
# siempre bindea el puerto pedido (en vez de que Next.js caiga silenciosamente
# a :3001, que está reservado para e2e).
#
# Seguridad:
#   - Solo mata procesos cuyo cmdline matchea "next", y SOLO en el puerto
#     pedido acá. NUNCA toca el server e2e (:3001, manejado por run-e2e.sh),
#     así que `pnpm dev` y `pnpm test:e2e` conviven lado a lado.
#   - run-e2e.sh levanta su server con `pnpm exec next dev -p $PORT`
#     (bypaseando este script) para que correr e2e nunca mate este dev server.
set -euo pipefail

PORT="${PORT:-3000}"
EXTRA=()
while [[ $# -gt 0 ]]; do
  case "$1" in
    -p|--port)
      PORT="${2:?missing port after $1}"
      shift 2
      ;;
    *)
      EXTRA+=("$1")
      shift
      ;;
  esac
done

# Mata next-server(s) stale bound a $PORT.
PIDS="$(ss -tlnp 2>/dev/null | grep ":${PORT} " | grep -oE 'pid=[0-9]+' | cut -d= -f2 | sort -un || true)"
for pid in $PIDS; do
  cmd="$(tr '\0' ' ' < "/proc/${pid}/cmdline" 2>/dev/null || true)"
  if [[ "$cmd" == *next* ]]; then
    echo "[dev] matando dev server stale (PID ${pid}) en :${PORT}"
    kill "$pid" 2>/dev/null || true
  fi
done
if [[ -n "$PIDS" ]]; then
  # Le damos un momento al proceso para soltar el socket.
  sleep 1
fi

echo "[dev] arrancando dev server en http://localhost:${PORT}"
exec pnpm exec next dev -p "$PORT" "${EXTRA[@]}"
