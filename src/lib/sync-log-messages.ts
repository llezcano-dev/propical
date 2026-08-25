/**
 * Sync log messages — structured `{key, params}` payloads.
 *
 * The SyncLog.message column historically stored a raw English string
 * ("Sync started: 2 properties, 3 feeds"). This module introduces a
 * structured format so the UI can translate entries per locale:
 *
 *   message = syncLogMessage("sync.log.started", { properties: 2, feeds: 3 })
 *           → '{"key":"sync.log.started","params":{"properties":2,"feeds":3}}'
 *
 * Rows written before this change (legacy raw strings) and malformed
 * payloads fall back to their raw text — nothing breaks, nothing is
 * re-written retroactively.
 *
 * One special case: the consecutive-failure ALERT keeps its legacy
 * "[ALERT]" marker OUTSIDE the JSON payload, because /api/sync-alerts
 * filters rows by `message.startsWith("[ALERT]")`. The parser tolerates
 * the prefix (and renderers show the translated message without it).
 */

export interface SyncLogParams {
  [k: string]: string | number;
}

export interface ParsedSyncLogMessage {
  /** Translation key; null when the row is a legacy raw string. */
  key: string | null;
  /** Params for the translation; null when absent or unparseable. */
  params: SyncLogParams | null;
  /** The full original message — fallback for legacy / unparseable rows. */
  raw: string;
}

const ALERT_PREFIX = "[ALERT]";

/** Serialize a sync-log entry as a stable {key, params} JSON string. */
export function syncLogMessage(key: string, params?: SyncLogParams): string {
  return params ? JSON.stringify({ key, params }) : JSON.stringify({ key });
}

/**
 * Parse a stored sync-log message. Structured payloads yield their
 * key + params; everything else (legacy raw strings, malformed JSON,
 * JSON without a string `key`) falls back to `{ key: null, raw }`.
 */
export function parseSyncLogMessage(raw: string): ParsedSyncLogMessage {
  const body = raw.startsWith(ALERT_PREFIX)
    ? raw.slice(ALERT_PREFIX.length)
    : raw;

  if (body.startsWith("{")) {
    try {
      const parsed: unknown = JSON.parse(body);
      if (
        parsed &&
        typeof parsed === "object" &&
        typeof (parsed as { key?: unknown }).key === "string"
      ) {
        const params = (parsed as { params?: unknown }).params;
        return {
          key: (parsed as { key: string }).key,
          params:
            params && typeof params === "object" && !Array.isArray(params)
              ? (params as SyncLogParams)
              : null,
          raw,
        };
      }
    } catch {
      // malformed JSON → treat as a legacy raw message
    }
  }

  return { key: null, params: null, raw };
}

/**
 * Render a stored sync-log message for the UI: translate when the
 * payload is structured, otherwise show the raw string.
 *
 * `translate` is injected so the module stays framework-free; callers
 * pass their i18n `t` (casting the string key to TranslationKey).
 */
export function renderSyncLogMessage(
  message: string,
  translate: (key: string, params?: SyncLogParams) => string,
): string {
  const parsed = parseSyncLogMessage(message);
  return parsed.key
    ? translate(parsed.key, parsed.params ?? undefined)
    : parsed.raw;
}
