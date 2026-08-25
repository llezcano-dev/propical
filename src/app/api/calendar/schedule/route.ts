import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { requireSuperadmin } from "@/lib/auth";

// GET /api/calendar/schedule — get sync schedule settings
//
// Superadmin-only. This endpoint surfaces global operator state:
// `sync_auto_enabled` / `sync_frequency_minutes` control the system-wide
// background sync, and `sync_last_result` comes from the global cron
// (`cron/route.ts` → `syncAllCalendars()` unscoped) — it carries counts
// and errors for every host's properties, so a non-superadmin must not
// read it either (same leak class as /api/settings).
export async function GET() {
  const auth = await requireSuperadmin();
  if (auth.response) return auth.response;

  try {
    const settings = await prisma.appSettings.findMany({
      where: { key: { in: ["sync_auto_enabled", "sync_frequency_minutes", "sync_last_run", "sync_last_result"] } },
    });

    const map: Record<string, string> = {};
    for (const s of settings) map[s.key] = s.value;

    return NextResponse.json({
      autoEnabled: map.sync_auto_enabled === "true",
      frequencyMinutes: parseInt(map.sync_frequency_minutes || "10"),
      lastRun: map.sync_last_run || null,
      lastResult: map.sync_last_result || null,
    });
  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

// PUT /api/calendar/schedule — update sync schedule settings
//
// Superadmin-only. Previously any signed-in user could flip
// `sync_auto_enabled` / `sync_frequency_minutes`, which are GLOBAL
// settings shared by every host on the instance.
export async function PUT(request: NextRequest) {
  const auth = await requireSuperadmin();
  if (auth.response) return auth.response;

  try {
    const body = await request.json();

    if ("autoEnabled" in body) {
      await prisma.appSettings.upsert({
        where: { key: "sync_auto_enabled" },
        update: { value: String(body.autoEnabled) },
        create: { key: "sync_auto_enabled", value: String(body.autoEnabled) },
      });
    }

    if ("frequencyMinutes" in body) {
      await prisma.appSettings.upsert({
        where: { key: "sync_frequency_minutes" },
        update: { value: String(body.frequencyMinutes) },
        create: { key: "sync_frequency_minutes", value: String(body.frequencyMinutes) },
      });
    }

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
