import { buildFixtureIcal } from "@/lib/test-fixtures";

/**
 * GET /api/test/ical/{platform}.ics — deterministic iCal test fixtures.
 *
 * Gated by ENABLE_TEST_API **in production only**: outside production
 * (dev, e2e) the fixtures are always available; in production they return
 * 404 unless ENABLE_TEST_API=1. The flag is the off-switch for the public
 * site — flip it on temporarily to hunt bugs against realistic synthetic
 * calendars, off once real users exist.
 *
 * Platforms:
 *   - airbnb.ics  / booking.ics — realistic, fixed-date, organically-evolving.
 *   - airbnb-sample.ics        — minimal relative-date feed for the e2e claim tests.
 */
export const dynamic = "force-dynamic";

export async function GET(
  _request: Request,
  { params }: { params: Promise<{ platform: string }> },
) {
  if (
    process.env.NODE_ENV === "production" &&
    process.env.ENABLE_TEST_API !== "1"
  ) {
    return new Response("Not found", { status: 404 });
  }

  const { platform } = await params;
  const ical = buildFixtureIcal(platform);
  if (!ical) return new Response("Not found", { status: 404 });

  return new Response(ical, {
    headers: {
      "Content-Type": "text/calendar; charset=utf-8",
      "Cache-Control": "no-store",
    },
  });
}
