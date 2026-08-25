import { NextRequest, NextResponse } from "next/server";
import { parseICal } from "@/lib/ical";
import { getSession } from "@/lib/auth";
import { fetchPublicFeedUrl, FEED_URL_ERROR } from "@/lib/feed-url-guard";

/**
 * POST /api/calendar/test
 * Test an iCal URL — fetch it, parse it, return results.
 *
 * Auth: any signed-in user (F2 — anonymous access would turn this into an
 * unauthenticated fetch proxy). The SSRF guard in
 * `fetchPublicFeedUrl` additionally rejects non-public targets (loopback,
 * private ranges, cloud metadata) and non-HTTPS URLs before any fetch.
 */
export async function POST(request: NextRequest) {
  const session = await getSession();
  if (!session) {
    return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
  }

  const { url } = await request.json();

  if (!url) {
    return NextResponse.json({ error: "URL is required" }, { status: 400 });
  }

  const result = await fetchPublicFeedUrl(url);

  // SSRF validation rejections get a generic, attacker-safe message.
  // Never distinguish "private IP" from "http://" from "DNS failed": that
  // detail only helps an attacker tune a rebinding/filtering attempt.
  if (!result.ok && result.reason !== "http_error" && result.reason !== "fetch_failed") {
    return NextResponse.json(
      { success: false, error: FEED_URL_ERROR },
      { status: 400 },
    );
  }

  // Fetch-level failures happen AFTER the guard passed (a public HTTPS URL
  // that genuinely failed) — safe to surface the concrete reason, matching
  // the previous behaviour the calendar wizard relied on for debugging.
  if (!result.ok) {
    return NextResponse.json({
      success: false,
      error: result.detail ?? FEED_URL_ERROR,
    });
  }

  const text = result.text;

  if (!text.includes("VCALENDAR")) {
    return NextResponse.json({
      success: false,
      error: "Response is not a valid iCal feed",
      preview: text.substring(0, 200),
    });
  }

  const events = parseICal(text);
  const today = new Date().toISOString().substring(0, 10);
  const future = events.filter((e) => e.endDate >= today);
  const past = events.filter((e) => e.endDate < today);

  return NextResponse.json({
    success: true,
    totalEvents: events.length,
    futureEvents: future.length,
    pastEvents: past.length,
    events: future.slice(0, 20).map((e) => ({
      summary: e.summary || "Blocked",
      startDate: e.startDate,
      endDate: e.endDate,
    })),
  });
}
