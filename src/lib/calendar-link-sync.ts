export interface SaveLinkInput {
  propertyId: number;
  platform: string;
  icalExportUrl: string;
  bufferBefore?: number;
  bufferAfter?: number;
}

export interface SaveLinkResult {
  ok: boolean;
  error?: string;
  /** The CalendarLink record returned by the POST (useful for onboarding). */
  link?: unknown;
}

/**
 * Save (create or update) a calendar link for the given property+platform,
 * then immediately trigger a scoped sync so imported events render on the
 * calendar right away — no "Sync now" press needed.
 *
 * The sync is best-effort — if it fails, the link save still succeeds and
 * the 10-min cron will pick up the data on the next pass.
 */
export async function saveCalendarLinkAndSync(
  input: SaveLinkInput,
): Promise<SaveLinkResult> {
  const linkRes = await fetch("/api/calendar/links", {
    method: "POST",
    headers: { "Content-Type": "application/json" },
    body: JSON.stringify(input),
  });

  const data = (await linkRes.json().catch(() => ({}))) as Record<string, unknown>;

  if (!linkRes.ok) {
    return { ok: false, error: (data.error as string) ?? `HTTP ${linkRes.status}` };
  }

  // Best-effort scoped sync — a failed first sync is retried by the
  // 10-min cron, so we don't surface errors from this call.
  try {
    await fetch("/api/calendar/sync", {
      method: "POST",
      headers: { "Content-Type": "application/json" },
      body: JSON.stringify({ propertyId: input.propertyId }),
    });
  } catch {
    // Non-critical.
  }

  return { ok: true, link: data };
}
