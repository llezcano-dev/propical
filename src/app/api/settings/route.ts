import { NextRequest, NextResponse } from "next/server";
import { prisma } from "@/lib/prisma";
import { getSession } from "@/lib/auth";

// Keys of the legacy AppSettings table that a
// non-superadmin is allowed to read. Everything else in this table is
// operator/global state (sync_*), and in particular `sync_last_result`
// carries cross-user counts/errors from the GLOBAL cron
// (`syncAllCalendars()` unscoped) — that must never reach a non-superadmin.
// Currently EMPTY: the sole former entry belonged to the removed
// Gemini/OCR integration. Add a key here ONLY if a non-superadmin
// genuinely needs to read it.
const NON_SUPERADMIN_READABLE_KEYS = new Set<string>();

export async function GET() {
  try {
    const session = await getSession();
    if (!session) {
      return NextResponse.json({ error: "Unauthorized" }, { status: 401 });
    }

    const isSuperadmin = session.role === "superadmin";
    const settings = await prisma.appSettings.findMany();
    const map: Record<string, string> = {};
    for (const s of settings) {
      // Per-key allowlist for non-superadmins. Drop anything not
      // explicitly readable instead of returning it as-is.
      if (!isSuperadmin && !NON_SUPERADMIN_READABLE_KEYS.has(s.key)) {
        continue;
      }
      map[s.key] = s.value;
    }
    return NextResponse.json(map);
  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}

export async function PUT(request: NextRequest) {
  try {
    const session = await getSession();
    if (!session || session.role !== "superadmin") {
      return NextResponse.json({ error: "Forbidden" }, { status: 403 });
    }

    const { key, value } = await request.json();
    if (!key) {
      return NextResponse.json({ error: "Key required" }, { status: 400 });
    }

    await prisma.appSettings.upsert({
      where: { key },
      update: { value },
      create: { key, value },
    });

    return NextResponse.json({ success: true });
  } catch (err) {
    console.error("Route error:", err);
    return NextResponse.json({ error: "Internal server error" }, { status: 500 });
  }
}
